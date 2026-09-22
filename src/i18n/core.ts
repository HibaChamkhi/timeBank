import { en, Key } from './en';
import { fr } from './fr';
import { ar } from './ar';

export type Locale = 'en' | 'fr' | 'ar';
export const LOCALES: Locale[] = ['en', 'fr', 'ar'];
export type { Key };
export type PluralBase = Key extends infer K ? (K extends `${infer B}_other` ? B : never) : never;

const catalogs: Record<Locale, Record<string, string>> = { en, fr, ar };

// The active language is module state so code outside React (data layer, formatters) can translate too.
// Changing it remounts the visible screens (see LocaleView), so components read it at render time.
let current: Locale = 'en';
export const getLocale = () => current;
export const setCurrentLocale = (l: Locale) => { current = l; };
export const isRTL = () => current === 'ar';

function interpolate(s: string, params?: Record<string, string | number>) {
  return s.replace(/\{(\w+)\}/g, (_, k) => (params && k in params ? String(params[k]) : `{${k}}`));
}

export function t(key: Key, params?: Record<string, string | number>): string {
  return interpolate(catalogs[current][key] ?? en[key], params);
}

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
export function pluralCategory(locale: Locale, n: number): PluralCategory {
  if (locale === 'ar') {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    const m = n % 100;
    if (m >= 3 && m <= 10) return 'few';
    if (m >= 11 && m <= 99) return 'many';
    return 'other';
  }
  if (locale === 'fr') return n >= 0 && n < 2 ? 'one' : 'other'; // French: 0 and 1 are singular
  return n === 1 ? 'one' : 'other';
}

/** Plural-aware lookup: uses `<base>_<category>`, falling back to `<base>_other`. */
export function tp(base: PluralBase, count: number, params?: Record<string, string | number>): string {
  const cat = catalogs[current];
  const s = cat[`${base}_${pluralCategory(current, count)}`] ?? cat[`${base}_other`] ?? (en as Record<string, string>)[`${base}_other`];
  return interpolate(s, { count, ...params });
}

/** Categories are stored in English in the database; show them in the active language. */
export const categoryLabel = (c: string) => (`category.${c}` in en ? t(`category.${c}` as Key) : c);

export const dayNames = () => t('date.days').split(',');
export const monthNames = () => t('date.months').split(',');

export const catalogsForTest = catalogs;
