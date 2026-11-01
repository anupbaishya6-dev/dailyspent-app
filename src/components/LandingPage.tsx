import React from 'react';
import {
  ShieldCheck,
  Lock,
  Zap,
  Bell,
  Cpu,
  Smartphone,
  ChevronRight,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Mail,
  CheckCircle2,
  DollarSign,
  Key,
} from 'lucide-react';

interface LandingPageProps {
  onStartOnboarding: () => void;
  onOpenSupport: () => void;
  onOpenLegal: (type: 'terms' | 'privacy') => void;
  hasVault: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartOnboarding,
  onOpenSupport,
  onOpenLegal,
  hasVault,
}) => {

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Direct Gumroad Release · Zero-Cloud Offline Security
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              Automatic Bank SMS Expense Tracker with Local Encryption
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
              DailySpent reads bank debit, spent, and cash withdrawal notifications in the background, categorizing your expenses instantly. All financial data stays strictly on your hardware, encrypted with AES-256 and your private MPIN.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={onStartOnboarding}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
              >
                {hasVault ? 'Unlock Encrypted Vault' : 'Activate DailySpent & Create MPIN'}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('features');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-sm transition"
              >
                Explore Features & Security
              </button>
            </div>

            {/* Trust Markers */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Zero Server Telemetry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Device-Locked Gumroad Activation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>AES-256-GCM + PBKDF2 MPIN</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Section */}
      <section id="features" className="py-16 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Engineered for Complete Privacy and Speed
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Traditional expense apps upload your financial messages to third-party servers. DailySpent stays 100% on your device.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Zero-Cloud AES-256 Vault
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Before writing to storage, all transaction numbers and merchant notes are encrypted using SubtleCrypto AES-GCM 256. The key is derived strictly from your secret MPIN via 100,000 PBKDF2 iterations.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Background SMS Listener
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Seamless background processing automatically catches debit, card spend, and ATM withdrawals without needing to open the app each time you swipe your card.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Push Budget Alerts
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Set monthly spending limits. Get native browser push notifications immediately at 75%, 90%, and 100% velocity thresholds before you overspend.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gumroad Distribution & Device Lock Banner */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="space-y-4 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 text-xs font-medium text-emerald-400">
                <Cpu className="w-4 h-4" />
                Gumroad Anti-Resale Architecture
              </div>
              <h3 className="text-2xl font-bold tracking-tight">
                Distributed Directly via Gumroad
              </h3>
              <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                Because Google Play restricts native SMS reading capabilities for private independent developers, DailySpent is published via Gumroad. Each download comes with an activation key tied to your device's unique hardware fingerprint, ensuring genuine buyer access.
              </p>

              <div className="pt-4 flex flex-wrap gap-4">
                <button
                  onClick={onStartOnboarding}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow"
                >
                  <Key className="w-4 h-4" /> Enter License Key & Launch
                </button>
                <button
                  onClick={onOpenSupport}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
                >
                  Contact Customer Care
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © 2026 DailySpent. All rights reserved. Zero-cloud on-device encrypted expense tracker.
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => onOpenLegal('terms')} className="hover:underline">
              Terms & Conditions
            </button>
            <button onClick={() => onOpenLegal('privacy')} className="hover:underline">
              Privacy Policy
            </button>
            <button onClick={onOpenSupport} className="hover:underline">
              Support (thebill.customercare@gmail.com)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
