const { changeStock, restockOrderItems } = require('../src/services/stock');
const AppError = require('../src/utils/AppError');

function makeTrx(initialQty, reserved = 0) {
  let qty = initialQty;
  let reservedQty = reserved;
  const movements = [];
  const trx = (table) => {
    if (table === 'product_variants') {
      return {
        where() {
          return {
            forUpdate() {
              return {
                first: async () => ({
                  id: 1,
                  sku: 'TEST',
                  stock_qty: qty,
                  reserved_qty: reservedQty,
                }),
              };
            },
            update: async (patch) => {
              if (patch.stock_qty != null) qty = patch.stock_qty;
              if (patch.reserved_qty != null) reservedQty = patch.reserved_qty;
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
  trx._getReserved = () => reservedQty;
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

describe('restock-on-cancel transaction', () => {
  test('finalized order restocks quantity', async () => {
    const trx = makeTrx(4, 0);
    await restockOrderItems(trx, {
      order: { id: 1, stock_state: 'finalized' },
      items: [{ variant_id: 1, quantity: 2 }],
      reason: 'cancel',
    });
    expect(trx._getQty()).toBe(6);
    expect(trx._movements[0].reason).toBe('cancel');
  });

  test('reserved order releases reservation without adding stock', async () => {
    const trx = makeTrx(10, 3);
    await restockOrderItems(trx, {
      order: { id: 1, stock_state: 'reserved' },
      items: [{ variant_id: 1, quantity: 3 }],
      reason: 'cancel',
    });
    expect(trx._getQty()).toBe(10);
    expect(trx._getReserved()).toBe(0);
  });
});
