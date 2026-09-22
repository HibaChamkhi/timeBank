import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { useApi, useData } from '../data/ApiProvider';
import { t } from '../i18n';
import { useNav } from '../navigation/NavContext';
import { AppButton, AppCard, EmptyState, NoticeItem } from '../components';
import { LoadingCards, ScreenScaffold } from './ScreenScaffold';

export function NoticesScreen() {
  const { colors } = useTheme();
  const api = useApi();
  const nav = useNav();
  const { data, loading, reload } = useData((a) => a.notices(), [], 5000);
  const unread = (data ?? []).filter((n) => !n.read).length;

  // Keep the unread dots visible on this visit, clear them once you leave.
  useEffect(() => () => { api.markNoticesRead().catch(() => {}); }, [api]);

  const open = (bookingId: string | null, kind: string) => {
    if (bookingId && kind === 'message') nav.push({ name: 'chat', sessionId: bookingId });
    else { nav.pop(); nav.setTab('activity'); }
  };

  return (
    <ScreenScaffold title={t('notices.title')} subtitle={unread ? t('notices.newCount', { count: unread }) : undefined} onBack={nav.pop}>
      {unread > 0 && (
        <View style={{ alignItems: 'flex-end', marginBottom: spacing.xs }}>
          <AppButton label={t('notices.markRead')} variant="ghost" size="sm" onPress={() => api.markNoticesRead().then(reload)} />
        </View>
      )}
      {loading && !data ? <LoadingCards /> : data?.length ? (
        <AppCard padding={spacing.sm}>
          {data.map((n, i) => (
            <View key={n.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
              <NoticeItem notice={n} onPress={() => open(n.bookingId, n.kind)} />
            </View>
          ))}
        </AppCard>
      ) : (
        <AppCard><EmptyState icon={Bell} title={t('empty.notices.title')} message={t('empty.notices.body')} /></AppCard>
      )}
    </ScreenScaffold>
  );
}
