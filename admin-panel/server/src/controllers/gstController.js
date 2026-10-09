const { z } = require('zod');
const XLSX = require('xlsx');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const settingsService = require('../services/settingsService');
const mailer = require('../services/mailer');
const { invoicesPdf, packingSlipsPdf } = require('../services/gstPdf');

dayjs.extend(utc);
dayjs.extend(timezone);

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function rangeFromQuery(q) {
  const tz = 'Asia/Kolkata';
  const now = dayjs().tz(tz);
  let from;
  let to;
  switch (q.range) {
    case 'today':
      from = now.startOf('day');
      to = now.endOf('day');
      break;
    case 'yesterday':
      from = now.subtract(1, 'day').startOf('day');
      to = now.subtract(1, 'day').endOf('day');
      break;
    case 'select':
    case 'custom':
      from = q.from ? dayjs.tz(q.from, tz).startOf('day') : now.startOf('month');
      to = q.to ? dayjs.tz(q.to, tz).endOf('day') : now.endOf('day');
      break;
    case 'last7':
      from = now.subtract(6, 'day').startOf('day');
      to = now.endOf('day');
      break;
    case 'last30':
      from = now.subtract(29, 'day').startOf('day');
      to = now.endOf('day');
      break;
    case 'this_month':
      from = now.startOf('month');
      to = now.endOf('month');
      break;
    default:
      from = now.startOf('month');
      to = now.endOf('day');
  }
  return { from: from.format('YYYY-MM-DD HH:mm:ss'), to: to.format('YYYY-MM-DD HH:mm:ss') };
}

function applyOrderFilters(query, q, { from, to }) {
  query.whereBetween('o.created_at', [from, to]);
  if (q.studentIds && q.studentIds.length) {
    query.whereIn('o.student_id', q.studentIds);
  }
  return query;
}

async function getProfileRow() {
  let row = await db('gst_profile').orderBy('id').first();
  if (!row) {
    const [id] = await db('gst_profile').insert({
      legal_name: 'Scholar Store',
      city: 'Hyderabad',
      state: 'Telangana',
      state_code: '36',
    });
    row = await db('gst_profile').where({ id }).first();
  }
  return row;
}

async function documents(req, res, next) {
  try {
    const schema = z.object({
      range: z.string().optional().default('this_month'),
      from: z.string().optional(),
      to: z.string().optional(),
      studentIds: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    });
    const q = schema.parse(req.query);
    q.studentIds = q.studentIds
      ? q.studentIds.split(',').map((n) => Number(n)).filter(Boolean)
      : [];
    const bounds = rangeFromQuery(q);
    let query = db('orders as o')
      .join('students as s', 's.id', 'o.student_id')
      .select('o.*', 's.student_name', 's.admission_number');
    applyOrderFilters(query, q, bounds);
    const countRow = await query.clone().clearSelect().count({ total: '*' }).first();
    const total = Number(countRow.total);
    const rows = await query
      .orderBy('o.created_at', 'desc')
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);

    const statsQuery = db('orders as o').whereBetween('o.created_at', [bounds.from, bounds.to]);
    if (q.studentIds.length) statsQuery.whereIn('o.student_id', q.studentIds);
    const stats = await statsQuery
      .select(
        db.raw('COALESCE(SUM(total),0) as sales'),
        db.raw("COALESCE(SUM(CASE WHEN payment_status IN ('paid','partially_refunded') THEN total ELSE 0 END),0) as collected"),
        db.raw("COALESCE(SUM(CASE WHEN payment_status IN ('refunded','partially_refunded') THEN tax ELSE 0 END),0) as refunded"),
        db.raw('COALESCE(SUM(taxable_total),0) as taxable'),
        db.raw('COALESCE(SUM(cgst_total + sgst_total + igst_total),0) as gst')
      )
      .first();

    res.json({
      success: true,
      data: {
        items: rows,
        pagination: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) || 1 },
        stats: {
          totalSales: Number(stats.sales),
          collected: Number(stats.collected),
          refunded: Number(stats.refunded),
          taxableSubtotal: Number(stats.taxable),
          totalGst: Number(stats.gst),
          netSales: Number(stats.sales) - Number(stats.refunded),
        },
      },
    });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function summary(req, res, next) {
  try {
    const data = await summaryData();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const type = req.query.type === 'packing-slip' ? 'packing-slip' : 'invoice';
    const ids = String(req.query.orderIds || '')
      .split(',')
      .map((n) => Number(n))
      .filter(Boolean);
    if (!ids.length) throw new AppError('orderIds required', 400);
    const profile = await getProfileRow();
    const docs = [];
    for (const id of ids) {
      const order = await db('orders as o')
        .join('students as s', 's.id', 'o.student_id')
        .select('o.*', 's.student_name', 's.admission_number', 's.house_color')
        .where('o.id', id)
        .first();
      if (!order) continue;
      const items = await db('order_items').where({ order_id: id });
      const student = {
        student_name: order.student_name,
        admission_number: order.admission_number,
        house_color: order.house_color,
      };
      docs.push({ profile, order, items, student });
    }
    if (!docs.length) throw new AppError('No matching orders', 404);
    const out = type === 'invoice' ? await invoicesPdf(docs) : await packingSlipsPdf(docs);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${type}-${ids.join('-')}.pdf"`
    );
    res.send(out);
  } catch (err) {
    next(err);
  }
}

async function exportXlsx(req, res, next) {
  try {
    const rows = await db('order_items as oi')
      .join('orders as o', 'o.id', 'oi.order_id')
      .join('students as s', 's.id', 'o.student_id')
      .select(
        'o.invoice_number',
        'o.order_number',
        'o.created_at',
        's.admission_number',
        's.student_name',
        'oi.hsn_code',
        'oi.name_snapshot',
        'oi.quantity',
        'oi.gst_rate',
        'oi.taxable_value',
        'oi.cgst',
        'oi.sgst',
        'oi.igst',
        'oi.line_total'
      );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GST');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="gst-export.xlsx"');
    res.send(buf);
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const profile = await getProfileRow();
    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err);
  }
}

async function putProfile(req, res, next) {
  try {
    const schema = z.object({
      legal_name: z.string().min(1),
      gstin: z.string().regex(GSTIN_RE).or(z.literal('')).optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      state_code: z.string().max(2).optional(),
      pincode: z.string().optional(),
      email: z.string().email().or(z.literal('')).optional(),
      phone: z.string().optional(),
      logo: z.string().nullable().optional(),
    });
    const body = schema.parse(req.body);
    const existing = await getProfileRow();
    await db('gst_profile').where({ id: existing.id }).update({ ...body, updated_at: db.fn.now() });
    const profile = await db('gst_profile').where({ id: existing.id }).first();
    res.json({ success: true, data: { profile } });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function getEmailSchedule(req, res, next) {
  try {
    const s = await settingsService.getPublicSettings();
    res.json({
      success: true,
      data: {
        email: s.gst_email_to || s.contact_email || '',
        time: s.gst_email_time || '08:00',
        reportDay: s.gst_email_report_day || 'yesterday',
        timezone: s.gst_email_timezone || 'Asia/Kolkata',
        smtpConfigured: Boolean(s.smtp_host),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function putEmailSchedule(req, res, next) {
  try {
    const schema = z.object({
      gst_email_to: z.string().email().or(z.literal('')),
      gst_email_time: z.string(),
      gst_email_report_day: z.string(),
      gst_email_timezone: z.string().optional().default('Asia/Kolkata'),
    });
    const body = schema.parse(req.body);
    await settingsService.updateSettings(body);
    res.json({ success: true, message: 'Schedule saved' });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function sendTestEmail(req, res, next) {
  try {
    const s = await settingsService.getSettings();
    const to = req.body?.to || s.gst_email_to || s.contact_email || s.smtp_from_email;
    if (!to) throw new AppError('No recipient', 400);
    await mailer.sendMail({
      to,
      subject: 'Scholar Store — GST daily report (test)',
      text: 'This is a test of the GST daily email report.',
    });
    res.json({ success: true, message: `Sent to ${to}` });
  } catch (err) {
    next(err);
  }
}

async function taxMapping(req, res, next) {
  try {
    const missing = req.query.missing === 'true';
    let query = db('products as p').leftJoin('categories as c', 'c.id', 'p.category_id').select('p.*', 'c.name as category_name');
    if (missing) {
      query = query.andWhere((b) => b.whereNull('p.hsn_code').orWhere('p.hsn_code', '').orWhere('p.gst_rate', 0));
    }
    const rows = await query.orderBy('p.name');
    res.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          name: r.name,
          hsnCode: r.hsn_code,
          gstRate: Number(r.gst_rate || r.tax_percent || 0),
          categoryName: r.category_name,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function bulkTax(req, res, next) {
  try {
    const schema = z.object({
      ids: z.array(z.coerce.number().int().positive()).min(1),
      hsnCode: z.string().optional(),
      gstRate: z.coerce.number().optional(),
    });
    const body = schema.parse(req.body);
    const patch = { updated_at: db.fn.now() };
    if (body.hsnCode !== undefined) patch.hsn_code = body.hsnCode;
    if (body.gstRate !== undefined) {
      patch.gst_rate = body.gstRate;
      patch.tax_percent = body.gstRate;
    }
    await db('products').whereIn('id', body.ids).update(patch);
    res.json({ success: true, message: `Updated ${body.ids.length} products` });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function patchProductTax(req, res, next) {
  try {
    const schema = z.object({
      hsnCode: z.string().nullable().optional(),
      gstRate: z.coerce.number().optional(),
    });
    const body = schema.parse(req.body);
    const patch = { updated_at: db.fn.now() };
    if (body.hsnCode !== undefined) patch.hsn_code = body.hsnCode;
    if (body.gstRate !== undefined) {
      patch.gst_rate = body.gstRate;
      patch.tax_percent = body.gstRate;
    }
    await db('products').where({ id: req.params.id }).update(patch);
    res.json({ success: true });
  } catch (err) {
    next(err.name === 'ZodError' ? new AppError('Validation failed', 400, err.issues) : err);
  }
}

async function rateWise(req, res, next) {
  try {
    const data = await summaryData();
    res.json({ success: true, data: { items: data.rateWise } });
  } catch (err) {
    next(err);
  }
}

async function hsnWise(req, res, next) {
  try {
    const data = await summaryData();
    res.json({ success: true, data: { items: data.hsnWise } });
  } catch (err) {
    next(err);
  }
}

async function summaryData() {
  const monthRows = await db('orders')
    .whereNotIn('status', ['cancelled'])
    .select(
      db.raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
      db.raw('COALESCE(SUM(taxable_total),0) as taxable'),
      db.raw('COALESCE(SUM(cgst_total + sgst_total + igst_total),0) as gst'),
      db.raw('COALESCE(SUM(total),0) as sales')
    )
    .groupByRaw('DATE_FORMAT(created_at, "%Y-%m")')
    .orderBy('month', 'asc');

  const rateWiseRows = await db('order_items as oi')
    .join('orders as o', 'o.id', 'oi.order_id')
    .whereNotIn('o.status', ['cancelled'])
    .select('oi.gst_rate')
    .sum({ taxable: 'oi.taxable_value' })
    .sum({ cgst: 'oi.cgst' })
    .sum({ sgst: 'oi.sgst' })
    .sum({ igst: 'oi.igst' })
    .groupBy('oi.gst_rate');

  const hsnWiseRows = await db('order_items as oi')
    .join('orders as o', 'o.id', 'oi.order_id')
    .whereNotIn('o.status', ['cancelled'])
    .select('oi.hsn_code')
    .sum({ taxable: 'oi.taxable_value' })
    .sum({ qty: 'oi.quantity' })
    .sum({ cgst: 'oi.cgst' })
    .sum({ sgst: 'oi.sgst' })
    .sum({ igst: 'oi.igst' })
    .groupBy('oi.hsn_code');

  return { monthly: monthRows, rateWise: rateWiseRows, hsnWise: hsnWiseRows };
}

module.exports = {
  documents,
  summary,
  rateWise,
  hsnWise,
  download,
  exportXlsx,
  getProfile,
  putProfile,
  getEmailSchedule,
  putEmailSchedule,
  sendTestEmail,
  taxMapping,
  bulkTax,
  patchProductTax,
  rangeFromQuery,
  getProfileRow,
};
