import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { LOCALES, Locale } from './core';

export * from './core';

const STORAGE_KEY = 'tb.locale';

export function detectLocale(): Locale {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    return (LOCALES as string[]).includes(code ?? '') ? (code as Locale) : 'en';
  } catch { return 'en'; }
}

export async function loadLocale(): Promise<Locale> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && (LOCALES as string[]).includes(saved)) return saved as Locale;
  } catch {}
  return detectLocale();
}

export async function saveLocale(l: Locale) {
  try { await AsyncStorage.setItem(STORAGE_KEY, l); } catch {}
}
