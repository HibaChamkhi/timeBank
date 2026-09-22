import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Locale, isRTL, loadLocale, saveLocale, setCurrentLocale } from './index';

interface Ctx { locale: Locale; rtl: boolean; setLocale: (l: Locale) => void }
const I18nCtx = createContext<Ctx>({ locale: 'en', rtl: false, setLocale: () => {} });
export const useI18n = () => useContext(I18nCtx);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale | null>(null);

  useEffect(() => {
    loadLocale().then((l) => { setCurrentLocale(l); setLocaleState(l); });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setCurrentLocale(l); // before the state change, so the re-render already reads the new language
    saveLocale(l);
    setLocaleState(l);
  }, []);

  const value = useMemo(() => ({ locale: locale ?? 'en', rtl: locale === 'ar', setLocale }), [locale, setLocale]);
  if (!locale) return null;
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

/**
 * Wraps the visible app. A new key on language change remounts it, so every string and font is
 * re-read; the data and auth providers above it keep their state. `direction` mirrors layouts for Arabic.
 */
export function LocaleView({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  return <View key={locale} style={{ flex: 1, direction: isRTL() ? 'rtl' : 'ltr' }}>{children}</View>;
}
