/**
 * Zero-Cloud Local Device Cryptography Service
 * Uses Web Crypto API (SubtleCrypto) with PBKDF2 + AES-GCM 256-bit encryption.
 * All transaction data in localStorage / IndexedDB is encrypted with the user's MPIN.
 */

import { DecryptedData, EncryptedVault } from '../types';

// Convert ArrayBuffer to Hex string
function bufToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex string to Uint8Array
function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Base64 helpers
function bufToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuf(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive AES-GCM CryptoKey from user MPIN and salt using PBKDF2
 */
async function deriveKey(mpin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(mpin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Calculate verification hash to quickly check if MPIN is correct without risking corrupted state
 */
export async function computeMpinHash(mpin: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${mpin}:${saltHex}:thebill-vault-auth`);
  const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
  return bufToHex(hashBuf);
}

/**
 * Encrypt the entire application vault
 */
export async function encryptVault(data: DecryptedData, mpin: string, existingSaltHex?: string): Promise<EncryptedVault> {
  const salt = existingSaltHex ? hexToBuf(existingSaltHex) : window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(mpin, salt);

  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));

  const ciphertextBuf = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    plaintext
  );

  const saltHex = bufToHex(salt.buffer as ArrayBuffer);
  const verificationHash = await computeMpinHash(mpin, saltHex);

  return {
    version: 1,
    salt: saltHex,
    iv: bufToHex(iv.buffer as ArrayBuffer),
    ciphertext: bufToBase64(ciphertextBuf),
    verificationHash,
    updatedAt: Date.now(),
  };
}

/**
 * Decrypt the application vault using MPIN
 */
export async function decryptVault(vault: EncryptedVault, mpin: string): Promise<DecryptedData> {
  const salt = hexToBuf(vault.salt);
  const iv = hexToBuf(vault.iv);
  const ciphertext = base64ToBuf(vault.ciphertext);

  // Quick verification hash check
  const calculatedHash = await computeMpinHash(mpin, vault.salt);
  if (calculatedHash !== vault.verificationHash) {
    throw new Error('Incorrect MPIN. Please try again.');
  }

  const key = await deriveKey(mpin, salt);

  try {
    const decryptedBuf = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      key,
      ciphertext as unknown as BufferSource
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBuf);
    return JSON.parse(jsonStr) as DecryptedData;
  } catch {
    throw new Error('Decryption failed. Data could not be verified.');
  }
}

/**
 * Deterministic Device Fingerprint Generator
 * Generates an encrypted hardware-bound Device ID for Gumroad licensing.
 */
export async function getDeviceFingerprint(): Promise<string> {
  const cached = localStorage.getItem('thebill_device_id');
  if (cached && cached.startsWith('DEV-')) {
    return cached;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 10, 60, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('TheBillSecurity', 12, 14);
    }
    const canvasData = canvas.toDataURL();

    const rawIdData = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency || 4,
      canvasData.slice(-50),
    ].join('||');

    const enc = new TextEncoder();
    const hash = await window.crypto.subtle.digest('SHA-256', enc.encode(rawIdData));
    const hex = bufToHex(hash).toUpperCase();

    // Format: DEV-XXXX-XXXX-XXXX
    const deviceId = `DEV-${hex.substring(0, 4)}-${hex.substring(4, 8)}-${hex.substring(8, 12)}`;
    localStorage.setItem('thebill_device_id', deviceId);
    return deviceId;
  } catch {
    const fallback = `DEV-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    localStorage.setItem('thebill_device_id', fallback);
    return fallback;
  }
}
