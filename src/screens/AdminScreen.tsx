import React, { useState } from 'react';
import { View } from 'react-native';
import { spacing } from '../theme/tokens';
import { useAction, useApi, useData } from '../data/ApiProvider';
import { t } from '../i18n';
import { formatWhen, hours } from '../lib/format';
import { useToast } from '../lib/Toast';
import { useNav } from '../navigation/NavContext';
import { AppButton, AppCard, AppText, Badge } from '../components';
import { LoadingCards, ScreenScaffold, SectionHeader } from './ScreenScaffold';

/** Moderators only (the database refuses everyone else). Resolving a reported session is final. */
export function AdminScreen() {
  const api = useApi();
  const act = useAction();
  const toast = useToast();
  const nav = useNav();
  const disputes = useData((a) => a.adminDisputes());
  const reports = useData((a) => a.adminReports());
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    const err = await act(fn);
    setBusy(null);
    toast(err ?? t('admin.resolved'), err ? 'error' : 'success');
  };

  return (
    <ScreenScaffold title={t('admin.title')} subtitle={t('admin.subtitle')} onBack={nav.pop}>
      <SectionHeader title={t('admin.disputes')} />
      {disputes.loading && !disputes.data ? <LoadingCards n={1} /> : (
        <View style={{ gap: spacing.md }}>
          {(disputes.data ?? []).map((d) => (
            <AppCard key={d.id} padding={spacing.lg} style={{ gap: spacing.sm }}>
              <AppText variant="labelLg">{d.skillTitle}</AppText>
              <AppText variant="bodyMd" tone="secondary">{t('admin.disputeLine', { requester: d.requesterName, provider: d.providerName })}</AppText>
              <AppText variant="bodySm" tone="muted">{formatWhen(d.startsAt)} · {hours(d.hours)} · ◉ {hours(d.credits)}</AppText>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <View style={{ flex: 1 }}><AppButton label={t('admin.refund')} variant="secondary" fullWidth loading={busy === `r${d.id}`} onPress={() => run(`r${d.id}`, () => api.resolveDispute(d.id, 'refund'))} /></View>
                <View style={{ flex: 1 }}><AppButton label={t('admin.pay')} fullWidth loading={busy === `p${d.id}`} onPress={() => run(`p${d.id}`, () => api.resolveDispute(d.id, 'pay'))} /></View>
              </View>
            </AppCard>
          ))}
          {!(disputes.data ?? []).length && <AppText variant="bodyMd" tone="muted">{t('admin.noDisputes')}</AppText>}
        </View>
      )}

      <SectionHeader title={t('admin.reports')} />
      {reports.loading && !reports.data ? <LoadingCards n={1} /> : (
        <View style={{ gap: spacing.md }}>
          {(reports.data ?? []).map((r) => (
            <AppCard key={r.id} padding={spacing.lg} style={{ gap: spacing.sm }}>
              <AppText variant="bodyMd">{t('admin.reportLine', { reporter: r.reporterName, target: r.targetName })}</AppText>
              <View style={{ flexDirection: 'row' }}><Badge label={t(`safety.reason.${r.reason}` as const)} variant="warning" /></View>
              {!!r.details && <AppText variant="bodySm" tone="secondary">{r.details}</AppText>}
              <AppButton label={t('admin.markReviewed')} variant="secondary" loading={busy === r.id} onPress={() => run(r.id, () => api.resolveReport(r.id))} />
            </AppCard>
          ))}
          {!(reports.data ?? []).length && <AppText variant="bodyMd" tone="muted">{t('admin.noReports')}</AppText>}
        </View>
      )}
    </ScreenScaffold>
  );
}
