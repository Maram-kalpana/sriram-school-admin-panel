const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const { query, withTransaction } = require('../db');
const { validate } = require('../middleware/validate');
const { fail } = require('../errors');
const { slugify } = require('../utils/slug');
const { applyStockChange } = require('../services/stock');
const { config } = require('../config');

const router = express.Router();

if (!fs.existsSync(config.uploadsDir)) fs.mkdirSync(config.uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 8) || '.bin';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

router.post('/uploads', upload.array('files', 12), (req, res) => {
  const urls = (req.files || []).map((f) => `/uploads/${f.filename}`);
  res.json({ data: { urls } });
});

const catBody = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

router.get('/categories', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM categories ORDER BY sort_order, name');
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', validate(z.object({ body: catBody, query: z.any().optional(), params: z.any().optional() })), async (req, res, next) => {
  try {
    const d = req.validated.body;
    const slug = slugify(d.slug || d.name);
    const result = await query(
      'INSERT INTO categories (name, slug, sort_order, is_active) VALUES (?, ?, ?, ?)',
      [d.name, slug, d.sort_order || 0, d.is_active === false ? 0 : 1]
    );
    const rows = await query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/categories/:id', validate(z.object({ body: catBody.partial(), query: z.any().optional(), params: z.object({ id: z.string() }) })), async (req, res, next) => {
  try {
    const d = req.validated.body;
    const fields = [];
    const params = [];
    if (d.name) { fields.push('name = ?'); params.push(d.name); }
    if (d.slug) { fields.push('slug = ?'); params.push(slugify(d.slug)); }
    if (d.sort_order != null) { fields.push('sort_order = ?'); params.push(d.sort_order); }
    if (d.is_active != null) { fields.push('is_active = ?'); params.push(d.is_active ? 1 : 0); }
    params.push(req.params.id);
    await query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params);
    const rows = await query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

router.get('/products', async (req, res, next) => {
  try {
    const { q, category_id, status, stock } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
    const where = ['1=1'];
    const params = [];
    if (q) {
      where.push('(p.name LIKE ? OR p.slug LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category_id) {
      where.push('p.category_id = ?');
      params.push(category_id);
    }
    if (status) {
      where.push('p.status = ?');
      params.push(status);
    }
    const clause = where.join(' AND ');
    let stockFilter = '';
    if (stock === 'low') stockFilter = 'AND COALESCE(s.total_stock,0) > 0 AND COALESCE(s.total_stock,0) <= 5';
    if (stock === 'out') stockFilter = 'AND COALESCE(s.total_stock,0) = 0';
    const totalRows = await query(`SELECT COUNT(*) AS c FROM products p WHERE ${clause}`, params);
    const rows = await query(
      `SELECT p.*, c.name AS category_name,
        COALESCE(s.total_stock, 0) AS total_stock,
        COALESCE(s.variants_count, 0) AS variants_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN (
         SELECT product_id, SUM(stock_qty) AS total_stock, COUNT(id) AS variants_count
         FROM product_variants GROUP BY product_id
       ) s ON s.product_id = p.id
       WHERE ${clause}
       ${stockFilter}
       ORDER BY p.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    rows.forEach((r) => {
      if (typeof r.images === 'string') {
        try { r.images = JSON.parse(r.images); } catch { r.images = []; }
      }
    });
    res.json({ data: rows, meta: { total: totalRows[0].c, page, pageSize } });
  } catch (err) {
    next(err);
  }
});

const variantSchema = z.object({
  id: z.number().optional(),
  sku: z.string().min(1),
  option1_name: z.string().nullable().optional(),
  option1_value: z.string().nullable().optional(),
  option2_name: z.string().nullable().optional(),
  option2_value: z.string().nullable().optional(),
  price_override: z.number().nullable().optional(),
  stock_qty: z.number().int().min(0).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  image: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
});

const productBody = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  category_id: z.number().nullable().optional(),
  brand: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  base_price: z.number(),
  compare_at_price: z.number().nullable().optional(),
  tax_percent: z.number().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  is_kit_item: z.boolean().optional(),
  visible_individually: z.boolean().optional(),
  variants: z.array(variantSchema).optional(),
});

async function saveProduct(id, d, adminId) {
  const slug = slugify(d.slug || d.name);
  const images = JSON.stringify(d.images || []);
  let productId = id;
  if (!id) {
    const result = await query(
      `INSERT INTO products (name, slug, description, category_id, brand, images, base_price, compare_at_price,
        tax_percent, status, is_kit_item, visible_individually)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.name, slug, d.description || null, d.category_id || null, d.brand || null, images,
        d.base_price, d.compare_at_price || null, d.tax_percent || 0, d.status || 'draft',
        d.is_kit_item ? 1 : 0, d.visible_individually === false ? 0 : 1,
      ]
    );
    productId = result.insertId;
  } else {
    await query(
      `UPDATE products SET name=?, slug=?, description=?, category_id=?, brand=?, images=?, base_price=?,
        compare_at_price=?, tax_percent=?, status=?, is_kit_item=?, visible_individually=? WHERE id=?`,
      [
        d.name, slug, d.description || null, d.category_id || null, d.brand || null, images,
        d.base_price, d.compare_at_price || null, d.tax_percent || 0, d.status || 'draft',
        d.is_kit_item ? 1 : 0, d.visible_individually === false ? 0 : 1, productId,
      ]
    );
  }

  if (d.variants) {
    const skus = d.variants.map((v) => v.sku);
    const dup = skus.filter((s, i) => skus.indexOf(s) !== i);
    if (dup.length) throw fail(`Duplicate SKUs: ${dup.join(', ')}`);

    const existing = await query('SELECT id, sku, stock_qty FROM product_variants WHERE product_id = ?', [productId]);
    const keepIds = [];
    for (const v of d.variants) {
      const found = v.id ? existing.find((e) => e.id === v.id) : existing.find((e) => e.sku === v.sku);
      if (found) {
        keepIds.push(found.id);
        await query(
          `UPDATE product_variants SET sku=?, option1_name=?, option1_value=?, option2_name=?, option2_value=?,
           price_override=?, low_stock_threshold=?, is_active=?, image=?, barcode=?, weight=? WHERE id=?`,
          [
            v.sku, v.option1_name || null, v.option1_value || null, v.option2_name || null, v.option2_value || null,
            v.price_override ?? null, v.low_stock_threshold ?? 5, v.is_active === false ? 0 : 1,
            v.image || null, v.barcode || null, v.weight ?? null, found.id,
          ]
        );
        if (v.stock_qty != null && v.stock_qty !== found.stock_qty) {
          await withTransaction((conn) => applyStockChange(conn, {
            variantId: found.id,
            changeQty: v.stock_qty - found.stock_qty,
            reason: 'adjustment',
            adminUserId: adminId,
            note: 'product form stock edit',
            allowNegative: true,
          }));
        }
      } else {
        const result = await query(
          `INSERT INTO product_variants (product_id, sku, option1_name, option1_value, option2_name, option2_value,
            price_override, stock_qty, low_stock_threshold, reserved_qty, is_active, image, barcode, weight)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
          [
            productId, v.sku, v.option1_name || null, v.option1_value || null, v.option2_name || null,
            v.option2_value || null, v.price_override ?? null, v.stock_qty || 0, v.low_stock_threshold ?? 5,
            v.is_active === false ? 0 : 1, v.image || null, v.barcode || null, v.weight ?? null,
          ]
        );
        keepIds.push(result.insertId);
        if (v.stock_qty) {
          await query(
            `INSERT INTO stock_movements (variant_id, change_qty, reason, admin_user_id, note)
             VALUES (?, ?, 'initial', ?, 'product create')`,
            [result.insertId, v.stock_qty, adminId]
          );
        }
      }
    }
    if (keepIds.length) {
      await query(
        `DELETE FROM product_variants WHERE product_id = ? AND id NOT IN (${keepIds.map(() => '?').join(',')})`,
        [productId, ...keepIds]
      );
    } else {
      await query('DELETE FROM product_variants WHERE product_id = ?', [productId]);
    }
  }

  return productId;
}

router.post('/products', validate(z.object({ body: productBody, query: z.any().optional(), params: z.any().optional() })), async (req, res, next) => {
  try {
    const id = await saveProduct(null, req.validated.body, req.admin.id);
    const rows = await query('SELECT * FROM products WHERE id = ?', [id]);
    const variants = await query('SELECT * FROM product_variants WHERE product_id = ?', [id]);
    res.status(201).json({ data: { ...rows[0], variants } });
  } catch (err) {
    next(err);
  }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) throw fail('Product not found', { status: 404, code: 'NOT_FOUND' });
    const variants = await query('SELECT * FROM product_variants WHERE product_id = ?', [req.params.id]);
    const p = rows[0];
    if (typeof p.images === 'string') {
      try { p.images = JSON.parse(p.images); } catch { p.images = []; }
    }
    res.json({ data: { ...p, variants } });
  } catch (err) {
    next(err);
  }
});

router.patch('/products/:id', validate(z.object({ body: productBody, query: z.any().optional(), params: z.object({ id: z.string() }) })), async (req, res, next) => {
  try {
    await saveProduct(Number(req.params.id), req.validated.body, req.admin.id);
    const rows = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    const variants = await query('SELECT * FROM product_variants WHERE product_id = ?', [req.params.id]);
    res.json({ data: { ...rows[0], variants } });
  } catch (err) {
    next(err);
  }
});

router.post('/products/bulk-status', validate(z.object({
  body: z.object({ ids: z.array(z.number()), status: z.enum(['draft', 'active', 'archived']) }),
  query: z.any().optional(),
  params: z.any().optional(),
})), async (req, res, next) => {
  try {
    const { ids, status } = req.validated.body;
    if (!ids.length) throw fail('No products selected');
    await query(`UPDATE products SET status = ? WHERE id IN (${ids.map(() => '?').join(',')})`, [status, ...ids]);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

router.get('/inventory', async (req, res, next) => {
  try {
    const { q, stock } = req.query;
    const where = ['1=1'];
    const params = [];
    if (q) {
      where.push('(v.sku LIKE ? OR p.name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (stock === 'low') where.push('v.stock_qty > 0 AND v.stock_qty <= v.low_stock_threshold');
    if (stock === 'out') where.push('v.stock_qty <= 0');
    const rows = await query(
      `SELECT v.*, p.name AS product_name, p.base_price
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       WHERE ${where.join(' AND ')}
       ORDER BY p.name, v.sku`,
      params
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/inventory/export.csv', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT v.sku, p.name, v.option1_value, v.option2_value, v.stock_qty, v.low_stock_threshold, v.is_active
       FROM product_variants v JOIN products p ON p.id = v.product_id ORDER BY p.name`
    );
    const lines = ['sku,product,size,color,stock,low_stock,active'];
    rows.forEach((r) => {
      lines.push([r.sku, r.name, r.option1_value, r.option2_value, r.stock_qty, r.low_stock_threshold, r.is_active].join(','));
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
    res.send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
});

router.post('/inventory/:id/move', validate(z.object({
  body: z.object({
    reason: z.enum(['restock', 'adjustment']),
    change_qty: z.number().int(),
    note: z.string().optional(),
  }),
  query: z.any().optional(),
  params: z.object({ id: z.string() }),
})), async (req, res, next) => {
  try {
    const { reason, change_qty, note } = req.validated.body;
    if (reason === 'restock' && change_qty <= 0) throw fail('Restock quantity must be positive');
    const result = await withTransaction((conn) => applyStockChange(conn, {
      variantId: Number(req.params.id),
      changeQty: change_qty,
      reason,
      adminUserId: req.admin.id,
      note: note || reason,
      allowNegative: reason === 'adjustment',
    }));
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/inventory/:id/movements', async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT * FROM stock_movements WHERE variant_id = ? ORDER BY id DESC LIMIT 100',
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/kit', async (req, res, next) => {
  try {
    const kits = await query('SELECT * FROM kits ORDER BY id LIMIT 1');
    if (!kits.length) return res.json({ data: null });
    const items = await query(
      `SELECT ki.*, p.name, p.status,
        (SELECT COALESCE(SUM(stock_qty),0) FROM product_variants WHERE product_id = p.id AND is_active = 1) AS total_stock
       FROM kit_items ki JOIN products p ON p.id = ki.product_id WHERE ki.kit_id = ?`,
      [kits[0].id]
    );
    const warnings = items.filter((i) => Number(i.total_stock) <= 0).map((i) => `${i.name} has zero stock`);
    res.json({ data: { ...kits[0], items, warnings } });
  } catch (err) {
    next(err);
  }
});

router.put('/kit', validate(z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
    price: z.number(),
    is_active: z.boolean(),
    items: z.array(z.object({
      product_id: z.number(),
      quantity: z.number().int().min(1),
      requires_size_selection: z.boolean(),
      house_color_auto_match: z.boolean(),
    })),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
})), async (req, res, next) => {
  try {
    const d = req.validated.body;
    const kits = await query('SELECT id FROM kits ORDER BY id LIMIT 1');
    let kitId;
    if (!kits.length) {
      const result = await query(
        'INSERT INTO kits (name, description, image, price, is_active) VALUES (?, ?, ?, ?, ?)',
        [d.name, d.description || null, d.image || null, d.price, d.is_active ? 1 : 0]
      );
      kitId = result.insertId;
    } else {
      kitId = kits[0].id;
      await query(
        'UPDATE kits SET name=?, description=?, image=?, price=?, is_active=? WHERE id=?',
        [d.name, d.description || null, d.image || null, d.price, d.is_active ? 1 : 0, kitId]
      );
      await query('DELETE FROM kit_items WHERE kit_id = ?', [kitId]);
    }
    for (const item of d.items) {
      await query(
        `INSERT INTO kit_items (kit_id, product_id, quantity, requires_size_selection, house_color_auto_match)
         VALUES (?, ?, ?, ?, ?)`,
        [kitId, item.product_id, item.quantity, item.requires_size_selection ? 1 : 0, item.house_color_auto_match ? 1 : 0]
      );
    }
    res.json({ data: { id: kitId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
