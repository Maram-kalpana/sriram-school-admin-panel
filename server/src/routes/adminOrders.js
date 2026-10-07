const express = require('express');
const { z } = require('zod');
const { query, withTransaction } = require('../db');
const { validate } = require('../middleware/validate');
const { fail } = require('../errors');
const { applyStockChange } = require('../services/stock');

const router = express.Router();

const STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];

router.get('/', async (req, res, next) => {
  try {
    const { q, status, type, house_color, from, to, page = '1', pageSize = '20' } = req.query;
    const limit = Math.min(100, Number(pageSize) || 20);
    const offset = (Math.max(1, Number(page) || 1) - 1) * limit;
    const where = ['1=1'];
    const params = [];
    if (q) {
      where.push('(o.order_number LIKE ? OR s.admission_number LIKE ? OR s.student_name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) { where.push('o.status = ?'); params.push(status); }
    if (type) { where.push('o.type = ?'); params.push(type); }
    if (house_color) { where.push('s.house_color = ?'); params.push(house_color); }
    if (from) { where.push('o.created_at >= ?'); params.push(from); }
    if (to) { where.push('o.created_at <= ?'); params.push(`${to} 23:59:59`); }
    const clause = where.join(' AND ');
    const totalRows = await query(
      `SELECT COUNT(*) AS c FROM orders o JOIN students s ON s.id = o.student_id WHERE ${clause}`,
      params
    );
    const rows = await query(
      `SELECT o.*, s.admission_number, s.student_name, s.house_color,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
       FROM orders o JOIN students s ON s.id = o.student_id
       WHERE ${clause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ data: rows, meta: { total: totalRows[0].c, page: Number(page) || 1, pageSize: limit } });
  } catch (err) {
    next(err);
  }
});

router.get('/export.csv', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT o.order_number, s.admission_number, s.student_name, o.type, o.status, o.payment_status, o.total, o.created_at
       FROM orders o JOIN students s ON s.id = o.student_id ORDER BY o.id DESC`
    );
    const lines = ['order_number,admission_number,student,type,status,payment,total,date'];
    rows.forEach((r) => {
      lines.push([r.order_number, r.admission_number, r.student_name, r.type, r.status, r.payment_status, r.total, r.created_at].join(','));
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
});

router.post('/pick-list', validate(z.object({
  body: z.object({ ids: z.array(z.number()).min(1) }),
  query: z.any().optional(),
  params: z.any().optional(),
})), async (req, res, next) => {
  try {
    const ids = req.validated.body.ids;
    const rows = await query(
      `SELECT oi.sku_snapshot, oi.name_snapshot, oi.size_snapshot, oi.color_snapshot, SUM(oi.quantity) AS qty
       FROM order_items oi WHERE oi.order_id IN (${ids.map(() => '?').join(',')})
       GROUP BY oi.sku_snapshot, oi.name_snapshot, oi.size_snapshot, oi.color_snapshot
       ORDER BY oi.sku_snapshot`,
      ids
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT o.*, s.admission_number, s.student_name, s.house_color, s.phone
       FROM orders o JOIN students s ON s.id = o.student_id WHERE o.id = ?`,
      [req.params.id]
    );
    if (!rows.length) throw fail('Order not found', { status: 404, code: 'NOT_FOUND' });
    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    const history = await query('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id', [req.params.id]);
    const order = rows[0];
    if (typeof order.shipping_address_snapshot === 'string') {
      try { order.shipping_address_snapshot = JSON.parse(order.shipping_address_snapshot); } catch { /* keep */ }
    }
    res.json({ data: { ...order, items, history } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/status', validate(z.object({
  body: z.object({
    status: z.enum(STATUSES),
    note: z.string().optional(),
  }),
  query: z.any().optional(),
  params: z.object({ id: z.string() }),
})), async (req, res, next) => {
  try {
    const { status, note } = req.validated.body;
    await withTransaction(async (conn) => {
      const [orders] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
      if (!orders.length) throw fail('Order not found', { status: 404, code: 'NOT_FOUND' });
      const order = orders[0];
      if (order.status === status) return;
      if (['cancelled', 'returned'].includes(order.status) && ['cancelled', 'returned'].includes(status)) {
        throw fail('Order already closed');
      }
      if ((status === 'cancelled' || status === 'returned') && !['cancelled', 'returned'].includes(order.status)) {
        const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
        for (const item of items) {
          await applyStockChange(conn, {
            variantId: item.variant_id,
            changeQty: item.quantity,
            reason: status === 'cancelled' ? 'cancel' : 'return',
            orderId: order.id,
            adminUserId: req.admin.id,
            note: note || status,
          });
        }
      }
      await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, order.id]);
      await conn.query(
        'INSERT INTO order_status_history (order_id, status, changed_by, note) VALUES (?, ?, ?, ?)',
        [order.id, status, req.admin.email, note || null]
      );
    });
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
