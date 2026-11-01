import React, { useState, useEffect } from 'react';
import {
  X,
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
} from 'lucide-react';
import { DecryptedData, TransactionCategory } from '../types';
import { CATEGORY_INFO } from '../services/smsParser';
import { getDeviceFingerprint } from '../services/crypto';
import { generateActivationKeyForDevice, getStoredLicense, storeLicense } from '../services/license';
import { saveVault, wipeAllLocalData } from '../services/vaultStorage';
import { smsService } from '../services/smsListener';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DecryptedData;
  activeMpin: string;
  onDataUpdated: (newData: DecryptedData, newMpin?: string) => void;
  onWipeData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  data,
  activeMpin,
  onDataUpdated,
  onWipeData,
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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    getDeviceFingerprint().then((id) => {
      setMyDeviceId(id);
      setGeneratorTargetDeviceId(id);
    });
    setNotificationPermission(smsService.getNotificationPermission());
  }, []);

  if (!isOpen) return null;

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

  const handleExportBackup = () => {
    const vaultRaw = localStorage.getItem('thebill_encrypted_vault');
    if (!vaultRaw) return;
    const blob = new Blob([vaultRaw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TheBill_Encrypted_Backup_${new Date().toISOString().slice(0, 10)}.thebill`;
    a.click();
    URL.revokeObjectURL(url);
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
      data.profile.currency || '₹',
      t.accountMasked || '',
      t.balanceAfter || '',
      t.paymentMethod,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TheBill_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentLicense = getStoredLicense();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Settings & Security Vault</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure budgets, MPIN, and licensing tools</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl my-4 shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('budget')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'budget'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Budgets & Currency
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'security'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            MPIN & Lock
          </button>
          <button
            onClick={() => setActiveTab('licensing')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'licensing'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Gumroad Key Gen
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'data'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Backup & Export
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto py-2 pr-1 space-y-6 text-sm text-slate-700 dark:text-slate-300">
          {/* TAB 1: Budgets */}
          {activeTab === 'budget' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Currency Symbol
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
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
                    Monthly Spending Budget Cap
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">{currency}</span>
                    <input
                      type="number"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Notification Permissions Check */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Push & Budget Alerts</h4>
                    <p className="text-[11px] text-slate-500">
                      Current permission status: <strong className="capitalize">{notificationPermission}</strong>
                    </p>
                  </div>
                </div>
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={handleRequestPush}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                  >
                    Enable Alerts
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {savedSuccess && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Saved to encrypted vault!</span>}
                <button
                  onClick={handleSaveBudget}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
                >
                  <Save className="w-4 h-4" /> Save Budgets
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MPIN Security */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Changing your MPIN generates a fresh cryptographic key via PBKDF2 and re-encrypts all transactions stored locally.
                </span>
              </div>

              <form onSubmit={handleChangeMpin} className="space-y-4">
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
                  Update MPIN & Re-Encrypt
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Gumroad Key Gen (Creator & Anti-Reselling Tool) */}
          {activeTab === 'licensing' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Creator / Gumroad License Generator
                </div>
                <p>
                  Because TheBill is sold directly on Gumroad outside Google Play, each customer's activation key is mathematically locked to their specific hardware Device ID to prevent reselling.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">
                  This Device Identifier
                </span>
                <div className="flex items-center justify-between font-mono text-xs font-bold text-slate-900 dark:text-emerald-400">
                  <span>{myDeviceId}</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                    {currentLicense?.status === 'valid' ? 'Active License' : 'Unactivated'}
                  </span>
                </div>
              </div>

              {/* Generator Tool */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Issue Device-Locked Key (For Sellers & Testing)
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Device ID
                  </label>
                  <input
                    type="text"
                    value={generatorTargetDeviceId}
                    onChange={(e) => setGeneratorTargetDeviceId(e.target.value)}
                    placeholder="e.g. DEV-821A-49BF-11C2"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="text-xs font-semibold">License Tier:</label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="plan"
                      checked={generatorPlan === 'Pro License'}
                      onChange={() => setGeneratorPlan('Pro License')}
                    />
                    Pro License (Lifetime)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="plan"
                      checked={generatorPlan === 'Lifetime Standard'}
                      onChange={() => setGeneratorPlan('Lifetime Standard')}
                    />
                    Standard Tier
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateKey}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow flex items-center justify-center gap-1.5"
                >
                  <Key className="w-4 h-4" /> Generate Device Activation Key
                </button>

                {generatedKey && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 mt-3">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                      Generated Activation Key for {generatorTargetDeviceId}:
                    </span>
                    <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-lg font-mono text-sm font-bold text-emerald-500">
                      <span>{generatedKey}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedKey);
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-slate-300"
                        title="Copy Key"
                      >
                        {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {generatorTargetDeviceId === myDeviceId && (
                      <button
                        onClick={handleApplyGeneratedKeyToSelf}
                        className="w-full py-1.5 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 underline hover:opacity-80 transition"
                      >
                        Apply this key directly to this device now
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Data & Export */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                  Encrypted Vault Backup
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Download an offline snapshot of your encrypted database. The resulting file cannot be opened without your MPIN.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleExportBackup}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" /> Download Encrypted Vault (.thebill)
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" /> Export Transactions as CSV
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
                  Danger Zone
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Irreversibly wipe all local device transaction ciphertext, license activation, and MPIN from this browser.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Are you absolutely sure you want to wipe all local data? Make sure you have exported a backup.')) {
                      wipeAllLocalData();
                      onWipeData();
                      onClose();
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
    </div>
  );
};
