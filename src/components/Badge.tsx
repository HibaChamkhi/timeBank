import React from 'react';
import { View } from 'react-native';
import { BadgeCheck, CircleCheck, TriangleAlert, Timer } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';

export type BadgeVariant = 'verified' | 'success' | 'credit' | 'warning' | 'neutral';

// Every variant carries an icon or label so state is never conveyed by color alone.
export function Badge({ label, variant = 'neutral' }: { label: string; variant?: BadgeVariant }) {
  const { colors } = useTheme();
  const cfg = {
    verified: { bg: colors.primarySoft, fg: colors.primary, Icon: BadgeCheck },
    success: { bg: colors.successSoft, fg: colors.success, Icon: CircleCheck },
    credit: { bg: colors.creditSoft, fg: colors.credit, Icon: Timer },
    warning: { bg: colors.warningSoft, fg: colors.warning, Icon: TriangleAlert },
    neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary, Icon: null },
  }[variant];
  const Icon = cfg.Icon;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.full, backgroundColor: cfg.bg }}>
      {Icon && <Icon size={12} color={cfg.fg} />}
      <AppText variant="caption" style={{ color: cfg.fg }}>{label}</AppText>
    </View>
  );
}
