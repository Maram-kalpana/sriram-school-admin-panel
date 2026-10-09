const https = require('https');
const { URL } = require('url');
const PaytmChecksum = require('paytmchecksum');
const settingsService = require('./settingsService');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function baseUrl(environment) {
  return environment === 'production'
    ? 'https://securegw.paytm.in'
    : 'https://securegw-stage.paytm.in';
}

function postJson(urlStr, payload) {
  if (typeof module.exports._httpPost === 'function') {
    return module.exports._httpPost(urlStr, payload);
  }
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const data = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: u.hostname,
        path: `${u.pathname}${u.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => {
          body += c;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function credentials() {
  const s = await settingsService.getSettings();
  if (!s.paytm_mid || !s.paytm_merchant_key) {
    throw new AppError('Paytm is not configured', 400);
  }
  return {
    mid: s.paytm_mid,
    merchantKey: s.paytm_merchant_key,
    websiteName: s.paytm_website || (s.paytm_environment === 'production' ? 'DEFAULT' : 'WEBSTAGING'),
    industryType: s.paytm_industry_type || 'Retail',
    channelId: s.paytm_channel_id || 'WEB',
    environment: s.paytm_environment || 'staging',
    callbackUrl:
      `${String(env.apiBaseUrl).replace(/\/$/, '')}/api/storefront/payments/paytm/callback`,
    enabled: Boolean(s.paytm_enabled),
  };
}

async function initiateTransaction(order) {
  const c = await credentials();
  const paytmOrderId = `${order.orderNumber}-${Date.now()}`;
  const body = {
    requestType: 'Payment',
    mid: c.mid,
    websiteName: c.websiteName,
    orderId: paytmOrderId,
    callbackUrl: c.callbackUrl,
    txnAmount: {
      value: Number(order.total).toFixed(2),
      currency: 'INR',
    },
    userInfo: {
      custId: String(order.admissionNumber || order.studentId || 'CUST'),
    },
  };
  const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), c.merchantKey);
  const payload = { body, head: { signature } };
  const url = `${baseUrl(c.environment)}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(c.mid)}&orderId=${encodeURIComponent(paytmOrderId)}`;
  const json = await postJson(url, payload);
  const txnToken = json?.body?.txnToken;
  if (!txnToken) {
    const msg = json?.body?.resultInfo?.resultMsg || 'Paytm initiate failed';
    throw new AppError(msg, 400);
  }
  return {
    txnToken,
    orderId: paytmOrderId,
    mid: c.mid,
    amount: body.txnAmount.value,
    environment: c.environment,
    host: baseUrl(c.environment).replace('https://', ''),
  };
}

async function getStatus(paytmOrderId) {
  const c = await credentials();
  const body = { mid: c.mid, orderId: paytmOrderId };
  const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), c.merchantKey);
  const url = `${baseUrl(c.environment)}/v3/order/status`;
  return postJson(url, { body, head: { signature } });
}

async function verifyCallback(params) {
  const c = await credentials();
  const checksum = params.CHECKSUMHASH;
  if (!checksum) throw new AppError('Missing CHECKSUMHASH', 400);
  const copy = { ...params };
  delete copy.CHECKSUMHASH;
  const ok = await PaytmChecksum.verifySignature(copy, c.merchantKey, checksum);
  if (!ok) throw new AppError('Invalid Paytm checksum', 400);
  const orderId = params.ORDERID;
  const statusJson = await getStatus(orderId);
  return { params, statusJson, verified: true };
}

async function refund({ orderId, txnId, amount, refId }) {
  const c = await credentials();
  const body = {
    mid: c.mid,
    txnType: 'REFUND',
    orderId,
    txnId,
    refId: refId || `REF-${Date.now()}`,
    refundAmount: Number(amount).toFixed(2),
  };
  const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), c.merchantKey);
  const url = `${baseUrl(c.environment)}/refund/apply`;
  const applied = await postJson(url, { body, head: { signature } });
  const status = await getRefundStatus({ orderId, refId: body.refId });
  return { applied, status, refId: body.refId };
}

async function getRefundStatus({ orderId, refId }) {
  const c = await credentials();
  const body = { mid: c.mid, orderId, refId };
  const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), c.merchantKey);
  const url = `${baseUrl(c.environment)}/v2/refund/status`;
  return postJson(url, { body, head: { signature } });
}

async function testConnection() {
  const c = await credentials();
  const body = {
    requestType: 'Payment',
    mid: c.mid,
    websiteName: c.websiteName,
    orderId: `TEST-${Date.now()}`,
    callbackUrl: c.callbackUrl,
    txnAmount: { value: '1.00', currency: 'INR' },
    userInfo: { custId: 'TEST' },
  };
  const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), c.merchantKey);
  if (!signature) throw new AppError('Could not generate signature', 400);
  const url = `${baseUrl(c.environment)}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(c.mid)}&orderId=${encodeURIComponent(body.orderId)}`;
  const json = await postJson(url, { body, head: { signature } });
  return {
    ok: Boolean(json?.body?.txnToken) || json?.body?.resultInfo?.resultStatus === 'S',
    resultMsg: json?.body?.resultInfo?.resultMsg || json?.body?.resultInfo?.resultStatus || 'No token',
    resultStatus: json?.body?.resultInfo?.resultStatus,
  };
}

module.exports = {
  baseUrl,
  credentials,
  initiateTransaction,
  getStatus,
  verifyCallback,
  refund,
  getRefundStatus,
  testConnection,
  _httpPost: null,
};
