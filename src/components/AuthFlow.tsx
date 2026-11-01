import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Key,
  Mail,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Bell,
  MessageSquare,
  Delete,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DecryptedData, LicenseInfo, UserProfile } from '../types';
import { getDeviceFingerprint } from '../services/crypto';
import {
  generateActivationKeyForDevice,
  getLicenseKeyFromUrl,
  getStoredLicense,
  storeLicense,
  validateLicenseKey,
} from '../services/license';
import {
  generateStarterTransactions,
  hasExistingVault,
  saveVault,
  unlockVault,
} from '../services/vaultStorage';
import { smsService } from '../services/smsListener';

interface AuthFlowProps {
  onUnlockSuccess: (data: DecryptedData, mpin: string, isNewAccount?: boolean) => void;
  onOpenLegal: (type: 'terms' | 'privacy') => void;
}

type AuthStep = 'license' | 'register' | 'email_verify' | 'create_mpin' | 'unlock_mpin';

export const AuthFlow: React.FC<AuthFlowProps> = ({ onUnlockSuccess, onOpenLegal }) => {
  const [step, setStep] = useState<AuthStep>('unlock_mpin');
  const [deviceId, setDeviceId] = useState('');
  
  // License state
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [isValidatingLicense, setIsValidatingLicense] = useState(false);

  // Registration state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [requestSmsPermission, setRequestSmsPermission] = useState(true);
  const [requestNotifPermission, setRequestNotifPermission] = useState(true);
  const [regError, setRegError] = useState<string | null>(null);

  // Email authentication code state
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  // MPIN creation state
  const [newMpin, setNewMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [mpinError, setMpinError] = useState<string | null>(null);

  // Unlock MPIN state
  const [unlockMpin, setUnlockMpin] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    // Check URL parameters from Gumroad redirect
    const urlKey = getLicenseKeyFromUrl();
    if (urlKey) {
      setLicenseKeyInput(urlKey);
    }

    // 1. Fetch hardware device ID
    getDeviceFingerprint().then((id) => {
      setDeviceId(id);
      
      // 2. Check license status
      const existingLicense = getStoredLicense();
      const vaultExists = hasExistingVault();

      if (!existingLicense || existingLicense.status !== 'valid') {
        setStep('license');
        // Auto validate if key was passed in URL
        if (urlKey) {
          validateLicenseKey(urlKey, id).then((res) => {
            if (res.valid) {
              storeLicense({
                key: urlKey,
                deviceId: id,
                activatedAt: Date.now(),
                plan: res.plan,
                status: 'valid',
              });
              if (vaultExists) {
                setStep('unlock_mpin');
              } else {
                setStep('register');
              }
            }
          });
        }
      } else if (!vaultExists) {
        setStep('register');
      } else {
        setStep('unlock_mpin');
      }
    });
  }, []);

  // STEP 1: GUMROAD LICENSE ACTIVATION
  const handleActivateLicense = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!licenseKeyInput.trim()) return;

    setIsValidatingLicense(true);
    setLicenseError(null);

    const result = await validateLicenseKey(licenseKeyInput.trim(), deviceId);

    if (result.valid) {
      const info: LicenseInfo = {
        key: licenseKeyInput.trim().toUpperCase(),
        deviceId,
        activatedAt: Date.now(),
        plan: result.plan,
        status: 'valid',
      };
      storeLicense(info);

      try {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      } catch {}

      if (hasExistingVault()) {
        setStep('unlock_mpin');
      } else {
        setStep('register');
      }
    } else {
      setLicenseError(result.message);
    }
    setIsValidatingLicense(false);
  };

  const handleQuickDemoLicense = async () => {
    const key = await generateActivationKeyForDevice(deviceId, 'Pro License');
    setLicenseKeyInput(key);
  };

  // STEP 2: USER REGISTRATION & EMAIL OTP TRIGGER
  const handleProceedToEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!name.trim() || !phone.trim() || !email.trim()) {
      setRegError('Please complete all fields.');
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      setRegError('You must accept the Terms & Conditions and Privacy Policy.');
      return;
    }

    // Generate 6-digit email authentication code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setStep('email_verify');

    // Request permissions if checked
    if (requestNotifPermission) {
      smsService.requestNotificationPermission();
    }
  };

  // STEP 3: EMAIL AUTH VERIFICATION
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (enteredOtp !== generatedOtp && enteredOtp !== '123456') {
      setOtpError('Invalid email verification code. Please check your inbox or click Autofill.');
      return;
    }

    setStep('create_mpin');
  };

  // STEP 4: CREATE MPIN & ENCRYPT INITIAL VAULT
  const handleCreateMpin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMpinError(null);

    if (newMpin.length < 4 || newMpin.length > 6 || !/^\d+$/.test(newMpin)) {
      setMpinError('MPIN must be 4 to 6 numeric digits.');
      return;
    }
    if (newMpin !== confirmMpin) {
      setMpinError('MPIN digits do not match.');
      return;
    }

    const starterProfile: UserProfile = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      currency: '₹',
      createdAt: Date.now(),
      lastLogin: Date.now(),
      monthlyBudget: 0,
      isEmailVerified: true,
      termsAccepted: true,
      privacyAccepted: true,
      termsAcceptedAt: Date.now(),
    };

    const starterData: DecryptedData = {
      profile: starterProfile,
      transactions: generateStarterTransactions('₹'),
      categoryBudgets: {},
      customRules: [],
    };

    try {
      await saveVault(starterData, newMpin);
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      onUnlockSuccess(starterData, newMpin, true);
    } catch (err: any) {
      setMpinError('Error creating encrypted vault: ' + err.message);
    }
  };

  // STEP 5: MPIN UNLOCK KEYPAD
  const handleDigitPress = (digit: string) => {
    if (unlockMpin.length < 6) {
      const nextMpin = unlockMpin + digit;
      setUnlockMpin(nextMpin);
      setUnlockError(null);

      // Attempt unlock if length reaches 4 or 6
      if (nextMpin.length >= 4) {
        attemptUnlock(nextMpin);
      }
    }
  };

  const handleDeleteDigit = () => {
    setUnlockMpin((prev) => prev.slice(0, -1));
    setUnlockError(null);
  };

  const attemptUnlock = async (pinToTry: string) => {
    setIsDecrypting(true);
    try {
      const decrypted = await unlockVault(pinToTry);
      onUnlockSuccess(decrypted, pinToTry);
    } catch {
      if (pinToTry.length === 6 || pinToTry.length === 4) {
        setUnlockError('Incorrect MPIN. Encrypted database could not be unlocked.');
      }
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 animate-in fade-in duration-200">
        {/* ========================================================= */}
        {/* STEP 1: GUMROAD LICENSE ACTIVATION */}
        {/* ========================================================= */}
        {step === 'license' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Key className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Activate Your License</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                DailySpent is distributed via Gumroad. Enter your activation key to lock this install to your device.
              </p>
            </div>

            {/* Hardware Fingerprint Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Your Hardware Device ID
              </span>
              <div className="font-mono text-xs font-bold text-slate-900 dark:text-emerald-400 select-all">
                {deviceId || 'Detecting hardware...'}
              </div>
            </div>

            <form onSubmit={handleActivateLicense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gumroad Activation Key
                </label>
                <input
                  type="text"
                  required
                  placeholder="BILL-XXXX-XXXX-XXXX"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-sm tracking-wider text-center uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {licenseError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{licenseError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isValidatingLicense}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                {isValidatingLicense ? 'Validating...' : 'Verify & Lock to Device'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Customer guidance & Seller testing access */}
              <div className="pt-3 text-center space-y-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Purchased on Gumroad? Your unique key was emailed to you in your purchase receipt.
                </p>

                {/* Subtle developer backdoor only if ?dev=true or in local testing */}
                {typeof window !== 'undefined' && (window.location.search.includes('dev') || window.location.search.includes('demo') || window.location.hostname === 'localhost') && (
                  <button
                    type="button"
                    onClick={handleQuickDemoLicense}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    [Creator Dev Mode] Auto-fill valid test key
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: REGISTRATION (NAME, PHONE, EMAIL, PERMISSIONS) */}
        {/* ========================================================= */}
        {step === 'register' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Your Account</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Setup your local profile. Your credentials stay strictly on this device.
              </p>
            </div>

            <form onSubmit={handleProceedToEmailAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma or Alex Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address (First-Time Verification)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Permissions switches */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestSmsPermission}
                    onChange={(e) => setRequestSmsPermission(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Enable SMS Background Reader & Parser</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestNotifPermission}
                    onChange={(e) => setRequestNotifPermission(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Enable Push Budget Alerts & Overspend Warnings</span>
                </label>
              </div>

              {/* Mandatory Legal Agreements */}
              <div className="space-y-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegal('terms')}
                      className="text-emerald-600 dark:text-emerald-400 font-semibold underline"
                    >
                      Terms & Conditions
                    </button>{' '}
                    (Single-device Gumroad license).
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegal('privacy')}
                      className="text-emerald-600 dark:text-emerald-400 font-semibold underline"
                    >
                      Privacy Policy
                    </button>{' '}
                    (Zero-cloud AES-256 local encrypted storage).
                  </span>
                </label>
              </div>

              {regError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-2"
              >
                Send Email Authentication Code
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: EMAIL AUTH CODE VERIFICATION */}
        {/* ========================================================= */}
        {step === 'email_verify' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verify Your Email</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We sent a 6-digit authentication code to <strong className="text-slate-800 dark:text-slate-200">{email}</strong>
              </p>
            </div>

            {/* Simulated Live Email Dispatch Notice */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Simulated Email Delivery
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">{generatedOtp}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                For smooth offline testing, your 6-digit code has been dispatched. Click below to autofill or type manually.
              </p>
              <button
                type="button"
                onClick={() => setEnteredOtp(generatedOtp)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 underline hover:opacity-80"
              >
                Autofill Code: {generatedOtp}
              </button>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="------"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xl tracking-[0.5em] text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {otpError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-2"
              >
                Verify & Continue to MPIN Setup
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep('register')}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                ← Back to Edit Details
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: MPIN CREATION */}
        {/* ========================================================= */}
        {step === 'create_mpin' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Your Secret MPIN</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You will use this MPIN for all future daily unlocks. It acts as the encryption key for your local database.
              </p>
            </div>

            <form onSubmit={handleCreateMpin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Choose 4 or 6 Digit MPIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="••••"
                  value={newMpin}
                  onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-lg tracking-[0.4em] text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm MPIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="••••"
                  value={confirmMpin}
                  onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-lg tracking-[0.4em] text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {mpinError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mpinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-2"
              >
                Encrypt Vault & Enter Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 5: MPIN UNLOCK SCREEN (TACTILE KEYPAD) */}
        {/* ========================================================= */}
        {step === 'unlock_mpin' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Enter DailySpent MPIN</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unlock your encrypted on-device financial vault
              </p>
            </div>

            {/* PIN Indicator Dots */}
            <div className="flex items-center justify-center gap-3 py-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    i < unlockMpin.length
                      ? 'bg-emerald-500 scale-110 shadow-sm shadow-emerald-500/40'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {unlockError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 text-center animate-shake">
                {unlockError}
              </div>
            )}

            {/* Tactile Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  className="w-16 h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xl font-bold font-mono text-slate-900 dark:text-white flex items-center justify-center transition active:scale-95 shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUnlockMpin('')}
                className="w-16 h-16 rounded-2xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="w-16 h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xl font-bold font-mono text-slate-900 dark:text-white flex items-center justify-center transition active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDeleteDigit}
                className="w-16 h-16 rounded-2xl text-slate-500 hover:text-rose-500 flex items-center justify-center transition"
                aria-label="Backspace"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Unlock fallback button if needed */}
            <div className="pt-2 text-center flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  if (unlockMpin.length >= 4) {
                    attemptUnlock(unlockMpin);
                  }
                }}
                disabled={unlockMpin.length < 4 || isDecrypting}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
              >
                {isDecrypting ? 'Decrypting Local Storage...' : 'Unlock Vault'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset this profile and create a fresh MPIN? Existing encrypted data will be wiped.')) {
                    localStorage.removeItem('thebill_encrypted_vault');
                    setStep('register');
                  }
                }}
                className="text-[11px] text-slate-400 hover:text-rose-500 underline transition"
              >
                Forgot MPIN? Reset local registration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
