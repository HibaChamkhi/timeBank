import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAdaptiveLayout } from '../layout/AdaptiveLayout';
import { useData } from '../data/ApiProvider';
import type { Session } from '../data/types';
import { NavCtx, Nav, Route } from './NavContext';
import { TabKey } from './tabs';
import { TabBar } from './TabBar';
import { Sidebar } from './Sidebar';
import { HomeScreen } from '../screens/HomeScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { GalleryScreen } from '../screens/GalleryScreen';
import { PersonScreen } from '../screens/PersonScreen';
import { BookScreen } from '../screens/BookScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { InboxScreen } from '../screens/InboxScreen';
import { NoticesScreen } from '../screens/NoticesScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { AvailabilityScreen } from '../screens/AvailabilityScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { OfferSheet } from '../screens/OfferSheet';
import { ReviewSheet } from '../screens/ReviewSheet';

function renderRoute(r: Route) {
  switch (r.name) {
    case 'person': return <PersonScreen userId={r.userId} />;
    case 'book': return <BookScreen skill={r.skill} />;
    case 'chat': return <ChatScreen sessionId={r.sessionId} />;
    case 'inbox': return <InboxScreen />;
    case 'notices': return <NoticesScreen />;
    case 'gallery': return <GalleryScreen />;
    case 'editProfile': return <EditProfileScreen />;
    case 'availability': return <AvailabilityScreen />;
    case 'admin': return <AdminScreen />;
  }
}

export function AppNavigator() {
  const { colors } = useTheme();
  const { navigation } = useAdaptiveLayout();
  const [tab, setTab] = useState<TabKey>('home');
  const [stack, setStack] = useState<Route[]>([]);
  const [offerOpen, setOfferOpen] = useState(false);
  const [reviewing, setReviewing] = useState<Session | null>(null);
  const balance = useData((a) => a.getBalance()).data ?? 0;

  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const nav = useMemo<Nav>(() => ({
    tab,
    setTab: (t) => { setStack([]); setTab(t); },
    push: (r) => setStack((s) => [...s, r]),
    pop,
    openOffer: () => setOfferOpen(true),
    openReview: setReviewing,
  }), [tab, pop]);

  // Android back button closes the top screen first.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length) { pop(); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab, pop]);

  const top = stack[stack.length - 1];
  const screen = top ? renderRoute(top) : {
    home: <HomeScreen />, discover: <DiscoverScreen />, activity: <ActivityScreen />, profile: <ProfileScreen />,
  }[tab];

  return (
    <NavCtx.Provider value={nav}>
      <View style={{ flex: 1, flexDirection: navigation === 'sidebar' ? 'row' : 'column', backgroundColor: colors.background }}>
        {navigation === 'sidebar' && <Sidebar active={tab} onChange={nav.setTab} onOffer={nav.openOffer} balance={balance} />}
        <View style={{ flex: 1 }}>{screen}</View>
        {navigation === 'bottom-tabs' && !top && <TabBar active={tab} onChange={nav.setTab} onOffer={nav.openOffer} />}
        <OfferSheet visible={offerOpen} onClose={() => setOfferOpen(false)} />
        <ReviewSheet session={reviewing} onClose={() => setReviewing(null)} />
      </View>
    </NavCtx.Provider>
  );
}
