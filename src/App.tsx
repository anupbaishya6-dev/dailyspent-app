/**
 * DailySpent - Automated Bank SMS Expense Tracker & Vault
 * Features:
 * - Reads debit, spent, and withdrawal SMS notifications and auto-categorizes them
 * - Zero-cloud PBKDF2 + AES-256-GCM on-device encryption
 * - MPIN creation for fast subsequent unlocks
 * - Compact Dashboard displaying current day expenses & monthly summary
 * - Dedicated Transactions Page for historical searches & filters
 * - Dedicated Monthly Reports Page with multi-year and monthly roll-up archive
 * - Dedicated Settings & Security Vault Page (budgets, MPIN, Gumroad generator, CSV export only)
 * - Initial Budget prompt on registration/login
 * - Gumroad direct distribution with device-locked activation keys
 * - Clean start: all transactions and metrics start at zero
 * - Support channel (thebill.customercare@gmail.com) with diagnostics
 * - Terms & Conditions and Privacy Policy agreements
 * - Dark & Light mode support
 */

import React, { useState, useEffect } from 'react';
import { DecryptedData } from './types';
import { hasExistingVault, lockVault, saveVault } from './services/vaultStorage';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AuthFlow } from './components/AuthFlow';
import { Dashboard } from './components/Dashboard';
import { TransactionsPage } from './components/TransactionsPage';
import { ReportsPage } from './components/ReportsPage';
import { SettingsPage } from './components/SettingsPage';
import { SupportPage } from './components/SupportPage';
import { LegalModal } from './components/LegalModals';
import { InitialBudgetPromptModal } from './components/InitialBudgetPromptModal';
import { PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  const [currentView, setCurrentView] = useState<
    'landing' | 'auth' | 'dashboard' | 'transactions' | 'reports' | 'settings' | 'support'
  >('landing');
  const [unlockedData, setUnlockedData] = useState<DecryptedData | null>(null);
  const [activeMpin, setActiveMpin] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);
  const [hasVault, setHasVault] = useState(false);
  const [showInitialBudgetPrompt, setShowInitialBudgetPrompt] = useState(false);

  // Initialize theme and vault presence
  useEffect(() => {
    const savedTheme = (localStorage.getItem('dailyspent_theme') || localStorage.getItem('thebill_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme as 'dark' | 'light');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const vaultExists = hasExistingVault();
    setHasVault(vaultExists);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('dailyspent_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleUnlockSuccess = (data: DecryptedData, mpin: string, isNewAccount?: boolean) => {
    setUnlockedData(data);
    setActiveMpin(mpin);
    setHasVault(true);
    setCurrentView('dashboard');

    // Prompt for current month budget if it's a new account or budget is currently 0
    if (isNewAccount || data.profile.monthlyBudget === 0) {
      setShowInitialBudgetPrompt(true);
    }
  };

  const handleSaveInitialBudget = async (budget: number) => {
    if (!unlockedData) return;
    const updated: DecryptedData = {
      ...unlockedData,
      profile: {
        ...unlockedData.profile,
        monthlyBudget: budget,
      },
    };
    await saveVault(updated, activeMpin);
    setUnlockedData(updated);
    setShowInitialBudgetPrompt(false);
  };

  const handleLockVault = () => {
    lockVault();
    setUnlockedData(null);
    setActiveMpin('');
    setCurrentView('auth');
  };

  const handleDataUpdated = async (newData: DecryptedData, newMpin?: string) => {
    const mpinToUse = newMpin || activeMpin;
    await saveVault(newData, mpinToUse);
    setUnlockedData(newData);
    if (newMpin) {
      setActiveMpin(newMpin);
    }
  };

  const handleWipeData = () => {
    setUnlockedData(null);
    setActiveMpin('');
    setHasVault(false);
    setCurrentView('landing');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Bar Contract Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if ((view === 'dashboard' || view === 'transactions' || view === 'reports' || view === 'settings') && !unlockedData) {
            setCurrentView('auth');
          } else {
            setCurrentView(view);
          }
        }}
        isUnlocked={!!unlockedData}
        onLockVault={handleLockVault}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* In-App Floating Install Anchor for PWA */}
      <div className="fixed bottom-4 right-4 z-40">
        <PWAInstallButton />
      </div>

      {/* Main Content Router */}
      <main className="flex-1 pb-12">
        {currentView === 'landing' && (
          <LandingPage
            onStartOnboarding={() => setCurrentView('auth')}
            onOpenSupport={() => setCurrentView('support')}
            onOpenLegal={(type) => setLegalModalType(type)}
            hasVault={hasVault}
          />
        )}

        {currentView === 'auth' && (
          <AuthFlow
            onUnlockSuccess={handleUnlockSuccess}
            onOpenLegal={(type) => setLegalModalType(type)}
          />
        )}

        {currentView === 'dashboard' && unlockedData && (
          <Dashboard
            data={unlockedData}
            activeMpin={activeMpin}
            onUpdateData={handleDataUpdated}
            onNavigate={(view) => setCurrentView(view)}
          />
        )}

        {currentView === 'transactions' && unlockedData && (
          <TransactionsPage
            data={unlockedData}
            activeMpin={activeMpin}
            onUpdateData={handleDataUpdated}
            onNavigate={(view) => setCurrentView(view)}
          />
        )}

        {currentView === 'reports' && unlockedData && (
          <ReportsPage
            data={unlockedData}
            onUpdateData={handleDataUpdated}
          />
        )}

        {currentView === 'settings' && unlockedData && (
          <SettingsPage
            data={unlockedData}
            activeMpin={activeMpin}
            onDataUpdated={handleDataUpdated}
            onWipeData={handleWipeData}
            onNavigate={(view) => setCurrentView(view)}
          />
        )}

        {currentView === 'support' && (
          <SupportPage
            onBack={() => setCurrentView(unlockedData ? 'dashboard' : 'landing')}
            userEmail={unlockedData?.profile.email}
          />
        )}
      </main>

      {/* Initial Budget Prompt on Login/Registration */}
      {showInitialBudgetPrompt && unlockedData && (
        <InitialBudgetPromptModal
          isOpen={showInitialBudgetPrompt}
          currency={unlockedData.profile.currency || '₹'}
          onSaveBudget={handleSaveInitialBudget}
          onSkip={() => setShowInitialBudgetPrompt(false)}
        />
      )}

      {/* Legal Modals (Terms & Conditions, Privacy Policy) */}
      {legalModalType && (
        <LegalModal
          type={legalModalType}
          onClose={() => setLegalModalType(null)}
        />
      )}
    </div>
  );
}
