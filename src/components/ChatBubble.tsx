import React from 'react';
import { View } from 'react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { formatTime } from '../lib/format';
import { t } from '../i18n';
import { AppText } from './AppText';

export function ChatBubble({ body, at, mine }: { body: string; at: string; mine: boolean }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={t(mine ? 'chat.a11yMine' : 'chat.a11yTheirs', { text: body })} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: mine ? colors.primary : colors.surface, borderWidth: mine ? 0 : 1, borderColor: colors.border, borderRadius: radius.lg, borderBottomEndRadius: mine ? radius.sm : radius.lg, borderBottomStartRadius: mine ? radius.lg : radius.sm, paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm }}>
      <AppText variant="bodyMd" style={{ color: mine ? colors.onPrimary : colors.textPrimary }}>{body}</AppText>
      <AppText variant="caption" style={{ color: mine ? colors.onPrimary : colors.textMuted, opacity: 0.8, alignSelf: 'flex-end', marginTop: 2 }}>{formatTime(new Date(at))}</AppText>
    </View>
  );
}
