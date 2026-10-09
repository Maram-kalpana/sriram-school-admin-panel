const { financialYear } = require('./gst');

async function nextInvoiceNumber(trx, date = new Date()) {
  const fy = financialYear(date);
  const prefix = `INV/${fy}/`;
  const last = await trx('orders')
    .where('invoice_number', 'like', `${prefix}%`)
    .orderBy('invoice_number', 'desc')
    .forUpdate()
    .first();
  let seq = 1;
  if (last && last.invoice_number) {
    const n = Number(String(last.invoice_number).split('/').pop());
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

async function nextPackingSlipNumber(trx, date = new Date()) {
  const fy = financialYear(date);
  const prefix = `PS/${fy}/`;
  const last = await trx('orders')
    .where('packing_slip_number', 'like', `${prefix}%`)
    .orderBy('packing_slip_number', 'desc')
    .forUpdate()
    .first();
  let seq = 1;
  if (last && last.packing_slip_number) {
    const n = Number(String(last.packing_slip_number).split('/').pop());
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

async function assignInvoiceIfNeeded(trx, order) {
  if (order.invoice_number) return order.invoice_number;
  const invoiceNumber = await nextInvoiceNumber(trx);
  const packing = order.packing_slip_number || (await nextPackingSlipNumber(trx));
  await trx('orders').where({ id: order.id }).update({
    invoice_number: invoiceNumber,
    invoice_date: trx.fn.now(),
    packing_slip_number: packing,
    updated_at: trx.fn.now(),
  });
  return invoiceNumber;
}

module.exports = {
  nextInvoiceNumber,
  nextPackingSlipNumber,
  assignInvoiceIfNeeded,
};
