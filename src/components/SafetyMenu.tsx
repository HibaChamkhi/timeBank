import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ban, Flag, MoreVertical } from 'lucide-react-native';
import { elevation, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { useAction, useApi } from '../data/ApiProvider';
import { REPORT_REASONS, ReportReason } from '../data/types';
import { isRTL, t } from '../i18n';
import { useToast } from '../lib/Toast';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { Chip } from './Chip';

type Step = 'menu' | 'report' | 'block';

/** ⋯ button with Report and Block. Blocking hides both people from each other and stops booking and chat. */
export function SafetyMenu({ userId, name, sessionId, onBlocked }: { userId: string; name: string; sessionId?: string; onBlocked?: () => void }) {
  const { colors } = useTheme();
  const { insets } = useAdaptiveLayout();
  const api = useApi();
  const act = useAction();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => { setOpen(false); setStep('menu'); setReason(null); setDetails(''); setError(null); };
  const first = name.split(' ')[0];

  const report = async () => {
    if (!reason) return setError(t('safety.err.reason'));
    setBusy(true);
    const err = await act(() => api.reportUser(userId, reason, details, sessionId));
    setBusy(false);
    if (err) return setError(err);
    close();
    toast(t('safety.reported'));
  };
  const block = async () => {
    setBusy(true);
    const err = await act(() => api.blockUser(userId));
    setBusy(false);
    if (err) return setError(err);
    close();
    toast(t('safety.blocked', { name: first }));
    onBlocked?.();
  };

  const Row = ({ Icon, label, onPress, danger }: { Icon: typeof Flag; label: string; onPress: () => void; danger?: boolean }) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52 }}>
      <Icon size={22} color={danger ? colors.error : colors.textPrimary} />
      <AppText variant="labelLg" style={{ color: danger ? colors.error : colors.textPrimary }}>{label}</AppText>
    </Pressable>
  );

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={t('safety.menu')} onPress={() => setOpen(true)} style={{ width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
        <MoreVertical size={22} color={colors.textPrimary} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable accessibilityLabel={t('common.close')} onPress={close} style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end', direction: isRTL() ? 'rtl' : 'ltr' }}>
          <Pressable onPress={() => {}} style={{ alignSelf: 'center', width: '100%', maxWidth: 520, maxHeight: '92%', backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, ...elevation[3] }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md }}>
              {step === 'menu' && (
                <>
                  <Row Icon={Flag} label={t('safety.report', { name: first })} onPress={() => setStep('report')} />
                  <Row Icon={Ban} label={t('safety.block', { name: first })} onPress={() => setStep('block')} danger />
                  <AppButton label={t('common.cancel')} variant="ghost" fullWidth onPress={close} />
                </>
              )}
              {step === 'report' && (
                <>
                  <AppText variant="h2" accessibilityRole="header">{t('safety.reportTitle', { name: first })}</AppText>
                  <AppText variant="bodyMd" tone="secondary">{t('safety.reportIntro')}</AppText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                    {REPORT_REASONS.map((r) => <Chip key={r} label={t(`safety.reason.${r}` as const)} selected={r === reason} onPress={() => { setReason(r); setError(null); }} />)}
                  </View>
                  {error && <AppText variant="bodySm" tone="error" accessibilityLiveRegion="polite">{error}</AppText>}
                  <AppInput label={t('safety.details')} value={details} onChangeText={setDetails} multiline />
                  <AppButton label={t('safety.submit')} size="lg" fullWidth loading={busy} onPress={report} />
                  <AppButton label={t('common.cancel')} variant="ghost" fullWidth onPress={close} />
                </>
              )}
              {step === 'block' && (
                <>
                  <AppText variant="h2" accessibilityRole="header">{t('safety.blockTitle', { name: first })}</AppText>
                  <AppText variant="bodyMd" tone="secondary">{t('safety.blockBody')}</AppText>
                  {error && <AppText variant="bodySm" tone="error" accessibilityLiveRegion="polite">{error}</AppText>}
                  <AppButton label={t('safety.blockConfirm')} variant="destructive" size="lg" fullWidth loading={busy} onPress={block} />
                  <AppButton label={t('common.cancel')} variant="ghost" fullWidth onPress={close} />
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
