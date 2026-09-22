import React from 'react';
import { View } from 'react-native';
import { radius, spacing, fontFor } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { hours as fmtHours } from '../lib/format';
import { t } from '../i18n';
import { AppText } from './AppText';
import { Text } from 'react-native';

export const formatHours = fmtHours;

/** Inline credit chip: ◉ 3.5h */
export function CreditAmount({ hours, size = 'md' }: { hours: number; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const fs = size === 'sm' ? 13 : 16;
  return (
    <Text accessibilityLabel={t('credit.a11yAmount', { amount: fmtHours(hours) })} style={{ color: colors.credit, fontFamily: fontFor('semibold'), fontSize: fs }}>
      ◉ {formatHours(hours)}
    </Text>
  );
}

export function CreditBalance({ hours, earnedThisWeek }: { hours: number; earnedThisWeek?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={t('credit.a11yBalance', { amount: fmtHours(hours) }) + (earnedThisWeek ? ', ' + t('credit.earnedWeek', { amount: fmtHours(earnedThisWeek) }) : '')}
      style={{ backgroundColor: colors.creditSoft, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.credit + '33', gap: spacing.xs }}
    >
      <AppText variant="labelMd" tone="credit">{t('credit.title')}</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.micro }}>
        <AppText variant="displayLg" tone="credit" style={{ fontSize: 44, lineHeight: 52 }}>{Number(hours).toFixed(1)}</AppText>
        <AppText variant="h2" tone="credit">{t('unit.h').trim()}</AppText>
      </View>
      {earnedThisWeek != null && earnedThisWeek > 0 && (
        <AppText variant="bodySm" tone="success">{t('credit.earnedWeek', { amount: fmtHours(earnedThisWeek) })}</AppText>
      )}
    </View>
  );
}
