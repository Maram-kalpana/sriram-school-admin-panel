const {
  encryptSecret,
  decryptSecret,
  maskSecret,
  isMaskedPlaceholder,
} = require('../src/utils/cryptoSecrets');

describe('settings AES-256-GCM secrets', () => {
  test('encrypt then decrypt round-trips', () => {
    const plain = 'paytm-merchant-key-a91f';
    const enc = encryptSecret(plain);
    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(decryptSecret(enc)).toBe(plain);
  });

  test('mask shows last 4 characters of plaintext', () => {
    const enc = encryptSecret('secret-a91f');
    expect(maskSecret(enc)).toBe('••••••a91f');
  });

  test('does not update when masked placeholder submitted', () => {
    expect(isMaskedPlaceholder('••••••a91f')).toBe(true);
    expect(isMaskedPlaceholder('new-secret')).toBe(false);
  });

  test('legacy plaintext decrypts as-is', () => {
    expect(decryptSecret('plain-key')).toBe('plain-key');
  });
});
