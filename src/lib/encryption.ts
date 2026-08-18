/**
 * AES-256-GCM encryption via Web Crypto API.
 * Used for client-side encryption of sensitive financial data.
 */

const ALGO = "AES-GCM";
const PBKDF2_ITERATIONS = 100_000;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function concatBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((acc, b) => acc + b.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }
  return result.buffer;
}

/**
 * Derive an AES-256-GCM key from a password and salt using PBKDF2.
 */
async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a base64 string: salt(16) + iv(12) + ciphertext.
 */
async function encryptData(plaintext: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt.buffer);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    encoder.encode(plaintext),
  );

  return toBase64(concatBuffers(salt.buffer, iv.buffer, ciphertext));
}

/**
 * Decrypt a base64 string produced by encryptData.
 */
async function decryptData(encrypted: string, password: string): Promise<string> {
  const data = fromBase64(encrypted);

  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const ciphertext = data.slice(28);

  const key = await deriveKey(password, salt);

  const plainBuffer = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);

  return new TextDecoder().decode(plainBuffer);
}

/**
 * Encrypt a numeric value. Returns base64 encrypted string.
 */
export async function encryptNumber(value: number, password: string): Promise<string> {
  return encryptData(String(value), password);
}

/**
 * Decrypt back to a number.
 */
export async function decryptNumber(encrypted: string, password: string): Promise<number> {
  const plaintext = await decryptData(encrypted, password);
  return Number(plaintext) || 0;
}

const MASK = "\u2022\u2022\u2022\u2022\u2022\u2022";

export function maskValue(): string {
  return MASK;
}
