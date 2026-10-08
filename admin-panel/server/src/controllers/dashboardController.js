const db = require('../config/db');

async function getDashboard(req, res, next) {
  try {
    const [
      studentsTotal,
      studentsLoggedIn,
      kitOrders,
      individualOrders,
      revenue,
      pendingOrders,
      lowStock,
      outStock,
    ] = await Promise.all([
      db('students').count({ c: '*' }).first(),
      db('students').whereNotNull('first_login_at').count({ c: '*' }).first(),
      db('orders').where({ type: 'kit' }).whereNotIn('status', ['cancelled']).count({ c: '*' }).first(),
      db('orders').where({ type: 'individual' }).whereNotIn('status', ['cancelled']).count({ c: '*' }).first(),
      db('orders')
        .whereNotIn('status', ['cancelled', 'returned'])
        .where({ payment_status: 'paid' })
        .sum({ total: 'total' })
        .first(),
      db('orders').where({ status: 'placed' }).count({ c: '*' }).first(),
      db('product_variants')
        .where('stock_qty', '>', 0)
        .whereRaw('stock_qty <= low_stock_threshold')
        .count({ c: '*' })
        .first(),
      db('product_variants').where({ stock_qty: 0 }).count({ c: '*' }).first(),
    ]);

    const ordersPerDay = await db('orders')
      .where('created_at', '>=', db.raw('DATE_SUB(CURDATE(), INTERVAL 30 DAY)'))
      .select(db.raw('DATE(created_at) as day'), db.raw('COUNT(*) as count'))
      .groupByRaw('DATE(created_at)')
      .orderBy('day', 'asc');

    const recentOrders = await db('orders as o')
      .join('students as s', 's.id', 'o.student_id')
      .select(
        'o.id',
        'o.order_number',
        'o.type',
        'o.status',
        'o.total',
        'o.created_at',
        's.admission_number',
        's.student_name'
      )
      .orderBy('o.created_at', 'desc')
      .limit(10);

    const lowStockList = await db('product_variants as v')
      .join('products as p', 'p.id', 'v.product_id')
      .whereRaw('v.stock_qty <= v.low_stock_threshold')
      .select('v.sku', 'p.name as product_name', 'v.stock_qty', 'v.low_stock_threshold')
      .orderBy('v.stock_qty', 'asc')
      .limit(20);

    res.json({
      success: true,
      data: {
        cards: {
          totalStudents: Number(studentsTotal.c),
          studentsLoggedIn: Number(studentsLoggedIn.c),
          kitOrders: Number(kitOrders.c),
          individualOrders: Number(individualOrders.c),
          totalRevenue: Number(revenue.total || 0),
          pendingOrders: Number(pendingOrders.c),
          lowStockVariants: Number(lowStock.c),
          outOfStockVariants: Number(outStock.c),
        },
        ordersPerDay: ordersPerDay.map((r) => ({
          day: r.day,
          count: Number(r.count),
        })),
        recentOrders,
        lowStockList,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
