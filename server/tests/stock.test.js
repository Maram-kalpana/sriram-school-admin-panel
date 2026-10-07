const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyStockChange } = require('../src/services/stock');

function mockConn(startQty) {
  let qty = startQty;
  const movements = [];
  return {
    movements,
    async query(sql, params) {
      if (sql.includes('SELECT id, stock_qty')) {
        if (startQty === null) return [[]];
        return [[{ id: 1, stock_qty: qty }]];
      }
      if (sql.includes('UPDATE product_variants')) {
        qty = params[0];
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('INSERT INTO stock_movements')) {
        movements.push(params);
        return [{ insertId: movements.length }];
      }
      throw new Error(`unexpected sql ${sql}`);
    },
  };
}

test('decrements stock and writes a movement', async () => {
  const conn = mockConn(10);
  const result = await applyStockChange(conn, {
    variantId: 1,
    changeQty: -3,
    reason: 'order',
    orderId: 9,
  });
  assert.equal(result.stock_qty, 7);
  assert.equal(conn.movements.length, 1);
  assert.equal(conn.movements[0][1], -3);
});

test('fails when stock would go negative', async () => {
  const conn = mockConn(1);
  await assert.rejects(
    () => applyStockChange(conn, { variantId: 1, changeQty: -2, reason: 'order' }),
    (err) => err.code === 'OUT_OF_STOCK'
  );
});
