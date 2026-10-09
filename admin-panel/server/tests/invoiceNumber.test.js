const { nextInvoiceNumber, assignInvoiceIfNeeded } = require('../src/utils/invoiceNumber');

function makeTrx(existing) {
  const updates = [];
  const trx = (table) => ({
    where(col, op, val) {
      if (typeof col === 'object') {
        return {
          update: async (patch) => {
            updates.push(patch);
          },
        };
      }
      return {
        orderBy() {
          return {
            forUpdate() {
              return {
                first: async () => (existing ? { invoice_number: existing } : null),
              };
            },
          };
        },
      };
    },
  });
  trx.fn = { now: () => new Date() };
  trx._updates = updates;
  return trx;
}

describe('invoice numbering', () => {
  test('starts at 000001 for the FY', async () => {
    const n = await nextInvoiceNumber(makeTrx(null), new Date('2026-10-09T10:00:00+05:30'));
    expect(n).toBe('INV/2026-27/000001');
  });

  test('increments last sequence', async () => {
    const n = await nextInvoiceNumber(makeTrx('INV/2026-27/000041'), new Date('2026-10-09T10:00:00+05:30'));
    expect(n).toBe('INV/2026-27/000042');
  });

  test('assignInvoiceIfNeeded is no-op when already set', async () => {
    const trx = makeTrx(null);
    const n = await assignInvoiceIfNeeded(trx, { id: 1, invoice_number: 'INV/2026-27/000009' });
    expect(n).toBe('INV/2026-27/000009');
    expect(trx._updates.length).toBe(0);
  });
});
