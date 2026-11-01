import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Download,
  CreditCard,
  Layers,
  DollarSign,
  PieChart,
  ShoppingBag,
  Utensils,
  Car,
  Film,
  Zap,
} from 'lucide-react';
import { DecryptedData, Transaction, TransactionCategory } from '../types';
import { CATEGORY_INFO } from '../services/smsParser';
import { TransactionDetailModal } from './TransactionDetailModal';

interface ReportsPageProps {
  data: DecryptedData;
  onUpdateData: (newData: DecryptedData) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const ReportsPage: React.FC<ReportsPageProps> = ({ data, onUpdateData }) => {
  const currency = data.profile.currency || '₹';
  const now = new Date();
  const currentCalendarYear = now.getFullYear();
  const currentCalendarMonth = now.getMonth(); // 0 to 11

  // Extract all distinct years present in user transactions, plus current calendar year
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    yearSet.add(currentCalendarYear);

    // Also include account creation year
    if (data.profile.createdAt) {
      yearSet.add(new Date(data.profile.createdAt).getFullYear());
    }

    data.transactions.forEach((t) => {
      const y = new Date(t.date).getFullYear();
      if (!isNaN(y)) yearSet.add(y);
    });

    return Array.from(yearSet).sort((a, b) => b - a); // descending: 2027, 2026...
  }, [data.transactions, data.profile.createdAt, currentCalendarYear]);

  // Selected Year & Month state
  const [selectedYear, setSelectedYear] = useState<number>(currentCalendarYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentCalendarMonth);
  const [inspectingTx, setInspectingTx] = useState<Transaction | null>(null);

  // Determine which months to display for the selected year
  // Rule: For current calendar year, show months up to current month (e.g. Jan..Nov).
  // For past years (e.g. 2026 once 2027 arrives), show all 12 months.
  // For future years, show up to current month if applicable.
  const displayMonths = useMemo(() => {
    const maxMonthIndex = selectedYear === currentCalendarYear ? currentCalendarMonth : 11;
    const months: number[] = [];
    for (let m = 0; m <= maxMonthIndex; m++) {
      months.push(m);
    }
    return months.reverse(); // Show most recent month first: November, October...
  }, [selectedYear, currentCalendarYear, currentCalendarMonth]);

  // Calculate annual roll-up for the selected year
  const yearStats = useMemo(() => {
    const yearTx = data.transactions.filter((t) => new Date(t.date).getFullYear() === selectedYear);
    const totalSpent = yearTx
      .filter((t) => t.type === 'debit' || t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCredit = yearTx
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalSpent,
      totalCredit,
      count: yearTx.length,
    };
  }, [data.transactions, selectedYear]);

  // Selected Month Transactions
  const monthTransactions = useMemo(() => {
    return data.transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.transactions, selectedYear, selectedMonth]);

  // Selected Month Calculations
  const monthDebits = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type === 'debit' || t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const monthCredits = useMemo(() => {
    return monthTransactions
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const monthCategoryBreakdown = useMemo(() => {
    const map: Partial<Record<TransactionCategory, number>> = {};
    for (const t of monthTransactions) {
      if (t.type === 'debit' || t.type === 'withdrawal') {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    }
    return map;
  }, [monthTransactions]);

  // Helper to compute total spent for any month card in grid
  const getMonthSpend = (mIndex: number) => {
    return data.transactions
      .filter((t) => {
        const d = new Date(t.date);
        return (
          d.getFullYear() === selectedYear &&
          d.getMonth() === mIndex &&
          (t.type === 'debit' || t.type === 'withdrawal')
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleExportMonthCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Category', 'Merchant', 'Amount', 'Currency', 'Masked Account', 'Balance After', 'Payment Method'];
    const rows = monthTransactions.map((t) => [
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
    link.setAttribute('download', `DailySpent_Report_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateCategory = (txId: string, newCategory: TransactionCategory) => {
    const updatedTxList = data.transactions.map((t) =>
      t.id === txId ? { ...t, category: newCategory } : t
    );
    onUpdateData({ ...data, transactions: updatedTxList });
  };

  const handleDeleteTx = (txId: string) => {
    const updatedTxList = data.transactions.filter((t) => t.id !== txId);
    onUpdateData({ ...data, transactions: updatedTxList });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-150">
      {/* Page Title & Year Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Monthly Reports & Annual Archive
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Historical spending categorized by year and month
          </p>
        </div>

        {/* Year Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => {
                setSelectedYear(yr);
                // Default to latest month in that year
                setSelectedMonth(yr === currentCalendarYear ? currentCalendarMonth : 11);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedYear === yr
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Year {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Year Overview Strip */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block mb-1">
            Annual Summary · {selectedYear}
          </span>
          <div className="text-2xl font-bold font-mono">
            {currency}{yearStats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400">
            Total expenses recorded in {selectedYear} ({yearStats.count} transactions)
          </span>
        </div>

        {monthTransactions.length > 0 && (
          <button
            onClick={handleExportMonthCSV}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-2 self-start sm:self-auto"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export {MONTH_NAMES[selectedMonth]} {selectedYear} CSV
          </button>
        )}
      </div>

      {/* Months Grid (Horizontal scrollable or grid) */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
          Select Month in {selectedYear}:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {displayMonths.map((mIdx) => {
            const isSelected = selectedMonth === mIdx;
            const spend = getMonthSpend(mIdx);

            return (
              <button
                key={mIdx}
                onClick={() => setSelectedMonth(mIdx)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500 dark:border-emerald-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold ${
                      isSelected
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {MONTH_NAMES[mIdx]}
                  </span>
                  {selectedYear === currentCalendarYear && mIdx === currentCalendarMonth && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Current Month" />
                  )}
                </div>
                <div className="text-sm font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                  {currency}{spend.toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Report for the Selected Month */}
      <div className="space-y-6 pt-2">
        {/* Month Header Banner */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <span>
              {MONTH_NAMES[selectedMonth]} {selectedYear} Report
            </span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {monthTransactions.length} recorded entries
          </span>
        </div>

        {/* 3 KPI Cards for the Month */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Spent</span>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {currency}{monthDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400">
              Debits & ATM cash withdrawals
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Credited</span>
              <TrendingDown className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {currency}{monthCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400">
              Salaries, refunds & deposits
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Net Cashflow</span>
              <Layers className="w-4 h-4 text-cyan-500" />
            </div>
            <div
              className={`text-xl sm:text-2xl font-bold font-mono ${
                monthCredits - monthDebits >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-500'
              }`}
            >
              {monthCredits - monthDebits >= 0 ? '+' : ''}
              {currency}{(monthCredits - monthDebits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400">
              Balance difference for {MONTH_NAMES[selectedMonth]}
            </div>
          </div>
        </div>

        {/* Category breakdown for the month */}
        {Object.entries(monthCategoryBreakdown).length > 0 && (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Category Distribution for {MONTH_NAMES[selectedMonth]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.entries(monthCategoryBreakdown) as [TransactionCategory, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([catKey, amount]) => {
                  const info = CATEGORY_INFO[catKey] || CATEGORY_INFO.other;
                  const pct = Math.round((amount / (monthDebits || 1)) * 100);

                  return (
                    <div key={catKey} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {info.label}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {currency}{amount.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ backgroundColor: info.color, width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Transactions list inside this month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Transactions in {MONTH_NAMES[selectedMonth]} {selectedYear}
          </h3>

          {monthTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No transactions recorded for {MONTH_NAMES[selectedMonth]} {selectedYear}. Everything is at zero.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {monthTransactions.map((tx) => {
                const info = CATEGORY_INFO[tx.category] || CATEGORY_INFO.other;
                const isDebit = tx.type === 'debit' || tx.type === 'withdrawal';

                return (
                  <div
                    key={tx.id}
                    onClick={() => setInspectingTx(tx)}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2.5 transition cursor-pointer group"
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
                          <Zap className="w-5 h-5" />
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
                          <span>
                            {new Date(tx.date).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
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

      {/* Inspect Modal */}
      {inspectingTx && (
        <TransactionDetailModal
          transaction={inspectingTx}
          currency={currency}
          onClose={() => setInspectingTx(null)}
          onUpdateCategory={handleUpdateCategory}
          onDeleteTransaction={handleDeleteTx}
        />
      )}
    </div>
  );
};
