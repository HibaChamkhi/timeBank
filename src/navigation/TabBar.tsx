import React from 'react';
import { Pressable, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { elevation, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { AppText } from '../components/AppText';
import { t } from '../i18n';
import { TabKey, tabs } from './tabs';

export const TAB_BAR_HEIGHT = 64;

function TabItem({ tab, active, onPress }: { tab: (typeof tabs)[number]; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const color = active ? colors.primary : colors.textMuted;
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} onPress={onPress} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <View style={{ width: 56, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? colors.primarySoft : 'transparent' }}>
        <tab.Icon size={24} color={color} strokeWidth={active ? 2.4 : 2} />
      </View>
      <AppText variant="caption" style={{ color }}>{tab.label}</AppText>
    </Pressable>
  );
}

/** Bottom bar: two tabs, a raised Offer action in the middle, two tabs. */
export function TabBar({ active, onChange, onOffer }: { active: TabKey; onChange: (t: TabKey) => void; onOffer: () => void }) {
  const { colors } = useTheme();
  const { insets } = useAdaptiveLayout();
  const [a, b, c, d] = tabs;
  return (
    <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom, ...elevation[2] }}>
      <View accessibilityRole="tablist" style={{ height: TAB_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <TabItem tab={a} active={active === a.key} onPress={() => onChange(a.key)} />
        <TabItem tab={b} active={active === b.key} onPress={() => onChange(b.key)} />
        <View style={{ width: 84, alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tab.offer')}
            onPress={onOffer}
            style={({ pressed }) => ({ marginTop: -28, width: 60, height: 60, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.primaryPressed : colors.primary, borderWidth: 4, borderColor: colors.surface, ...elevation[3] })}
          >
            <Plus size={28} color={colors.onPrimary} strokeWidth={2.6} />
          </Pressable>
        </View>
        <TabItem tab={c} active={active === c.key} onPress={() => onChange(c.key)} />
        <TabItem tab={d} active={active === d.key} onPress={() => onChange(d.key)} />
      </View>
    </View>
  );
}
