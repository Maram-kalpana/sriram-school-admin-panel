const { z } = require('zod');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const { resolveCatalogMode, loadSettingsMap } = require('../services/catalogMode');
const stockService = require('../services/stock');
const { nextOrderNumber } = require('../utils/orderNumber');
const { applyOrderGst, isIntraState, splitLine, round2 } = require('../utils/gst');

async function login(req, res, next) {
  try {
    const schema = z.object({
      admissionNumber: z.string().min(1),
      secondFactor: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const settings = await loadSettingsMap(db);
    const student = await db('students')
      .where({ admission_number: body.admissionNumber.trim(), is_active: true })
      .first();
    if (!student) throw new AppError('Student not found or inactive', 401);

    const check = settings.extra_login_check || 'none';
    if (check === 'zipcode') {
      if (!body.secondFactor || body.secondFactor.trim() !== student.zipcode) {
        throw new AppError('Invalid zipcode', 401);
      }
    }
    if (check === 'parent_phone') {
      if (!student.phone || !body.secondFactor || body.secondFactor.trim() !== student.phone) {
        throw new AppError('Invalid phone', 401);
      }
    }

    const patch = { last_login_at: db.fn.now() };
    if (!student.first_login_at) patch.first_login_at = db.fn.now();
    await db('students').where({ id: student.id }).update(patch);

    const refreshed = await db('students').where({ id: student.id }).first();
    const mode = resolveCatalogMode(refreshed, settings);

    res.json({
      success: true,
      data: {
        student: {
          id: refreshed.id,
          admissionNumber: refreshed.admission_number,
          studentName: refreshed.student_name,
          houseColor: refreshed.house_color,
          kitStatus: refreshed.kit_status,
          catalogMode: mode,
        },
      },
    });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function getCatalog(req, res, next) {
  try {
    const admissionNumber = String(req.query.admissionNumber || '').trim();
    if (!admissionNumber) throw new AppError('admissionNumber required', 400);
    const settings = await loadSettingsMap(db);
    const student = await db('students')
      .where({ admission_number: admissionNumber, is_active: true })
      .first();
    if (!student) throw new AppError('Student not found', 404);
    const mode = resolveCatalogMode(student, settings);

    if (mode === 'kit') {
      const kit = await db('kits').where({ is_active: true }).orderBy('id', 'desc').first();
      if (!kit) {
        return res.json({ success: true, data: { mode, kit: null, products: [] } });
      }
      const items = await db('kit_items as ki')
        .join('products as p', 'p.id', 'ki.product_id')
        .where('ki.kit_id', kit.id)
        .select('ki.*', 'p.name', 'p.slug', 'p.description');
      const enriched = [];
      for (const item of items) {
        const variants = await db('product_variants')
          .where({ product_id: item.product_id, is_active: true })
          .andWhere('stock_qty', '>', 0);
        enriched.push({
          productId: item.product_id,
          name: item.name,
          quantity: item.quantity,
          studentPicksSize: Boolean(item.student_picks_size),
          autoMatchHouseColor: Boolean(item.auto_match_house_color),
          variants: variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            option1Name: v.option1_name,
            option1Value: v.option1_value,
            option2Name: v.option2_name,
            option2Value: v.option2_value,
            stockQty: v.stock_qty,
          })),
        });
      }
      return res.json({
        success: true,
        data: {
          mode,
          kit: {
            id: kit.id,
            name: kit.name,
            description: kit.description,
            price: Number(kit.price),
            imageUrl: kit.image_url,
            items: enriched,
          },
          products: [],
        },
      });
    }

    const products = await db('products as p')
      .where({ status: 'active', visible_individually: true })
      .whereExists(function existsVariant() {
        this.select(db.raw('1'))
          .from('product_variants as v')
          .whereRaw('v.product_id = p.id')
          .andWhere('v.is_active', true)
          .andWhere('v.stock_qty', '>', 0);
      })
      .select('p.*');

    const result = [];
    for (const p of products) {
      const variants = await db('product_variants')
        .where({ product_id: p.id, is_active: true })
        .andWhere('stock_qty', '>', 0);
      const images = await db('product_images').where({ product_id: p.id }).orderBy('sort_order');
      result.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePrice: Number(p.base_price),
        images: images.map((i) => i.url),
        variants: variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          option1Name: v.option1_name,
          option1Value: v.option1_value,
          option2Name: v.option2_name,
          option2Value: v.option2_value,
          priceOverride: v.price_override != null ? Number(v.price_override) : null,
          stockQty: v.stock_qty,
        })),
      });
    }

    return res.json({ success: true, data: { mode, kit: null, products: result } });
  } catch (err) {
    return next(err);
  }
}

async function placeOrder(req, res, next) {
  try {
    const schema = z.object({
      admissionNumber: z.string().min(1),
      type: z.enum(['kit', 'individual']),
      items: z
        .array(
          z.object({
            variantId: z.coerce.number().int().positive(),
            productId: z.coerce.number().int().positive(),
            quantity: z.coerce.number().int().positive(),
          })
        )
        .min(1),
      paymentMethod: z.string().optional().default('cod'),
      notes: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const settings = await loadSettingsMap(db);
    const student = await db('students')
      .where({ admission_number: body.admissionNumber.trim(), is_active: true })
      .first();
    if (!student) throw new AppError('Student not found', 404);

    const mode = resolveCatalogMode(student, settings);
    if (body.type === 'individual' && mode === 'kit') {
      throw new AppError('Student is in kit mode; cannot order individual products', 403);
    }
    if (body.type === 'kit' && mode === 'individual') {
      const allowReorder = settings.allow_kit_reorder === true;
      if (!allowReorder) {
        throw new AppError('Kit already ordered; re-order not allowed', 403);
      }
    }

    const shipping = Number(settings.shipping_fee || 0);
    const prefix = settings.order_number_prefix || 'SS';

    const orderId = await db.transaction(async (trx) => {
      let subtotal = 0;
      const lineRows = [];

      for (const item of body.items) {
        const variant = await trx('product_variants').where({ id: item.variantId }).forUpdate().first();
        if (!variant || !variant.is_active) {
          throw new AppError('Variant unavailable', 400);
        }
        const available = Number(variant.stock_qty) - Number(variant.reserved_qty || 0);
        if (available < item.quantity) {
          throw new AppError(`Insufficient stock for ${variant.sku}`, 400);
        }
        const product = await trx('products').where({ id: item.productId }).first();
        if (!product) throw new AppError('Product not found', 400);

        const unit =
          variant.price_override != null
            ? Number(variant.price_override)
            : body.type === 'kit'
              ? 0
              : Number(product.base_price);
        const lineTotal = unit * item.quantity;
        subtotal += lineTotal;

        await stockService.reserveStock(trx, {
          variantId: variant.id,
          quantity: item.quantity,
          note: 'Storefront reserve',
        });

        lineRows.push({
          product_id: product.id,
          variant_id: variant.id,
          name_snapshot: product.name,
          sku_snapshot: variant.sku,
          option_snapshot: [variant.option1_value, variant.option2_value].filter(Boolean).join(' / '),
          unit_price: unit,
          quantity: item.quantity,
          line_total: lineTotal,
          hsn_code: product.hsn_code || null,
          gst_rate: Number(product.gst_rate != null ? product.gst_rate : product.tax_percent || 0),
          priceIncludesGst: product.price_includes_gst !== false && product.price_includes_gst !== 0,
        });
      }

      let profile = null;
      try {
        profile = await trx('gst_profile').orderBy('id').first();
      } catch {
        profile = null;
      }
      const intraState = isIntraState(profile || { state: 'Telangana', state_code: '36' }, student);

      let total = subtotal;
      let tax = 0;
      let taxableTotal = subtotal;
      let cgstTotal = 0;
      let sgstTotal = 0;
      let igstTotal = 0;
      if (body.type === 'kit') {
        const kit = await trx('kits').where({ is_active: true }).orderBy('id', 'desc').first();
        if (!kit) throw new AppError('No active kit', 400);
        const kitSplit = splitLine({
          amount: Number(kit.price),
          quantity: 1,
          gstRate: 5,
          priceIncludesGst: true,
          intraState,
        });
        subtotal = kitSplit.lineTotal;
        taxableTotal = kitSplit.taxableValue;
        tax = kitSplit.tax;
        cgstTotal = kitSplit.cgst;
        sgstTotal = kitSplit.sgst;
        igstTotal = kitSplit.igst;
        total = round2(kitSplit.lineTotal + shipping);
        if (lineRows[0]) {
          lineRows[0].taxable_value = taxableTotal;
          lineRows[0].cgst = cgstTotal;
          lineRows[0].sgst = sgstTotal;
          lineRows[0].igst = igstTotal;
          lineRows[0].gst_rate = 5;
          lineRows[0].hsn_code = lineRows[0].hsn_code || '6109';
        }
      } else {
        const gst = applyOrderGst(
          lineRows.map((l) => ({
            unitPrice: l.unit_price,
            quantity: l.quantity,
            gstRate: l.gst_rate,
            priceIncludesGst: l.priceIncludesGst,
          })),
          { intraState }
        );
        gst.lines.forEach((g, i) => {
          lineRows[i].taxable_value = g.taxableValue;
          lineRows[i].cgst = g.cgst;
          lineRows[i].sgst = g.sgst;
          lineRows[i].igst = g.igst;
          lineRows[i].line_total = g.lineTotal;
        });
        taxableTotal = gst.taxableTotal;
        cgstTotal = gst.cgstTotal;
        sgstTotal = gst.sgstTotal;
        igstTotal = gst.igstTotal;
        tax = gst.gstTotal;
        subtotal = gst.itemsTotal;
        total = round2(gst.itemsTotal + shipping);
      }

      const orderNumber = await nextOrderNumber(trx, prefix);
      const addressSnapshot = {
        address1: student.address1,
        address2: student.address2,
        city: student.city,
        state: student.state,
        zipcode: student.zipcode,
        parentName: student.parent_name,
        phone: student.phone,
      };

      const isPaytm = body.paymentMethod === 'paytm';
      const [oid] = await trx('orders').insert({
        order_number: orderNumber,
        student_id: student.id,
        type: body.type,
        status: 'placed',
        payment_status: 'pending',
        payment_method: body.paymentMethod,
        subtotal,
        tax,
        shipping,
        total,
        taxable_total: taxableTotal,
        cgst_total: cgstTotal,
        sgst_total: sgstTotal,
        igst_total: igstTotal,
        stock_state: 'reserved',
        address_snapshot: JSON.stringify(addressSnapshot),
        notes: body.notes || null,
      });

      for (const line of lineRows) {
        const { priceIncludesGst, ...rest } = line;
        await trx('order_items').insert({ ...rest, order_id: oid });
      }

      if (!isPaytm) {
        for (const line of lineRows) {
          await stockService.finalizeReserved(trx, {
            variantId: line.variant_id,
            quantity: line.quantity,
            orderId: oid,
            note: 'COD — finalize stock',
          });
        }
        await trx('orders').where({ id: oid }).update({ stock_state: 'finalized' });
      }
      await trx('order_status_history').insert({
        order_id: oid,
        status: 'placed',
        changed_by: 'storefront',
        note: 'Order placed',
      });

      // attach order_id on stock movements created above — update recent
      await trx('stock_movements')
        .whereNull('order_id')
        .where({ reason: 'order' })
        .whereIn(
          'variant_id',
          lineRows.map((l) => l.variant_id)
        )
        .orderBy('id', 'desc')
        .limit(lineRows.length)
        .update({ order_id: oid });

      if (body.type === 'kit') {
        await trx('students').where({ id: student.id }).update({
          kit_status: 'ordered',
          updated_at: trx.fn.now(),
        });
      }

      return oid;
    });

    const order = await db('orders').where({ id: orderId }).first();
    res.status(201).json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.order_number,
          total: Number(order.total),
          status: order.status,
        },
      },
    });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function listOrders(req, res, next) {
  try {
    const admissionNumber = String(req.query.admissionNumber || '').trim();
    if (!admissionNumber) throw new AppError('admissionNumber required', 400);
    const student = await db('students').where({ admission_number: admissionNumber }).first();
    if (!student) throw new AppError('Student not found', 404);
    const orders = await db('orders').where({ student_id: student.id }).orderBy('created_at', 'desc');
    res.json({
      success: true,
      data: {
        items: orders.map((o) => ({
          id: o.id,
          orderNumber: o.order_number,
          type: o.type,
          status: o.status,
          paymentStatus: o.payment_status,
          total: Number(o.total),
          createdAt: o.created_at,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getCatalog,
  placeOrder,
  listOrders,
};
