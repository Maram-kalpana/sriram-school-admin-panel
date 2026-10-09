const { z } = require('zod');
const XLSX = require('xlsx');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const stockService = require('../services/stock');

async function summary(req, res, next) {
  try {
    const [skus, units, low, out, valueRow] = await Promise.all([
      db('product_variants').count({ c: '*' }).first(),
      db('product_variants').sum({ c: 'stock_qty' }).first(),
      db('product_variants')
        .where('stock_qty', '>', 0)
        .whereRaw('stock_qty <= low_stock_threshold')
        .count({ c: '*' })
        .first(),
      db('product_variants').where({ stock_qty: 0 }).count({ c: '*' }).first(),
      db('product_variants as v')
        .join('products as p', 'p.id', 'v.product_id')
        .select(db.raw('COALESCE(SUM(v.stock_qty * COALESCE(v.price_override, p.base_price)), 0) as value'))
        .first(),
    ]);
    res.json({
      success: true,
      data: {
        totalSkus: Number(skus.c),
        unitsInStock: Number(units.c || 0),
        stockValue: Number(valueRow.value || 0),
        lowStock: Number(low.c),
        outOfStock: Number(out.c),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listVariants(req, res, next) {
  try {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(200).default(50),
      search: z.string().optional().default(''),
      stockFilter: z.enum(['', 'low', 'out']).optional().default(''),
    });
    const q = schema.parse(req.query);

    let query = db('product_variants as v')
      .join('products as p', 'p.id', 'v.product_id')
      .select(
        'v.*',
        'p.name as product_name',
        'p.status as product_status'
      );

    if (q.search) {
      const s = `%${q.search}%`;
      query = query.andWhere((b) =>
        b.where('v.sku', 'like', s).orWhere('p.name', 'like', s)
      );
    }
    if (q.stockFilter === 'out') query = query.andWhere('v.stock_qty', 0);
    if (q.stockFilter === 'low') {
      query = query.andWhere('v.stock_qty', '>', 0).andWhereRaw('v.stock_qty <= v.low_stock_threshold');
    }

    const countRow = await query.clone().clearSelect().count({ total: '*' }).first();
    const total = Number(countRow.total);
    const rows = await query
      .orderBy('p.name')
      .orderBy('v.sku')
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);

    res.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          productId: r.product_id,
          productName: r.product_name,
          productStatus: r.product_status,
          sku: r.sku,
          option1Name: r.option1_name,
          option1Value: r.option1_value,
          option2Name: r.option2_name,
          option2Value: r.option2_value,
          stockQty: r.stock_qty,
          lowStockThreshold: r.low_stock_threshold,
          isActive: Boolean(r.is_active),
          statusBadge:
            r.stock_qty === 0 ? 'out' : r.stock_qty <= r.low_stock_threshold ? 'low' : 'ok',
        })),
        pagination: {
          page: q.page,
          pageSize: q.pageSize,
          total,
          totalPages: Math.ceil(total / q.pageSize) || 1,
        },
      },
    });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function adjustStock(req, res, next) {
  try {
    const schema = z.object({
      mode: z.enum(['set', 'restock', 'adjust']),
      quantity: z.coerce.number().int(),
      note: z.string().min(1),
    });
    const body = schema.parse(req.body);
    const variantId = Number(req.params.id);

    await db.transaction(async (trx) => {
      if (body.mode === 'set') {
        await stockService.setStockAbsolute(trx, {
          variantId,
          newQty: body.quantity,
          reason: 'adjustment',
          adminUserId: req.admin.id,
          note: body.note,
        });
      } else if (body.mode === 'restock') {
        if (body.quantity <= 0) throw new AppError('Restock qty must be positive', 400);
        await stockService.changeStock(trx, {
          variantId,
          changeQty: body.quantity,
          reason: 'restock',
          adminUserId: req.admin.id,
          note: body.note,
        });
      } else {
        await stockService.changeStock(trx, {
          variantId,
          changeQty: body.quantity,
          reason: 'adjustment',
          adminUserId: req.admin.id,
          note: body.note,
        });
      }
    });

    const row = await db('product_variants').where({ id: variantId }).first();
    res.json({ success: true, data: { stockQty: row.stock_qty } });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function movements(req, res, next) {
  try {
    const rows = await db('stock_movements as m')
      .leftJoin('admin_users as a', 'a.id', 'm.admin_user_id')
      .where('m.variant_id', req.params.id)
      .select('m.*', 'a.name as admin_name')
      .orderBy('m.created_at', 'desc')
      .limit(100);
    res.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          changeQty: r.change_qty,
          reason: r.reason,
          orderId: r.order_id,
          note: r.note,
          adminName: r.admin_name,
          createdAt: r.created_at,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function exportRows() {
  return db('product_variants as v')
    .join('products as p', 'p.id', 'v.product_id')
    .select(
      'v.sku',
      'p.name',
      'v.option1_value',
      'v.option2_value',
      'v.stock_qty',
      'v.low_stock_threshold',
      db.raw('COALESCE(v.price_override, p.base_price) as unit_price')
    );
}

async function exportCsv(req, res, next) {
  try {
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    const rows = await exportRows();
    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="inventory.xlsx"');
      return res.send(buf);
    }
    const lines = ['SKU,Product,Option1,Option2,Stock,Threshold,UnitPrice'];
    rows.forEach((r) => {
      lines.push(
        [r.sku, r.name, r.option1_value || '', r.option2_value || '', r.stock_qty, r.low_stock_threshold, r.unit_price]
          .map((x) => `"${String(x).replace(/"/g, '""')}"`)
          .join(',')
      );
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
    return res.send(lines.join('\n'));
  } catch (err) {
    return next(err);
  }
}

async function lowStockReport(req, res, next) {
  try {
    const rows = await db('product_variants as v')
      .join('products as p', 'p.id', 'v.product_id')
      .whereRaw('v.stock_qty <= v.low_stock_threshold')
      .select('v.sku', 'p.name', 'v.stock_qty', 'v.low_stock_threshold');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Low stock');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="low-stock.xlsx"');
    res.send(buf);
  } catch (err) {
    next(err);
  }
}

function parseStockWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  if (!matrix.length) return [];
  const headers = matrix[0].map((h) => String(h || '').trim().toLowerCase());
  const skuIdx = headers.findIndex((h) => h === 'sku');
  const qtyIdx = headers.findIndex((h) => h === 'qty' || h === 'quantity' || h === 'stock');
  if (skuIdx < 0 || qtyIdx < 0) {
    throw new AppError('Excel must have SKU and Qty columns', 400);
  }
  const rows = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const sku = String(matrix[i][skuIdx] || '').trim();
    const qty = Number(matrix[i][qtyIdx]);
    if (!sku) continue;
    rows.push({ row: i + 1, sku, qty });
  }
  return rows;
}

async function bulkPreview(req, res, next) {
  try {
    if (!req.file) throw new AppError('File required', 400);
    const parsed = parseStockWorkbook(req.file.buffer);
    const skus = parsed.map((p) => p.sku);
    const variants = await db('product_variants').whereIn('sku', skus);
    const bySku = new Map(variants.map((v) => [v.sku, v]));
    const preview = parsed.map((p) => {
      const v = bySku.get(p.sku);
      const errors = [];
      if (!v) errors.push('SKU not found');
      if (!Number.isInteger(p.qty) || p.qty < 0) errors.push('Invalid qty');
      return {
        ...p,
        currentQty: v ? v.stock_qty : null,
        variantId: v ? v.id : null,
        errors,
      };
    });
    res.json({
      success: true,
      data: {
        preview,
        counts: {
          total: preview.length,
          valid: preview.filter((p) => !p.errors.length).length,
          invalid: preview.filter((p) => p.errors.length).length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function bulkCommit(req, res, next) {
  try {
    if (!req.file) throw new AppError('File required', 400);
    const parsed = parseStockWorkbook(req.file.buffer);
    let updated = 0;
    let failed = 0;
    await db.transaction(async (trx) => {
      for (const row of parsed) {
        const variant = await trx('product_variants').where({ sku: row.sku }).first();
        if (!variant || !Number.isInteger(row.qty) || row.qty < 0) {
          failed += 1;
          continue;
        }
        await stockService.setStockAbsolute(trx, {
          variantId: variant.id,
          newQty: row.qty,
          reason: 'adjustment',
          adminUserId: req.admin.id,
          note: 'Bulk stock upload',
        });
        updated += 1;
      }
    });
    res.json({ success: true, data: { updated, failed } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  summary,
  listVariants,
  adjustStock,
  movements,
  exportCsv,
  lowStockReport,
  bulkPreview,
  bulkCommit,
};
