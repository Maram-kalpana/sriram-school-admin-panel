const { splitLine, applyOrderGst, isIntraState, amountInWords, round2, financialYear } = require('../src/utils/gst');

describe('gst splitLine', () => {
  test('inclusive GST extracts taxable + tax', () => {
    const line = splitLine({ amount: 118, gstRate: 18, priceIncludesGst: true, intraState: true, quantity: 1 });
    expect(line.taxableValue).toBe(100);
    expect(line.tax).toBe(18);
    expect(line.cgst).toBe(9);
    expect(line.sgst).toBe(9);
    expect(line.igst).toBe(0);
    expect(line.lineTotal).toBe(118);
  });

  test('exclusive GST adds tax on top', () => {
    const line = splitLine({ amount: 100, gstRate: 18, priceIncludesGst: false, intraState: true, quantity: 1 });
    expect(line.taxableValue).toBe(100);
    expect(line.tax).toBe(18);
    expect(line.lineTotal).toBe(118);
  });

  test('inter-state uses IGST only', () => {
    const line = splitLine({ amount: 100, gstRate: 18, priceIncludesGst: false, intraState: false, quantity: 1 });
    expect(line.igst).toBe(18);
    expect(line.cgst).toBe(0);
    expect(line.sgst).toBe(0);
  });

  test('quantity multiplies before split', () => {
    const line = splitLine({ amount: 50, gstRate: 12, priceIncludesGst: false, intraState: true, quantity: 2 });
    expect(line.taxableValue).toBe(100);
    expect(line.tax).toBe(12);
  });
});

describe('gst applyOrderGst rounding', () => {
  test('reconciles line totals with GST halves', () => {
    const result = applyOrderGst(
      [
        { unitPrice: 99.99, quantity: 1, gstRate: 5, priceIncludesGst: true },
        { unitPrice: 199.49, quantity: 1, gstRate: 12, priceIncludesGst: true },
      ],
      { intraState: true }
    );
    const gst = round2(result.cgstTotal + result.sgstTotal + result.igstTotal);
    expect(round2(result.taxableTotal + gst)).toBe(result.itemsTotal);
  });
});

describe('gst isIntraState', () => {
  test('same Telangana state is intra', () => {
    expect(
      isIntraState({ state: 'Telangana', state_code: '36' }, { state: 'TS', state_code: '36' })
    ).toBe(true);
  });

  test('different state is inter', () => {
    expect(
      isIntraState({ state: 'Telangana', state_code: '36' }, { state: 'Karnataka', state_code: '29' })
    ).toBe(false);
  });
});

describe('gst amountInWords', () => {
  test('formats rupees and paise', () => {
    expect(amountInWords(1205.5)).toMatch(/One Thousand Two Hundred Five Rupees and Fifty Paise Only/);
  });
});

describe('financialYear', () => {
  test('April starts new FY', () => {
    expect(financialYear(new Date('2026-04-01T06:00:00+05:30'))).toBe('2026-27');
  });

  test('March belongs to previous FY', () => {
    expect(financialYear(new Date('2026-03-31T06:00:00+05:30'))).toBe('2025-26');
  });
});
