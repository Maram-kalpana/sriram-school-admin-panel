const { applyPaidResult, applyFailed } = require('../src/controllers/paymentsController');

function makeTrx({ order, txn }) {
  const state = {
    order: { ...order },
    txn: txn ? { ...txn } : null,
  };

  const chain = {
    where() {
      return chain;
    },
    orWhere() {
      return chain;
    },
    first: async () => state.txn,
    update: async (patch) => {
      if (state.txn && patch.status) Object.assign(state.txn, patch);
      Object.assign(state.order, patch);
    },
    insert: async () => {},
    forUpdate() {
      return chain;
    },
  };

  const trx = (table) => {
    if (table === 'payment_transactions') {
      return {
        where() {
          return {
            first: async () => state.txn,
            update: async (patch) => {
              state.txn = { ...state.txn, ...patch };
            },
          };
        },
        insert: async (row) => {
          state.txn = { id: 1, ...row };
        },
      };
    }
    if (table === 'orders') {
      return {
        where() {
          return {
            update: async (patch) => {
              Object.assign(state.order, patch);
            },
          };
        },
      };
    }
    if (table === 'order_items') {
      return { where: async () => [] };
    }
    if (table === 'order_status_history') {
      return { insert: async () => {} };
    }
    return chain;
  };
  trx.fn = { now: () => new Date() };
  trx._state = state;
  return trx;
}

describe('Paytm callback idempotency', () => {
  test('second success for the same txn is a no-op', async () => {
    const order = {
      id: 9,
      total: 100,
      status: 'placed',
      payment_status: 'pending',
      stock_state: 'reserved',
      invoice_number: 'INV/2026-27/000001',
      packing_slip_number: 'PS/2026-27/000001',
    };
    const trx = makeTrx({
      order,
      txn: { id: 1, paytm_order_id: 'PO1', txn_id: 'TXN1', status: 'success' },
    });
    const first = await applyPaidResult(
      trx,
      order,
      { body: { txnId: 'TXN1', resultInfo: { resultStatus: 'TXN_SUCCESS' } } },
      'PO1'
    );
    expect(first.idempotent).toBe(true);
    expect(trx._state.order.payment_status).toBe('pending');
  });

  test('applyFailed does not overwrite a paid order', async () => {
    const order = {
      id: 9,
      payment_status: 'paid',
      stock_state: 'finalized',
    };
    const trx = makeTrx({ order, txn: { id: 1, status: 'success' } });
    await applyFailed(trx, order, 'PO1', 'late failure');
    expect(trx._state.order.payment_status).toBe('paid');
  });
});
