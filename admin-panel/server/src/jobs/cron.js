const cron = require('node-cron');
const db = require('../config/db');
const settingsService = require('../services/settingsService');
const mailer = require('../services/mailer');
const paymentsController = require('../controllers/paymentsController');

async function expirePendingPaytm() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const pending = await db('orders')
    .where({ payment_method: 'paytm', payment_status: 'pending' })
    .where('created_at', '<', cutoff);
  for (const order of pending) {
    await db.transaction(async (trx) => {
      const locked = await trx('orders').where({ id: order.id }).forUpdate().first();
      if (!locked || locked.payment_status !== 'pending') return;
      await paymentsController.applyFailed(trx, locked, locked.paytm_order_id, 'Expired unpaid (>30 min)');
    });
  }
}

async function sendGstDailyReport() {
  const s = await settingsService.getSettings();
  const to = s.gst_email_to || s.contact_email;
  if (!to || !s.smtp_host) return;
  const rows = await db('orders')
    .whereRaw('DATE(created_at) = DATE(DATE_SUB(CURDATE(), INTERVAL 1 DAY))')
    .select(
      db.raw('COUNT(*) as orders'),
      db.raw('COALESCE(SUM(total),0) as sales'),
      db.raw('COALESCE(SUM(cgst_total + sgst_total + igst_total),0) as gst')
    )
    .first();
  await mailer.sendMail({
    to,
    subject: `Scholar Store GST report — ${new Date().toISOString().slice(0, 10)}`,
    text: `Orders: ${rows.orders}\nSales: ₹${rows.sales}\nGST: ₹${rows.gst}`,
  });
}

function startJobs() {
  cron.schedule('*/10 * * * *', () => {
    expirePendingPaytm().catch((err) => console.error('Paytm expiry job:', err.message));
  });
  cron.schedule('0 * * * *', async () => {
    try {
      const s = await settingsService.getSettings();
      const time = s.gst_email_time || '08:00';
      const [hh, mm] = String(time).split(':');
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: s.gst_email_timezone || 'Asia/Kolkata' }));
      if (now.getHours() === Number(hh) && now.getMinutes() < 10) {
        await sendGstDailyReport();
      }
    } catch (err) {
      console.error('GST email job:', err.message);
    }
  });
}

module.exports = { startJobs, expirePendingPaytm, sendGstDailyReport };
