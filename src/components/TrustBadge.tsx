import React from 'react';
import { View } from 'react-native';
import { CalendarCheck, Clock, Star } from 'lucide-react-native';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { hours } from '../lib/format';
import { t, tp } from '../i18n';
import { AppText } from './AppText';

export interface TrustSignals { rating: number | null; reviewCount: number; sessions: number; hoursGiven: number }

// Reputation is shown as its underlying signals, never as one opaque score.
export function TrustBadge({ signals }: { signals: TrustSignals }) {
  const { colors } = useTheme();
  const items = [
    { Icon: Star, color: colors.warning, text: signals.rating == null ? t('trust.noReviews') : tp('trust.reviews', signals.reviewCount, { rating: signals.rating.toFixed(1) }) },
    { Icon: CalendarCheck, color: colors.community, text: tp('trust.completed', signals.sessions) },
    { Icon: Clock, color: colors.credit, text: t('trust.given', { hours: hours(signals.hoursGiven) }) },
  ];
  return (
    <View style={{ gap: spacing.micro }}>
      {items.map(({ Icon, color, text }) => (
        <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon size={16} color={color} />
          <AppText variant="bodySm" tone="secondary">{text}</AppText>
        </View>
      ))}
    </View>
  );
}
