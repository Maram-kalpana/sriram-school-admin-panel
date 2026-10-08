const {
  parseWorkbookBuffer,
  validateRows,
  cellToString,
} = require('../src/services/excelStudents');
const XLSX = require('xlsx');

function makeBuffer(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

describe('excelStudents', () => {
  test('trims cell values and headers with trailing spaces', () => {
    expect(cellToString('Ashok ')).toBe('Ashok');
    expect(cellToString('TS ')).toBe('TS');

    const buf = makeBuffer([
      [
        'AdmissionNumber',
        'StudentName',
        'ParentName',
        'Address1',
        'Address2',
        'City',
        'State ',
        'Zipcode',
        'House Color',
      ],
      ['01001', 'Ashok ', 'A Kumar ', 'Addr1', '', 'Hyderabad', 'TS ', '500034', 'Blue'],
    ]);
    const parsed = parseWorkbookBuffer(buf, 'test.xlsx');
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.rows[0].admissionNumber).toBe('01001');
    expect(parsed.rows[0].studentName).toBe('Ashok');
    expect(parsed.rows[0].state).toBe('TS');
    expect(parsed.rows[0].phone).toBeNull();
  });

  test('detects duplicates and missing admission', () => {
    const rows = [
      {
        rowNumber: 2,
        admissionNumber: '10101',
        studentName: 'A',
        parentName: 'P',
        address1: 'x',
        address2: '',
        city: 'Hyd',
        state: 'TS',
        zipcode: '500034',
        houseColor: 'Red',
        phone: null,
      },
      {
        rowNumber: 3,
        admissionNumber: '10101',
        studentName: 'B',
        parentName: 'P',
        address1: 'x',
        address2: '',
        city: 'Hyd',
        state: 'TS',
        zipcode: '500034',
        houseColor: 'Red',
        phone: null,
      },
      {
        rowNumber: 4,
        admissionNumber: '',
        studentName: 'C',
        parentName: 'P',
        address1: 'x',
        address2: '',
        city: 'Hyd',
        state: 'TS',
        zipcode: '500034',
        houseColor: 'Blue',
        phone: null,
      },
    ];
    const result = validateRows(rows, new Map([['10102', true]]));
    expect(result.counts.duplicateInFile).toBeGreaterThanOrEqual(1);
    expect(result.counts.invalid).toBeGreaterThanOrEqual(1);
    expect(result.validRows.length).toBe(1);
  });
});
