export type TransactionCategory =
  | 'food_dining'
  | 'groceries'
  | 'shopping'
  | 'utilities_bills'
  | 'travel_fuel'
  | 'entertainment'
  | 'health_wellness'
  | 'cash_withdrawal'
  | 'transfers'
  | 'other';

export type TransactionType = 'debit' | 'credit' | 'withdrawal' | 'transfer';

export type PaymentMethod = 'SMS' | 'UPI' | 'Card' | 'Cash' | 'NetBanking' | 'Manual';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  merchant: string;
  accountMasked?: string;
  date: string; // ISO string
  paymentMethod: PaymentMethod;
  notes?: string;
  rawSMS?: string;
  balanceAfter?: number;
  createdAt: number;
}

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  currency: string;
  createdAt: number;
  lastLogin: number;
  monthlyBudget: number;
  isEmailVerified: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  termsAcceptedAt?: number;
}

export interface EncryptedVault {
  version: number;
  salt: string; // hex
  iv: string; // hex
  ciphertext: string; // base64
  verificationHash: string; // hash of mpin for fast sanity check
  updatedAt: number;
}

export interface DecryptedData {
  profile: UserProfile;
  transactions: Transaction[];
  categoryBudgets: Partial<Record<TransactionCategory, number>>;
  customRules: Array<{ keyword: string; category: TransactionCategory }>;
}

export interface LicenseInfo {
  key: string;
  deviceId: string;
  activatedAt: number;
  plan: 'Lifetime Standard' | 'Pro License' | 'Early Adopter';
  status: 'valid' | 'revoked' | 'unregistered';
  customerEmail?: string;
}

export interface SMSParseResult {
  amount: number;
  type: TransactionType;
  currency: string;
  merchant: string;
  category: TransactionCategory;
  accountMasked?: string;
  balanceAfter?: number;
  dateStr?: string;
  confidence: number;
  rawText: string;
}

export interface BudgetAlert {
  id: string;
  threshold: 75 | 90 | 100;
  category?: TransactionCategory;
  spent: number;
  budget: number;
  timestamp: number;
  message: string;
}
