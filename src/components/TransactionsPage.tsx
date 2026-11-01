import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ChevronRight,
  Download,
  CreditCard,
  DollarSign,
  Utensils,
  ShoppingBag,
  Car,
  Film,
  Zap,
  ArrowUpDown,
  Calendar,
} from 'lucide-react';
import { DecryptedData, Transaction, TransactionCategory, TransactionType } from '../types';
import { CATEGORY_INFO } from '../services/smsParser';
import { TransactionDetailModal } from './TransactionDetailModal';
import { ManualAddModal } from './ManualAddModal';

interface TransactionsPageProps {
  data: DecryptedData;
  activeMpin: string;
  onUpdateData: (newData: DecryptedData) => void;
  onNavigate: (view: 'dashboard' | 'transactions' | 'reports' | 'settings' | 'support') => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  data,
  activeMpin,
  onUpdateData,
  onNavigate,
}) => {
  const currency = data.profile.currency || '₹';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest'>('newest');

  // Modals
  const [inspectingTx, setInspectingTx] = useState<Transaction | null>(null);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);

  // Filter & Sort
  const filteredTransactions = useMemo(() => {
    let result = data.transactions.filter((t) => {
      const matchesSearch =
        t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.accountMasked && t.accountMasked.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'all' || t.category === categoryFilter;
      const matchesType = typeFilter === 'all' || t.type === typeFilter;

      return matchesSearch && matchesCat && matchesType;
    });

    if (sortOrder === 'newest') {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortOrder === 'highest') {
      result.sort((a, b) => b.amount - a.amount);
    }

    return result;
  }, [data.transactions, searchQuery, categoryFilter, typeFilter, sortOrder]);

  const handleUpdateTxCategory = (txId: string, newCategory: TransactionCategory) => {
    const updatedTxList = data.transactions.map((t) =>
      t.id === txId ? { ...t, category: newCategory } : t
    );
    const updated: DecryptedData = {
      ...data,
      transactions: updatedTxList,
    };
    onUpdateData(updated);
  };

  const handleDeleteTx = (txId: string) => {
    const updatedTxList = data.transactions.filter((t) => t.id !== txId);
    const updated: DecryptedData = {
      ...data,
      transactions: updatedTxList,
    };
    onUpdateData(updated);
  };

  const handleAddManualTx = (tx: Transaction) => {
    const updated: DecryptedData = {
      ...data,
      transactions: [tx, ...data.transactions],
    };
    onUpdateData(updated);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Category', 'Merchant', 'Amount', 'Currency', 'Masked Account', 'Balance After', 'Payment Method'];
    const rows = filteredTransactions.map((t) => [
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            All Transactions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data.transactions.length} total encrypted records · Tap any record to inspect decrypted bank SMS
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data.transactions.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}

          <button
            onClick={() => setIsManualAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" /> Add Manually
          </button>
        </div>
      </div>

      {/* Controls: Search, Category, Type, Sort */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search merchant, notes, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Types</option>
            <option value="debit">Debits / Spent</option>
            <option value="withdrawal">ATM Withdrawals</option>
            <option value="credit">Credits / Income</option>
            <option value="transfer">Transfers</option>
          </select>

          {/* Sort */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
          </select>
        </div>

        {/* Categories Horizontal Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
              categoryFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Categories
          </button>
          {Object.entries(CATEGORY_INFO).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
                categoryFilter === key
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {info.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {data.transactions.length === 0 ? 'Everything starts at zero' : 'No transactions match filters'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {data.transactions.length === 0
                ? 'Your transaction history is completely clean. New expenses will appear here automatically when bank SMS notifications arrive, or you can add them manually.'
                : 'Try adjusting your search keywords or switching categories.'}
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsManualAddOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add First Transaction
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredTransactions.map((tx) => {
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
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
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
