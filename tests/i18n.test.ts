// Translation completeness and plural rules. Run: npx tsx tests/i18n.test.ts
import assert from 'node:assert/strict';
import { en } from '../src/i18n/en';
import { fr } from '../src/i18n/fr';
import { ar } from '../src/i18n/ar';
import { pluralCategory, setCurrentLocale, t, tp } from '../src/i18n/core';
import { friendlyError } from '../src/data/errors';
import { formatWhen, hours, timeAgo } from '../src/lib/format';
import { noticeText } from '../src/i18n/notices';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const langs = { fr, ar } as Record<string, Record<string, string>>;

for (const [name, cat] of Object.entries(langs)) {
  const missing = Object.keys(en).filter((k) => !(k in cat));
  assert.deepEqual(missing, [], `${name} is missing keys`);
  const empty = Object.entries(cat).filter(([, v]) => !v.trim()).map(([k]) => k);
  assert.deepEqual(empty, [], `${name} has empty strings`);
  // Same placeholders as English, so nothing is dropped or misspelled ({name} vs {nom}).
  const bad = Object.keys(en).filter((k) => !k.endsWith('_one') && !k.endsWith('_other') && placeholders((en as any)[k]) !== placeholders(cat[k]));
  assert.deepEqual(bad, [], `${name}: placeholders differ from English`);
  // Every plural group needs its _other fallback.
  for (const k of Object.keys(cat).filter((x) => /_(zero|one|two|few|many)$/.test(x))) {
    assert.ok(cat[k.replace(/_(zero|one|two|few|many)$/, '_other')], `${name}: ${k} has no _other`);
  }
  // Calendar tables must have 7 days and 12 months.
  assert.equal(cat['date.days'].split(',').length, 7, `${name} days`);
  assert.equal(cat['date.months'].split(',').length, 12, `${name} months`);
}
// No stray extra keys in translations that English lacks (except Arabic's extra plural forms).
for (const [name, cat] of Object.entries(langs)) {
  const extra = Object.keys(cat).filter((k) => !(k in en) && !/_(zero|one|two|few|many)$/.test(k));
  assert.deepEqual(extra, [], `${name} has unknown keys`);
}

const pc = (l: 'en' | 'fr' | 'ar', n: number) => pluralCategory(l, n);
assert.deepEqual([0, 1, 2, 5].map((n) => pc('en', n)), ['other', 'one', 'other', 'other']);
assert.deepEqual([0, 1, 2, 5].map((n) => pc('fr', n)), ['one', 'one', 'other', 'other']);
assert.deepEqual([0, 1, 2, 3, 10, 11, 99, 100, 102, 111].map((n) => pc('ar', n)), ['zero', 'one', 'two', 'few', 'few', 'many', 'many', 'other', 'other', 'many']);

// Behaviour in each language.
const when = new Date(2026, 8, 22, 14, 0); // Tue 22 Sep 2026, 14:00
setCurrentLocale('en');
assert.equal(formatWhen(when), 'Tue 22 Sep · 14:00');
assert.equal(hours(1.5), '1.5h');
assert.equal(friendlyError(new Error('boom insufficient_credits')).message, en['error.insufficient_credits']);
assert.equal(tp('trust.completed', 1), '1 session completed');
setCurrentLocale('fr');
assert.equal(formatWhen(when), 'mar. 22 sept. · 14:00');
assert.equal(hours(1.5), '1.5 h');
assert.equal(friendlyError(new Error('time_slot_taken')).message, fr['error.time_slot_taken']);
assert.equal(tp('trust.completed', 0), '0 séance terminée'); // French: zero is singular
assert.equal(t('home.greeting', { name: 'Hiba' }), 'Bonjour, Hiba');
setCurrentLocale('ar');
assert.equal(formatWhen(when), 'الثلاثاء 22 سبتمبر · 14:00');
assert.equal(hours(2), '2 س');
assert.equal(tp('trust.completed', 2), 'جلستان مكتملتان');
assert.equal(tp('trust.completed', 5), '5 جلسات مكتملة');
assert.equal(tp('trust.completed', 12), '12 جلسة مكتملة');
assert.equal(friendlyError(new Error('start_in_past')).message, ar['error.start_in_past']);
assert.equal(timeAgo(new Date(Date.now() - 3 * 3600_000).toISOString()), 'منذ 3 س');
// Server notifications render from structured params in the reader's language.
const n = { id: '1', kind: 'credits_earned', title: 'You earned 1.5h', body: 'x', bookingId: null, read: false, createdAt: '', params: { name: 'Sarah', credits: 1.5 } };
assert.equal(noticeText(n).title, 'كسبت 1.5 س');
setCurrentLocale('fr');
assert.equal(noticeText(n).title, 'Vous avez gagné 1.5 h');
assert.equal(noticeText({ ...n, params: {} }).title, 'You earned 1.5h', 'old rows without params keep their stored text');
setCurrentLocale('en');

console.log(`I18N TESTS PASSED (${Object.keys(en).length} keys × 3 languages)`);
