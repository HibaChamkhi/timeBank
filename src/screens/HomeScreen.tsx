import React from 'react';
import { Pressable, View } from 'react-native';
import { Bell, CalendarX, MessageCircle } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../auth/AuthProvider';
import { AdaptiveGrid } from '../layout/AdaptiveLayout';
import { useApi, useData } from '../data/ApiProvider';
import { t } from '../i18n';
import { useNav } from '../navigation/NavContext';
import { AppButton, AppCard, AppText, Badge, CreditBalance, CreditTransaction, EmptyState, ImpactCard, SessionCard, SkillCard } from '../components';
import { LoadingCards, ScreenScaffold, SectionHeader } from './ScreenScaffold';

function HeaderIcon({ Icon, label, dot, onPress }: { Icon: typeof Bell; label: string; dot?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={dot ? `${label}, ${t('home.new')}` : label} onPress={onPress} style={{ width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      <Icon size={22} color={colors.textPrimary} />
      {dot && <View style={{ position: 'absolute', top: 9, end: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.surface }} />}
    </Pressable>
  );
}

export function HomeScreen() {
  const api = useApi();
  const nav = useNav();
  const { demo } = useAuth();
  const balance = useData((a) => a.getBalance());
  const ledger = useData((a) => a.ledger());
  const sessions = useData((a) => a.mySessions());
  const stats = useData((a) => a.getStats(a.userId));
  const picks = useData((a) => a.discover());
  const notices = useData((a) => a.notices(), [], 8000);

  const now = Date.now();
  const list = sessions.data ?? [];
  const attention = list.filter((s) => (s.status === 'requested' && s.role === 'provider') || (s.status === 'accepted' && new Date(s.startsAt).getTime() <= now && !s.iConfirmed));
  const upcoming = list.filter((s) => (s.status === 'requested' || s.status === 'accepted') && !attention.includes(s)).reverse().slice(0, 2);
  const weekAgo = now - 7 * 86400_000;
  const earnedThisWeek = (ledger.data ?? []).filter((l) => l.kind === 'earn' && new Date(l.createdAt).getTime() >= weekAgo).reduce((s, l) => s + l.amount, 0);
  const unread = (notices.data ?? []).filter((n) => !n.read);
  const st = stats.data;
  const ledgerTitle = (l: { kind: string; title: string }) => (l.kind === 'welcome_grant' ? t('ledger.welcome') : l.title);
  const ledgerNote = { welcome_grant: t('ledger.welcome'), hold: t('ledger.hold'), earn: t('ledger.earn'), refund: t('ledger.refund') } as const;

  return (
    <ScreenScaffold
      title={t('home.greeting', { name: api.userName.split(' ')[0] })}
      subtitle={t('home.subtitle')}
      right={
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <HeaderIcon Icon={MessageCircle} label={t('home.messages')} dot={unread.some((n) => n.kind === 'message')} onPress={() => nav.push({ name: 'inbox' })} />
          <HeaderIcon Icon={Bell} label={t('home.notifications')} dot={unread.length > 0} onPress={() => nav.push({ name: 'notices' })} />
        </View>
      }
    >
      {demo && (
        <View style={{ marginBottom: spacing.md, flexDirection: 'row' }}>
          <Badge label={t('home.demo')} variant="warning" />
        </View>
      )}
      <CreditBalance hours={balance.data ?? 0} earnedThisWeek={earnedThisWeek} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <View style={{ flex: 1 }}><AppButton label={t('home.offerHelp')} size="lg" fullWidth onPress={nav.openOffer} /></View>
        <View style={{ flex: 1 }}><AppButton label={t('home.findHelp')} size="lg" variant="secondary" fullWidth onPress={() => nav.setTab('discover')} /></View>
      </View>

      {attention.length > 0 && (
        <>
          <SectionHeader title={t('home.attention')} />
          <View style={{ gap: spacing.md }}>{attention.map((s) => <SessionCard key={s.id} session={s} />)}</View>
        </>
      )}

      <SectionHeader title={t('home.upcoming')} action={t('common.seeAll')} onAction={() => nav.setTab('activity')} />
      {sessions.loading ? <LoadingCards n={1} /> : upcoming.length ? (
        <View style={{ gap: spacing.md }}>{upcoming.map((s) => <SessionCard key={s.id} session={s} />)}</View>
      ) : (
        <AppCard><EmptyState icon={CalendarX} title={t('empty.noUpcoming.title')} message={t('empty.noUpcoming.home')} actionLabel={t('empty.explore')} onAction={() => nav.setTab('discover')} /></AppCard>
      )}

      <SectionHeader title={t('home.recommended')} action={t('common.seeAll')} onAction={() => nav.setTab('discover')} />
      {picks.loading ? <LoadingCards /> : (
        <AdaptiveGrid data={(picks.data ?? []).slice(0, 2)} keyExtractor={(s) => s.id} renderItem={(s) => <SkillCard skill={s} onPress={() => nav.push({ name: 'person', userId: s.ownerId })} onBook={() => nav.push({ name: 'book', skill: s })} />} />
      )}

      <SectionHeader title={t('home.recentCredits')} action={t('common.seeAll')} onAction={() => nav.setTab('activity')} />
      <AppCard>
        {(ledger.data ?? []).slice(0, 3).map((l) => (
          <CreditTransaction key={l.id} tx={{ id: l.id, hours: l.amount, title: ledgerTitle(l), counterpart: ledgerNote[l.kind] }} />
        ))}
        {!ledger.loading && !(ledger.data ?? []).length && <AppText variant="bodyMd" tone="muted">{t('home.noCredits')}</AppText>}
      </AppCard>

      <SectionHeader title={t('home.impact')} />
      {st ? <ImpactCard impact={{ helped: st.peopleHelped, hours: st.hoursGiven, sessions: st.sessionsCompleted, skills: st.skillsCount }} /> : <LoadingCards n={1} />}
    </ScreenScaffold>
  );
}
