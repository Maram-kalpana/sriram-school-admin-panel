const { fail } = require('../errors');

async function applyStockChange(conn, {
  variantId,
  changeQty,
  reason,
  orderId = null,
  adminUserId = null,
  note = null,
  allowNegative = false,
}) {
  const [rows] = await conn.query(
    'SELECT id, stock_qty FROM product_variants WHERE id = ? FOR UPDATE',
    [variantId]
  );
  if (!rows.length) throw fail('Variant not found', { status: 404, code: 'NOT_FOUND' });
  const next = rows[0].stock_qty + changeQty;
  if (!allowNegative && next < 0) {
    throw fail('Stock changed. One or more items are no longer available.', {
      status: 409,
      code: 'OUT_OF_STOCK',
    });
  }
  await conn.query('UPDATE product_variants SET stock_qty = ? WHERE id = ?', [next, variantId]);
  await conn.query(
    `INSERT INTO stock_movements (variant_id, change_qty, reason, reference_order_id, admin_user_id, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [variantId, changeQty, reason, orderId, adminUserId, note]
  );
  return { variantId, stock_qty: next };
}

module.exports = { applyStockChange };
