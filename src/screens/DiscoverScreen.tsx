import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SearchX } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { AdaptiveGrid, SplitPane, useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { useData } from '../data/ApiProvider';
import { CATEGORIES } from '../data/types';
import { categoryLabel, t } from '../i18n';
import { useNav } from '../navigation/NavContext';
import { AppCard, AppText, EmptyState, ErrorState, FilterChips, SearchBar, SkillCard } from '../components';
import { LoadingCards, ScreenScaffold } from './ScreenScaffold';

export function DiscoverScreen() {
  const { colors } = useTheme();
  const { sizeClass } = useAdaptiveLayout();
  const nav = useNav();
  const compact = sizeClass === 'compact';
  const ALL = t('discover.all');
  const HIGH = t('discover.highlyRated');
  const ALL_CATS = t('discover.allCategories');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const [category, setCategory] = useState<string | null>(null);
  useEffect(() => { const timer = setTimeout(() => setDebounced(query), 300); return () => clearTimeout(timer); }, [query]);

  const { data, loading, error, reload } = useData((a) => a.discover({ query: debounced, category }), [debounced, category]);
  const results = (data ?? []).filter((s) => filter !== 'high' || (s.rating ?? 0) >= 4.5);

  const categoryList = (
    <AppCard padding={spacing.sm}>
      <AppText variant="labelMd" tone="muted" style={{ padding: spacing.xs }}>{t('discover.categories')}</AppText>
      {CATEGORIES.map((c) => {
        const on = c === category;
        return (
          <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setCategory(on ? null : c)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: on ? colors.primarySoft : 'transparent' }}>
            <AppText variant="labelLg" style={{ color: on ? colors.primary : colors.textSecondary }}>{categoryLabel(c)}</AppText>
          </Pressable>
        );
      })}
    </AppCard>
  );

  const main = (
    <View style={{ gap: spacing.md }}>
      <SearchBar value={query} onChangeText={setQuery} placeholder={t('discover.search')} />
      {compact && (
        <FilterChips
          options={[ALL_CATS, ...CATEGORIES.map(categoryLabel)]}
          value={category ? categoryLabel(category) : ALL_CATS}
          onChange={(label) => setCategory(label === ALL_CATS ? null : CATEGORIES.find((c) => categoryLabel(c) === label) ?? null)}
        />
      )}
      <FilterChips options={[ALL, HIGH]} value={filter === 'high' ? HIGH : ALL} onChange={(v) => setFilter(v === HIGH ? 'high' : 'all')} />
      {loading && !data ? <LoadingCards /> : error && !data ? (
        <ErrorState title={t('error.loadSkills')} message={t('error.checkConnection')} onRetry={reload} />
      ) : results.length ? (
        <AdaptiveGrid data={results} keyExtractor={(s) => s.id} renderItem={(s) => <SkillCard skill={s} onPress={() => nav.push({ name: 'person', userId: s.ownerId })} onBook={() => nav.push({ name: 'book', skill: s })} />} />
      ) : (
        <EmptyState icon={SearchX} title={t('empty.noMatches.title')} message={t('empty.noMatches.body')} actionLabel={t('empty.clearFilters')} onAction={() => { setQuery(''); setFilter('all'); setCategory(null); }} />
      )}
    </View>
  );

  return (
    <ScreenScaffold title={t('discover.title')} subtitle={t('discover.subtitle')}>
      {compact ? main : <SplitPane secondary={categoryList} primary={main} />}
    </ScreenScaffold>
  );
}
