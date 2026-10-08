const { changeStock } = require('../src/services/stock');
const AppError = require('../src/utils/AppError');

function makeTrx(initialQty) {
  let qty = initialQty;
  const movements = [];
  const trx = (table) => {
    if (table === 'product_variants') {
      return {
        where() {
          return {
            forUpdate() {
              return {
                first: async () => ({ id: 1, sku: 'TEST', stock_qty: qty }),
              };
            },
            update: async (patch) => {
              qty = patch.stock_qty;
            },
          };
        },
      };
    }
    if (table === 'stock_movements') {
      return {
        insert: async (row) => {
          movements.push(row);
        },
      };
    }
    return {};
  };
  trx.fn = { now: () => new Date() };
  trx._getQty = () => qty;
  trx._movements = movements;
  return trx;
}

describe('stock changeStock', () => {
  test('decrements and records movement', async () => {
    const trx = makeTrx(10);
    await changeStock(trx, {
      variantId: 1,
      changeQty: -3,
      reason: 'order',
      note: 'test',
    });
    expect(trx._getQty()).toBe(7);
    expect(trx._movements[0].change_qty).toBe(-3);
  });

  test('prevents negative stock', async () => {
    const trx = makeTrx(2);
    await expect(
      changeStock(trx, { variantId: 1, changeQty: -5, reason: 'order' })
    ).rejects.toBeInstanceOf(AppError);
  });

  test('restock increases qty', async () => {
    const trx = makeTrx(2);
    await changeStock(trx, { variantId: 1, changeQty: 5, reason: 'restock', note: 'box' });
    expect(trx._getQty()).toBe(7);
  });
});
