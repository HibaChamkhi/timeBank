import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { spacing } from '../theme/tokens';
import { useAction, useApi, useData } from '../data/ApiProvider';
import { dayNames, t } from '../i18n';
import { fmtMin, PRESETS, PresetKey, selectionToWindows, windowsToSelection } from '../lib/availability';
import { useToast } from '../lib/Toast';
import { useNav } from '../navigation/NavContext';
import { AppButton, AppCard, AppText, Chip } from '../components';
import { LoadingCards, ScreenScaffold } from './ScreenScaffold';

export function AvailabilityScreen() {
  const api = useApi();
  const act = useAction();
  const toast = useToast();
  const nav = useNav();
  const av = useData((a) => a.getAvailability(a.userId));
  const [sel, setSel] = useState<Record<number, PresetKey[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (av.data && !sel) setSel(windowsToSelection(av.data.windows)); }, [av.data, sel]);

  const toggle = (day: number, key: PresetKey) =>
    setSel((s) => ({ ...s!, [day]: s![day].includes(key) ? s![day].filter((k) => k !== key) : [...s![day], key] }));

  const save = async () => {
    setBusy(true);
    const err = await act(() => api.setAvailability(selectionToWindows(sel!)));
    setBusy(false);
    if (err) return setError(err);
    toast(t('availability.saved'));
    nav.pop();
  };

  const names = dayNames();
  return (
    <ScreenScaffold title={t('availability.title')} subtitle={t('availability.subtitle')} onBack={nav.pop}>
      {!sel ? <LoadingCards /> : (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodySm" tone="muted">{t('availability.hint')}</AppText>
          <AppText variant="labelMd" tone="secondary">{PRESETS.map((p) => `${t(`availability.${p.key}` as const)} ${fmtMin(p.startMin)}–${fmtMin(p.endMin)}`).join('  ·  ')}</AppText>
          {names.map((day, d) => (
            <AppCard key={d} padding={spacing.md} style={{ gap: spacing.xs }}>
              <AppText variant="labelLg">{day}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {PRESETS.map((p) => (
                  <Chip key={p.key} label={t(`availability.${p.key}` as const)} selected={sel[d].includes(p.key)} onPress={() => toggle(d, p.key)} />
                ))}
              </View>
            </AppCard>
          ))}
          {error && <AppText variant="bodyMd" tone="error" accessibilityLiveRegion="polite">{error}</AppText>}
          <AppButton label={t('availability.save')} size="lg" fullWidth loading={busy} onPress={save} />
        </View>
      )}
    </ScreenScaffold>
  );
}
