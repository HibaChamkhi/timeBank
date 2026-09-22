// Pure logic: availability slots, presets, levels and badges. Run: npx tsx tests/libs.test.ts
import assert from 'node:assert/strict';
import { selectionToWindows, slotAllowed, windowsToSelection } from '../src/lib/availability';
import { BADGES, computeLevel, earnedBadges } from '../src/lib/levels';
import type { Stats } from '../src/data/types';

// Provider at UTC+2, free Mondays 11:00–13:00 local. 2026-09-28 is a Monday.
const av = { windows: [{ weekday: 1, startMin: 660, endMin: 780 }], utcOffsetMin: 120 };
const at = (iso: string) => new Date(iso).getTime();
assert.equal(slotAllowed(av, at('2026-09-28T10:00:00Z'), 1), true, '12:00–13:00 local fits');
assert.equal(slotAllowed(av, at('2026-09-28T09:00:00Z'), 2), true, '11:00–13:00 local fits exactly');
assert.equal(slotAllowed(av, at('2026-09-28T10:30:00Z'), 1), false, 'would end at 13:30 local');
assert.equal(slotAllowed(av, at('2026-09-28T08:00:00Z'), 1), false, '10:00 local is before the window');
assert.equal(slotAllowed(av, at('2026-09-29T10:00:00Z'), 1), false, 'Tuesday');
assert.equal(slotAllowed({ windows: [], utcOffsetMin: 0 }, at('2026-09-29T03:00:00Z'), 1), true, 'no windows: any time');
// Offset can move the day: 23:00 UTC Sunday is Monday 01:00 at UTC+2.
assert.equal(slotAllowed({ windows: [{ weekday: 1, startMin: 0, endMin: 240 }], utcOffsetMin: 120 }, at('2026-09-27T23:00:00Z'), 1), true);

// Presets round-trip and merge neighbours.
const sel = { 0: [], 1: ['morning', 'afternoon'], 2: ['evening'], 3: [], 4: [], 5: [], 6: [] } as any;
const windows = selectionToWindows(sel);
assert.deepEqual(windows, [{ weekday: 1, startMin: 480, endMin: 1020 }, { weekday: 2, startMin: 1020, endMin: 1260 }]);
assert.deepEqual(windowsToSelection(windows)[1], ['morning', 'afternoon']);
assert.deepEqual(windowsToSelection(windows)[2], ['evening']);
assert.deepEqual(selectionToWindows({ 1: ['morning', 'evening'] } as any).length, 2, 'gaps stay separate');

// Levels follow hours given.
const lv = (h: number) => computeLevel({ hoursGiven: h }).level;
assert.deepEqual([0, 0.5, 1, 9.9, 10, 25, 49, 50, 500].map(lv), [0, 0, 1, 1, 2, 3, 3, 4, 4]);
const mid = computeLevel({ hoursGiven: 5.5 });
assert.equal(mid.nextLevel, 2); assert.equal(mid.hoursToNext, 4.5); assert.ok(Math.abs(mid.progress - 0.5) < 1e-9);
assert.equal(computeLevel({ hoursGiven: 80 }).nextLevel, null);

const none: Stats = { rating: null, reviewCount: 0, sessionsCompleted: 0, hoursGiven: 0, peopleHelped: 0, skillsCount: 0 };
assert.deepEqual(earnedBadges(none), []);
assert.deepEqual(earnedBadges({ ...none, hoursGiven: 1 }), ['first']);
const star: Stats = { rating: 4.9, reviewCount: 6, sessionsCompleted: 12, hoursGiven: 120, peopleHelped: 7, skillsCount: 3 };
assert.equal(earnedBadges(star).length, BADGES.length, 'a very active member earns everything');
assert.ok(!earnedBadges({ ...star, rating: 4.7 }).includes('mentor'), 'mentor needs a 4.8 rating');
console.log('LIB TESTS PASSED');
