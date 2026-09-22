export const palette = {
  primary: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#2563EB', 600: '#1D4ED8', 700: '#1E40AF' },
  community: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669' },
  credit: { 50: '#F5F3FF', 100: '#EDE9FE', 500: '#8B5CF6', 600: '#7C3AED' },
} as const;

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;
  credit: string;
  creditSoft: string;
  community: string;
  communitySoft: string;
  focusRing: string;
}

export const lightColors: ColorTokens = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  primary: palette.primary[500],
  primaryPressed: palette.primary[600],
  primarySoft: palette.primary[50],
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  successSoft: '#ECFDF5',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  error: '#DC2626',
  errorSoft: '#FEF2F2',
  info: '#0284C7',
  infoSoft: '#E0F2FE',
  credit: palette.credit[600],
  creditSoft: palette.credit[50],
  community: palette.community[600],
  communitySoft: palette.community[50],
  focusRing: palette.primary[500],
};

// Dark mode is designed, not inverted: lifted surfaces, softened accents.
export const darkColors: ColorTokens = {
  background: '#0B1120',
  surface: '#111827',
  surfaceElevated: '#1B2434',
  surfaceAlt: '#1F2937',
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  border: '#2A3546',
  divider: '#1F2937',
  primary: '#3B82F6',
  primaryPressed: '#60A5FA',
  primarySoft: '#172554',
  onPrimary: '#FFFFFF',
  success: '#4ADE80',
  successSoft: '#052E1A',
  warning: '#FBBF24',
  warningSoft: '#3A2A05',
  error: '#F87171',
  errorSoft: '#3B1212',
  info: '#38BDF8',
  infoSoft: '#082F49',
  credit: '#A78BFA',
  creditSoft: '#2E1F5C',
  community: '#34D399',
  communitySoft: '#053B2C',
  focusRing: '#60A5FA',
};

export const spacing = { micro: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, section: 40, major: 48, hero: 64 } as const;

export const radius = { sm: 4, input: 8, md: 12, lg: 16, sheet: 20, xl: 24, full: 999 } as const;

export const typography = {
  displayLg: { fontSize: 32, lineHeight: 40, weight: 'bold' },
  displayMd: { fontSize: 28, lineHeight: 36, weight: 'bold' },
  h1: { fontSize: 24, lineHeight: 32, weight: 'bold' },
  h2: { fontSize: 20, lineHeight: 28, weight: 'bold' },
  h3: { fontSize: 18, lineHeight: 24, weight: 'semibold' },
  bodyLg: { fontSize: 16, lineHeight: 24, weight: 'regular' },
  bodyMd: { fontSize: 14, lineHeight: 20, weight: 'regular' },
  bodySm: { fontSize: 13, lineHeight: 18, weight: 'regular' },
  labelLg: { fontSize: 14, lineHeight: 20, weight: 'semibold' },
  labelMd: { fontSize: 12, lineHeight: 16, weight: 'semibold' },
  caption: { fontSize: 11, lineHeight: 16, weight: 'medium' },
} as const;
export type TextVariant = keyof typeof typography;

import { getLocale } from '../i18n/core';

// Only three weights are used across the app.
export const fontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const elevation = {
  0: {},
  1: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  2: { shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  3: { shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
} as const;

export const control = { heightSm: 36, heightMd: 44, heightLg: 52, minTouch: 44 } as const;

export const motion = { fast: 150, base: 200, slow: 300 } as const;

const arabicFamily = {
  regular: 'NotoSansArabic_400Regular',
  medium: 'NotoSansArabic_500Medium',
  semibold: 'NotoSansArabic_600SemiBold',
  bold: 'NotoSansArabic_700Bold',
} as const;

/** Poppins has no Arabic glyphs, so Arabic uses Noto Sans Arabic. Read at render time. */
export const fontFor = (weight: keyof typeof fontFamily) => (getLocale() === 'ar' ? arabicFamily : fontFamily)[weight];
