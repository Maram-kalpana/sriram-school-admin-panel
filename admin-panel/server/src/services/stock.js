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

function availableQty(variant) {
  return Number(variant.stock_qty || 0) - Number(variant.reserved_qty || 0);
}

async function reserveStock(trx, { variantId, quantity, orderId = null, note = null }) {
  const variant = await trx('product_variants').where({ id: variantId }).forUpdate().first();
  if (!variant) throw new AppError('Variant not found', 404);
  if (availableQty(variant) < quantity) {
    throw new AppError(`Insufficient stock for SKU ${variant.sku}`, 400);
  }
  await trx('product_variants').where({ id: variantId }).update({
    reserved_qty: Number(variant.reserved_qty || 0) + quantity,
    updated_at: trx.fn.now(),
  });
  await trx('stock_movements').insert({
    variant_id: variantId,
    change_qty: 0,
    reason: 'order',
    order_id: orderId,
    note: note || `Reserved ${quantity}`,
  });
  return variant;
}

async function releaseReserved(trx, { variantId, quantity, orderId = null, note = null }) {
  const variant = await trx('product_variants').where({ id: variantId }).forUpdate().first();
  if (!variant) throw new AppError('Variant not found', 404);
  const nextReserved = Math.max(0, Number(variant.reserved_qty || 0) - quantity);
  await trx('product_variants').where({ id: variantId }).update({
    reserved_qty: nextReserved,
    updated_at: trx.fn.now(),
  });
  await trx('stock_movements').insert({
    variant_id: variantId,
    change_qty: 0,
    reason: 'cancel',
    order_id: orderId,
    note: note || `Released reserve ${quantity}`,
  });
}

async function finalizeReserved(trx, { variantId, quantity, orderId = null, adminUserId = null, note = null }) {
  const variant = await trx('product_variants').where({ id: variantId }).forUpdate().first();
  if (!variant) throw new AppError('Variant not found', 404);
  const nextQty = variant.stock_qty - quantity;
  if (nextQty < 0) throw new AppError(`Insufficient stock for SKU ${variant.sku}`, 400);
  const nextReserved = Math.max(0, Number(variant.reserved_qty || 0) - quantity);
  await trx('product_variants').where({ id: variantId }).update({
    stock_qty: nextQty,
    reserved_qty: nextReserved,
    updated_at: trx.fn.now(),
  });
  await trx('stock_movements').insert({
    variant_id: variantId,
    change_qty: -quantity,
    reason: 'order',
    order_id: orderId,
    admin_user_id: adminUserId,
    note: note || 'Finalized reserved stock',
  });
}

/**
 * Restock (or release reservation) when an order is cancelled or returned.
 * Must run inside a DB transaction.
 */
async function restockOrderItems(trx, { order, items, reason, adminUserId = null, note = null }) {
  if (order.stock_state === 'reserved') {
    for (const item of items) {
      await releaseReserved(trx, {
        variantId: item.variant_id,
        quantity: item.quantity,
        orderId: order.id,
        note: note || `Order ${reason}`,
      });
    }
    return 'released';
  }
  if (order.stock_state === 'released') return 'released';
  for (const item of items) {
    await changeStock(trx, {
      variantId: item.variant_id,
      changeQty: item.quantity,
      reason,
      orderId: order.id,
      adminUserId,
      note: note || `Order ${reason}`,
    });
  }
  return order.stock_state;
}

module.exports = {
  changeStock,
  setStockAbsolute,
  availableQty,
  reserveStock,
  releaseReserved,
  finalizeReserved,
  restockOrderItems,
};
