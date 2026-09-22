import React, { useState } from 'react';
import { View } from 'react-native';
import { CalendarX, History, Wallet } from 'lucide-react-native';
import { spacing } from '../theme/tokens';
import { useData } from '../data/ApiProvider';
import { t } from '../i18n';
import { useNav } from '../navigation/NavContext';
import { AppCard, Chip, CreditBalance, CreditTransaction, EmptyState, ErrorState, SessionCard } from '../components';
import { LoadingCards, ScreenScaffold } from './ScreenScaffold';

type View_ = 'upcoming' | 'past' | 'credits';

export function ActivityScreen() {
  const nav = useNav();
  const [view, setView] = useState<View_>('upcoming');
  const balance = useData((a) => a.getBalance());
  const sessions = useData((a) => a.mySessions());
  const ledger = useData((a) => a.ledger());
  const list = sessions.data ?? [];
  const upcoming = list.filter((s) => s.status === 'requested' || s.status === 'accepted').reverse();
  const past = list.filter((s) => s.status === 'completed' || s.status === 'cancelled' || s.status === 'disputed');
  const note = { welcome_grant: t('ledger.welcome'), hold: t('ledger.hold'), earn: t('ledger.earn'), refund: t('ledger.refund') } as const;

  return (
    <ScreenScaffold title={t('activity.title')} subtitle={t('activity.subtitle')}>
      <CreditBalance hours={balance.data ?? 0} />
      <View style={{ flexDirection: 'row', gap: spacing.xs, marginVertical: spacing.md }}>
        <Chip label={upcoming.length ? t('activity.upcomingCount', { count: upcoming.length }) : t('activity.upcoming')} selected={view === 'upcoming'} onPress={() => setView('upcoming')} />
        <Chip label={t('activity.past')} selected={view === 'past'} onPress={() => setView('past')} />
        <Chip label={t('activity.credits')} selected={view === 'credits'} onPress={() => setView('credits')} />
      </View>

      {sessions.error && !sessions.data ? <ErrorState title={t('error.loadSessions')} message={t('error.nothingChanged')} onRetry={sessions.reload} /> : sessions.loading && !sessions.data ? <LoadingCards /> : null}

      {view === 'upcoming' && !!sessions.data && (upcoming.length ? (
        <View style={{ gap: spacing.md }}>{upcoming.map((s) => <SessionCard key={s.id} session={s} />)}</View>
      ) : (
        <AppCard><EmptyState icon={CalendarX} title={t('empty.noUpcoming.title')} message={t('empty.noUpcoming.activity')} actionLabel={t('empty.explore')} onAction={() => nav.setTab('discover')} /></AppCard>
      ))}
      {view === 'past' && !!sessions.data && (past.length ? (
        <View style={{ gap: spacing.md }}>{past.map((s) => <SessionCard key={s.id} session={s} />)}</View>
      ) : (
        <AppCard><EmptyState icon={History} title={t('empty.past.title')} message={t('empty.past.body')} /></AppCard>
      ))}
      {view === 'credits' && (
        (ledger.data ?? []).length ? (
          <AppCard>
            {(ledger.data ?? []).map((l) => (
              <CreditTransaction key={l.id} tx={{ id: l.id, hours: l.amount, title: l.kind === 'welcome_grant' ? t('ledger.welcome') : l.title, counterpart: note[l.kind] }} />
            ))}
          </AppCard>
        ) : <AppCard><EmptyState icon={Wallet} title={t('empty.credits.title')} message={t('empty.credits.body')} /></AppCard>
      )}
    </ScreenScaffold>
  );
}
