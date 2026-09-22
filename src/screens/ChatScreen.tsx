import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View, Pressable } from 'react-native';
import { Send } from 'lucide-react-native';
import { isRTL, t } from '../i18n';
import { control, fontFor, radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { Screen, useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { useAction, useApi, useData } from '../data/ApiProvider';
import { formatWhen, hours } from '../lib/format';
import { useToast } from '../lib/Toast';
import { useNav } from '../navigation/NavContext';
import { AppText, Avatar, ChatBubble, SafetyMenu } from '../components';
import { BackButton } from './ScreenScaffold';

export function ChatScreen({ sessionId }: { sessionId: string }) {
  const { colors } = useTheme();
  const { insets } = useAdaptiveLayout();
  const api = useApi();
  const act = useAction();
  const toast = useToast();
  const nav = useNav();
  const scroll = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const sessions = useData((a) => a.mySessions());
  const msgs = useData((a) => a.messages(sessionId), [sessionId], 3000);
  const s = sessions.data?.find((x) => x.id === sessionId);
  const list = msgs.data ?? [];
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [list.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const err = await act(() => api.sendMessage(sessionId, body));
    if (err) { setText(body); toast(err, 'error'); } else msgs.reload();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Screen style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <BackButton onPress={nav.pop} />
          {s && <Avatar name={s.otherName} size={40} />}
          <View style={{ flex: 1 }}>
            <AppText variant="labelLg" numberOfLines={1} accessibilityRole="header">{s?.otherName ?? t('chat.title')}</AppText>
            {s && <AppText variant="bodySm" tone="muted" numberOfLines={1}>{s.skillTitle} · {formatWhen(s.startsAt)} · {hours(s.credits)}</AppText>}
          </View>
          {s && <SafetyMenu userId={s.otherId} name={s.otherName} sessionId={s.id} onBlocked={nav.pop} />}
        </Screen>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: spacing.md }} keyboardShouldPersistTaps="handled">
        <Screen style={{ gap: spacing.xs }}>
          {!msgs.loading && !list.length && <AppText variant="bodyMd" tone="muted" style={{ textAlign: 'center', marginTop: spacing.xl }}>{t('chat.empty')}</AppText>}
          {list.map((m) => <ChatBubble key={m.id} body={m.body} at={m.createdAt} mine={m.senderId === api.userId} />)}
        </Screen>
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom + spacing.xs, paddingTop: spacing.xs, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Screen style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>
          <TextInput
            accessibilityLabel={t('chat.messageA11y')}
            value={text}
            onChangeText={setText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            style={{ flex: 1, minHeight: control.heightMd, maxHeight: 120, paddingHorizontal: spacing.sm, paddingTop: 11, paddingBottom: 11, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary, fontFamily: fontFor('regular'), fontSize: 16, outlineStyle: 'none' } as any}
          />
          <Pressable accessibilityRole="button" accessibilityLabel={t('chat.send')} accessibilityState={{ disabled: !text.trim() }} onPress={send} disabled={!text.trim()} style={{ width: 48, height: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? colors.primary : colors.surfaceAlt }}>
            <Send size={22} color={text.trim() ? colors.onPrimary : colors.textMuted} style={isRTL() ? { transform: [{ scaleX: -1 }] } : undefined} />
          </Pressable>
        </Screen>
      </View>
    </KeyboardAvoidingView>
  );
}
