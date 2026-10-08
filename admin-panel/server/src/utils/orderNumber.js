const dayjs = require('dayjs');

async function nextOrderNumber(trx, prefix = 'SS') {
  const year = dayjs().format('YYYY');
  const like = `${prefix}-${year}-%`;
  const last = await trx('orders')
    .where('order_number', 'like', like)
    .orderBy('id', 'desc')
    .first();
  let seq = 1;
  if (last) {
    const parts = last.order_number.split('-');
    const n = Number(parts[parts.length - 1]);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
}

module.exports = { nextOrderNumber };
