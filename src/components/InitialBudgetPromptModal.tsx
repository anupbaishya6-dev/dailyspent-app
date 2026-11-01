import React, { useState } from 'react';
import { Target, Sparkles, Check, X, ArrowRight } from 'lucide-react';

interface InitialBudgetPromptModalProps {
  isOpen: boolean;
  currency: string;
  onSaveBudget: (budget: number) => void;
  onSkip: () => void;
}

export const InitialBudgetPromptModal: React.FC<InitialBudgetPromptModalProps> = ({
  isOpen,
  currency,
  onSaveBudget,
  onSkip,
}) => {
  const [budgetInput, setBudgetInput] = useState<string>('25000');

  if (!isOpen) return null;

  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val >= 0) {
      onSaveBudget(val);
    } else {
      onSaveBudget(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <Target className="w-6 h-6" />
        </div>

        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Quick Setup
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Set Your {currentMonthName} Budget
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Would you like to set a monthly spending limit? DailySpent will track your progress from zero and send push warnings at 75%, 90%, and 100%.
          </p>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Monthly Budget Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 font-bold text-slate-400 font-mono text-base">
                {currency}
              </span>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                placeholder="25000"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-center"
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-1">
              You can adjust this anytime in Settings
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Monthly Budget
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition text-center"
            >
              Skip for Now (Start with 0)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
