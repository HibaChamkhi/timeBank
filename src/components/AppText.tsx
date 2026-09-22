import React from 'react';
import { Text, TextProps } from 'react-native';
import { fontFor, TextVariant, typography } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

type Tone = 'primary' | 'secondary' | 'muted' | 'onPrimary' | 'credit' | 'success' | 'error';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: Tone;
}

export function AppText({ variant = 'bodyMd', tone = 'primary', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  const t = typography[variant];
  const color = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    onPrimary: colors.onPrimary,
    credit: colors.credit,
    success: colors.success,
    error: colors.error,
  }[tone];
  // maxFontSizeMultiplier keeps dynamic type usable without breaking layouts.
  return <Text maxFontSizeMultiplier={1.6} style={[{ fontFamily: fontFor(t.weight), fontSize: t.fontSize, lineHeight: t.lineHeight, color }, style]} {...rest} />;
}
