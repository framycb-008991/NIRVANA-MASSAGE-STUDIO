import en from '../locales/en.json';
import pl from '../locales/pl.json';
import uk from '../locales/uk.json';
import { Locale } from '../types';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'pl', 'uk'];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_NAMES: Record<Locale, { label: string; code: string; flag: string }> = {
  en: { label: 'English', code: 'EN', flag: '🇬🇧' },
  pl: { label: 'Polski', code: 'PL', flag: '🇵🇱' },
  uk: { label: 'Українська', code: 'UA', flag: '🇺🇦' }
};

const translations: Record<Locale, any> = { en, pl, uk };

export function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  
  // 1. Check saved choice
  const saved = localStorage.getItem('nirvana_lang') as Locale;
  if (saved && SUPPORTED_LOCALES.includes(saved)) {
    return saved;
  }

  // 2. Check URL path prefix
  const path = window.location.pathname;
  const match = path.match(/^\/(en|pl|uk)(\/|$)/);
  if (match && SUPPORTED_LOCALES.includes(match[1] as Locale)) {
    return match[1] as Locale;
  }

  // 3. Check browser languages
  const navLangs = navigator.languages || [navigator.language];
  for (const lang of navLangs) {
    const code = lang.toLowerCase();
    if (code.startsWith('pl')) return 'pl';
    if (code.startsWith('uk') || code.startsWith('ua')) return 'uk';
    if (code.startsWith('en')) return 'en';
  }

  return DEFAULT_LOCALE;
}

export function setPersistedLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nirvana_lang', locale);
    document.documentElement.lang = locale;
  }
}

/**
 * Get translated string by dot notation key with fallback to English
 */
export function getTranslation(key: string, locale: Locale = DEFAULT_LOCALE): string {
  const getFromObj = (obj: any, path: string) => {
    const parts = path.split('.');
    let curr = obj;
    for (const p of parts) {
      if (curr && typeof curr === 'object' && p in curr) {
        curr = curr[p];
      } else {
        return undefined;
      }
    }
    return typeof curr === 'string' ? curr : undefined;
  };

  // Try current locale
  const target = getFromObj(translations[locale], key);
  if (target !== undefined) return target;

  // Fallback to English
  const fallback = getFromObj(translations.en, key);
  if (fallback !== undefined) return fallback;

  return key; // return key if completely missing
}

/**
 * Format a Date string (YYYY-MM-DD or ISO) into human-readable string using Intl.DateTimeFormat
 */
export function formatLocaleDate(
  dateStr: string,
  locale: Locale = 'en',
  options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
): string {
  try {
    const date = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00Z' : ''));
    const intlLocale = locale === 'uk' ? 'uk-UA' : locale === 'pl' ? 'pl-PL' : 'en-GB';
    return new Intl.DateTimeFormat(intlLocale, options).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Format month and year e.g. "August 2026" / "Sierpień 2026" / "Серпень 2026"
 */
export function formatMonthYear(year: number, monthZeroIndexed: number, locale: Locale = 'en'): string {
  try {
    const date = new Date(Date.UTC(year, monthZeroIndexed, 1));
    const intlLocale = locale === 'uk' ? 'uk-UA' : locale === 'pl' ? 'pl-PL' : 'en-GB';
    return new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric' }).format(date);
  } catch {
    return `${year}-${monthZeroIndexed + 1}`;
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: 'PLN' | 'EUR', locale: Locale = 'en'): string {
  const intlLocale = locale === 'uk' ? 'uk-UA' : locale === 'pl' ? 'pl-PL' : 'en-GB';
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
