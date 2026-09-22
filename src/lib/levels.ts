import type { Stats } from '../data/types';

/** Levels reward time given to the community; they never gate features. */
export const LEVEL_HOURS = [0, 1, 10, 25, 50] as const;

export interface LevelInfo {
  level: number; // 0..4
  nextLevel: number | null;
  hoursToNext: number;
  progress: number; // 0..1 towards the next level (1 at the top)
}

export function computeLevel(stats: Pick<Stats, 'hoursGiven'>): LevelInfo {
  const h = stats.hoursGiven;
  let level = 0;
  LEVEL_HOURS.forEach((min, i) => { if (h >= min) level = i; });
  if (level === LEVEL_HOURS.length - 1) return { level, nextLevel: null, hoursToNext: 0, progress: 1 };
  const from = LEVEL_HOURS[level], to = LEVEL_HOURS[level + 1];
  return { level, nextLevel: level + 1, hoursToNext: Math.round((to - h) * 100) / 100, progress: (h - from) / (to - from) };
}

export const BADGES = [
  { key: 'first', earned: (s: Stats) => s.hoursGiven > 0 },
  { key: 'people5', earned: (s: Stats) => s.peopleHelped >= 5 },
  { key: 'sessions10', earned: (s: Stats) => s.sessionsCompleted >= 10 },
  { key: 'skillSharer', earned: (s: Stats) => s.skillsCount >= 3 },
  { key: 'mentor', earned: (s: Stats) => (s.rating ?? 0) >= 4.8 && s.reviewCount >= 5 },
  { key: 'hours100', earned: (s: Stats) => s.hoursGiven >= 100 },
] as const;
export type BadgeKey = (typeof BADGES)[number]['key'];

export const earnedBadges = (s: Stats): BadgeKey[] => BADGES.filter((b) => b.earned(s)).map((b) => b.key);
