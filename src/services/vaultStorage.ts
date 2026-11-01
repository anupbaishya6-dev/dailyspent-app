/**
 * Encrypted Vault Storage Manager
 * Stores strictly ciphertext in localStorage; decrypts into memory only upon valid MPIN entry.
 */

import { DecryptedData, EncryptedVault, Transaction, UserProfile } from '../types';
import { decryptVault, encryptVault } from './crypto';

const VAULT_STORAGE_KEY = 'thebill_encrypted_vault';
const ACTIVE_MPIN_KEY = 'thebill_session_token'; // temporary session marker

export function hasExistingVault(): boolean {
  return !!localStorage.getItem(VAULT_STORAGE_KEY);
}

export function getRawVault(): EncryptedVault | null {
  const raw = localStorage.getItem(VAULT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EncryptedVault;
  } catch {
    return null;
  }
}

export async function saveVault(data: DecryptedData, mpin: string): Promise<void> {
  const existing = getRawVault();
  const encrypted = await encryptVault(data, mpin, existing?.salt);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(encrypted));
}

export async function unlockVault(mpin: string): Promise<DecryptedData> {
  const vault = getRawVault();
  if (!vault) {
    throw new Error('No vault found. Please register first.');
  }
  const decrypted = await decryptVault(vault, mpin);
  // Store session unlock indicator
  sessionStorage.setItem(ACTIVE_MPIN_KEY, 'unlocked');
  return decrypted;
}

export function lockVault(): void {
  sessionStorage.removeItem(ACTIVE_MPIN_KEY);
}

export function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(ACTIVE_MPIN_KEY) === 'unlocked';
}

export function wipeAllLocalData(): void {
  localStorage.removeItem(VAULT_STORAGE_KEY);
  localStorage.removeItem('thebill_license');
  localStorage.removeItem('thebill_device_id');
  sessionStorage.clear();
}

/**
 * Generate starter mock transactions for newly registered user
 * User requested clean start: everything zero, values appear only when user enters.
 */
export function generateStarterTransactions(currency: string = '₹'): Transaction[] {
  return [];
}
