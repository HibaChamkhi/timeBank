import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { elevation, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { useAction, useApi } from '../data/ApiProvider';
import type { Session } from '../data/types';
import { isRTL, t } from '../i18n';
import { useToast } from '../lib/Toast';
import { AppButton, AppInput, AppText, StarInput } from '../components';

export function ReviewSheet({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const { colors } = useTheme();
  const { insets } = useAdaptiveLayout();
  const api = useApi();
  const act = useAction();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Keep the last session's text on screen while the sheet slides away.
  const last = useRef<Session | null>(null);
  if (session) last.current = session;
  const shown = session ?? last.current;
  useEffect(() => { if (session) { setRating(0); setComment(''); setError(null); } }, [session?.id]);

  const submit = async () => {
    if (!session) return;
    if (!rating) return setError(t('review.err.rating'));
    setBusy(true);
    const err = await act(() => api.submitReview(session.id, rating, comment));
    setBusy(false);
    if (err) return setError(err);
    toast(t('review.toast'));
    onClose();
  };

  return (
    <Modal visible={!!session} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('common.close')} onPress={onClose} style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end', direction: isRTL() ? 'rtl' : 'ltr' }}>
        <Pressable onPress={() => {}} style={{ alignSelf: 'center', width: '100%', maxWidth: 520, backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md, ...elevation[3] }}>
          <AppText variant="h2" accessibilityRole="header">{t('review.title')}</AppText>
          <AppText variant="bodyMd" tone="secondary">{t('review.about', { skill: shown?.skillTitle ?? '', name: shown?.otherName ?? '' })}</AppText>
          <StarInput value={rating} onChange={(n) => { setRating(n); setError(null); }} />
          {error && <AppText variant="bodySm" tone="error" accessibilityLiveRegion="polite">{error}</AppText>}
          <AppInput label={t('review.comment')} value={comment} onChangeText={setComment} multiline placeholder={t('review.commentPlaceholder')} />
          <AppButton label={t('review.submit')} size="lg" fullWidth loading={busy} onPress={submit} />
          <AppButton label={t('common.notNow')} variant="ghost" fullWidth onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
