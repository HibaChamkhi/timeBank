import React from 'react';
import { Pressable, View } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useData } from '../data/ApiProvider';
import { timeAgo } from '../lib/format';
import { t } from '../i18n';
import { useNav } from '../navigation/NavContext';
import { AppCard, AppText, Avatar, EmptyState } from '../components';
import { LoadingCards, ScreenScaffold } from './ScreenScaffold';

export function InboxScreen() {
  const { colors } = useTheme();
  const nav = useNav();
  const { data, loading } = useData(async (a) => {
    const sessions = (await a.mySessions()).filter((s) => s.status !== 'cancelled');
    const rows = await Promise.all(sessions.slice(0, 20).map(async (s) => ({ s, last: (await a.messages(s.id)).slice(-1)[0] ?? null })));
    return rows.sort((x, y) => new Date(y.last?.createdAt ?? y.s.startsAt).getTime() - new Date(x.last?.createdAt ?? x.s.startsAt).getTime());
  }, [], 6000);

  return (
    <ScreenScaffold title={t('inbox.title')} subtitle={t('inbox.subtitle')} onBack={nav.pop}>
      {loading && !data ? <LoadingCards /> : data?.length ? (
        <AppCard padding={spacing.xs}>
          {data.map(({ s, last }, i) => (
            <Pressable key={s.id} accessibilityRole="button" onPress={() => nav.push({ name: 'chat', sessionId: s.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, minHeight: 68, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
              <Avatar name={s.otherName} size={48} />
              <View style={{ flex: 1 }}>
                <AppText variant="labelLg" numberOfLines={1}>{s.otherName}</AppText>
                <AppText variant="bodySm" tone="muted" numberOfLines={1}>{s.skillTitle}</AppText>
                <AppText variant="bodySm" tone="secondary" numberOfLines={1}>{last ? last.body : t('inbox.none')}</AppText>
              </View>
              {last && <AppText variant="caption" tone="muted">{timeAgo(last.createdAt)}</AppText>}
            </Pressable>
          ))}
        </AppCard>
      ) : (
        <AppCard><EmptyState icon={MessageCircle} title={t('empty.inbox.title')} message={t('empty.inbox.body')} actionLabel={t('empty.explore')} onAction={() => { nav.pop(); nav.setTab('discover'); }} /></AppCard>
      )}
    </ScreenScaffold>
  );
}
