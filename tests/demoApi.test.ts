// The demo backend must follow the same rules as the database. Run: npx tsx tests/demoApi.test.ts
import assert from 'node:assert/strict';
import { DemoApi } from '../src/data/demoApi';

const rejects = async (p: Promise<unknown>, text: RegExp) => {
  try { await p; } catch (e: any) { assert.match(e.message, text); return; }
  assert.fail(`expected rejection ${text}`);
};
const H = 3600_000;

(async () => {
  const api = new DemoApi();
  assert.equal(await api.getBalance(), 2.5);
  const skills = await api.discover();
  assert.ok(skills.every((s) => s.ownerId !== 'me'), 'own skills are not listed');
  assert.equal((await api.discover({ query: 'zzz' })).length, 0);
  const karim = skills.find((s) => s.ownerName.startsWith('Karim'))!;

  const b = await api.bookSession(karim.id, new Date(Date.now() + 24 * H), 1);
  assert.equal(await api.getBalance(), 1.5, 'booking reserves credits');
  await rejects(api.bookSession(karim.id, new Date(Date.now() + 24.5 * H), 1), /already booked/);
  await rejects(api.bookSession(karim.id, new Date(Date.now() - H), 1), /future/);
  await rejects(api.bookSession(karim.id, new Date(Date.now() + 48 * H), 0.3), /half-hour/);
  const omar = skills.find((s) => s.ownerName.startsWith('Omar'))!; // 2 credits/h
  await rejects(api.bookSession(omar.id, new Date(Date.now() + 72 * H), 1), /enough Time Credits/);
  const mine = (await api.getPerson('me')).skills[0];
  await rejects(api.bookSession(mine.id, new Date(Date.now() + 96 * H), 1), /own skill/);

  await api.cancel(b.id);
  assert.equal(await api.getBalance(), 2.5, 'cancel refunds');
  await rejects(api.cancel(b.id), /can't be changed/);

  // Seeded: an accepted session that already started, and an incoming request.
  const sessions = await api.mySessions();
  const started = sessions.find((s) => s.status === 'accepted' && s.role === 'requester')!;
  await api.confirm(started.id);
  await new Promise((r) => setTimeout(r, 2300));
  assert.equal((await api.mySessions()).find((s) => s.id === started.id)!.status, 'completed');
  await api.submitReview(started.id, 5, 'Great');
  await rejects(api.submitReview(started.id, 4, ''), /already reviewed/);
  assert.equal((await api.getPerson(started.otherId)).reviews[0].reviewerName, 'Hiba');

  const incoming = sessions.find((s) => s.status === 'requested' && s.role === 'provider')!;
  await api.respond(incoming.id, true);
  await rejects(api.confirm(incoming.id), /once the session has started/);
  await api.sendMessage(incoming.id, 'See you then');
  assert.equal((await api.messages(incoming.id))[0].body, 'See you then');
  await api.markNoticesRead();
  assert.ok((await api.notices()).every((n) => n.read));
  // Profile, availability, blocking, reports and moderation.
  await api.updateProfile({ name: 'Hiba H.', headline: 'Builder', bio: 'Hello' });
  assert.equal(api.userName, 'Hiba H.');
  assert.equal((await api.getPerson('me')).bio, 'Hello');
  const sarah = (await api.discover()).find((x) => x.ownerName.startsWith('Sarah'))!;
  // Sarah is never bookable on a Sunday: pick the next Sunday at 12:00 local time.
  const sunday = new Date(); sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7)); sunday.setHours(12, 0, 0, 0);
  await rejects(api.bookSession(sarah.id, sunday, 1), /isn't available at that time/);
  const av = await api.getAvailability('u1');
  assert.ok(av.windows.length > 0);
  await api.setAvailability([{ weekday: 1, startMin: 540, endMin: 600 }]);
  assert.equal((await api.getAvailability('me')).windows.length, 1);
  await api.blockUser('u2');
  assert.ok((await api.discover()).every((x) => x.ownerId !== 'u2'), 'blocked people disappear from discovery');
  assert.deepEqual((await api.blockedUsers()).map((b) => b.id), ['u2']);
  await api.unblockUser('u2');
  assert.ok((await api.discover()).some((x) => x.ownerId === 'u2'));
  await rejects(api.blockUser('me'), /can't do that/);
  const before = (await api.adminReports()).length;
  await api.reportUser('u5', 'spam', 'ads');
  assert.equal((await api.adminReports()).length, before + 1);
  assert.equal(await api.isAdmin(), true);
  const disputes = await api.adminDisputes();
  assert.ok(disputes.length >= 1);
  await api.resolveDispute(disputes[0].id, 'refund');
  await rejects(api.resolveDispute(disputes[0].id, 'pay'), /can't be changed/);
  await api.resolveReport((await api.adminReports())[0].id);
  console.log('DEMO API TESTS PASSED');
  process.exit(0);
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
