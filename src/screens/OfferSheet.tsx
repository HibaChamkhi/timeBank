import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { elevation, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { useAction, useApi } from '../data/ApiProvider';
import { CATEGORIES } from '../data/types';
import { categoryLabel, isRTL, t } from '../i18n';
import { useToast } from '../lib/Toast';
import { AppButton, AppInput, AppText, Chip } from '../components';

const RATES = [0.5, 1, 1.5, 2, 3];

export function OfferSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const { insets } = useAdaptiveLayout();
  const api = useApi();
  const act = useAction();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [rate, setRate] = useState(1);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (title.trim().length < 2) return setError(t('offer.err.title'));
    setBusy(true);
    const err = await act(() => api.createSkill({ title, category, description, creditsPerHour: rate }));
    setBusy(false);
    if (err) return setError(err);
    setTitle(''); setDescription(''); setError(null);
    toast(t('offer.toast'));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('common.close')} onPress={onClose} style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end', direction: isRTL() ? 'rtl' : 'ltr' }}>
        <Pressable onPress={() => {}} style={{ alignSelf: 'center', width: '100%', maxWidth: 520, maxHeight: '92%', backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, ...elevation[3] }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md }}>
            <AppText variant="h2" accessibilityRole="header">{t('offer.title')}</AppText>
            <AppText variant="bodyMd" tone="secondary">{t('offer.intro')}</AppText>
            <AppInput label={t('offer.skill')} placeholder={t('offer.skillPlaceholder')} value={title} onChangeText={(t) => { setTitle(t); setError(null); }} error={error ?? undefined} />
            <View style={{ gap: spacing.xs }}>
              <AppText variant="labelMd" tone="secondary">{t('offer.category')}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {CATEGORIES.map((c) => <Chip key={c} label={categoryLabel(c)} selected={c === category} onPress={() => setCategory(c)} />)}
              </View>
            </View>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="labelMd" tone="secondary">{t('offer.rate')}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {RATES.map((r) => <Chip key={r} label={`◉ ${r}${t('unit.h')}`} selected={r === rate} onPress={() => setRate(r)} />)}
              </View>
            </View>
            <AppInput label={t('offer.description')} value={description} onChangeText={setDescription} multiline placeholder={t('offer.descriptionPlaceholder')} />
            <AppButton label={t('offer.publish')} size="lg" fullWidth loading={busy} onPress={submit} />
            <AppButton label={t('common.cancel')} variant="ghost" fullWidth onPress={onClose} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
