import React from 'react';
import { View } from 'react-native';
import { HandHeart, Clock, CalendarCheck, Sparkles } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { t } from '../i18n';
import { hours } from '../lib/format';
import { AppText } from './AppText';
import { AppCard } from './AppCard';

export interface Impact { helped: number; hours: number; sessions: number; skills: number }

export function ImpactCard({ impact }: { impact: Impact }) {
  const { colors } = useTheme();
  const { sizeClass } = useAdaptiveLayout();
  const stats = [
    { Icon: HandHeart, value: String(impact.helped), label: t('impact.helped') },
    { Icon: Clock, value: hours(impact.hours), label: t('impact.hours') },
    { Icon: CalendarCheck, value: String(impact.sessions), label: t('impact.sessions') },
    { Icon: Sparkles, value: String(impact.skills), label: t('impact.skills') },
  ];
  return (
    <AppCard padding={spacing.lg} style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {stats.map(({ Icon, value, label }) => (
          <View key={label} accessible accessibilityLabel={`${label}: ${value}`} style={{ flexBasis: sizeClass === 'compact' ? '47%' : '22%', flexGrow: 1, backgroundColor: colors.communitySoft, borderRadius: radius.md, padding: spacing.sm, gap: 4 }}>
            <Icon size={20} color={colors.community} />
            <AppText variant="h1" style={{ color: colors.community }}>{value}</AppText>
            <AppText variant="bodySm" tone="secondary">{label}</AppText>
          </View>
        ))}
      </View>
    </AppCard>
  );
}
