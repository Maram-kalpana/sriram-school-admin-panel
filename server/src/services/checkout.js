const { fail } = require('../errors');
const { withTransaction } = require('../db');
const { applyStockChange } = require('./stock');
const { nextOrderNumber } = require('../utils/orderNumber');
const { getProvider } = require('./payment');
const { resolveCatalogMode } = require('./catalogMode');
const { getSettings } = require('./settings');

function unitPrice(product, variant) {
  if (variant.price_override != null) return Number(variant.price_override);
  return Number(product.base_price);
}

async function placeOrder(student, payload) {
  const settings = await getSettings();
  const mode = resolveCatalogMode(student, settings);
  const type = payload.type;
  if (mode === 'kit' && type !== 'kit') {
    throw fail('Individual products are not available yet.', { status: 403, code: 'KIT_ONLY' });
  }

  const pay = await getProvider(payload.payment_method).createPayment();
  const shippingFee = Number(settings.shipping_flat_fee || 0);
  const allowEdit = settings.allow_address_edit === 'true';
  const address = allowEdit && payload.address ? payload.address : {
    student_name: student.student_name,
    parent_name: student.parent_name,
    address1: student.address1,
    address2: student.address2,
    city: student.city,
    state: student.state,
    zipcode: student.zipcode,
    phone: student.phone,
    house_color: student.house_color,
  };

  return withTransaction(async (conn) => {
    const lineInputs = payload.items || [];
    if (!lineInputs.length) throw fail('Cart is empty');

    const lines = [];
    let subtotal = 0;
    let taxTotal = 0;

    if (type === 'kit') {
      const [kits] = await conn.query('SELECT * FROM kits WHERE is_active = 1 ORDER BY id LIMIT 1');
      if (!kits.length) throw fail('School kit is not available');
      const kit = kits[0];
      const [kitItems] = await conn.query('SELECT * FROM kit_items WHERE kit_id = ?', [kit.id]);
      if (lineInputs.length !== kitItems.length) {
        throw fail('Kit order must include every kit item');
      }
      const byProduct = new Map(lineInputs.map((i) => [Number(i.product_id), i]));
      for (const ki of kitItems) {
        const chosen = byProduct.get(ki.product_id);
        if (!chosen) throw fail('Missing kit item selection');
        const [products] = await conn.query('SELECT * FROM products WHERE id = ?', [ki.product_id]);
        const [variants] = await conn.query('SELECT * FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1', [
          chosen.variant_id,
          ki.product_id,
        ]);
        if (!products.length || !variants.length) throw fail('Invalid kit variant');
        const product = products[0];
        const variant = variants[0];
        if (ki.house_color_auto_match) {
          const color = (variant.option2_value || variant.option1_value || '').toLowerCase();
          if (color && color !== String(student.house_color).toLowerCase()) {
            throw fail('House color does not match the student record');
          }
        }
        const qty = ki.quantity;
        const price = unitPrice(product, variant);
        const lineTotal = price * qty;
        const tax = (lineTotal * Number(product.tax_percent || 0)) / 100;
        subtotal += lineTotal;
        taxTotal += tax;
        lines.push({ product, variant, qty, price, lineTotal, kitQtyLocked: true });
      }
      subtotal = Number(kit.price);
      taxTotal = 0;
    } else {
      for (const item of lineInputs) {
        const [products] = await conn.query(
          `SELECT * FROM products WHERE id = ? AND status = 'active' AND visible_individually = 1`,
          [item.product_id]
        );
        const [variants] = await conn.query(
          'SELECT * FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1',
          [item.variant_id, item.product_id]
        );
        if (!products.length || !variants.length) throw fail('Invalid product selection');
        const product = products[0];
        const variant = variants[0];
        const qty = Number(item.quantity);
        if (!Number.isInteger(qty) || qty < 1) throw fail('Invalid quantity');
        const price = unitPrice(product, variant);
        const lineTotal = price * qty;
        const tax = (lineTotal * Number(product.tax_percent || 0)) / 100;
        subtotal += lineTotal;
        taxTotal += tax;
        lines.push({ product, variant, qty, price, lineTotal });
      }
    }

    const total = Number((subtotal + taxTotal + shippingFee).toFixed(2));
    const orderNumber = await nextOrderNumber(conn);

    const [ord] = await conn.query(
      `INSERT INTO orders (order_number, student_id, type, status, payment_status, payment_method,
        subtotal, tax, shipping, total, shipping_address_snapshot, notes)
       VALUES (?, ?, ?, 'placed', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        student.id,
        type,
        pay.payment_status,
        pay.payment_method,
        subtotal,
        taxTotal,
        shippingFee,
        total,
        JSON.stringify(address),
        payload.notes || null,
      ]
    );
    const orderId = ord.insertId;

    for (const line of lines) {
      await applyStockChange(conn, {
        variantId: line.variant.id,
        changeQty: -line.qty,
        reason: 'order',
        orderId,
      });
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, name_snapshot, sku_snapshot,
          size_snapshot, color_snapshot, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          line.product.id,
          line.variant.id,
          line.product.name,
          line.variant.sku,
          line.variant.option1_value,
          line.variant.option2_value,
          line.price,
          line.qty,
          type === 'kit' ? Number((subtotal / lines.length).toFixed(2)) : line.lineTotal,
        ]
      );
    }

    await conn.query(
      `INSERT INTO order_status_history (order_id, status, changed_by, note) VALUES (?, 'placed', ?, ?)`,
      [orderId, `student:${student.admission_number}`, 'Order placed']
    );

    if (type === 'kit') {
      await conn.query(`UPDATE students SET kit_status = 'ordered' WHERE id = ?`, [student.id]);
    }

    const [created] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    return { order: created[0], items };
  });
}

module.exports = { placeOrder };
