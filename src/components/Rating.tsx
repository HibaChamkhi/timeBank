import React from 'react';
import { View } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { t, tp } from '../i18n';
import { AppText } from './AppText';

export function Rating({ value, sessions }: { value: number | null; sessions?: number }) {
  const { colors } = useTheme();
  if (value == null) return <AppText variant="labelMd" tone="muted">{t('rating.newMember')}{sessions ? ` · ${tp('rating.sessions', sessions)}` : ''}</AppText>;
  return (
    <View accessible accessibilityLabel={t('rating.a11y', { value: value.toFixed(1) }) + (sessions != null ? ', ' + tp('rating.sessions', sessions) : '')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Star size={14} color={colors.warning} fill={colors.warning} />
      <AppText variant="labelMd">{value.toFixed(1)}</AppText>
      {sessions != null && <AppText variant="bodySm" tone="muted">· {tp('rating.sessions', sessions)}</AppText>}
    </View>
  );
}
