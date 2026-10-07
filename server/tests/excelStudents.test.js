const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseStudentRows, trimCell, normalizeHeader } = require('../src/services/excelStudents');

test('trims header spaces and cell values, keeps admission as string', () => {
  assert.equal(normalizeHeader('State '), 'state');
  assert.equal(normalizeHeader('House Color'), 'housecolor');
  assert.equal(trimCell('Ashok '), 'Ashok');
  assert.equal(trimCell('TS '), 'TS');

  const { rows, errors } = parseStudentRows([
    {
      AdmissionNumber: ' 01001 ',
      StudentName: 'Ashok ',
      ParentName: 'Dad',
      Address1: 'A',
      Address2: '',
      City: 'Hyd',
      'State ': 'TS ',
      Zipcode: '500001',
      'House Color': 'Blue',
    },
  ]);
  assert.equal(errors.length, 0);
  assert.equal(rows[0].data.admission_number, '01001');
  assert.equal(rows[0].data.student_name, 'Ashok');
  assert.equal(rows[0].data.state, 'TS');
  assert.equal(rows[0].data.phone, null);
});

test('phone may be missing; invalid zip and duplicates are flagged', () => {
  const { rows } = parseStudentRows([
    { AdmissionNumber: '10101', StudentName: 'A', Zipcode: '500001', 'House Color': 'Red' },
    { AdmissionNumber: '10101', StudentName: 'B', Zipcode: '12', 'House Color': 'Red' },
    { AdmissionNumber: '', StudentName: 'C', Zipcode: '500002' },
  ]);
  assert.equal(rows[0].valid, false);
  assert.ok(rows[0].errors.includes('duplicate admission number in file'));
  assert.ok(rows[1].errors.includes('duplicate admission number in file'));
  assert.ok(rows[1].errors.includes('invalid zipcode'));
  assert.ok(rows[2].errors.includes('missing admission number'));
});
