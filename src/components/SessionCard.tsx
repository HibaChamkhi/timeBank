import React, { useState } from 'react';
import { View } from 'react-native';
import { CalendarClock, MessageCircle } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAction, useApi } from '../data/ApiProvider';
import type { Session } from '../data/types';
import { formatWhen, hours } from '../lib/format';
import { useToast } from '../lib/Toast';
import { t } from '../i18n';
import { useNav } from '../navigation/NavContext';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { AppButton } from './AppButton';
import { Avatar } from './Avatar';
import { Badge, BadgeVariant } from './Badge';
import { CreditAmount } from './CreditBalance';

const statusVariant: Record<Session['status'], BadgeVariant> = {
  requested: 'neutral', accepted: 'verified', completed: 'success', cancelled: 'neutral', disputed: 'warning',
};

/** One session with every action that makes sense for its state and for your role. */
export function SessionCard({ session: s }: { session: Session }) {
  const { colors } = useTheme();
  const api = useApi();
  const act = useAction();
  const toast = useToast();
  const nav = useNav();
  const [busy, setBusy] = useState<string | null>(null);

  const started = new Date(s.startsAt).getTime() <= Date.now();
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    const err = await act(fn);
    setBusy(null);
    toast(err ?? ok, err ? 'error' : 'success');
  };
  const badge = { label: t(`session.status.${s.status}` as const), variant: statusVariant[s.status] };
  const isProvider = s.role === 'provider';

  return (
    <AppCard padding={spacing.lg} style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={s.otherName} size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="labelLg" numberOfLines={1}>{s.skillTitle}</AppText>
          <AppText variant="bodySm" tone="muted" numberOfLines={1}>{isProvider ? t('session.helping', { name: s.otherName }) : t('session.with', { name: s.otherName })}</AppText>
        </View>
        <Badge label={badge.label} variant={badge.variant} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
        <CalendarClock size={16} color={colors.textMuted} />
        <AppText variant="bodyMd" tone="secondary">{formatWhen(s.startsAt)} · {hours(s.hours)}</AppText>
        <View style={{ flex: 1 }} />
        <AppText variant="labelLg" tone={isProvider ? 'success' : 'credit'}>{isProvider ? '+' : '−'} <CreditAmount hours={s.credits} /></AppText>
      </View>

      {s.status === 'requested' && isProvider && (
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <View style={{ flex: 1 }}><AppButton label={t('session.accept')} fullWidth loading={busy === 'accept'} onPress={() => run('accept', () => api.respond(s.id, true), t('session.toast.accepted'))} /></View>
          <View style={{ flex: 1 }}><AppButton label={t('session.decline')} variant="secondary" fullWidth loading={busy === 'decline'} onPress={() => run('decline', () => api.respond(s.id, false), t('session.toast.declined'))} /></View>
        </View>
      )}
      {s.status === 'requested' && !isProvider && (
        <AppText variant="bodySm" tone="muted">{t('session.waiting', { name: s.otherName, credits: hours(s.credits) })}</AppText>
      )}
      {s.status === 'accepted' && started && !s.iConfirmed && (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="bodySm" tone="secondary">{s.otherConfirmed ? t('session.otherConfirmed', { name: s.otherName }) : t('session.didItHappen')}</AppText>
          <AppButton label={t('session.yesHappened')} fullWidth loading={busy === 'confirm'} onPress={() => run('confirm', () => api.confirm(s.id), t('session.toast.confirmed'))} />
        </View>
      )}
      {s.status === 'accepted' && started && s.iConfirmed && (
        <AppText variant="bodySm" tone="muted">{t(isProvider ? 'session.youConfirmedProvider' : 'session.youConfirmedRequester', { name: s.otherName })}</AppText>
      )}
      {s.status === 'accepted' && !started && (
        <AppText variant="bodySm" tone="muted">{t('session.confirmAfterStart')}</AppText>
      )}
      {s.status === 'completed' && !s.hasReviewed && <AppButton label={t('session.leaveReview')} variant="secondary" fullWidth onPress={() => nav.openReview(s)} />}
      {s.status === 'disputed' && <AppText variant="bodySm" tone="muted">{t('session.disputedInfo')}</AppText>}

      <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
        {s.status !== 'cancelled' && <AppButton label={t('common.message')} icon={MessageCircle} variant="ghost" size="sm" onPress={() => nav.push({ name: 'chat', sessionId: s.id })} />}
        {(s.status === 'requested' || (s.status === 'accepted' && !started)) && !(s.status === 'requested' && isProvider) && (
          <AppButton label={t('session.cancel')} variant="ghost" size="sm" loading={busy === 'cancel'} onPress={() => run('cancel', () => api.cancel(s.id), isProvider ? t('session.toast.cancelled') : t('session.toast.cancelledRefund'))} />
        )}
        {s.status === 'accepted' && started && (
          <AppButton label={t('session.report')} variant="ghost" size="sm" loading={busy === 'dispute'} onPress={() => run('dispute', () => api.dispute(s.id), t('session.toast.reported'))} />
        )}
      </View>
    </AppCard>
  );
}
