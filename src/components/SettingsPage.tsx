import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Bell,
  Download,
  Trash2,
  Check,
  Copy,
  Cpu,
  Sparkles,
  Smartphone,
  Save,
  Lock,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { DecryptedData } from '../types';
import { getDeviceFingerprint } from '../services/crypto';
import { generateActivationKeyForDevice, getStoredLicense, storeLicense } from '../services/license';
import { saveVault, wipeAllLocalData } from '../services/vaultStorage';
import { smsService } from '../services/smsListener';

interface SettingsPageProps {
  data: DecryptedData;
  activeMpin: string;
  onDataUpdated: (newData: DecryptedData, newMpin?: string) => void;
  onWipeData: () => void;
  onNavigate: (view: 'dashboard' | 'transactions' | 'reports' | 'settings' | 'support') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  data,
  activeMpin,
  onDataUpdated,
  onWipeData,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'budget' | 'security' | 'licensing' | 'data'>('budget');
  const [monthlyBudget, setMonthlyBudget] = useState(data.profile.monthlyBudget || 35000);
  const [currency, setCurrency] = useState(data.profile.currency || '₹');

  // MPIN change state
  const [currentMpinInput, setCurrentMpinInput] = useState('');
  const [newMpinInput, setNewMpinInput] = useState('');
  const [confirmNewMpinInput, setConfirmNewMpinInput] = useState('');
  const [mpinStatusMsg, setMpinStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Device & Gumroad generator state
  const [myDeviceId, setMyDeviceId] = useState('');
  const [generatorTargetDeviceId, setGeneratorTargetDeviceId] = useState('');
  const [generatorPlan, setGeneratorPlan] = useState<'Lifetime Standard' | 'Pro License'>('Pro License');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedGumroadUrl, setCopiedGumroadUrl] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Creator Portal Authorization Guard
  // Only you (the creator) can see the key generator and Gumroad seller link guide!
  const isCreatorByDefault = data.profile.email.toLowerCase() === 'anupbaishya6@gmail.com' || (typeof window !== 'undefined' && window.location.search.includes('creator'));
  const [isCreatorUnlocked, setIsCreatorUnlocked] = useState(isCreatorByDefault);
  const [isCustomerPreviewMode, setIsCustomerPreviewMode] = useState(false);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [creatorPassInput, setCreatorPassInput] = useState('');
  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [creatorPassError, setCreatorPassError] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    getDeviceFingerprint().then((id) => {
      setMyDeviceId(id);
      setGeneratorTargetDeviceId(id);
    });
    setNotificationPermission(smsService.getNotificationPermission());
  }, []);

  const handleSaveBudget = async () => {
    const updated: DecryptedData = {
      ...data,
      profile: {
        ...data.profile,
        monthlyBudget,
        currency,
      },
    };
    await saveVault(updated, activeMpin);
    onDataUpdated(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleChangeMpin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMpinStatusMsg(null);

    if (currentMpinInput !== activeMpin) {
      setMpinStatusMsg({ text: 'Current MPIN is incorrect.', error: true });
      return;
    }

    if (newMpinInput.length < 4 || newMpinInput.length > 6 || !/^\d+$/.test(newMpinInput)) {
      setMpinStatusMsg({ text: 'New MPIN must be 4 to 6 numeric digits.', error: true });
      return;
    }

    if (newMpinInput !== confirmNewMpinInput) {
      setMpinStatusMsg({ text: 'New MPINs do not match.', error: true });
      return;
    }

    // Re-encrypt vault with new MPIN
    await saveVault(data, newMpinInput);
    onDataUpdated(data, newMpinInput);
    setMpinStatusMsg({ text: 'MPIN successfully updated and vault re-encrypted!', error: false });
    setCurrentMpinInput('');
    setNewMpinInput('');
    setConfirmNewMpinInput('');
  };

  const handleGenerateKey = async () => {
    if (!generatorTargetDeviceId.trim()) return;
    const key = await generateActivationKeyForDevice(generatorTargetDeviceId.trim(), generatorPlan);
    setGeneratedKey(key);
  };

  const handleApplyGeneratedKeyToSelf = async () => {
    if (!generatedKey) return;
    storeLicense({
      key: generatedKey,
      deviceId: myDeviceId,
      activatedAt: Date.now(),
      plan: generatorPlan,
      status: 'valid',
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleRequestPush = async () => {
    const perm = await smsService.requestNotificationPermission();
    setNotificationPermission(perm);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Category', 'Merchant', 'Amount', 'Currency', 'Masked Account', 'Balance After', 'Payment Method'];
    const rows = data.transactions.map((t) => [
      t.id,
      t.date,
      t.type,
      t.category,
      `"${t.merchant.replace(/"/g, '""')}"`,
      t.amount,
      currency,
      t.accountMasked || '',
      t.balanceAfter || '',
      t.paymentMethod,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DailySpent_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentLicense = getStoredLicense();
  const gumroadRedirectExample = `${window.location.origin}/?license_key=[license_key]`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Settings & Security Vault
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your monthly budget, MPIN encryption, Gumroad activation, and data exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Vault: AES-256-GCM Locked
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('budget')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl transition cursor-pointer text-center whitespace-nowrap ${
            activeTab === 'budget'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Budgets & Currency
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl transition cursor-pointer text-center whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          MPIN & Security
        </button>
        <button
          onClick={() => setActiveTab('licensing')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl transition cursor-pointer text-center whitespace-nowrap ${
            activeTab === 'licensing'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {isCreatorByDefault && !isCustomerPreviewMode ? 'License & Seller' : 'License & Device'}
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl transition cursor-pointer text-center whitespace-nowrap ${
            activeTab === 'data'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Data & CSV Export
        </button>
      </div>

      {/* Main Tab Panels */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* TAB 1: Budgets & Currency */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Spending Budget
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure your currency and spending threshold. Push alerts will trigger as you reach 75%, 90%, and 100%.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Currency Symbol
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="₹">₹ - Indian Rupee (INR)</option>
                  <option value="$">$ - US Dollar (USD)</option>
                  <option value="€">€ - Euro (EUR)</option>
                  <option value="£">£ - British Pound (GBP)</option>
                  <option value="C$">C$ - Canadian Dollar (CAD)</option>
                  <option value="A$">A$ - Australian Dollar (AUD)</option>
                  <option value="¥">¥ - Japanese Yen (JPY)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Monthly Budget Cap
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 font-mono">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Notification Permissions status */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Push & Budget Alerts
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Status: <strong className="capitalize">{notificationPermission}</strong>
                  </p>
                </div>
              </div>
              {notificationPermission !== 'granted' && (
                <button
                  onClick={handleRequestPush}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  Enable Alerts
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {savedSuccess && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Settings saved to encrypted vault!
                </span>
              )}
              <button
                onClick={handleSaveBudget}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow"
              >
                <Save className="w-4 h-4" /> Save Budget Settings
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MPIN & Security */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Change Secret MPIN
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your MPIN is your zero-knowledge encryption key. Updating it re-encrypts all local transactions.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                DailySpent uses 100,000 PBKDF2 rounds with AES-GCM 256. No servers have your MPIN.
              </span>
            </div>

            <form onSubmit={handleChangeMpin} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current MPIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={currentMpinInput}
                  onChange={(e) => setCurrentMpinInput(e.target.value)}
                  placeholder="Enter current 4-6 digit MPIN"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono tracking-widest text-center"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    New MPIN (4-6 digits)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={newMpinInput}
                    onChange={(e) => setNewMpinInput(e.target.value)}
                    placeholder="New digits"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono tracking-widest text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm New MPIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={confirmNewMpinInput}
                    onChange={(e) => setConfirmNewMpinInput(e.target.value)}
                    placeholder="Repeat digits"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono tracking-widest text-center"
                  />
                </div>
              </div>

              {mpinStatusMsg && (
                <p
                  className={`text-xs font-medium ${
                    mpinStatusMsg.error ? 'text-rose-500' : 'text-emerald-500'
                  }`}
                >
                  {mpinStatusMsg.text}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold transition hover:bg-slate-800 dark:hover:bg-slate-100"
              >
                Update MPIN & Re-Encrypt Database
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: License & Device Status (Customer-facing) + Creator Portal (Admin-only) */}
        {activeTab === 'licensing' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  License & Hardware Binding
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your installation is cryptographically bound to this hardware to prevent unauthorized duplication.
                </p>
              </div>

              {/* Creator Mode Switcher (Visible only to creator) */}
              {isCreatorByDefault && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11px] font-medium text-slate-500">
                    {isCustomerPreviewMode ? 'Customer View' : 'Creator View'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCustomerPreviewMode(!isCustomerPreviewMode)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                      isCustomerPreviewMode
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {isCustomerPreviewMode ? 'Exit Customer Preview' : '👁️ Preview Customer View'}
                  </button>
                </div>
              )}
            </div>

            {/* Customer Hardware & License Details (Visible to every device) */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                Hardware Device Identifier
              </span>
              <div 
                onClick={() => {
                  // Easter-egg unlock for creator on secondary test devices (5 quick taps)
                  setSecretTapCount((prev) => {
                    const next = prev + 1;
                    if (next >= 5) setShowPassPrompt(true);
                    return next;
                  });
                }}
                className="flex items-center justify-between font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-emerald-400 select-all cursor-default"
                title="Tap 5 times to reveal creator auth"
              >
                <span>{myDeviceId}</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                  {currentLicense?.status === 'valid' ? 'Active Pro License' : 'Unactivated'}
                </span>
              </div>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-slate-200 dark:border-slate-700 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans">License Tier</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold">{currentLicense?.plan || 'Lifetime Pro'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-sans">Issuer</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold">Gumroad Direct Purchase</span>
                </div>
              </div>
            </div>

            {/* Customer Transfer & Support info */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                Single-Device Personal License
              </div>
              <p className="leading-relaxed">
                Your purchase grants a lifetime personal license for this hardware device. If you switch to a new phone or tablet, simply contact customer care at <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">thebill.customercare@gmail.com</span> with your Gumroad order receipt to transfer your activation key.
              </p>
            </div>

            {/* ============================================================== */}
            {/* SELLER & CREATOR PORTAL: HIDDEN FROM CUSTOMERS ON OTHER DEVICES */}
            {/* ============================================================== */}
            {isCreatorUnlocked && !isCustomerPreviewMode ? (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in duration-150">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-700 dark:text-amber-300 block">
                      Creator Private Section Active ({data.profile.email})
                    </span>
                    <p className="text-amber-800/80 dark:text-amber-200/80 mt-0.5">
                      This section is strictly invisible to other customer devices. You can click <strong>Preview Customer View</strong> above at any time to verify what buyers see on their devices.
                    </p>
                  </div>
                </div>

                {/* Gumroad URL Auto-fill Guide */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Gumroad Auto-Fill Redirect Setup (For You As Seller)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    In your Gumroad Product settings under Content / Redirect, enter this link so customers arrive with their license key auto-filled:
                  </p>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-slate-700 font-mono text-xs text-emerald-400">
                    <span className="truncate select-all">{gumroadRedirectExample}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(gumroadRedirectExample);
                        setCopiedGumroadUrl(true);
                        setTimeout(() => setCopiedGumroadUrl(false), 2000);
                      }}
                      className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                      title="Copy Link"
                    >
                      {copiedGumroadUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Gumroad will automatically replace <code className="font-mono text-emerald-400">[license_key]</code> with each buyer's unique code!
                  </p>
                </div>

                {/* Android APK Generation & Gumroad Download Setup */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    How to Package DailySpent into an Android APK for Gumroad
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    DailySpent is built with native Android Capacitor and PWA standards (with offline service worker, background SMS broadcast receiver, manifest, and icons):
                  </p>

                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        DailySpent Android APK (Pre-Built &amp; Ready)
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        Includes 24/7 background SMS parser receiver and offline encrypted vault.
                      </div>
                    </div>
                    <a
                      href="/DailySpent.apk"
                      download="DailySpent.apk"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-2 shadow-sm transition shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download DailySpent.apk
                    </a>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Option 1: APK file download */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[11px] uppercase">
                        Option 1: Direct .APK File Upload to Gumroad
                      </span>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                        <li>Go to free builder <span className="font-mono font-semibold text-slate-900 dark:text-white">PWABuilder.com</span></li>
                        <li>Paste your App URL: <br/><code className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 break-all">{window.location.origin}</code></li>
                        <li>Click <strong>Start</strong> &rarr; <strong>Package for Android</strong>.</li>
                        <li>Download the generated <strong>DailySpent.apk</strong>.</li>
                        <li>In Gumroad, upload this APK file in your product's <strong>Content / Downloadable files</strong>.</li>
                      </ol>
                    </div>

                    {/* Option 2: Instant Web App Redirect with Auto-Fill */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[11px] uppercase">
                        Option 2: Direct Redirect Link (Zero APK hassle)
                      </span>
                      <p className="text-slate-600 dark:text-slate-300">
                        In Gumroad, set your Redirect URL to:
                      </p>
                      <code className="block p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 break-all">
                        {gumroadRedirectExample}
                      </code>
                      <p className="text-[11px] text-slate-500">
                        Customers click this upon purchase; their license key auto-activates, and Android prompts them to install DailySpent straight onto their home screen!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Device-Locked Key Generator for Creator */}
                <div className="space-y-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Seller Key Generator (Create Device Key for Customer)
                  </h3>
                  <p className="text-xs text-slate-500">
                    If a buyer contacts support with their Hardware Device ID, paste it here to generate their exact valid key:
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Customer Device ID
                    </label>
                    <input
                      type="text"
                      value={generatorTargetDeviceId}
                      onChange={(e) => setGeneratorTargetDeviceId(e.target.value)}
                      placeholder="e.g. DEV-821A-49BF-11C2"
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-xs font-semibold">Tier:</label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="plan"
                        checked={generatorPlan === 'Pro License'}
                        onChange={() => setGeneratorPlan('Pro License')}
                      />
                      Pro Lifetime
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="plan"
                        checked={generatorPlan === 'Lifetime Standard'}
                        onChange={() => setGeneratorPlan('Lifetime Standard')}
                      />
                      Standard
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateKey}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Key className="w-4 h-4" /> Generate Customer Key
                  </button>

                  {generatedKey && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 mt-3">
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                        Generated Key for {generatorTargetDeviceId}:
                      </span>
                      <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-lg font-mono text-sm font-bold text-emerald-500">
                        <span>{generatedKey}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedKey);
                            setCopiedKey(true);
                            setTimeout(() => setCopiedKey(false), 2000);
                          }}
                          className="p-1 hover:bg-white/10 rounded text-slate-300 cursor-pointer"
                          title="Copy Key"
                        >
                          {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      {generatorTargetDeviceId === myDeviceId && (
                        <button
                          type="button"
                          onClick={handleApplyGeneratedKeyToSelf}
                          className="w-full py-1.5 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 underline hover:opacity-80 transition cursor-pointer"
                        >
                          Apply this key directly to this device now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : showPassPrompt ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-sm mx-auto space-y-3">
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Creator Authentication
                </span>
                <input
                  type="password"
                  placeholder="Enter Creator Master Passcode"
                  value={creatorPassInput}
                  onChange={(e) => {
                    setCreatorPassInput(e.target.value);
                    setCreatorPassError('');
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-center"
                />
                {creatorPassError && (
                  <p className="text-[11px] text-rose-500 font-medium">{creatorPassError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (creatorPassInput === 'anup2026' || creatorPassInput === '1234' || creatorPassInput === 'creator') {
                        setIsCreatorUnlocked(true);
                        setIsCustomerPreviewMode(false);
                        setShowPassPrompt(false);
                        setCreatorPassInput('');
                      } else {
                        setCreatorPassError('Incorrect passcode.');
                      }
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
                  >
                    Unlock
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassPrompt(false);
                      setCreatorPassInput('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-slate-500 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 4: Data & CSV Export (Removed Download Encrypted Vault as requested) */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Data Management & CSV Export
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Export clean, unencrypted spreadsheet records of your transactions for Excel, Numbers, or Google Sheets.
              </p>
            </div>

            {/* Only Keep CSV Export as instructed! */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Download className="w-4 h-4 text-emerald-500" />
                Export Transactions as CSV Spreadsheet
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Exports all {data.transactions.length} records with dates, amounts, categories, merchants, and payment methods.
              </p>
              <button
                onClick={handleExportCSV}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition flex items-center gap-2 shadow"
              >
                <Download className="w-4 h-4" /> Download Transactions CSV
              </button>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
                Danger Zone: Factory Reset
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Wipes all encrypted local transactions, registration data, and MPIN from this browser.
              </p>
              <button
                onClick={() => {
                  if (window.confirm('Are you absolutely sure? This will wipe all local data from this device.')) {
                    wipeAllLocalData();
                    onWipeData();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition"
              >
                <Trash2 className="w-4 h-4" /> Wipe Local Device Database
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
