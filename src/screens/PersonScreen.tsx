import React from 'react';
import { View } from 'react-native';
import { spacing } from '../theme/tokens';
import { useData } from '../data/ApiProvider';
import { categoryLabel, t } from '../i18n';
import { useNav } from '../navigation/NavContext';
import { AppButton, AppCard, AppText, Avatar, Badge, ErrorState, ReviewCard, SafetyMenu, TrustBadge } from '../components';
import { useApi } from '../data/ApiProvider';
import { dayNames } from '../i18n';
import { fmtMin } from '../lib/availability';
import { CreditAmount } from '../components/CreditBalance';
import { LoadingCards, ScreenScaffold, SectionHeader } from './ScreenScaffold';

function AvailabilitySummary({ userId, name }: { userId: string; name: string }) {
  const av = useData((a) => a.getAvailability(userId), [userId]).data;
  if (!av) return null;
  const days = dayNames();
  return (
    <AppCard padding={spacing.lg} style={{ gap: spacing.xs }}>
      {av.windows.length === 0 ? <AppText variant="bodyMd" tone="secondary">{t('availability.anytime')}</AppText> : (
        <>
          {days.map((d, i) => {
            const ws = av.windows.filter((w) => w.weekday === i);
            return ws.length ? (
              <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
                <AppText variant="labelLg" style={{ width: 88 }}>{d}</AppText>
                <AppText variant="bodyMd" tone="secondary">{ws.map((w) => `${fmtMin(w.startMin)}–${fmtMin(w.endMin)}`).join(', ')}</AppText>
              </View>
            ) : null;
          })}
          <AppText variant="caption" tone="muted">{t('availability.theirTime', { name: name.split(' ')[0] })}</AppText>
        </>
      )}
    </AppCard>
  );
}

export function PersonScreen({ userId }: { userId: string }) {
  const nav = useNav();
  const api = useApi();
  const { data: p, error, reload } = useData((a) => a.getPerson(userId), [userId]);
  return (
    <ScreenScaffold title={p?.name ?? t('profile.title')} onBack={nav.pop} right={p && userId !== api.userId ? <SafetyMenu userId={userId} name={p.name} onBlocked={nav.pop} /> : undefined}>
      {error && !p ? <ErrorState title={t('error.loadProfile')} message={t('error.nothingChanged')} onRetry={reload} /> : !p ? <LoadingCards /> : (
        <>
          <AppCard featured padding={spacing.xl} style={{ alignItems: 'center', gap: spacing.sm }}>
            <Avatar name={p.name} size={96} />
            <AppText variant="h1">{p.name}</AppText>
            {!!p.headline && <AppText variant="bodyMd" tone="secondary">{p.headline}</AppText>}
            {!!p.bio && <AppText variant="bodyMd" tone="secondary" style={{ textAlign: 'center' }}>{p.bio}</AppText>}
          </AppCard>

          <SectionHeader title={t('trust.title')} />
          <AppCard padding={spacing.lg}><TrustBadge signals={{ rating: p.stats.rating, reviewCount: p.stats.reviewCount, sessions: p.stats.sessionsCompleted, hoursGiven: p.stats.hoursGiven }} /></AppCard>

          <SectionHeader title={t('availability.section')} />
          <AvailabilitySummary userId={userId} name={p.name} />

          <SectionHeader title={t('person.skills')} />
          <View style={{ gap: spacing.sm }}>
            {p.skills.map((s) => (
              <AppCard key={s.id} padding={spacing.lg} style={{ gap: spacing.sm }}>
                <AppText variant="h3">{s.title}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Badge label={categoryLabel(s.category)} /><CreditAmount hours={s.creditsPerHour} /><AppText variant="bodySm" tone="muted">{t('unit.perHour')}</AppText></View>
                {!!s.description && <AppText variant="bodyMd" tone="secondary">{s.description}</AppText>}
                <AppButton label={t('person.book')} fullWidth onPress={() => nav.push({ name: 'book', skill: s })} />
              </AppCard>
            ))}
            {!p.skills.length && <AppText variant="bodyMd" tone="muted">{t('person.noSkills')}</AppText>}
          </View>

          <SectionHeader title={t('person.reviews')} />
          <AppCard padding={spacing.lg} style={{ gap: spacing.md }}>
            {p.reviews.length ? p.reviews.map((r) => <ReviewCard key={r.id} review={r} />) : <AppText variant="bodyMd" tone="muted">{t('person.noReviews')}</AppText>}
          </AppCard>
        </>
      )}
    </ScreenScaffold>
  );
}
