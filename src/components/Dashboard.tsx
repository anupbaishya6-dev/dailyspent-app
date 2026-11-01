import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Plus,
  MessageSquare,
  Bell,
  ArrowRight,
  Shield,
  Lock,
  ChevronRight,
  Zap,
  Sparkles,
  Calendar,
  Layers,
  CreditCard,
  ShoppingBag,
  Utensils,
  Car,
  Film,
  Clipboard,
  Zap as ZapIcon,
} from 'lucide-react';
import { DecryptedData, Transaction, TransactionCategory } from '../types';
import { CATEGORY_INFO, SAMPLE_BANK_SMS } from '../services/smsParser';
import { smsService } from '../services/smsListener';
import { saveVault } from '../services/vaultStorage';
import { ManualAddModal } from './ManualAddModal';
import { TransactionDetailModal } from './TransactionDetailModal';

interface DashboardProps {
  data: DecryptedData;
  activeMpin: string;
  onUpdateData: (newData: DecryptedData) => void;
  onNavigate: (view: 'dashboard' | 'transactions' | 'reports' | 'settings' | 'support') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  activeMpin,
  onUpdateData,
  onNavigate,
}) => {
  const currency = data.profile.currency || '₹';
  const monthlyBudget = data.profile.monthlyBudget || 0;

  // Modals state
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [inspectingTx, setInspectingTx] = useState<Transaction | null>(null);

  // Background daemon & SMS simulation state
  const [isBackgroundActive, setIsBackgroundActive] = useState(false);
  const [customSmsInput, setCustomSmsInput] = useState('');
  const [showSmsPanel, setShowSmsPanel] = useState(false);
  const [recentCapturedToast, setRecentCapturedToast] = useState<{ tx: Transaction; msg: string } | null>(null);

  // Register SMS Notification listener callback
  useEffect(() => {
    smsService.setCallbacks(
      (newTx, rawMsg) => {
        const updatedList = [newTx, ...data.transactions];
        const updated: DecryptedData = {
          ...data,
          transactions: updatedList,
        };
        saveVault(updated, activeMpin).then(() => {
          onUpdateData(updated);
        });

        // Show live notification toast
        setRecentCapturedToast({ tx: newTx, msg: rawMsg });
        setTimeout(() => setRecentCapturedToast(null), 5000);
      },
      (msg, threshold) => {
        console.log(`[Budget Alert ${threshold}%]:`, msg);
      }
    );
  }, [data, activeMpin, onUpdateData]);

  // Auto-import any SMS staged from the landing page demo
  useEffect(() => {
    const pendingSms = sessionStorage.getItem('dailyspent_pending_sms');
    if (pendingSms) {
      sessionStorage.removeItem('dailyspent_pending_sms');
      const timer = setTimeout(() => {
        smsService.processIncomingSMS(pendingSms, currency);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currency]);

  // Aggregate monthly figures
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayDateStr = now.toISOString().slice(0, 10);

  const currentMonthTransactions = useMemo(() => {
    return data.transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [data.transactions, currentYear, currentMonth]);

  const totalSpentThisMonth = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'debit' || t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  // ONLY TODAY'S TRANSACTIONS (as requested by user)
  const todayTransactions = useMemo(() => {
    return data.transactions.filter((t) => t.date.slice(0, 10) === todayDateStr);
  }, [data.transactions, todayDateStr]);

  const todaySpend = useMemo(() => {
    return todayTransactions
      .filter((t) => t.type === 'debit' || t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [todayTransactions]);

  // Evaluate budget triggers
  useEffect(() => {
    if (monthlyBudget > 0) {
      smsService.evaluateBudgetLimits(totalSpentThisMonth, monthlyBudget, currency);
    }
  }, [totalSpentThisMonth, monthlyBudget, currency]);

  // Spending by category for current month
  const categorySpending = useMemo(() => {
    const map: Partial<Record<TransactionCategory, number>> = {};
    for (const t of currentMonthTransactions) {
      if (t.type === 'debit' || t.type === 'withdrawal') {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    }
    return map;
  }, [currentMonthTransactions]);

  const topCategoryEntry = useMemo(() => {
    const entries = Object.entries(categorySpending) as [TransactionCategory, number][];
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0];
  }, [categorySpending]);

  const budgetProgressPercent = monthlyBudget > 0
    ? Math.min(Math.round((totalSpentThisMonth / monthlyBudget) * 100), 100)
    : 0;
  const remainingBudget = Math.max(monthlyBudget - totalSpentThisMonth, 0);

  // Handlers
  const handleAddManualTx = async (tx: Transaction) => {
    const updated: DecryptedData = {
      ...data,
      transactions: [tx, ...data.transactions],
    };
    await saveVault(updated, activeMpin);
    onUpdateData(updated);
  };

  const handleUpdateTxCategory = async (txId: string, newCategory: TransactionCategory) => {
    const updatedTxList = data.transactions.map((t) =>
      t.id === txId ? { ...t, category: newCategory } : t
    );
    const updated: DecryptedData = {
      ...data,
      transactions: updatedTxList,
    };
    await saveVault(updated, activeMpin);
    onUpdateData(updated);
  };

  const handleDeleteTx = async (txId: string) => {
    const updatedTxList = data.transactions.filter((t) => t.id !== txId);
    const updated: DecryptedData = {
      ...data,
      transactions: updatedTxList,
    };
    await saveVault(updated, activeMpin);
    onUpdateData(updated);
  };

  const handleTestSampleSms = (smsText: string) => {
    smsService.processIncomingSMS(smsText, currency);
  };

  const [smsError, setSmsError] = useState<string | null>(null);

  const handleCustomSmsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSmsInput.trim()) return;
    const res = smsService.processIncomingSMS(customSmsInput, currency);
    if (!res) {
      setSmsError('Could not find debit/spent/withdrawal pattern in this SMS text. Ensure an amount and financial verb is included.');
      setTimeout(() => setSmsError(null), 5000);
    } else {
      setCustomSmsInput('');
      setSmsError(null);
    }
  };

  const handlePasteClipboard = async () => {
    setSmsError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setCustomSmsInput(text.trim());
        const res = smsService.processIncomingSMS(text.trim(), currency);
        if (!res) {
          setSmsError('SMS format unrecognized. Please check text or enter manually.');
          setTimeout(() => setSmsError(null), 5000);
        } else {
          setCustomSmsInput('');
        }
      } else {
        setSmsError('Clipboard is empty. Copy the bank SMS message first!');
        setTimeout(() => setSmsError(null), 4000);
      }
    } catch {
      setSmsError('Clipboard permission needed. Tap and paste into the box below.');
      setTimeout(() => setSmsError(null), 4000);
    }
  };

  const handleToggleBackground = () => {
    if (isBackgroundActive) {
      smsService.stopBackgroundSimulation();
      setIsBackgroundActive(false);
    } else {
      smsService.startBackgroundSimulation(30, currency);
      setIsBackgroundActive(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-150">
      {/* Live Captured Notification Toast */}
      {recentCapturedToast && (
        <div className="fixed top-16 right-4 z-50 max-w-sm bg-slate-900 text-white border border-emerald-500/40 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">Incoming SMS Processed</span>
                <span className="text-[10px] text-slate-400">Just now</span>
              </div>
              <div className="text-sm font-bold">
                {recentCapturedToast.tx.type === 'withdrawal' ? 'Withdrawn' : 'Debited'} {currency}
                {recentCapturedToast.tx.amount.toLocaleString()} at {recentCapturedToast.tx.merchant}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                Categorized as {CATEGORY_INFO[recentCapturedToast.tx.category]?.label}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner: Local Encrypted Security & SMS Listener Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                {data.profile.name}'s Vault
              </h1>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                AES-256 Encrypted
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              DailySpent active · All data stays locally on your device
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Clipboard className="w-4 h-4 text-emerald-500" />
            <span>📋 Paste Copied SMS</span>
          </button>

          <button
            onClick={() => setShowSmsPanel(!showSmsPanel)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            SMS Capture Panel
          </button>

          <button
            onClick={() => setIsManualAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Manually
          </button>
        </div>
      </div>

      {/* SMS Capture & Simulator Drawer */}
      {showSmsPanel && (
        <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-xl animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Live Bank SMS Capture & Simulation
              </h3>
              <p className="text-xs text-slate-400">
                Click any bank to simulate an incoming SMS, or paste custom text:
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300">Run in Background:</span>
              <button
                onClick={handleToggleBackground}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  isBackgroundActive ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isBackgroundActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Quick Bank Presets */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
              1-Click Bank Notification Simulation:
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_BANK_SMS.map((sample) => (
                <button
                  key={sample.bank}
                  onClick={() => handleTestSampleSms(sample.text)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 hover:border-emerald-500/50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  {sample.bank} ({sample.categoryName})
                </button>
              ))}
            </div>
          </div>

          {/* Custom SMS Paste Form */}
          <div className="space-y-2 pt-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
              >
                <Clipboard className="w-4 h-4 text-emerald-400" />
                <span>📋 Paste from Clipboard</span>
              </button>

              <form onSubmit={handleCustomSmsSubmit} className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Or paste SMS: e.g. A/C debited by 11.00 trf to..."
                  value={customSmsInput}
                  onChange={(e) => setCustomSmsInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
                >
                  Capture
                </button>
              </form>
            </div>

            {smsError && (
              <p className="text-xs text-amber-400 font-medium animate-in fade-in">
                {smsError}
              </p>
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
              💡 <strong>How SMS Tracking works on Web & PWA</strong>: Android’s OS security strictly prohibits web browsers from silently reading private text messages in the phone's background. Simply copy any bank SMS from your messages app and tap <strong>Paste from Clipboard</strong> (or tap your bank preset above) to parse it in 1 second!
            </p>
          </div>
        </div>
      )}

      {/* KPI Stat Cards (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Spent This Month */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Spent This Month</span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
            {currency}{totalSpentThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Budget: {currency}{monthlyBudget.toLocaleString()}</span>
            {monthlyBudget > 0 && (
              <span
                className={`font-semibold ${
                  budgetProgressPercent >= 90
                    ? 'text-rose-500'
                    : budgetProgressPercent >= 75
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}
              >
                {budgetProgressPercent}%
              </span>
            )}
          </div>
          {monthlyBudget > 0 && (
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  budgetProgressPercent >= 90
                    ? 'bg-rose-500'
                    : budgetProgressPercent >= 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetProgressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Metric 2: Today's Spend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Today's Expenses</span>
            <Calendar className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
            {currency}{todaySpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {todayTransactions.length} items recorded today
          </div>
        </div>

        {/* Metric 3: Remaining Budget */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Remaining Budget</span>
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {monthlyBudget > 0
              ? `${currency}${remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : `${currency}0.00`}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {monthlyBudget > 0
              ? remainingBudget > 0
                ? 'Safe spending margin'
                : 'Budget cap exceeded'
              : 'Set a budget in Settings'}
          </div>
        </div>

        {/* Metric 4: Top Category */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Top Category</span>
            <Layers className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold truncate text-slate-900 dark:text-white">
            {topCategoryEntry ? CATEGORY_INFO[topCategoryEntry[0]]?.label : 'None (Zero)'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {topCategoryEntry
              ? `${currency}${topCategoryEntry[1].toLocaleString()} (${Math.round(
                  (topCategoryEntry[1] / (totalSpentThisMonth || 1)) * 100
                )}%)`
              : 'No spend yet'}
          </div>
        </div>
      </div>

      {/* Grid: Monthly Spending Summary (5 cols) + Today's Activity ONLY (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Spending Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Spending Summary
              </h3>
              <button
                onClick={() => onNavigate('settings')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Set Limits
              </button>
            </div>

            {/* List of categories */}
            <div className="space-y-4">
              {Object.entries(categorySpending).length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <p className="text-xs text-slate-400">
                    Everything starts at {currency}0.00.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Capture a bank notification or add an expense to see category bars.
                  </p>
                </div>
              ) : (
                (Object.entries(categorySpending) as [TransactionCategory, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([catKey, amount]) => {
                    const info = CATEGORY_INFO[catKey] || CATEGORY_INFO.other;
                    const percent = Math.round((amount / (totalSpentThisMonth || 1)) * 100);

                    return (
                      <div key={catKey} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {info.label}
                          </span>
                          <div className="font-mono text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {currency}{amount.toLocaleString()}
                            </span>
                            <span className="text-slate-400 ml-1.5">({percent}%)</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              backgroundColor: info.color,
                              width: `${percent}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Budget Health Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                Push Budget Alerts
              </span>
              <span className="text-emerald-400 font-mono">
                {monthlyBudget === 0
                  ? 'Budget Unset'
                  : budgetProgressPercent < 75
                  ? 'Healthy'
                  : budgetProgressPercent < 90
                  ? 'Warning'
                  : 'Critical'}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {monthlyBudget === 0
                ? 'Set a monthly spending limit to receive push alerts at 75%, 90%, and 100% capacity.'
                : budgetProgressPercent < 75
                ? `You have spent ${budgetProgressPercent}% of your ${currency}${monthlyBudget.toLocaleString()} budget. Spending velocity is on track.`
                : budgetProgressPercent < 90
                ? `You have reached ${budgetProgressPercent}% of your monthly cap. High-priority push notifications triggered.`
                : `Budget cap breached (${budgetProgressPercent}%)! Critical alerts dispatched.`}
            </p>
          </div>
        </div>

        {/* Today's Transactions ONLY (7 cols) - Clean and concise! */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Today's Transactions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current day activity only · Past dates are archived in Monthly Reports
              </p>
            </div>

            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Past Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Today's List */}
          {todayTransactions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No expenses recorded today
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Incoming bank debit/spent SMS will appear here automatically, or tap Add Manually.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestSampleSms(SAMPLE_BANK_SMS[0].text)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>⚡ Quick Import SBI UPI (₹11.00)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Paste Copied SMS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Manually</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[380px] overflow-y-auto pr-1">
              {todayTransactions.map((tx) => {
                const info = CATEGORY_INFO[tx.category] || CATEGORY_INFO.other;
                const isDebit = tx.type === 'debit' || tx.type === 'withdrawal';

                return (
                  <div
                    key={tx.id}
                    onClick={() => setInspectingTx(tx)}
                    className="pt-3 pb-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2.5 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${info.color}15`,
                          borderColor: `${info.color}35`,
                          color: info.color,
                        }}
                      >
                        {tx.type === 'withdrawal' ? (
                          <DollarSign className="w-5 h-5" />
                        ) : tx.category === 'food_dining' ? (
                          <Utensils className="w-5 h-5" />
                        ) : tx.category === 'groceries' ? (
                          <ShoppingBag className="w-5 h-5" />
                        ) : tx.category === 'travel_fuel' ? (
                          <Car className="w-5 h-5" />
                        ) : tx.category === 'entertainment' ? (
                          <Film className="w-5 h-5" />
                        ) : tx.category === 'utilities_bills' ? (
                          <ZapIcon className="w-5 h-5" />
                        ) : (
                          <CreditCard className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {tx.merchant}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                          <span>{info.label}</span>
                          <span aria-hidden="true">·</span>
                          <span>Today</span>
                          {tx.paymentMethod && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{tx.paymentMethod}</span>
                            </>
                          )}
                          {tx.accountMasked && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{tx.accountMasked}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div
                        className={`text-sm font-bold font-mono tabular-nums ${
                          isDebit ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isDebit ? '-' : '+'}
                        {currency}
                        {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isManualAddOpen && (
        <ManualAddModal
          isOpen={isManualAddOpen}
          onClose={() => setIsManualAddOpen(false)}
          currency={currency}
          onAddTransaction={handleAddManualTx}
        />
      )}

      {inspectingTx && (
        <TransactionDetailModal
          transaction={inspectingTx}
          currency={currency}
          onClose={() => setInspectingTx(null)}
          onUpdateCategory={handleUpdateTxCategory}
          onDeleteTransaction={handleDeleteTx}
        />
      )}
    </div>
  );
};
