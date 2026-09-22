import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { isRTL, t } from '../i18n';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { Screen, useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { AppText } from '../components/AppText';
import { AppButton } from '../components/AppButton';
import { Skeleton } from '../components/Skeleton';

export function BackButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={onPress} style={{ width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      {isRTL() ? <ChevronRight size={24} color={colors.textPrimary} /> : <ChevronLeft size={24} color={colors.textPrimary} />}
    </Pressable>
  );
}

/** Scroll container that respects the safe area and clears the tab bar. */
export function ScreenScaffold({ title, subtitle, right, onBack, children }: { title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  const { insets, navigation } = useAdaptiveLayout();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: (navigation === 'sidebar' ? spacing.xl : insets.top) + spacing.md, paddingBottom: spacing.xxl + (navigation === 'bottom-tabs' && !onBack ? 0 : insets.bottom) }}
      keyboardShouldPersistTaps="handled"
    >
      <Screen>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.lg }}>
          {onBack && <BackButton onPress={onBack} />}
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <AppText variant={navigation === 'bottom-tabs' ? 'h1' : 'displayMd'} numberOfLines={1} accessibilityRole="header">{title}</AppText>
            {subtitle && <AppText variant="bodyMd" tone="secondary" numberOfLines={2}>{subtitle}</AppText>}
          </View>
          {right}
        </View>
        {children}
      </Screen>
    </ScrollView>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <AppText variant="h2" accessibilityRole="header">{title}</AppText>
      {action && <AppButton label={action} variant="ghost" size="sm" onPress={onAction} />}
    </View>
  );
}

export function LoadingCards({ n = 2 }: { n?: number }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={{ gap: spacing.sm }}>
          <Skeleton height={20} width="60%" /><Skeleton height={14} /><Skeleton height={44} />
        </View>
      ))}
    </View>
  );
}
