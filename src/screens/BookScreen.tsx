import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAction, useApi, useData } from '../data/ApiProvider';
import type { Session, Skill } from '../data/types';
import { formatDay, formatWhen, hours as fmtHours } from '../lib/format';
import { t } from '../i18n';
import { slotAllowed } from '../lib/availability';
import { useNav } from '../navigation/NavContext';
import { AppButton, AppCard, AppText, Avatar, Chip, CreditAmount } from '../components';
import { ScreenScaffold } from './ScreenScaffold';

const DURATIONS = [0.5, 1, 1.5, 2, 3];
const SLOTS = Array.from({ length: 13 }, (_, i) => 8 + i); // 08:00 – 20:00

export function BookScreen({ skill }: { skill: Skill }) {
  const { colors } = useTheme();
  const api = useApi();
  const act = useAction();
  const nav = useNav();
  const balance = useData((a) => a.getBalance()).data;
  const av = useData((a) => a.getAvailability(skill.ownerId), [skill.ownerId]).data;
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0); return d; }), []);
  const [step, setStep] = useState<'when' | 'review' | 'done'>('when');
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState<number | null>(null);
  const [duration, setDuration] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState<Session | null>(null);

  const startsAt = hour == null ? null : new Date(new Date(days[day]).setHours(hour, 0, 0, 0));
  const cost = Math.round(duration * skill.creditsPerHour * 100) / 100;
  const short = balance != null && cost > balance;
  const slotStart = (h: number) => new Date(new Date(days[day]).setHours(h, 0, 0, 0)).getTime();
  // Only offer times inside the provider's availability (the database enforces the same rule).
  const slots = av ? SLOTS.filter((h) => slotStart(h) > Date.now() && slotAllowed(av, slotStart(h), duration)) : [];
  const restricted = !!av && av.windows.length > 0;

  const confirm = async () => {
    if (!startsAt) return;
    setBusy(true); setError(null);
    let session: Session | null = null;
    const err = await act(async () => { session = await api.bookSession(skill.id, startsAt, duration); });
    setBusy(false);
    if (err) return setError(err);
    setBooked(session);
    setStep('done');
  };

  const stepLabel = { when: t('book.step1'), review: t('book.step2'), done: '' }[step];

  return (
    <ScreenScaffold title={step === 'done' ? t('book.done') : t('book.title')} subtitle={stepLabel || undefined} onBack={step === 'done' ? nav.pop : step === 'review' ? () => setStep('when') : nav.pop}>
      <AppCard padding={spacing.lg} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
        <Avatar name={skill.ownerName} size={48} />
        <View style={{ flex: 1 }}>
          <AppText variant="labelLg" numberOfLines={2}>{skill.title}</AppText>
          <AppText variant="bodySm" tone="muted">{t('session.with', { name: skill.ownerName })}</AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}><CreditAmount hours={skill.creditsPerHour} /><AppText variant="caption" tone="muted">{t('unit.perHourShort')}</AppText></View>
      </AppCard>

      {step === 'when' && (
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="labelLg">{t('book.day')}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {days.map((d, i) => <Chip key={i} label={formatDay(d)} selected={i === day} onPress={() => { setDay(i); setHour(null); }} />)}
            </View>
          </View>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="labelLg">{t('book.duration')}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {DURATIONS.map((d) => <Chip key={d} label={fmtHours(d)} selected={d === duration} onPress={() => { setDuration(d); setHour(null); }} />)}
            </View>
          </View>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="labelLg">{t('book.startTime')}</AppText>
            {restricted && <AppText variant="bodySm" tone="muted">{t('book.availableNote', { name: skill.ownerName.split(' ')[0] })}</AppText>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {slots.map((h) => <Chip key={h} label={`${String(h).padStart(2, '0')}:00`} selected={h === hour} onPress={() => setHour(h)} />)}
            </View>
            {!!av && slots.length === 0 && <AppText variant="bodyMd" tone="secondary">{t('book.noSlots', { name: skill.ownerName.split(' ')[0], hours: fmtHours(duration) })}</AppText>}
          </View>
          {short && <AppText variant="bodyMd" tone="error">{t('book.short', { cost: fmtHours(cost), balance: fmtHours(balance ?? 0) })}</AppText>}
          <AppButton label={t('common.continue')} size="lg" fullWidth disabled={hour == null || short} onPress={() => setStep('review')} />
        </View>
      )}

      {step === 'review' && startsAt && (
        <View style={{ gap: spacing.md }}>
          <AppCard padding={spacing.lg} style={{ gap: spacing.sm }}>
            {([[t('book.when'), formatWhen(startsAt)], [t('book.duration'), fmtHours(duration)]] as const).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="bodyMd" tone="secondary">{k}</AppText><AppText variant="labelLg">{v}</AppText></View>
            ))}
            <View style={{ height: 1, backgroundColor: colors.divider }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="bodyMd" tone="secondary">{t('book.cost')}</AppText><CreditAmount hours={cost} /></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="bodyMd" tone="secondary">{t('book.balanceAfter')}</AppText><AppText variant="labelLg">{fmtHours(Math.max(0, (balance ?? 0) - cost))}</AppText></View>
          </AppCard>
          <AppText variant="bodySm" tone="muted">{t('book.explain', { name: skill.ownerName })}</AppText>
          {error && <AppText variant="bodyMd" tone="error" accessibilityLiveRegion="polite">{error}</AppText>}
          <AppButton label={t('book.confirm', { cost: fmtHours(cost) })} size="lg" fullWidth loading={busy} onPress={confirm} />
          <AppButton label={t('book.changeTime')} variant="ghost" fullWidth onPress={() => setStep('when')} />
        </View>
      )}

      {step === 'done' && booked && (
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' }}><CircleCheck size={40} color={colors.success} /></View>
          <AppText variant="h2" style={{ textAlign: 'center' }}>{t('book.sent', { name: skill.ownerName })}</AppText>
          <AppText variant="bodyMd" tone="secondary" style={{ textAlign: 'center' }}>{t('book.sentBody', { when: formatWhen(booked.startsAt), hours: fmtHours(booked.hours), cost: fmtHours(booked.credits) })}</AppText>
          <AppButton label={t('book.messageName', { name: skill.ownerName.split(' ')[0] })} size="lg" fullWidth onPress={() => { nav.pop(); nav.push({ name: 'chat', sessionId: booked.id }); }} />
          <AppButton label={t('book.viewActivity')} variant="secondary" fullWidth onPress={() => { nav.pop(); nav.setTab('activity'); }} />
        </View>
      )}
    </ScreenScaffold>
  );
}
