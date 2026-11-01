import React from 'react';
import { ShieldCheck, Lock, FileText, CheckCircle2, X } from 'lucide-react';

interface LegalModalProps {
  type: 'terms' | 'privacy' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 my-8 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              {type === 'terms' ? <FileText className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                DailySpent Application · Effective November 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-4 space-y-4 text-sm text-slate-600 dark:text-slate-300 pr-2">
          {type === 'privacy' ? (
            <>
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero-Cloud Guarantee:</strong> All financial messages, SMS extracts, and transaction history are encrypted on your local device using military-grade AES-256-GCM. We have no external servers, no tracking databases, and cannot read your data.
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  1. Information We Access
                </h3>
                <p className="leading-relaxed">
                  DailySpent accesses incoming SMS messages on your device exclusively to identify financial debit, spent, and cash withdrawal notifications sent by your banking institutions. No personal text messages, contacts, or photos are ever read or scanned.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  2. Local Cryptographic Storage
                </h3>
                <p className="leading-relaxed">
                  Every transaction record and profile field is converted into an encrypted ciphertext blob via the Web Cryptography API before writing to local device storage. The master encryption key is derived directly from your secret MPIN using PBKDF2 (100,000 iterations). If your device is locked, the data is indecipherable.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  3. No Telemetry or Advertising
                </h3>
                <p className="leading-relaxed">
                  We do not sell data to data brokers, analytics companies, or advertising networks. The application operates in complete offline mode.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  4. Support & Inquiries
                </h3>
                <p className="leading-relaxed">
                  For any privacy questions or data deletion requests, contact our designated privacy officer at{' '}
                  <a href="mailto:thebill.customercare@gmail.com" className="text-emerald-600 dark:text-emerald-400 font-medium underline">
                    thebill.customercare@gmail.com
                  </a>.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <span>
                  Please read these Terms carefully before downloading or activating DailySpent distributed via Gumroad.
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  1. Gumroad License & Anti-Reselling
                </h3>
                <p className="leading-relaxed">
                  Each purchase of DailySpent provides a single-device personal non-exclusive license. To protect the software against unauthorized duplication and unauthorized reselling, each activation key is mathematically bound to your device hardware fingerprint. You may not resell, sublicense, reverse-engineer, or redistribute copies.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  2. User Responsibility for MPIN
                </h3>
                <p className="leading-relaxed">
                  Because DailySpent utilizes zero-knowledge local encryption, we do not store your MPIN on any server. You are solely responsible for remembering your MPIN. If you forget your MPIN, the encrypted vault cannot be decrypted by customer care.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  3. SMS Notification Parsing Accuracy
                </h3>
                <p className="leading-relaxed">
                  DailySpent uses intelligent heuristics to parse bank notifications. While it supports major banking institutions, formatting variations may occasionally require manual categorization or adjustment using the in-app editor.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  4. Support & Direct Contact
                </h3>
                <p className="leading-relaxed">
                  Official support is provided directly via email at{' '}
                  <a href="mailto:thebill.customercare@gmail.com" className="text-emerald-600 dark:text-emerald-400 font-medium underline">
                    thebill.customercare@gmail.com
                  </a>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition"
          >
            I Understand & Accept
          </button>
        </div>
      </div>
    </div>
  );
};
