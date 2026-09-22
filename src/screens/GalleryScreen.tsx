import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { CalendarX, Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useNav } from '../navigation/NavContext';
import { spacing } from '../theme/tokens';
import { AdaptiveGrid, Screen, SplitPane, useAdaptiveLayout } from '../layout/AdaptiveLayout';
import {
  AppButton, AppCard, AppInput, AppText, Avatar, Badge, CreditBalance, CreditTransaction, EmptyState, ErrorState,
  FilterChips, SearchBar, Skeleton, SkillCard, TrustBadge,
} from '../components';

import { offers, txs, filters as categories } from './galleryData';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.xxl }}>
      <AppText variant="h2" accessibilityRole="header">{title}</AppText>
      {children}
    </View>
  );
}

export function GalleryScreen() {
  const nav = useNav();
  const { colors, isDark, setMode } = useTheme();
  const layout = useAdaptiveLayout();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const sidebar = (
    <AppCard>
      <AppText variant="labelMd" tone="muted">Layout</AppText>
      <AppText variant="bodyMd">{layout.sizeClass} · {layout.columns} col · {Math.round(layout.windowWidth)}px</AppText>
      <AppText variant="bodySm" tone="muted">nav: {layout.navigation}</AppText>
    </AppCard>
  );

  const main = (
    <View style={{ gap: spacing.md }}>
      <SearchBar value={query} onChangeText={setQuery} />
      <FilterChips options={categories} value={filter} onChange={setFilter} />
      <AdaptiveGrid
        data={offers.filter((o) => (o.ownerName + o.title + o.category).toLowerCase().includes(query.toLowerCase()))}
        keyExtractor={(o) => o.id}
        renderItem={(o) => <SkillCard skill={o} />}
      />
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: layout.insets.top + spacing.md, paddingBottom: layout.insets.bottom + spacing.section }}
      keyboardShouldPersistTaps="handled"
    >
      <Screen>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
          <AppButton label="Back" variant="ghost" size="sm" onPress={nav.pop} />
          <View style={{ flex: 1 }}>
            <AppText variant="displayMd">TimeBank</AppText>
            <AppText variant="bodyMd" tone="secondary">Your time has value.</AppText>
          </View>
          <AppButton label={isDark ? 'Light' : 'Dark'} icon={isDark ? Sun : Moon} variant="secondary" size="sm" onPress={() => setMode(isDark ? 'light' : 'dark')} />
        </View>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          <CreditBalance hours={12.5} earnedThisWeek={2} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppButton label="Offer Help" />
            <AppButton label="Find Help" variant="secondary" />
          </View>
        </View>

        <Section title="Discover">
          <SplitPane secondary={sidebar} primary={main} />
        </Section>

        <Section title="Activity">
          <AppCard>
            {txs.map((t, i) => (
              <View key={t.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
                <CreditTransaction tx={t} />
              </View>
            ))}
          </AppCard>
        </Section>

        <Section title="Trust & profile">
          <AppCard style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <Avatar name="Sarah Martin" size={64} online verified />
            <View style={{ gap: spacing.xs, flex: 1 }}>
              <AppText variant="h3">Sarah Martin</AppText>
              <TrustBadge signals={{ rating: 4.9, reviewCount: 18, sessions: 24, hoursGiven: 38.5 }} />
            </View>
          </AppCard>
        </Section>

        <Section title="Inputs, badges, buttons">
          <AdaptiveGrid
            data={['input', 'error', 'buttons'] as const}
            keyExtractor={(k) => k}
            renderItem={(k) =>
              k === 'input' ? (
                <AppInput label="Session topic" placeholder="e.g. Portfolio review" />
              ) : k === 'error' ? (
                <AppInput label="Duration (hours)" value="0" error="Sessions must be at least 0.5 hours." />
              ) : (
                <View style={{ gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                    <Badge label="Verified" variant="verified" />
                    <Badge label="Completed" variant="success" />
                    <Badge label="◉ 1h" variant="credit" />
                    <Badge label="Pending" variant="warning" />
                  </View>
                  <AppButton label="Report" variant="destructive" size="sm" />
                  <AppButton label="See all" variant="ghost" size="sm" />
                  <AppButton label="Confirming…" loading />
                </View>
              )
            }
          />
        </Section>

        <Section title="States">
          <AppCard>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <AppButton label={loading ? 'Show content' : 'Show skeleton'} variant="ghost" size="sm" onPress={() => setLoading(!loading)} />
            </View>
            {loading ? (
              <View style={{ gap: spacing.sm }}>
                <Skeleton height={48} width={48} />
                <Skeleton width="60%" />
                <Skeleton />
                <Skeleton width="80%" />
              </View>
            ) : (
              <EmptyState icon={CalendarX} title="No upcoming sessions" message="Your calendar is clear. Find someone who needs your skills or request help from the community." actionLabel="Explore Skills" />
            )}
          </AppCard>
          <AppCard>
            <ErrorState title="Couldn't confirm your session." message="Your Time Credits were not deducted." onRetry={() => {}} />
          </AppCard>
        </Section>
      </Screen>
    </ScrollView>
  );
}

