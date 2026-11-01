/**
 * Background SMS Listener & Web Notification Service
 * Manages notification permissions, WebOTP capture, and background simulation engine.
 */

import { Transaction, UserProfile } from '../types';
import { parseTransactionSMS, SAMPLE_BANK_SMS } from './smsParser';

export class SMSNotificationService {
  private static instance: SMSNotificationService;
  private backgroundIntervalId: number | null = null;
  private isListening = false;
  private onTransactionCaptured?: (tx: Transaction, rawMsg: string) => void;
  private onBudgetAlert?: (message: string, threshold: number) => void;

  private constructor() {
    // Listen for automatic Native Android APK SMS broadcast events
    if (typeof window !== 'undefined') {
      window.addEventListener('native_sms_received', (event: any) => {
        const smsBody = event.detail;
        if (smsBody && typeof smsBody === 'string') {
          console.log('[Native SMS Broadcast Captured]:', smsBody);
          this.processIncomingSMS(smsBody);
        }
      });
    }
  }

  public static getInstance(): SMSNotificationService {
    if (!SMSNotificationService.instance) {
      SMSNotificationService.instance = new SMSNotificationService();
    }
    return SMSNotificationService.instance;
  }

  public setCallbacks(
    onTx: (tx: Transaction, rawMsg: string) => void,
    onAlert: (msg: string, threshold: number) => void
  ) {
    this.onTransactionCaptured = onTx;
    this.onBudgetAlert = onAlert;
  }

  /**
   * Request native browser notification permissions
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser.');
      return 'denied';
    }
    const permission = await Notification.requestPermission();
    return permission;
  }

  public getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  /**
   * Push system browser notification
   */
  public sendPushNotification(title: string, options: NotificationOptions) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (e) {
      console.log('Push notification failed:', e);
    }
  }

  /**
   * Process incoming SMS text
   */
  public processIncomingSMS(smsText: string, currencySymbol: string = '₹'): Transaction | null {
    const parsed = parseTransactionSMS(smsText);
    if (!parsed) return null;

    const newTx: Transaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      amount: parsed.amount,
      type: parsed.type,
      category: parsed.category,
      merchant: parsed.merchant,
      accountMasked: parsed.accountMasked,
      balanceAfter: parsed.balanceAfter,
      date: new Date().toISOString(),
      paymentMethod: 'SMS',
      rawSMS: parsed.rawText,
      createdAt: Date.now(),
    };

    // Push notification to user
    const typeLabel = parsed.type === 'withdrawal' ? 'Withdrawn' : parsed.type === 'credit' ? 'Credited' : 'Debited';
    this.sendPushNotification(`DailySpent: ${typeLabel} ${currencySymbol}${parsed.amount.toLocaleString()}`, {
      body: `${parsed.merchant} · Categorized as ${parsed.category.replace('_', ' & ')}`,
      tag: 'thebill-sms-auto',
    });

    if (this.onTransactionCaptured) {
      this.onTransactionCaptured(newTx, smsText);
    }

    return newTx;
  }

  /**
   * Check budget limits and trigger warnings
   */
  public evaluateBudgetLimits(
    totalSpentThisMonth: number,
    monthlyBudget: number,
    currencySymbol: string = '₹'
  ) {
    if (monthlyBudget <= 0) return;

    const percentage = Math.round((totalSpentThisMonth / monthlyBudget) * 100);

    if (percentage >= 100) {
      const msg = `🚨 Monthly Budget Exceeded (${percentage}%)! Spent: ${currencySymbol}${totalSpentThisMonth.toLocaleString()} of ${currencySymbol}${monthlyBudget.toLocaleString()}`;
      this.sendPushNotification('DailySpent Budget Alert: 100% Limit Reached!', {
        body: msg,
        tag: 'budget-100',
      });
      if (this.onBudgetAlert) this.onBudgetAlert(msg, 100);
    } else if (percentage >= 90) {
      const msg = `⚠️ Approaching Budget Cap (${percentage}%)! Spent: ${currencySymbol}${totalSpentThisMonth.toLocaleString()} of ${currencySymbol}${monthlyBudget.toLocaleString()}`;
      this.sendPushNotification('DailySpent Budget Warning: 90% Spent', {
        body: msg,
        tag: 'budget-90',
      });
      if (this.onBudgetAlert) this.onBudgetAlert(msg, 90);
    } else if (percentage >= 75) {
      const msg = `Notice: 75% of your monthly budget utilized (${currencySymbol}${totalSpentThisMonth.toLocaleString()}).`;
      this.sendPushNotification('DailySpent Advisory: 75% Budget Utilized', {
        body: msg,
        tag: 'budget-75',
      });
      if (this.onBudgetAlert) this.onBudgetAlert(msg, 75);
    }
  }

  /**
   * Start background SMS listener simulator
   */
  public startBackgroundSimulation(
    intervalSeconds: number = 45,
    currencySymbol: string = '₹'
  ) {
    if (this.backgroundIntervalId) {
      clearInterval(this.backgroundIntervalId);
    }

    this.isListening = true;

    this.backgroundIntervalId = window.setInterval(() => {
      // Pick a random bank sample
      const sample = SAMPLE_BANK_SMS[Math.floor(Math.random() * SAMPLE_BANK_SMS.length)];
      // Slightly randomize amount
      const randomAmount = (Math.floor(Math.random() * 50) + 1) * 20;
      const customizedText = sample.text.replace(/[\d,]+(\.\d{2})?/, `${randomAmount}.00`);

      this.processIncomingSMS(customizedText, currencySymbol);
    }, intervalSeconds * 1000);
  }

  public stopBackgroundSimulation() {
    if (this.backgroundIntervalId) {
      clearInterval(this.backgroundIntervalId);
      this.backgroundIntervalId = null;
    }
    this.isListening = false;
  }

  public isBackgroundActive(): boolean {
    return this.isListening;
  }

  /**
   * WebOTP API receiver for Android Chrome
   */
  public async listenWebOTPSMS(): Promise<string | null> {
    if (!('credentials' in navigator) || !navigator.credentials) {
      return null;
    }

    try {
      const ac = new AbortController();
      const content = await (navigator.credentials as any).get({
        otp: { transport: ['sms'] },
        signal: ac.signal,
      });
      if (content && content.code) {
        return content.code;
      }
    } catch (e) {
      console.log('WebOTP not available or timed out', e);
    }
    return null;
  }
}

export const smsService = SMSNotificationService.getInstance();
