// Cryptographic and Security Utilities for 【猫步可爱】

// 1. PBKDF2 Master Key derivation & AES-GCM Encrypt/Decrypt
const SALT = new TextEncoder().encode('maobu-cute-app-secure-salt-2026');

async function getDerivedKey(password: string, mode: 'encrypt' | 'decrypt' = 'encrypt'): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    [mode]
  );
}

export async function encryptData(text: string, masterKey: string): Promise<string> {
  try {
    const key = await getDerivedKey(masterKey, 'encrypt');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('Encryption error:', err);
    throw err;
  }
}

export async function decryptData(encryptedBase64: string, masterKey: string): Promise<string> {
  try {
    const key = await getDerivedKey(masterKey, 'decrypt');
    const binary = atob(encryptedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('Decryption error:', err);
    throw new Error('解密失败，主密码错误或数据损坏');
  }
}

// 2. RFC 6238 TOTP Engine
const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(base32: string): Uint8Array {
  const cleaned = base32.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(((cleaned.length * 5) / 8) | 0);

  for (let i = 0; i < cleaned.length; i++) {
    const val = RFC4648_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue; // skip invalid characters
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return output.slice(0, index);
}

export async function generateTOTP(
  secretBase32: string,
  period = 30,
  digits = 6,
  time = Date.now()
): Promise<{ code: string; remainingSeconds: number; progress: number }> {
  const epoch = Math.floor(time / 1000);
  const timeStep = Math.floor(epoch / period);
  const remainingSeconds = period - (epoch % period);
  const progress = (remainingSeconds / period) * 100;

  try {
    const secretBytes = base32Decode(secretBase32);
    if (secretBytes.length === 0) {
      return { code: '000000', remainingSeconds, progress };
    }

    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, timeStep, false);

    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, timeBuffer);
    const hash = new Uint8Array(signature);

    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, digits);
    const code = otp.toString().padStart(digits, '0');

    return { code, remainingSeconds, progress };
  } catch (err) {
    console.error('TOTP generation failed:', err);
    return { code: '------', remainingSeconds, progress };
  }
}

export function parseOtpAuthUri(uri: string): { issuer: string; account: string; secret: string } | null {
  try {
    if (!uri.startsWith('otpauth://totp/')) return null;
    const url = new URL(uri);
    const label = decodeURIComponent(url.pathname.replace(/^\/\/totp\//, ''));
    let issuer = url.searchParams.get('issuer') || '';
    let account = label;

    if (label.includes(':')) {
      const parts = label.split(':');
      issuer = issuer || parts[0].trim();
      account = parts[1].trim();
    }

    const secret = url.searchParams.get('secret') || '';
    return { issuer, account, secret };
  } catch {
    return null;
  }
}

// 3. Password Strength and Generator
export function generateStrongPassword(options: {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  avoidAmbiguous: boolean;
}): string {
  let upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let lower = 'abcdefghijkmnpqrstuvwxyz';
  let numbers = '23456789';
  let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!options.avoidAmbiguous) {
    upper += 'I' + 'O';
    lower += 'l' + 'o';
    numbers += '0' + '1';
  }

  let charPool = '';
  if (options.useUpper) charPool += upper;
  if (options.useLower) charPool += lower;
  if (options.useNumbers) charPool += numbers;
  if (options.useSymbols) charPool += symbols;

  if (!charPool) charPool = lower + numbers;

  const randomValues = new Uint32Array(options.length);
  crypto.getRandomValues(randomValues);

  let result = '';
  for (let i = 0; i < options.length; i++) {
    result += charPool[randomValues[i] % charPool.length];
  }
  return result;
}

export function calculatePasswordStrength(password: string): {
  score: number; // 0 to 100
  label: 'weak' | 'fair' | 'strong' | 'very_strong';
  color: string;
} {
  if (!password) return { score: 0, label: 'weak', color: '#EF4444' };

  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 20;
  if (password.length >= 16) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;

  if (score < 40) return { score, label: 'weak', color: '#EF4444' };
  if (score < 70) return { score, label: 'fair', color: '#F59E0B' };
  if (score < 90) return { score, label: 'strong', color: '#10B981' };
  return { score: 100, label: 'very_strong', color: '#059669' };
}
