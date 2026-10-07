const XLSX = require('xlsx');

const HEADER_ALIASES = {
  admissionnumber: 'admission_number',
  studentname: 'student_name',
  parentname: 'parent_name',
  address1: 'address1',
  address2: 'address2',
  city: 'city',
  state: 'state',
  zipcode: 'zipcode',
  housecolor: 'house_color',
  phone: 'phone',
};

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function trimCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return String(value);
  }
  return String(value).trim();
}

function admissionAsString(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    return String(Math.trunc(value));
  }
  return String(value).trim();
}

function isValidZipcode(zip) {
  if (!zip) return false;
  return /^[A-Za-z0-9-]{4,12}$/.test(zip);
}

function mapRow(raw) {
  const mapped = {};
  Object.keys(raw).forEach((key) => {
    const field = HEADER_ALIASES[normalizeHeader(key)];
    if (!field) return;
    if (field === 'admission_number') mapped[field] = admissionAsString(raw[key]);
    else mapped[field] = trimCell(raw[key]);
  });
  if (!mapped.phone) mapped.phone = '';
  return mapped;
}

function parseStudentWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false, cellText: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  return parseStudentRows(rows);
}

function parseStudentRows(rawRows) {
  const seen = new Map();
  const parsed = [];
  const errors = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const mapped = mapRow(raw);
    const rowErrors = [];

    if (!mapped.admission_number) {
      rowErrors.push('missing admission number');
    }
    if (mapped.admission_number) {
      const key = mapped.admission_number.toLowerCase();
      if (seen.has(key)) {
        rowErrors.push('duplicate admission number in file');
        const first = seen.get(key);
        parsed[first.parsedIndex].errors.push('duplicate admission number in file');
        parsed[first.parsedIndex].valid = false;
      } else {
        seen.set(key, { parsedIndex: parsed.length, rowNumber });
      }
    }
    if (!isValidZipcode(mapped.zipcode)) {
      rowErrors.push('invalid zipcode');
    }
    if (!mapped.student_name) {
      rowErrors.push('missing student name');
    }

    parsed.push({
      rowNumber,
      valid: rowErrors.length === 0,
      errors: rowErrors,
      data: {
        admission_number: mapped.admission_number,
        student_name: mapped.student_name || '',
        parent_name: mapped.parent_name || '',
        address1: mapped.address1 || '',
        address2: mapped.address2 || '',
        city: mapped.city || '',
        state: mapped.state || '',
        zipcode: mapped.zipcode || '',
        house_color: mapped.house_color || '',
        phone: mapped.phone || null,
      },
    });
  });

  parsed.forEach((row) => {
    if (!row.valid) {
      errors.push({
        rowNumber: row.rowNumber,
        admission_number: row.data.admission_number,
        errors: row.errors,
      });
    }
  });

  return { rows: parsed, errors };
}

function buildTemplateBuffer() {
  const headers = [
    'AdmissionNumber',
    'StudentName',
    'ParentName',
    'Address1',
    'Address2',
    'City',
    'State',
    'Zipcode',
    'House Color',
    'Phone',
  ];
  const sample = [
    ['10101', 'P Sandeep', 'Parent One', '1-23 MG Road', 'Lane 2', 'Hyderabad', 'TS', '500001', 'Red', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  normalizeHeader,
  trimCell,
  parseStudentWorkbook,
  parseStudentRows,
  buildTemplateBuffer,
  isValidZipcode,
};
