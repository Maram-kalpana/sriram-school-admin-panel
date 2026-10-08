const XLSX = require('xlsx');

const REQUIRED_HEADERS = [
  'AdmissionNumber',
  'StudentName',
  'ParentName',
  'Address1',
  'Address2',
  'City',
  'State',
  'Zipcode',
  'House Color',
];

const OPTIONAL_HEADERS = ['Phone'];

const HEADER_ALIASES = {
  admissionnumber: 'AdmissionNumber',
  studentname: 'StudentName',
  parentname: 'ParentName',
  address1: 'Address1',
  address2: 'Address2',
  city: 'City',
  state: 'State',
  zipcode: 'Zipcode',
  housecolor: 'House Color',
  'house color': 'House Color',
  phone: 'Phone',
};

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[\s_]+/g, '');
}

function cellToString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    // Keep as integer string when Excel stored admission/zip as number
    if (Number.isInteger(value)) return String(value);
    return String(value);
  }
  return String(value).trim();
}

function mapHeaders(rawHeaders) {
  const map = {};
  rawHeaders.forEach((h, idx) => {
    const key = normalizeHeader(h);
    // Also try with spaces preserved for "house color"
    const withSpaces = String(h ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const canonical =
      HEADER_ALIASES[key] ||
      HEADER_ALIASES[withSpaces] ||
      HEADER_ALIASES[withSpaces.replace(/\s/g, '')];
    if (canonical) {
      map[canonical] = idx;
    }
  });
  return map;
}

function parseWorkbookBuffer(buffer, originalName = 'upload.xlsx') {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: [{ row: 0, message: 'Workbook has no sheets' }] };
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  if (!matrix.length) {
    return { rows: [], errors: [{ row: 0, message: 'File is empty' }], fileName: originalName };
  }

  const headerMap = mapHeaders(matrix[0]);
  const missing = REQUIRED_HEADERS.filter((h) => headerMap[h] === undefined);
  if (missing.length) {
    return {
      rows: [],
      errors: [{ row: 1, message: `Missing required headers: ${missing.join(', ')}` }],
      fileName: originalName,
    };
  }

  const rows = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const line = matrix[i];
    if (!line || line.every((c) => cellToString(c) === '')) continue;

    const get = (name) => cellToString(line[headerMap[name]]);
    rows.push({
      rowNumber: i + 1,
      admissionNumber: get('AdmissionNumber'),
      studentName: get('StudentName'),
      parentName: get('ParentName'),
      address1: get('Address1'),
      address2: get('Address2'),
      city: get('City'),
      state: get('State'),
      zipcode: get('Zipcode'),
      houseColor: get('House Color'),
      phone: headerMap.Phone !== undefined ? get('Phone') || null : null,
    });
  }

  return { rows, errors: [], fileName: originalName };
}

function validateRows(parsedRows, existingByAdmission = new Map()) {
  const seenInFile = new Map();
  const rowErrors = [];
  let newCount = 0;
  let updateCount = 0;
  let invalidCount = 0;
  let duplicateInFile = 0;

  const validRows = [];

  parsedRows.forEach((row) => {
    const errors = [];
    if (!row.admissionNumber) errors.push('Missing admission number');
    if (!row.studentName) errors.push('Missing student name');
    if (!row.parentName) errors.push('Missing parent name');
    if (!row.address1) errors.push('Missing address1');
    if (!row.city) errors.push('Missing city');
    if (!row.state) errors.push('Missing state');
    if (!row.zipcode) errors.push('Missing zipcode');
    if (!/^\d{4,10}$/.test(row.zipcode) && row.zipcode) {
      // Allow common zip formats; still require non-empty above
      if (!/^[A-Za-z0-9\- ]{3,10}$/.test(row.zipcode)) {
        errors.push('Bad zipcode');
      }
    }
    if (!row.houseColor) errors.push('Missing house color');

    if (row.admissionNumber) {
      if (seenInFile.has(row.admissionNumber)) {
        errors.push('Duplicate admission number in file');
        duplicateInFile += 1;
      } else {
        seenInFile.set(row.admissionNumber, row.rowNumber);
      }
    }

    if (errors.length) {
      invalidCount += 1;
      rowErrors.push({
        row: row.rowNumber,
        admissionNumber: row.admissionNumber,
        messages: errors,
      });
      return;
    }

    if (existingByAdmission.has(row.admissionNumber)) {
      updateCount += 1;
    } else {
      newCount += 1;
    }
    validRows.push(row);
  });

  return {
    validRows,
    rowErrors,
    counts: {
      total: parsedRows.length,
      new: newCount,
      willUpdate: updateCount,
      invalid: invalidCount,
      duplicateInFile,
    },
  };
}

function buildSampleTemplateBuffer() {
  const headers = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
  const sample = [
    headers,
    [
      '10106',
      'Sample Student',
      'Sample Parent',
      '12-3-45 Near Gate',
      'Banjara Hills',
      'Hyderabad',
      'TS',
      '500034',
      'Red',
      '9876543210',
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function errorsToCsv(rowErrors) {
  const lines = ['row,admissionNumber,messages'];
  rowErrors.forEach((e) => {
    const msgs = (e.messages || []).join('; ').replace(/"/g, '""');
    lines.push(`${e.row},"${e.admissionNumber || ''}","${msgs}"`);
  });
  return lines.join('\n');
}

/**
 * Upsert students by admission_number. Never resets kit_status / catalog_override.
 */
async function upsertStudents(db, validRows, chunkSize = 500) {
  let created = 0;
  let updated = 0;

  await db.transaction(async (trx) => {
    for (let i = 0; i < validRows.length; i += chunkSize) {
      const chunk = validRows.slice(i, i + chunkSize);
      const admissions = chunk.map((r) => r.admissionNumber);
      const existing = await trx('students')
        .whereIn('admission_number', admissions)
        .select('admission_number');
      const existingSet = new Set(existing.map((e) => e.admission_number));

      for (const row of chunk) {
        const payload = {
          student_name: row.studentName,
          parent_name: row.parentName,
          address1: row.address1,
          address2: row.address2 || '',
          city: row.city,
          state: row.state,
          zipcode: row.zipcode,
          house_color: row.houseColor,
        };
        if (row.phone) {
          payload.phone = row.phone;
        }

        if (existingSet.has(row.admissionNumber)) {
          await trx('students').where({ admission_number: row.admissionNumber }).update({
            ...payload,
            updated_at: trx.fn.now(),
          });
          updated += 1;
        } else {
          await trx('students').insert({
            admission_number: row.admissionNumber,
            ...payload,
            phone: row.phone || null,
            kit_status: 'pending',
            catalog_override: 'default',
            is_active: true,
          });
          created += 1;
        }
      }
    }
  });

  return { created, updated };
}

module.exports = {
  REQUIRED_HEADERS,
  parseWorkbookBuffer,
  validateRows,
  buildSampleTemplateBuffer,
  errorsToCsv,
  upsertStudents,
  cellToString,
  normalizeHeader,
};
