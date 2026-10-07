async function nextOrderNumber(conn) {
  const year = new Date().getFullYear();
  const prefix = `SS-${year}-`;
  const [rows] = await conn.query(
    `SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let seq = 1;
  if (rows.length) {
    const last = rows[0].order_number.split('-').pop();
    seq = Number(last) + 1;
  }
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

module.exports = { nextOrderNumber };
