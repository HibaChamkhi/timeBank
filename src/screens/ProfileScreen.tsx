import React from 'react';
import { View } from 'react-native';
import { CalendarClock, Moon, Palette, Pencil, Plus, ShieldCheck, Sun, Trash2 } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../auth/AuthProvider';
import { useAction, useApi, useData } from '../data/ApiProvider';
import { useToast } from '../lib/Toast';
import { categoryLabel, t } from '../i18n';
import { hours as fmtHours } from '../lib/format';
import { useNav } from '../navigation/NavContext';
import { AppButton, AppCard, AppText, Avatar, Badge, LanguagePicker, LevelCard, ReviewCard, TrustBadge } from '../components';
import { CreditAmount } from '../components/CreditBalance';
import { LoadingCards, ScreenScaffold, SectionHeader } from './ScreenScaffold';

export function ProfileScreen() {
  const { colors, isDark, setMode } = useTheme();
  const { session, signOut, demo } = useAuth();
  const api = useApi();
  const act = useAction();
  const toast = useToast();
  const nav = useNav();
  const me = useData((a) => a.getPerson(a.userId));
  const admin = useData((a) => a.isAdmin());
  const blocked = useData((a) => a.blockedUsers());
  const p = me.data;

  const remove = async (id: string) => {
    const err = await act(() => api.removeSkill(id));
    toast(err ?? t('profile.skillRemoved'), err ? 'error' : 'success');
  };

  return (
    <ScreenScaffold title={t('profile.title')}>
      <AppCard featured padding={spacing.xl} style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={api.userName} size={96} />
        <AppText variant="h1">{p?.name || api.userName}</AppText>
        {!!p?.headline && <AppText variant="bodyMd" tone="secondary">{p.headline}</AppText>}
        {demo && <Badge label={t('profile.demoAccount')} variant="warning" />}
        {p && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
            {([[String(p.stats.peopleHelped), t('profile.stat.helped')], [fmtHours(p.stats.hoursGiven), t('profile.stat.contributed')], [String(p.stats.sessionsCompleted), t('profile.stat.sessions')]] as const).map(([v, l]) => (
              <View key={l} style={{ flex: 1, alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingVertical: spacing.sm }}>
                <AppText variant="h3">{v}</AppText>
                <AppText variant="caption" tone="muted">{l}</AppText>
              </View>
            ))}
          </View>
        )}
      </AppCard>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md }}>
        <AppButton label={t('edit.button')} icon={Pencil} variant="secondary" size="sm" onPress={() => nav.push({ name: 'editProfile' })} />
        <AppButton label={t('availability.button')} icon={CalendarClock} variant="secondary" size="sm" onPress={() => nav.push({ name: 'availability' })} />
      </View>

      <SectionHeader title={t('level.title')} />
      {p ? <LevelCard stats={p.stats} /> : <LoadingCards n={1} />}

      <SectionHeader title={t('trust.title')} />
      <AppCard padding={spacing.lg}>
        {p ? <TrustBadge signals={{ rating: p.stats.rating, reviewCount: p.stats.reviewCount, sessions: p.stats.sessionsCompleted, hoursGiven: p.stats.hoursGiven }} /> : <LoadingCards n={1} />}
      </AppCard>

      <SectionHeader title={t('profile.yourSkills')} action={t('common.add')} onAction={nav.openOffer} />
      {p && p.skills.length === 0 && (
        <AppCard><View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
          <AppText variant="bodyMd" tone="secondary">{t('profile.noSkills')}</AppText>
          <AppButton label={t('profile.offerSkill')} icon={Plus} onPress={nav.openOffer} />
        </View></AppCard>
      )}
      <View style={{ gap: spacing.sm }}>
        {p?.skills.map((s) => (
          <AppCard key={s.id} padding={spacing.md} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="labelLg" numberOfLines={1}>{s.title}</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}><Badge label={categoryLabel(s.category)} /><CreditAmount hours={s.creditsPerHour} size="sm" /></View>
            </View>
            <AppButton label={t('common.remove')} icon={Trash2} variant="ghost" size="sm" onPress={() => remove(s.id)} />
          </AppCard>
        ))}
      </View>

      <SectionHeader title={t('profile.reviewsAbout')} />
      <AppCard padding={spacing.lg} style={{ gap: spacing.md }}>
        {p?.reviews.length ? p.reviews.map((r) => <ReviewCard key={r.id} review={r} />) : <AppText variant="bodyMd" tone="muted">{t('profile.reviewsEmpty')}</AppText>}
      </AppCard>

      {!!blocked.data?.length && (
        <>
          <SectionHeader title={t('blocked.title')} />
          <AppCard padding={spacing.md} style={{ gap: spacing.xs }}>
            {blocked.data.map((b) => (
              <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar name={b.name} size={32} />
                <AppText variant="labelLg" style={{ flex: 1 }} numberOfLines={1}>{b.name}</AppText>
                <AppButton label={t('blocked.unblock')} variant="secondary" size="sm" onPress={async () => { const err = await act(() => api.unblockUser(b.id)); toast(err ?? t('blocked.unblocked'), err ? 'error' : 'success'); }} />
              </View>
            ))}
          </AppCard>
        </>
      )}

      <SectionHeader title={t('profile.settings')} />
      <View style={{ gap: spacing.xs }}>
        <View style={{ marginBottom: spacing.xs }}><LanguagePicker /></View>
        <AppButton label={isDark ? t('profile.toLight') : t('profile.toDark')} icon={isDark ? Sun : Moon} variant="secondary" fullWidth onPress={() => setMode(isDark ? 'light' : 'dark')} />
        {admin.data && <AppButton label={t('admin.button')} icon={ShieldCheck} variant="secondary" fullWidth onPress={() => nav.push({ name: 'admin' })} />}
        {session && <AppButton label={t('auth.signout')} variant="destructive" fullWidth onPress={signOut} />}
        <AppButton label={t('profile.designSystem')} icon={Palette} variant="ghost" fullWidth onPress={() => nav.push({ name: 'gallery' })} />
      </View>
    </ScreenScaffold>
  );
}
