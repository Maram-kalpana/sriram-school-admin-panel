const AppError = require('../utils/AppError');

/**
 * Adjust stock inside an existing Knex transaction with row lock.
 * Never allows negative stock.
 */
async function changeStock(trx, { variantId, changeQty, reason, orderId = null, adminUserId = null, note = null }) {
  const variant = await trx('product_variants').where({ id: variantId }).forUpdate().first();
  if (!variant) throw new AppError('Variant not found', 404);

  const next = variant.stock_qty + changeQty;
  if (next < 0) {
    throw new AppError(`Insufficient stock for SKU ${variant.sku}`, 400);
  }

  await trx('product_variants').where({ id: variantId }).update({
    stock_qty: next,
    updated_at: trx.fn.now(),
  });

  await trx('stock_movements').insert({
    variant_id: variantId,
    change_qty: changeQty,
    reason,
    order_id: orderId,
    admin_user_id: adminUserId,
    note,
  });

  return { ...variant, stock_qty: next };
}

async function setStockAbsolute(trx, { variantId, newQty, reason, adminUserId = null, note = null }) {
  const variant = await trx('product_variants').where({ id: variantId }).forUpdate().first();
  if (!variant) throw new AppError('Variant not found', 404);
  if (newQty < 0) throw new AppError('Stock cannot be negative', 400);
  const changeQty = newQty - variant.stock_qty;
  if (changeQty === 0) return variant;

  await trx('product_variants').where({ id: variantId }).update({
    stock_qty: newQty,
    updated_at: trx.fn.now(),
  });
  await trx('stock_movements').insert({
    variant_id: variantId,
    change_qty: changeQty,
    reason,
    admin_user_id: adminUserId,
    note,
  });
  return { ...variant, stock_qty: newQty };
}

module.exports = {
  changeStock,
  setStockAbsolute,
};
