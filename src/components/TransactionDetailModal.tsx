import React, { useState } from 'react';
import { X, Lock, MessageSquare, Trash2, Check, Tag, ShieldCheck } from 'lucide-react';
import { Transaction, TransactionCategory } from '../types';
import { CATEGORY_INFO } from '../services/smsParser';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  currency: string;
  onClose: () => void;
  onUpdateCategory: (txId: string, newCategory: TransactionCategory) => void;
  onDeleteTransaction: (txId: string) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  currency,
  onClose,
  onUpdateCategory,
  onDeleteTransaction,
}) => {
  const [selectedCat, setSelectedCat] = useState<TransactionCategory>(
    transaction ? transaction.category : 'other'
  );
  const [savedCat, setSavedCat] = useState(false);

  // Sync selectedCat if transaction changes
  React.useEffect(() => {
    if (transaction) {
      setSelectedCat(transaction.category);
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value as TransactionCategory;
    setSelectedCat(newCat);
    onUpdateCategory(transaction.id, newCat);
    setSavedCat(true);
    setTimeout(() => setSavedCat(false), 2000);
  };

  const isDebit = transaction.type === 'debit' || transaction.type === 'withdrawal';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 my-8">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Encrypted Local Record
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Amount Card */}
        <div className="my-6 text-center space-y-1">
          <div
            className={`text-3xl font-extrabold font-mono tabular-nums tracking-tight ${
              isDebit ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isDebit ? '-' : '+'}
            {currency}
            {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">{transaction.merchant}</h3>
          <p className="text-xs text-slate-400">
            {new Date(transaction.date).toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Details Grid */}
        <div className="space-y-3 font-mono text-xs mb-6">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="text-slate-500 font-sans">Payment Method</span>
            <span className="font-semibold text-slate-900 dark:text-white">{transaction.paymentMethod}</span>
          </div>

          {transaction.accountMasked && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-slate-500 font-sans">Account / Card</span>
              <span className="font-semibold text-slate-900 dark:text-white">{transaction.accountMasked}</span>
            </div>
          )}

          {transaction.balanceAfter !== undefined && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-slate-500 font-sans">Balance After</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {currency}{transaction.balanceAfter.toLocaleString()}
              </span>
            </div>
          )}

          {/* Category Change Selector */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="text-slate-500 font-sans">Category</span>
            <div className="flex items-center gap-2">
              <select
                value={selectedCat}
                onChange={handleCategoryChange}
                className="bg-transparent font-sans font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none cursor-pointer"
              >
                {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                  <option key={key} value={key} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                    {info.label}
                  </option>
                ))}
              </select>
              {savedCat && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </div>
          </div>
        </div>

        {/* Decrypted Raw SMS Payload Box */}
        {transaction.rawSMS && (
          <div className="mb-6 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              Decrypted Bank SMS Source:
            </div>
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed select-all">
              {transaction.rawSMS}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              if (window.confirm('Delete this transaction from your encrypted vault?')) {
                onDeleteTransaction(transaction.id);
                onClose();
              }
            }}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-4 h-4" /> Delete Record
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
