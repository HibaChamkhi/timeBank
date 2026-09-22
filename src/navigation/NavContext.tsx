import React, { createContext, useContext } from 'react';
import type { Session, Skill } from '../data/types';
import type { TabKey } from './tabs';

export type Route =
  | { name: 'person'; userId: string }
  | { name: 'book'; skill: Skill }
  | { name: 'chat'; sessionId: string }
  | { name: 'inbox' }
  | { name: 'notices' }
  | { name: 'gallery' }
  | { name: 'editProfile' }
  | { name: 'availability' }
  | { name: 'admin' };

export interface Nav {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  push: (r: Route) => void;
  pop: () => void;
  openOffer: () => void;
  openReview: (s: Session) => void;
}

export const NavCtx = createContext<Nav | null>(null);
export function useNav() {
  const n = useContext(NavCtx);
  if (!n) throw new Error('useNav must be used inside the navigator');
  return n;
}
