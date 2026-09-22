import React from 'react';
import { Pressable, View } from 'react-native';
import { Bell, CalendarCheck, CircleAlert, Clock, MessageCircle, Star } from 'lucide-react-native';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { timeAgo } from '../lib/format';
import type { Notice } from '../data/types';
import { t } from '../i18n';
import { noticeText } from '../i18n/notices';
import { AppText } from './AppText';

function iconFor(kind: string) {
  if (kind === 'message') return MessageCircle;
  if (kind === 'credits_earned') return Clock;
  if (kind === 'review_received') return Star;
  if (kind === 'booking_disputed' || kind === 'booking_cancelled') return CircleAlert;
  if (kind.startsWith('booking') || kind.includes('session') || kind === 'confirm_needed') return CalendarCheck;
  return Bell;
}

export function NoticeItem({ notice, onPress }: { notice: Notice; onPress?: () => void }) {
  const { colors } = useTheme();
  const text = noticeText(notice);
  const Icon = iconFor(notice.kind);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${notice.read ? '' : t('notices.unread') + ' '}${text.title}. ${text.body}`} onPress={onPress} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', minHeight: 64, paddingVertical: spacing.xs }}>
      <View style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: notice.read ? colors.surfaceAlt : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={notice.read ? colors.textMuted : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="labelLg" numberOfLines={1}>{text.title}</AppText>
        <AppText variant="bodySm" tone="secondary" numberOfLines={2}>{text.body}</AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <AppText variant="caption" tone="muted">{timeAgo(notice.createdAt)}</AppText>
        {!notice.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
      </View>
    </Pressable>
  );
}
