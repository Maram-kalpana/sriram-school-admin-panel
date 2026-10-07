const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const { query, getPool } = require('../db');
const { validate } = require('../middleware/validate');
const { fail } = require('../errors');
const { parseStudentWorkbook: parseWb, buildTemplateBuffer: tpl } = require('../services/excelStudents');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const previews = new Map();

const listSchema = z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({
    q: z.string().optional(),
    house_color: z.string().optional(),
    kit_status: z.enum(['pending', 'ordered']).optional(),
    is_active: z.string().optional(),
    page: z.string().optional(),
    pageSize: z.string().optional(),
  }),
});

router.get('/', validate(listSchema), async (req, res, next) => {
  try {
    const { q, house_color, kit_status, is_active, page = '1', pageSize = '20' } = req.validated.query;
    const limit = Math.min(100, Number(pageSize) || 20);
    const offset = (Math.max(1, Number(page) || 1) - 1) * limit;
    const where = [];
    const params = [];
    if (q) {
      where.push('(admission_number LIKE ? OR student_name LIKE ? OR parent_name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (house_color) {
      where.push('house_color = ?');
      params.push(house_color);
    }
    if (kit_status) {
      where.push('kit_status = ?');
      params.push(kit_status);
    }
    if (is_active === 'true' || is_active === 'false') {
      where.push('is_active = ?');
      params.push(is_active === 'true' ? 1 : 0);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const totalRows = await query(`SELECT COUNT(*) AS c FROM students ${clause}`, params);
    const rows = await query(
      `SELECT * FROM students ${clause} ORDER BY admission_number LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ data: rows, meta: { total: totalRows[0].c, page: Number(page) || 1, pageSize: limit } });
  } catch (err) {
    next(err);
  }
});

router.get('/export.csv', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM students ORDER BY admission_number');
    const headers = [
      'AdmissionNumber', 'StudentName', 'ParentName', 'Address1', 'Address2', 'City', 'State',
      'Zipcode', 'House Color', 'Phone', 'KitStatus', 'Active',
    ];
    const lines = [headers.join(',')];
    rows.forEach((s) => {
      const cells = [
        s.admission_number, s.student_name, s.parent_name, s.address1, s.address2, s.city, s.state,
        s.zipcode, s.house_color, s.phone || '', s.kit_status, s.is_active ? '1' : '0',
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      lines.push(cells.join(','));
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
    res.send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
});

router.get('/template.xlsx', (req, res) => {
  const buf = tpl();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=students-template.xlsx');
  res.send(buf);
});

router.post('/import/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw fail('Upload an .xlsx, .xls or .csv file');
    const { rows, errors } = parseWb(req.file.buffer);
    const admissions = rows.filter((r) => r.data.admission_number).map((r) => r.data.admission_number);
    let existing = [];
    if (admissions.length) {
      existing = await query(
        `SELECT admission_number FROM students WHERE admission_number IN (${admissions.map(() => '?').join(',')})`,
        admissions
      );
    }
    const existingSet = new Set(existing.map((e) => e.admission_number));
    let willInsert = 0;
    let willUpdate = 0;
    rows.forEach((r) => {
      if (!r.valid) return;
      if (existingSet.has(r.data.admission_number)) willUpdate += 1;
      else willInsert += 1;
    });
    const previewId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    previews.set(previewId, { rows, expires: Date.now() + 15 * 60 * 1000 });
    res.json({
      data: {
        previewId,
        preview: rows.slice(0, 20),
        counts: {
          total: rows.length,
          new: willInsert,
          will_update: willUpdate,
          invalid: rows.filter((r) => !r.valid).length,
          duplicate_in_file: rows.filter((r) => r.errors.includes('duplicate admission number in file')).length,
        },
        errors,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/import/commit', validate(z.object({
  body: z.object({ previewId: z.string() }),
  query: z.any().optional(),
  params: z.any().optional(),
})), async (req, res, next) => {
  try {
    const rec = previews.get(req.validated.body.previewId);
    if (!rec || rec.expires < Date.now()) throw fail('Preview expired. Upload the file again.');
    const valid = rec.rows.filter((r) => r.valid);
    const pool = getPool();
    for (const row of valid) {
      const d = row.data;
      await pool.query(
        `INSERT INTO students (admission_number, student_name, parent_name, address1, address2, city, state, zipcode, house_color, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           student_name=VALUES(student_name), parent_name=VALUES(parent_name), address1=VALUES(address1),
           address2=VALUES(address2), city=VALUES(city), state=VALUES(state), zipcode=VALUES(zipcode),
           house_color=VALUES(house_color),
           phone=IF(VALUES(phone) IS NULL OR VALUES(phone) = '', phone, VALUES(phone))`,
        [d.admission_number, d.student_name, d.parent_name, d.address1, d.address2, d.city, d.state, d.zipcode, d.house_color, d.phone || null]
      );
    }
    previews.delete(req.validated.body.previewId);
    res.json({ data: { imported: valid.length } });
  } catch (err) {
    next(err);
  }
});

router.get('/import/errors.csv', validate(z.object({
  body: z.any().optional(),
  params: z.any().optional(),
  query: z.object({ previewId: z.string() }),
})), (req, res, next) => {
  try {
    const rec = previews.get(req.validated.query.previewId);
    if (!rec) throw fail('Preview not found');
    const lines = ['row,admission_number,errors'];
    rec.rows.filter((r) => !r.valid).forEach((r) => {
      lines.push(`${r.rowNumber},"${r.data.admission_number}","${r.errors.join('; ')}"`);
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=import-errors.csv');
    res.send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
});

const studentBody = z.object({
  admission_number: z.string().min(1),
  student_name: z.string().min(1),
  parent_name: z.string().optional().default(''),
  address1: z.string().optional().default(''),
  address2: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  zipcode: z.string().optional().default(''),
  house_color: z.string().optional().default(''),
  phone: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  kit_status: z.enum(['pending', 'ordered']).optional(),
  individual_override: z.enum(['default', 'force_show', 'force_hide']).optional(),
});

router.post('/', validate(z.object({ body: studentBody, query: z.any().optional(), params: z.any().optional() })), async (req, res, next) => {
  try {
    const d = req.validated.body;
    try {
      const result = await query(
        `INSERT INTO students (admission_number, student_name, parent_name, address1, address2, city, state, zipcode, house_color, phone, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.admission_number.trim(), d.student_name.trim(), d.parent_name, d.address1, d.address2, d.city, d.state, d.zipcode, d.house_color, d.phone || null, d.is_active === false ? 0 : 1]
      );
      const rows = await query('SELECT * FROM students WHERE id = ?', [result.insertId]);
      res.status(201).json({ data: rows[0] });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') throw fail('Admission number already exists');
      throw e;
    }
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!rows.length) throw fail('Student not found', { status: 404, code: 'NOT_FOUND' });
    const orders = await query(
      'SELECT id, order_number, type, status, payment_status, total, created_at FROM orders WHERE student_id = ? ORDER BY id DESC',
      [req.params.id]
    );
    res.json({ data: { ...rows[0], orders } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(z.object({
  body: studentBody.partial().extend({ phone: z.string().nullable().optional() }),
  query: z.any().optional(),
  params: z.object({ id: z.string() }),
})), async (req, res, next) => {
  try {
    const d = req.validated.body;
    const fields = [];
    const params = [];
    Object.entries(d).forEach(([k, v]) => {
      fields.push(`${k} = ?`);
      if (k === 'is_active') params.push(v ? 1 : 0);
      else if (typeof v === 'string') params.push(v.trim());
      else params.push(v);
    });
    if (!fields.length) throw fail('No changes');
    params.push(req.params.id);
    await query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, params);
    const rows = await query('SELECT * FROM students WHERE id = ?', [req.params.id]);
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

router.post('/bulk', validate(z.object({
  body: z.object({
    ids: z.array(z.number()),
    action: z.enum(['activate', 'deactivate']),
  }),
  query: z.any().optional(),
  params: z.any().optional(),
})), async (req, res, next) => {
  try {
    const { ids, action } = req.validated.body;
    if (!ids.length) throw fail('No students selected');
    await query(
      `UPDATE students SET is_active = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
      [action === 'activate' ? 1 : 0, ...ids]
    );
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
