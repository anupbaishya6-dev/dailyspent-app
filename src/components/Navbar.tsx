import React from 'react';
import { ShieldCheck, Moon, Sun, Lock, LogOut } from 'lucide-react';

interface NavbarProps {
  currentView: 'landing' | 'auth' | 'dashboard' | 'transactions' | 'reports' | 'settings' | 'support';
  onNavigate: (view: 'landing' | 'auth' | 'dashboard' | 'transactions' | 'reports' | 'settings' | 'support') => void;
  isUnlocked: boolean;
  onLockVault: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  isUnlocked,
  onLockVault,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onNavigate(isUnlocked ? 'dashboard' : 'landing')}
          className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2 group cursor-pointer"
        >
          <span className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <span>DailySpent</span>
        </button>

        {/* Zone 2: 4-5 concise single-line text links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {!isUnlocked && (
            <button
              onClick={() => onNavigate('landing')}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentView === 'landing' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
              }`}
            >
              Overview
            </button>
          )}

          {isUnlocked && (
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate('transactions')}
                className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'transactions' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'reports' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
                }`}
              >
                Monthly Reports
              </button>
              <button
                onClick={() => onNavigate('settings')}
                className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  currentView === 'settings' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
                }`}
              >
                Settings & Vault
              </button>
            </>
          )}

          <button
            onClick={() => onNavigate('support')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentView === 'support' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
            }`}
          >
            Support
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {isUnlocked ? (
            <button
              onClick={onLockVault}
              className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950/60 transition whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Lock Vault
            </button>
          ) : (
            <button
              onClick={() => onNavigate('auth')}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition whitespace-nowrap shrink-0 shadow-sm shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Open Vault
            </button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar when unlocked */}
      {isUnlocked && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around text-xs font-semibold overflow-x-auto bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onNavigate('transactions')}
            className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
              currentView === 'transactions'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
              currentView === 'reports'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
              currentView === 'settings'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => onNavigate('support')}
            className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
              currentView === 'support'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Support
          </button>
        </div>
      )}
    </header>
  );
};
