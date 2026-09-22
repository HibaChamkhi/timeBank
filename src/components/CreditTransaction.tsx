import React from 'react';
import { View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Badge } from './Badge';
import { t } from '../i18n';
import { formatHours } from './CreditBalance';

export interface Tx { id: string; hours: number; title: string; counterpart: string; status?: 'completed' | 'pending' | 'disputed' }

export function CreditTransaction({ tx }: { tx: Tx }) {
  const { colors } = useTheme();
  const earned = tx.hours > 0;
  const Icon = earned ? ArrowDownLeft : ArrowUpRight;
  const sign = earned ? '+' : '−';
  return (
    <View accessible accessibilityLabel={t(earned ? 'ledger.a11yEarned' : 'ledger.a11ySpent', { amount: formatHours(Math.abs(tx.hours)), title: tx.title, note: tx.counterpart })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 56 }}>
      <View style={{ width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: earned ? colors.successSoft : colors.creditSoft }}>
        <Icon size={20} color={earned ? colors.success : colors.credit} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="labelLg" numberOfLines={1}>{tx.title}</AppText>
        <AppText variant="bodySm" tone="muted" numberOfLines={1}>{tx.counterpart}</AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <AppText variant="labelLg" tone={earned ? 'success' : 'credit'}>{sign} {formatHours(Math.abs(tx.hours))}</AppText>
        {tx.status && <Badge label={tx.status[0].toUpperCase() + tx.status.slice(1)} variant={tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'neutral' : 'warning'} />}
      </View>
    </View>
  );
}
