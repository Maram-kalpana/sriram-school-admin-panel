const PaytmChecksum = require('paytmchecksum');
const paytmService = require('../src/services/paytmService');
const settingsService = require('../src/services/settingsService');

jest.mock('../src/services/settingsService', () => ({
  getSettings: jest.fn(),
}));

const KEY = 'xxxxxxxxxxxxxxxx';
const MID = 'TESTMID001';

beforeEach(() => {
  settingsService.getSettings.mockResolvedValue({
    paytm_mid: MID,
    paytm_merchant_key: KEY,
    paytm_website: 'WEBSTAGING',
    paytm_industry_type: 'Retail',
    paytm_channel_id: 'WEB',
    paytm_environment: 'staging',
    paytm_enabled: true,
  });
  paytmService._httpPost = null;
});

describe('Paytm checksum sign/verify', () => {
  test('generateSignature + verifySignature round-trip', async () => {
    const params = { ORDERID: 'SS-2026-1-1', STATUS: 'TXN_SUCCESS', TXNAMOUNT: '1.00' };
    const checksum = await PaytmChecksum.generateSignature(params, KEY);
    const ok = await PaytmChecksum.verifySignature(params, KEY, checksum);
    expect(ok).toBe(true);
  });

  test('verifySignature rejects tampered payload', async () => {
    const params = { ORDERID: 'SS-2026-1-1', STATUS: 'TXN_SUCCESS' };
    const checksum = await PaytmChecksum.generateSignature(params, KEY);
    const ok = await PaytmChecksum.verifySignature({ ...params, STATUS: 'TXN_FAILURE' }, KEY, checksum);
    expect(ok).toBe(false);
  });
});

describe('paytmService initiate (mocked HTTP)', () => {
  test('returns txnToken without logging secrets', async () => {
    paytmService._httpPost = async () => ({
      body: {
        txnToken: 'tok_abc',
        resultInfo: { resultStatus: 'S', resultMsg: 'Success' },
      },
    });
    const result = await paytmService.initiateTransaction({
      orderNumber: 'SS-2026-000001',
      total: 2499,
      admissionNumber: '10101',
    });
    expect(result.txnToken).toBe('tok_abc');
    expect(result.mid).toBe(MID);
    expect(result.amount).toBe('2499.00');
    expect(JSON.stringify(result)).not.toMatch(KEY);
  });
});

describe('paytmService verifyCallback', () => {
  test('rejects missing checksum', async () => {
    await expect(paytmService.verifyCallback({ ORDERID: 'x' })).rejects.toThrow(/CHECKSUMHASH/);
  });

  test('confirms with status API after checksum', async () => {
    const params = { ORDERID: 'SS-1', STATUS: 'TXN_SUCCESS' };
    const checksum = await PaytmChecksum.generateSignature(params, KEY);
    paytmService._httpPost = async () => ({
      body: { resultInfo: { resultStatus: 'TXN_SUCCESS' }, txnId: 'TXN1' },
    });
    const verified = await paytmService.verifyCallback({ ...params, CHECKSUMHASH: checksum });
    expect(verified.verified).toBe(true);
    expect(verified.statusJson.body.txnId).toBe('TXN1');
  });
});
