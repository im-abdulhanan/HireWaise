/**
 * ISO 4217 International Currency Registry & Salary Formatting Helpers
 */

export interface CurrencyConfig {
  code: string; // ISO 4217 standard 3-letter code
  name: string; // Full human-readable name
  symbol: string; // Local / universal currency symbol
  flag: string; // Country / regional flag emoji
  locale: string; // BCP 47 locale tag for formatting
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", locale: "en-US" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", flag: "🇵🇰", locale: "en-PK" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", locale: "de-DE" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", locale: "en-IN" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", locale: "en-GB" },
  { code: "SAR", name: "Saudi Riyal", symbol: "ر.س", flag: "🇸🇦", locale: "ar-SA" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", locale: "ar-AE" },
  { code: "QAR", name: "Qatari Riyal", symbol: "ر.ق", flag: "🇶🇦", locale: "ar-QA" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", flag: "🇰🇼", locale: "ar-KW" },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب", flag: "🇧🇭", locale: "ar-BH" },
  { code: "OMR", name: "Omani Rial", symbol: "ر.ع.", flag: "🇴🇲", locale: "ar-OM" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦", locale: "en-CA" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", locale: "en-AU" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", locale: "ja-JP" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳", locale: "zh-CN" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭", locale: "de-CH" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", locale: "en-SG" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾", locale: "ms-MY" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "🇹🇷", locale: "tr-TR" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿", locale: "en-NZ" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", flag: "🇸🇪", locale: "sv-SE" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", flag: "🇳🇴", locale: "nb-NO" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", flag: "🇩🇰", locale: "da-DK" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷", locale: "pt-BR" },
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$", flag: "🇲🇽", locale: "es-MX" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", locale: "en-ZA" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", flag: "🇭🇰", locale: "zh-HK" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", flag: "🇮🇩", locale: "id-ID" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", flag: "🇵🇭", locale: "en-PH" },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭", locale: "th-TH" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "🇪🇬", locale: "ar-EG" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", locale: "en-NG" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", flag: "🇻🇳", locale: "vi-VN" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", flag: "🇧🇩", locale: "bn-BD" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪", locale: "en-KE" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", flag: "🇵🇱", locale: "pl-PL" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", flag: "🇨🇿", locale: "cs-CZ" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", flag: "🇭🇺", locale: "hu-HU" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", flag: "🇮🇱", locale: "he-IL" },
];

export const DEFAULT_CURRENCY = SUPPORTED_CURRENCIES[0]; // USD

/**
 * Lookup a currency config by ISO code.
 */
export function getCurrency(code?: string): CurrencyConfig {
  if (!code) return DEFAULT_CURRENCY;
  const upper = code.trim().toUpperCase();
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === upper);
  return (
    found || {
      code: upper,
      name: `${upper} Currency`,
      symbol: upper,
      flag: "🌐",
      locale: "en-US",
    }
  );
}

/**
 * Validates if an ISO currency code is supported in registry.
 */
export function isValidCurrencyCode(code: string): boolean {
  if (!code) return false;
  const upper = code.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.some((c) => c.code === upper);
}

/**
 * Filter currencies by search query matching code, name, or symbol.
 */
export function searchCurrencies(query: string): CurrencyConfig[] {
  if (!query || !query.trim()) return SUPPORTED_CURRENCIES;
  const q = query.toLowerCase().trim();
  return SUPPORTED_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
  );
}

/**
 * Format a single numeric salary amount with standard grouping and symbol.
 * Example: formatSalaryAmount(150000, "PKR") -> "₨150,000"
 */
export function formatSalaryAmount(amount: number, currencyCode?: string): string {
  const cur = getCurrency(currencyCode);
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(amount);
    return `${cur.symbol}${formatted}`;
  } catch {
    return `${cur.symbol}${amount.toLocaleString()}`;
  }
}

/**
 * Format a salary range for display on candidate job applications and recruiter dashboards.
 * Examples:
 * - formatSalaryRange(100000, 150000, "PKR") -> "₨100,000 – ₨150,000 PKR"
 * - formatSalaryRange(80000, 100000, "USD") -> "$80,000 – $100,000 USD"
 * - formatSalaryRange(60000, 75000, "EUR") -> "€60,000 – €75,000 EUR"
 * - formatSalaryRange(800000, 1000000, "INR") -> "₹800,000 – ₹1,000,000 INR"
 * - formatSalaryRange(100000, undefined, "PKR") -> "From ₨100,000 PKR"
 * - formatSalaryRange(undefined, 150000, "PKR") -> "Up to ₨150,000 PKR"
 */
export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
  currencyCode?: string | null
): string | null {
  const minVal = min !== undefined && min !== null && !isNaN(Number(min)) && Number(min) > 0 ? Number(min) : null;
  const maxVal = max !== undefined && max !== null && !isNaN(Number(max)) && Number(max) > 0 ? Number(max) : null;
  const code = (currencyCode || "USD").toUpperCase();

  if (!minVal && !maxVal) return null;

  if (minVal && maxVal) {
    if (minVal === maxVal) {
      return `${formatSalaryAmount(minVal, code)} ${code}`;
    }
    return `${formatSalaryAmount(minVal, code)} – ${formatSalaryAmount(maxVal, code)} ${code}`;
  }

  if (minVal) {
    return `From ${formatSalaryAmount(minVal, code)} ${code}`;
  }

  if (maxVal) {
    return `Up to ${formatSalaryAmount(maxVal, code)} ${code}`;
  }

  return null;
}
