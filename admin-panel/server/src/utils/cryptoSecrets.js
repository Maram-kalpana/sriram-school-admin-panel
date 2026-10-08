const crypto = require('crypto');
const env = require('../config/env');

function getKey() {
  const raw = env.settingsEncryptionKey || '';
  // Accept 64-char hex (32 bytes) or utf8 string padded/hashed to 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(String(raw)).digest();
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Stored format: enc:v1:<iv_b64>:<tag_b64>:<cipher_b64>
 */
function encryptSecret(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return '';
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(payload) {
  if (!payload) return '';
  if (!String(payload).startsWith('enc:v1:')) {
    // Legacy plaintext — return as-is
    return String(payload);
  }
  const parts = String(payload).split(':');
  // enc:v1:iv:tag:cipher
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted secret format');
  }
  const iv = Buffer.from(parts[2], 'base64');
  const tag = Buffer.from(parts[3], 'base64');
  const data = Buffer.from(parts[4], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

/** Mask for API responses: ••••••a91f */
function maskSecret(value) {
  if (!value) return '';
  const plain = String(value).startsWith('enc:v1:') ? decryptSecret(value) : String(value);
  if (!plain) return '';
  const tail = plain.slice(-4);
  return `••••••${tail}`;
}

function isMaskedPlaceholder(value) {
  return typeof value === 'string' && value.startsWith('••••••');
}

module.exports = {
  encryptSecret,
  decryptSecret,
  maskSecret,
  isMaskedPlaceholder,
};
