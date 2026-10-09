function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function financialYear(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const year = Number(map.year);
  const month = Number(map.month);
  const start = month >= 4 ? year : year - 1;
  const end = String((start + 1) % 100).padStart(2, '0');
  return `${start}-${end}`;
}

/**
 * Split a line into taxable + GST.
 * @param {{ amount: number, gstRate: number, priceIncludesGst: boolean, intraState: boolean, quantity?: number }}
 */
function splitLine({ amount, gstRate = 0, priceIncludesGst = true, intraState = true, quantity = 1 }) {
  const gross = round2(Number(amount) * Number(quantity || 1));
  const rate = Number(gstRate) || 0;
  let taxable;
  let tax;
  if (priceIncludesGst && rate > 0) {
    taxable = round2(gross / (1 + rate / 100));
    tax = round2(gross - taxable);
  } else {
    taxable = gross;
    tax = round2((gross * rate) / 100);
  }
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (intraState) {
    cgst = round2(tax / 2);
    sgst = round2(tax - cgst);
  } else {
    igst = tax;
  }
  const lineTotal = priceIncludesGst ? gross : round2(taxable + tax);
  return {
    taxableValue: taxable,
    tax,
    cgst,
    sgst,
    igst,
    lineTotal,
    gstRate: rate,
  };
}

function applyOrderGst(lines, { intraState = true } = {}) {
  const computed = lines.map((line) => {
    const split = splitLine({
      amount: line.unitPrice,
      quantity: line.quantity,
      gstRate: line.gstRate,
      priceIncludesGst: line.priceIncludesGst,
      intraState,
    });
    return { ...line, ...split };
  });
  const taxableTotal = round2(computed.reduce((s, l) => s + l.taxableValue, 0));
  let cgstTotal = round2(computed.reduce((s, l) => s + l.cgst, 0));
  let sgstTotal = round2(computed.reduce((s, l) => s + l.sgst, 0));
  let igstTotal = round2(computed.reduce((s, l) => s + l.igst, 0));
  const gstTotal = round2(cgstTotal + sgstTotal + igstTotal);
  const linesTotal = round2(computed.reduce((s, l) => s + l.lineTotal, 0));
  const expected = round2(taxableTotal + gstTotal);
  const drift = round2(linesTotal - expected);
  if (drift !== 0 && computed.length) {
    const last = computed[computed.length - 1];
    if (intraState) {
      last.sgst = round2(last.sgst + drift);
      sgstTotal = round2(sgstTotal + drift);
    } else {
      last.igst = round2(last.igst + drift);
      igstTotal = round2(igstTotal + drift);
    }
    last.tax = round2(last.cgst + last.sgst + last.igst);
  }
  return {
    lines: computed,
    taxableTotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    gstTotal: round2(cgstTotal + sgstTotal + igstTotal),
    itemsTotal: linesTotal,
  };
}

function normalizeState(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const STATE_ALIASES = {
  ts: '36',
  telangana: '36',
  '36': '36',
};

function isIntraState(school, student) {
  const schoolCode = String(school?.state_code || school?.stateCode || '').padStart(2, '0');
  const studentRaw = student?.stateCode || student?.state_code || student?.state || '';
  const studentNorm = STATE_ALIASES[normalizeState(studentRaw)] || String(studentRaw).padStart(2, '0');
  if (schoolCode && studentNorm && schoolCode === studentNorm) return true;
  return normalizeState(school?.state) === normalizeState(student?.state);
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`.trim();
}

function amountInWords(num) {
  const n = round2(num);
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  function chunk(x) {
    if (x === 0) return '';
    if (x < 100) return twoDigits(x);
    const h = Math.floor(x / 100);
    const rest = x % 100;
    return `${ONES[h]} Hundred${rest ? ` ${twoDigits(rest)}` : ''}`;
  }

  let x = rupees;
  const crore = Math.floor(x / 10000000);
  x %= 10000000;
  const lakh = Math.floor(x / 100000);
  x %= 100000;
  const thousand = Math.floor(x / 1000);
  x %= 1000;
  const parts = [];
  if (crore) parts.push(`${chunk(crore)} Crore`);
  if (lakh) parts.push(`${chunk(lakh)} Lakh`);
  if (thousand) parts.push(`${chunk(thousand)} Thousand`);
  if (x) parts.push(chunk(x));
  let out = `${parts.join(' ')} Rupees`;
  if (paise) out += ` and ${twoDigits(paise)} Paise`;
  return `${out} Only`;
}

module.exports = {
  round2,
  financialYear,
  splitLine,
  applyOrderGst,
  isIntraState,
  amountInWords,
};
