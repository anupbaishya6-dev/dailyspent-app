import React, { useState, useEffect } from 'react';
import { Mail, Copy, Check, MessageSquare, Bug, HelpCircle, Shield, Cpu, ExternalLink, Send } from 'lucide-react';
import { getDeviceFingerprint } from '../services/crypto';
import { getStoredLicense } from '../services/license';

interface SupportPageProps {
  onBack: () => void;
  userEmail?: string;
}

export const SupportPage: React.FC<SupportPageProps> = ({ onBack, userEmail }) => {
  const SUPPORT_EMAIL = 'thebill.customercare@gmail.com';
  const [copied, setCopied] = useState(false);
  const [deviceId, setDeviceId] = useState('Loading...');
  const [ticketSubject, setTicketSubject] = useState('General Inquiry');
  const [ticketMessage, setTicketMessage] = useState('');
  const [senderEmail, setSenderEmail] = useState(userEmail || '');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getDeviceFingerprint().then(setDeviceId);
  }, []);

  const copyEmail = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const license = getStoredLicense();

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;

    // Open direct mail client with pre-filled diagnostic payload
    const body = `Hi DailySpent Support Team,\n\n${ticketMessage}\n\n--- Diagnostic Info ---\nDevice ID: ${deviceId}\nLicense Key: ${license?.key || 'Not Activated'}\nLicense Plan: ${license?.plan || 'N/A'}\nUser-Agent: ${navigator.userAgent}\nTimestamp: ${new Date().toISOString()}`;
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[DailySpent Support] ${ticketSubject}`)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTicketMessage('');
    }, 4000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <button
            onClick={onBack}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition mb-2"
          >
            ← Back to App
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Support & Customer Care
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Direct assistance, bug reporting, and device licensing inquiries for DailySpent
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Support Active (24/7 Response)
          </div>
        </div>
      </div>

      {/* Primary Contact Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 mb-8 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/10 text-emerald-300 text-xs font-medium">
              <Mail className="w-3.5 h-3.5" />
              Official Support Channel
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Have an issue, bug report, or Gumroad question?
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Write directly to our dedicated customer engineering team. All device activation, SMS parsing improvements, and license transfers are handled personally.
            </p>
          </div>

          <div className="w-full sm:w-auto flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-emerald-400">
              <span className="select-all truncate">{SUPPORT_EMAIL}</span>
              <button
                onClick={copyEmail}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition"
                title="Copy Email"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[DailySpent Inquiry] Need assistance')}`}
              className="w-full text-center px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Default Email Client
            </a>
          </div>
        </div>
      </div>

      {/* Grid: Bug Report Form + Diagnostic Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Ticket / Bug Form (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <Bug className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Send Support Message or Bug Report
            </h3>
          </div>

          {submitted ? (
            <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <Check className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ticket Draft Prepared</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Your email client was triggered with diagnostic telemetry attached. Our team will review your report at {SUPPORT_EMAIL}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="SMS Notification Parsing Issue">SMS Notification Parsing Issue</option>
                  <option value="Gumroad Activation Key Assistance">Gumroad Activation Key Assistance</option>
                  <option value="Device Transfer Request">Device Transfer Request</option>
                  <option value="Budget Alert or Push Notification Bug">Budget Alert or Push Notification Bug</option>
                  <option value="Encrypted Vault Backup Inquiry">Encrypted Vault Backup Inquiry</option>
                  <option value="General Question or Feature Request">General Question or Feature Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Contact Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Detailed Description (Include Bank name & sample SMS if relevant)
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe what occurred, your bank name, or paste the exact SMS text that failed to categorize..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Diagnostic Device ID: <strong className="font-mono text-slate-700 dark:text-slate-200">{deviceId}</strong></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Auto-Attached</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <Send className="w-4 h-4" />
                Submit to Customer Care
              </button>
            </form>
          )}
        </div>

        {/* Diagnostics & Device Specs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Hardware Device Info
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Your copy of DailySpent is locked to this unique hardware identifier. Give this ID to support if you need a replacement license.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-slate-500">Device ID</span>
                <span className="font-bold text-slate-900 dark:text-emerald-400">{deviceId}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-slate-500">License Plan</span>
                <span className="text-slate-900 dark:text-slate-200">{license?.plan || 'Pre-Activation'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-slate-500">Encryption Standard</span>
                <span className="text-slate-900 dark:text-slate-200">AES-256-GCM / PBKDF2</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-slate-500">Distribution Channel</span>
                <span className="text-slate-900 dark:text-slate-200">Gumroad Direct</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-5 h-5" />
              <h4 className="text-sm font-semibold">Zero-Cloud Privacy Notice</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Customer support never has access to your encrypted bank records or your MPIN. Even our engineers cannot decrypt your database without your personal MPIN.
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              How does SMS reading work outside Google Play?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              By distributing directly via Gumroad as a Progressive Web App (PWA), TheBill uses the standard SMS Receiver / WebOTP API alongside our background daemon to capture bank transaction notifications securely without Google Play store restrictions or background data scraping.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              Can I transfer my Gumroad license to a new phone?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Yes! Simply email <span className="text-emerald-600 dark:text-emerald-400 font-mono">thebill.customercare@gmail.com</span> with your original Gumroad purchase receipt and your new device ID. We will issue a replacement activation key for your new device within 24 hours.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              What happens if an SMS fails to categorize?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You can tap the transaction in your feed to adjust its category or merchant name, or use the "Add Transaction Manually" button. TheBill learns keyword patterns locally on your device for future SMS messages.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
              How do I back up my encrypted transactions?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              In Settings, click "Export Encrypted Backup". This downloads an AES-256 encrypted JSON file that only your MPIN can unlock, allowing safe storage on Google Drive, iCloud, or a flash drive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
