import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { AppText } from '../components/AppText';
import { AppButton } from '../components/AppButton';
import { CreditAmount } from '../components/CreditBalance';
import { t } from '../i18n';
import { TabKey, tabs } from './tabs';

export const SIDEBAR_WIDTH = 240;

/** Expanded windows (tablet, unfolded foldable, web) swap the tab bar for this. */
export function Sidebar({ active, onChange, onOffer, balance }: { active: TabKey; onChange: (t: TabKey) => void; onOffer: () => void; balance: number }) {
  const { colors } = useTheme();
  const { insets } = useAdaptiveLayout();
  return (
    <View style={{ width: SIDEBAR_WIDTH, backgroundColor: colors.surface, borderEndWidth: 1, borderEndColor: colors.border, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.md, gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs }}>
        <Image source={require('../../assets/logo.png')} accessibilityLabel={t('auth.logo')} style={{ width: 36, height: 36, borderRadius: radius.md }} />
        <AppText variant="h3">TimeBank</AppText>
      </View>
      <View accessibilityRole="tablist" style={{ gap: spacing.micro }}>
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(t.key)}
              style={({ hovered }: any) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: on ? colors.primarySoft : hovered ? colors.surfaceAlt : 'transparent' })}>
              <t.Icon size={22} color={on ? colors.primary : colors.textSecondary} />
              <AppText variant="labelLg" style={{ color: on ? colors.primary : colors.textSecondary }}>{t.label}</AppText>
            </Pressable>
          );
        })}
      </View>
      <AppButton label={t('home.offerHelp')} icon={Plus} fullWidth onPress={onOffer} />
      <View style={{ flex: 1 }} />
      <View style={{ backgroundColor: colors.creditSoft, borderRadius: radius.md, padding: spacing.sm, gap: 2 }}>
        <AppText variant="caption" tone="credit">Time Credits</AppText>
        <CreditAmount hours={balance} />
      </View>
    </View>
  );
}
