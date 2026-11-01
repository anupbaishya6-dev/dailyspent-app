/**
 * SMS Parser & Intelligent Categorization Engine
 * Extracts debit, spent, and withdrawal notifications and classifies them automatically.
 */

import { SMSParseResult, TransactionCategory, TransactionType } from '../types';

export const CATEGORY_INFO: Record<
  TransactionCategory,
  { label: string; icon: string; color: string; bgLight: string; bgDark: string }
> = {
  food_dining: {
    label: 'Food & Dining',
    icon: 'Utensils',
    color: '#f97316',
    bgLight: 'bg-orange-50 text-orange-700 border-orange-200',
    bgDark: 'dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50',
  },
  groceries: {
    label: 'Groceries',
    icon: 'ShoppingBag',
    color: '#10b981',
    bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bgDark: 'dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  },
  shopping: {
    label: 'Shopping',
    icon: 'ShoppingBag',
    color: '#6366f1',
    bgLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    bgDark: 'dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50',
  },
  utilities_bills: {
    label: 'Utilities & Bills',
    icon: 'Zap',
    color: '#eab308',
    bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
    bgDark: 'dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  },
  travel_fuel: {
    label: 'Travel & Fuel',
    icon: 'Car',
    color: '#06b6d4',
    bgLight: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    bgDark: 'dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50',
  },
  entertainment: {
    label: 'Entertainment',
    icon: 'Film',
    color: '#ec4899',
    bgLight: 'bg-pink-50 text-pink-700 border-pink-200',
    bgDark: 'dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900/50',
  },
  health_wellness: {
    label: 'Health & Medical',
    icon: 'Activity',
    color: '#14b8a6',
    bgLight: 'bg-teal-50 text-teal-700 border-teal-200',
    bgDark: 'dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50',
  },
  cash_withdrawal: {
    label: 'Cash & ATM',
    icon: 'DollarSign',
    color: '#8b5cf6',
    bgLight: 'bg-violet-50 text-violet-700 border-violet-200',
    bgDark: 'dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/50',
  },
  transfers: {
    label: 'Transfers',
    icon: 'ArrowRightLeft',
    color: '#64748b',
    bgLight: 'bg-slate-100 text-slate-700 border-slate-200',
    bgDark: 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  other: {
    label: 'General & Other',
    icon: 'CircleDollarSign',
    color: '#94a3b8',
    bgLight: 'bg-slate-100 text-slate-700 border-slate-200',
    bgDark: 'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
};

const CATEGORY_KEYWORDS: Record<TransactionCategory, string[]> = {
  food_dining: [
    'swiggy', 'zomato', 'starbucks', 'mcdonald', 'kfc', 'burger king', 'domino', 'pizza',
    'cafe', 'coffee', 'restaurant', 'dine', 'dining', 'bistro', 'foodpanda', 'dunkin',
    'subway', 'bar', 'pub', 'bakery', 'eats', 'chipotle', 'taco bell', 'tim hortons',
  ],
  groceries: [
    'blinkit', 'zepto', 'instacart', 'bigbasket', 'dmart', 'walmart', 'trader joe', 'whole foods',
    'kroger', 'costco', 'safeway', 'aldi', 'target', 'supermarket', 'grocery', 'provisions',
    'milk', 'spencer', 'reliance fresh', 'freshworks', 'nature basket',
  ],
  shopping: [
    'amazon', 'flipkart', 'myntra', 'zara', 'nike', 'adidas', 'h&m', 'uniqlo', 'apple store',
    'aliexpress', 'ebay', 'best buy', 'ikea', 'asos', 'sephora', 'ajio', 'nykaa', 'tata cliq',
    'mall', 'boutique', 'clothing', 'retail', 'electronics', 'fashion',
  ],
  utilities_bills: [
    'airtel', 'jio', 'vi', 'vodafone', 'verizon', 'at&t', 't-mobile', 'electricity', 'bescom',
    'water', 'gas', 'broadband', 'wifi', 'recharge', 'billdesk', 'cred', 'utility', 'power',
    'postpaid', 'insurance', 'lic', 'tax', 'rent', 'maintenance',
  ],
  travel_fuel: [
    'uber', 'ola', 'lyft', 'rapido', 'metro', 'irctc', 'train', 'flight', 'indigo', 'air india',
    'delta', 'booking.com', 'makemytrip', 'agoda', 'fuel', 'petrol', 'diesel', 'hpcl', 'bpcl',
    'iocl', 'shell', 'chevron', 'exxon', 'parking', 'toll', 'fastag',
  ],
  entertainment: [
    'netflix', 'spotify', 'prime video', 'disney', 'hotstar', 'youtube', 'steam', 'playstation',
    'xbox', 'cinema', 'pvr', 'inox', 'bookmyshow', 'amc', 'ticket', 'audible', 'hulu', 'apple music',
  ],
  health_wellness: [
    'apollo', 'pharmacy', 'chemist', 'medplus', '1mg', 'pharmeasy', 'cvs', 'walgreens', 'hospital',
    'clinic', 'dental', 'doctor', 'cult.fit', 'gym', 'fitness', 'opticals', 'lenskart',
  ],
  cash_withdrawal: [
    'atm', 'withdrawn', 'cash out', 'atm wdl', 'cash withdrawal', 'dispensed',
  ],
  transfers: [
    'transfer', 'vpa', 'sent to', 'imps', 'neft', 'rtgs', 'wire', 'peer', 'venmo', 'cash app', 'zelle',
  ],
  other: [],
};

/**
 * High precision SMS parsing function
 */
export function parseTransactionSMS(smsText: string): SMSParseResult | null {
  if (!smsText || typeof smsText !== 'string') return null;

  const text = smsText.replace(/\n+/g, ' ').trim();
  const lowerText = text.toLowerCase();

  // 1. Determine Transaction Type
  let type: TransactionType = 'debit';
  if (
    lowerText.includes('withdrawn') ||
    lowerText.includes('atm wdl') ||
    lowerText.includes('cash withdrawal')
  ) {
    type = 'withdrawal';
  } else if (
    lowerText.includes('credited') ||
    lowerText.includes('received') ||
    lowerText.includes('deposited') ||
    lowerText.includes('refund')
  ) {
    type = 'credit';
  } else if (
    lowerText.includes('sent to') ||
    lowerText.includes('transferred') ||
    lowerText.includes('transfer to')
  ) {
    type = 'transfer';
  } else if (
    lowerText.includes('debited') ||
    lowerText.includes('spent') ||
    lowerText.includes('paid') ||
    lowerText.includes('deducted') ||
    lowerText.includes('purchase of') ||
    lowerText.includes('purchase at') ||
    lowerText.includes('purchase') ||
    lowerText.includes('charged') ||
    lowerText.includes('authorized') ||
    lowerText.includes('transaction')
  ) {
    type = 'debit';
  } else {
    // If none of these financial verbs are found, it might not be a transaction notification
    const looksFinancial = /(rs\.?|inr|\$|usd|eur|€|£|gbp)\s*[\d,]+(\.\d{2})?/i.test(text);
    if (!looksFinancial) return null;
  }

  // 2. Extract Currency and Amount
  // Matches patterns like: Rs. 1,450.00 | INR 300 | $45.99 | USD 120 | €50.00 | £15
  let currency = 'INR';
  let amount = 0;

  const amountPatterns = [
    // $ 45.99 or USD 45.99 (Prioritize $ detection)
    /(?:\$|usd)\s*([\d,]+(?:\.\d{1,2})?)/i,
    // Rs. / INR 1,200.50
    /(?:rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i,
    // € 45.99 or EUR 45.99
    /(?:€|eur)\s*([\d,]+(?:\.\d{1,2})?)/i,
    // £ 45.99 or GBP 45.99
    /(?:£|gbp)\s*([\d,]+(?:\.\d{1,2})?)/i,
    // "charged $45.00" / "spent 45.00"
    /(?:debited(?:\s+for|\s+by)?|spent|paid|charged|authorized|purchase(?:\s+of)?)\s+(?:inr|rs\.?|\$|usd|eur|€)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const rawNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(rawNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        if (/(\$|usd)/i.test(match[0])) currency = 'USD';
        else if (/(€|eur)/i.test(match[0])) currency = 'EUR';
        else if (/(£|gbp)/i.test(match[0])) currency = 'GBP';
        else currency = 'INR';
        break;
      }
    }
  }

  if (amount === 0) {
    // Fallback amount regex: any number followed by "debited" or preceding "debited"
    const fallbackMatch = text.match(/([\d,]+\.\d{2})/);
    if (fallbackMatch) {
      amount = parseFloat(fallbackMatch[1].replace(/,/g, ''));
    }
  }

  if (amount === 0) return null;

  // 3. Extract Merchant / Party Name
  let merchant = 'Unknown Merchant';
  if (type === 'withdrawal') {
    merchant = 'Cash ATM Withdrawal';
  } else {
    // Patterns like: "at Swiggy", "to Amazon.com", "for NETFLIX.COM", "info: Starbucks", "vpa swiggy@icici"
    const merchantPatterns = [
      /(?:at|to|for|towards|info[:\s]+|vpa)\s+([A-Za-z0-9\.\-\_\s&]+?)(?:\s+on|\s+ref|\s+avl|\s+bal|\s+via|\s+with|\s+card|\.|$)/i,
      /(?:paid to|spent on|charged at|purchased at)\s+([A-Za-z0-9\.\-\_\s&]+?)(?:\s+on|\s+ref|\s+avl|\s+with|\.|$)/i,
    ];

    for (const pattern of merchantPatterns) {
      const mMatch = text.match(pattern);
      if (mMatch && mMatch[1]) {
        const candidate = mMatch[1].trim();
        // Discard junk words
        if (candidate.length > 1 && !/^(the|your|account|card|avl|bal)$/i.test(candidate)) {
          merchant = candidate.slice(0, 32);
          break;
        }
      }
    }
  }

  // 4. Extract Masked Account / Card (e.g., A/c ending 1234, Card ending in 4912, XX3892)
  let accountMasked: string | undefined;
  const acMatch = text.match(/(?:a\/c|account|card|acct)[\s\w]*?([xX*]+[\d]{3,4}|ending\s+[\d]{4}|[\d]{4})/i);
  if (acMatch && acMatch[1]) {
    accountMasked = acMatch[1].trim();
  }

  // 5. Extract Balance After
  let balanceAfter: number | undefined;
  const balMatch = text.match(/(?:avl\s+bal|avail\s+bal|balance(?:\s+is)?|bal:?)\s*(?:inr|rs\.?|\$|usd|eur|€)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (balMatch && balMatch[1]) {
    const rawBal = balMatch[1].replace(/,/g, '');
    const pBal = parseFloat(rawBal);
    if (!isNaN(pBal)) {
      balanceAfter = pBal;
    }
  }

  // 6. Categorize based on merchant and keywords
  let category: TransactionCategory = 'other';
  if (type === 'withdrawal') {
    category = 'cash_withdrawal';
  } else if (
    lowerText.includes('trf to') ||
    lowerText.includes('transfer to') ||
    lowerText.includes('sent to') ||
    type === 'transfer'
  ) {
    // If sent to food merchants, categorize as food, otherwise transfer
    if (merchant.toLowerCase().includes('swiggy') || merchant.toLowerCase().includes('zomato')) {
      category = 'food_dining';
    } else {
      category = 'transfers';
      type = 'transfer';
    }
  } else {
    const searchTarget = ` ${merchant} ${text} `.toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [TransactionCategory, string[]][]) {
      const isMatch = keywords.some((kw) => {
        if (kw.length <= 3) {
          const regex = new RegExp(`\\b${kw}\\b`, 'i');
          return regex.test(searchTarget);
        }
        return searchTarget.includes(kw);
      });
      if (isMatch) {
        category = cat;
        break;
      }
    }
  }

  return {
    amount,
    type,
    currency,
    merchant,
    category,
    accountMasked,
    balanceAfter,
    confidence: 0.95,
    rawText: text,
  };
}

/**
 * Ready-to-test Bank SMS Presets
 */
export const SAMPLE_BANK_SMS = [
  {
    bank: 'SBI UPI (Your Bank)',
    categoryName: 'Transfers / UPI',
    text: 'Dear UPI user A/C X3198 debited by 11.00 on date 01Nov26 trf to Gitumoni Baishy Refno 630530913437 If not u? call-1800111109 for other services-18001234-SBI',
  },
  {
    bank: 'HDFC Bank',
    categoryName: 'Food & Dining',
    text: 'Dear Customer, Rs. 480.00 has been debited from your A/C **4912 on 01-Nov-26 at SWIGGY BANGALORE via UPI. Avl Bal: Rs 42,390.00 - HDFC Bank',
  },
  {
    bank: 'ICICI Bank',
    categoryName: 'Groceries',
    text: 'Your ICICI Bank Card ending 8031 was spent for INR 1,249.50 on 01-Nov-26 at BLINKIT GURGAON. Avl Lmt: INR 85,400.00.',
  },
  {
    bank: 'State Bank of India',
    categoryName: 'Utilities & Bills',
    text: 'A/c *1092 debited by Rs 1,199.00 on 31-Oct-26 by transfer to AIRTEL POSTPAID BILL. Ref: 20938472910. SBI',
  },
  {
    bank: 'Chase Bank',
    categoryName: 'Shopping',
    text: 'Chase Alert: You made a $89.95 purchase at Amazon.com with your card ending in 3211 on Nov 01. Available credit: $4,210.00.',
  },
  {
    bank: 'Wells Fargo',
    categoryName: 'Entertainment',
    text: 'Wells Fargo: $19.99 was debited from checking account ending in 7740 for NETFLIX.COM on 11/01/2026. Avl Bal: $3,450.20.',
  },
  {
    bank: 'Axis Bank',
    categoryName: 'Cash Withdrawal',
    text: 'Alert: Cash withdrawal of INR 2,000.00 done from ATM #NDLS29 on your A/C **6621 on 01-Nov-26. Avl Bal: INR 18,210.00.',
  },
  {
    bank: 'Bank of America',
    categoryName: 'Travel & Fuel',
    text: 'Bank of America: Debit card ending in 4102 was charged $48.20 at CHEVRON 92041 on 11/01/2026. Available balance: $2,890.15.',
  },
];
