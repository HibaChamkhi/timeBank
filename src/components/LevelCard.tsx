import React from 'react';
import { View } from 'react-native';
import { Award, Lock } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { t, Key } from '../i18n';
import { hours } from '../lib/format';
import { BADGES, computeLevel } from '../lib/levels';
import type { Stats } from '../data/types';
import { AppText } from './AppText';
import { AppCard } from './AppCard';

/** Contribution level and badges. Levels are recognition only; nothing is locked behind them. */
export function LevelCard({ stats }: { stats: Stats }) {
  const { colors } = useTheme();
  const info = computeLevel(stats);
  return (
    <AppCard padding={spacing.lg} style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Award size={22} color={colors.credit} />
          <AppText variant="h3">{t(`level.${info.level}` as Key)}</AppText>
        </View>
        <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(info.progress * 100) }} style={{ height: 8, borderRadius: radius.full, backgroundColor: colors.creditSoft, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(info.progress * 100)}%`, height: 8, backgroundColor: colors.credit }} />
        </View>
        <AppText variant="bodySm" tone="secondary">
          {info.nextLevel == null ? t('level.max') : t('level.next', { hours: hours(info.hoursToNext), level: t(`level.${info.nextLevel}` as Key) })}
        </AppText>
      </View>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="labelMd" tone="muted">{t('level.badges')}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {BADGES.map((b) => {
            const on = b.earned(stats);
            return (
              <View key={b.key} accessible accessibilityLabel={`${t(`badge.${b.key}` as const)}, ${on ? t('badge.earned') : t('badge.locked')}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: radius.full, backgroundColor: on ? colors.creditSoft : colors.surfaceAlt, opacity: on ? 1 : 0.7 }}>
                {on ? <Award size={14} color={colors.credit} /> : <Lock size={14} color={colors.textMuted} />}
                <AppText variant="labelMd" style={{ color: on ? colors.credit : colors.textMuted }}>{t(`badge.${b.key}` as const)}</AppText>
              </View>
            );
          })}
        </View>
      </View>
    </AppCard>
  );
}
