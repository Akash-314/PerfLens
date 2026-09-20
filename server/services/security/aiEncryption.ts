import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const SALT = 'perflens-byok-storage-salt';

function getEncryptionKey(): Buffer {
  const secret = process.env.AI_ENCRYPTION_KEY || process.env.JWT_SECRET || 'perflens_secure_encryption_key_default_32bytes!';
  return crypto.scryptSync(secret, SALT, 32);
}

/**
 * Encrypts a secret API key using AES-256-GCM authenticated encryption.
 * Plaintext keys are never stored at rest.
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Secret to encrypt must be a non-empty string.');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return serialized string: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret back into plaintext memory.
 * Throws an error if ciphertext or authentication tag has been tampered with.
 */
export function decryptSecret(cipherPayload: string): string {
  if (!cipherPayload || typeof cipherPayload !== 'string') {
    throw new Error('Encrypted payload must be a non-empty string.');
  }

  const parts = cipherPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted secret payload format.');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a safe masked representation of an API key for frontend display.
 * The actual key is NEVER returned to the client.
 */
export function maskApiKey(apiKey?: string | null): string {
  if (!apiKey) return '';
  return '••••••••••••••••';
}

/**
 * Sanitizes any raw string or error message so secrets and credentials
 * (Bearer tokens, API keys, basic auth, etc.) are never logged or leaked.
 */
export function sanitizeLog(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+/gi, '$1[REDACTED]')
    .replace(/(key=)[A-Za-z0-9._~+/-]+/gi, '$1[REDACTED]')
    .replace(/(api[_-]?key[:=]\s*["']?)[A-Za-z0-9._~+/-]+(["']?)/gi, '$1[REDACTED]$2')
    .replace(/(authorization[:=]\s*["']?)[A-Za-z0-9._~+/-]+(["']?)/gi, '$1[REDACTED]$2')
    .replace(/(x-api-key[:=]\s*["']?)[A-Za-z0-9._~+/-]+(["']?)/gi, '$1[REDACTED]$2')
    .replace(/(password[:=]\s*["']?)[^&\s"']+(["']?)/gi, '$1[REDACTED]$2')
    .replace(/(secret[:=]\s*["']?)[^&\s"']+(["']?)/gi, '$1[REDACTED]$2');
}
