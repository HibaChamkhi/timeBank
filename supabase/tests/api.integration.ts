// Exercises the real SupabaseApi against Postgres + PostgREST (same REST layer Supabase uses).
import { createHmac, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { SupabaseApi } from '../../src/data/supabaseApi';
import { slotAllowed } from '../../src/lib/availability';

const SECRET = 'a-test-secret-that-is-at-least-32-characters-long';
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(sub: string) {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ sub, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
  return `${head}.${body}.${createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url')}`;
}
const psql = (sql: string) => execFileSync('docker', ['exec', 'tb-test-db', 'psql', '-X', '-q', '-At', '-U', 'postgres', '-d', 'tb', '-c', sql]).toString().trim();

function apiFor(id: string, name: string) {
  const db = createClient('http://localhost:3311', 'anon-key', {
    accessToken: async () => jwt(id),
    // supabase-js calls <url>/rest/v1/...; bare PostgREST serves at the root.
    global: { fetch: (input: any, init?: any) => fetch(String(input).replace('/rest/v1', ''), init) },
  });
  return new SupabaseApi(db, id, name);
}
async function rejects(p: Promise<unknown>, text: string) {
  try { await p; } catch (e: any) { assert.match(e.message, new RegExp(text), `wrong error: ${e.message}`); return; }
  assert.fail(`expected rejection matching ${text}`);
}

const [aId, bId, cId, dId, eId, fId] = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
for (const [id, n] of [[aId, 'Alice'], [bId, 'Bob'], [cId, 'Carol'], [dId, 'Dave'], [eId, 'Erin'], [fId, 'Frank']]) {
  psql(`insert into auth.users (id, raw_user_meta_data) values ('${id}', '{"full_name":"${n}"}')`);
}
const alice = apiFor(aId, 'Alice'), bob = apiFor(bId, 'Bob'), carol = apiFor(cId, 'Carol');
const dave = apiFor(dId, 'Dave'), erin = apiFor(eId, 'Erin'), frank = apiFor(fId, 'Frank');
const step = (s: string) => console.log('  ✓', s);

(async () => {
  assert.equal(await alice.getBalance(), 2); step('new member starts with 2 credits');

  await bob.createSkill({ title: 'Web development help', category: 'Technology', description: 'React and Node', creditsPerHour: 1.5 });
  const found = await alice.discover({ query: 'Web development help' });
  assert.equal(found.length, 1); assert.equal(found[0].ownerName, 'Bob'); assert.equal(found[0].creditsPerHour, 1.5);
  assert.ok((await alice.discover({ category: 'Design' })).every((x) => x.category === 'Design'));
  assert.ok((await bob.discover()).every((x) => x.ownerId !== bId), 'own skills not listed');
  step('offer a skill and discover it (search + category filters)');

  const skillId = found[0].id;
  const start = new Date(Date.now() + 24 * 3600_000);
  const s1 = await alice.bookSession(skillId, start, 1);
  assert.equal(s1.status, 'requested'); assert.equal(s1.role, 'requester'); assert.equal(s1.otherName, 'Bob'); assert.equal(s1.credits, 1.5);
  assert.equal(await alice.getBalance(), 0.5);
  step('booking reserves credits');

  await rejects(alice.bookSession(skillId, new Date(Date.now() + 48 * 3600_000), 1), 'enough Time Credits');
  await rejects(carol.bookSession(skillId, new Date(start.getTime() + 30 * 60_000), 1), 'already booked');
  await rejects(bob.bookSession(skillId, new Date(Date.now() + 72 * 3600_000), 1), "can't book your own");
  step('overspending, double-booking and self-booking are refused with friendly messages');

  const bobSessions = await bob.mySessions();
  assert.equal(bobSessions.length, 1); assert.equal(bobSessions[0].role, 'provider'); assert.equal(bobSessions[0].otherName, 'Alice');
  await bob.respond(s1.id, true);
  assert.equal((await alice.mySessions())[0].status, 'accepted');
  step('provider sees and accepts the request');

  await alice.sendMessage(s1.id, 'Looking forward to it!');
  assert.deepEqual((await bob.messages(s1.id)).map((m) => m.body), ['Looking forward to it!']);
  assert.equal((await carol.messages(s1.id)).length, 0);
  await rejects(carol.sendMessage(s1.id, 'hi'), 'Nothing was changed');
  const bobNotes = await bob.notices();
  assert.ok(bobNotes.some((n) => n.kind === 'booking_requested') && bobNotes.some((n) => n.kind === 'message' && n.body.includes('Looking forward')));
  assert.equal(bobNotes.filter((n) => !n.read).length, bobNotes.length);
  await bob.markNoticesRead();
  assert.ok((await bob.notices()).every((n) => n.read));
  step('chat works for participants only; notifications arrive and can be marked read');

  await rejects(alice.confirm(s1.id), 'once the session has started');
  psql(`update bookings set starts_at = now() - interval '2 hours', ends_at = now() - interval '1 hour' where id = '${s1.id}'`);
  await alice.confirm(s1.id);
  let mine = (await alice.mySessions())[0];
  assert.equal(mine.iConfirmed, true); assert.equal(mine.otherConfirmed, false); assert.equal(mine.status, 'accepted');
  assert.equal(await bob.getBalance(), 2, 'not paid yet');
  await bob.confirm(s1.id);
  mine = (await alice.mySessions())[0];
  assert.equal(mine.status, 'completed'); assert.equal(await bob.getBalance(), 3.5);
  const bobLedger = await bob.ledger();
  assert.ok(bobLedger.some((l) => l.kind === 'earn' && l.amount === 1.5 && l.title === 'Web development help'));
  step('both confirm → provider is paid exactly once');

  await alice.submitReview(s1.id, 5, 'Super helpful');
  await rejects(alice.submitReview(s1.id, 4, ''), 'already reviewed');
  await rejects(alice.submitReview(s1.id, 9, ''), 'rating');
  assert.equal((await alice.mySessions())[0].hasReviewed, true);
  const person = await alice.getPerson(bId);
  assert.equal(person.stats.rating, 5); assert.equal(person.stats.hoursGiven, 1); assert.equal(person.stats.peopleHelped, 1);
  assert.equal(person.reviews[0].reviewerName, 'Alice'); assert.equal(person.skills.length, 1);
  step('review updates the provider profile and stats');

  await alice.bookSession(skillId, new Date(Date.now() + 5 * 24 * 3600_000), 0.5).then(
    () => assert.fail('Alice has 0.5 credits, 0.75 needed'), (e) => assert.match(e.message, /enough Time Credits/));
  const s2 = await carol.bookSession(skillId, new Date(Date.now() + 5 * 24 * 3600_000), 1);
  assert.equal(await carol.getBalance(), 0.5);
  await carol.cancel(s2.id);
  assert.equal(await carol.getBalance(), 2); step('cancelling refunds the requester');

  await bob.removeSkill(skillId);
  assert.ok((await alice.discover()).every((x) => x.ownerId !== bId));
  step('removed skills disappear from discovery');
  // ---------------------------------------------------------------- profile, availability, safety, moderation
  await dave.updateProfile({ name: 'Dave D.', headline: 'Carpenter', bio: 'I fix things' });
  const daveProfile = await erin.getPerson(dId);
  assert.equal(daveProfile.name, 'Dave D.'); assert.equal(daveProfile.headline, 'Carpenter'); assert.equal(daveProfile.bio, 'I fix things');
  await rejects(dave.updateProfile({ name: 'x'.repeat(81), headline: '', bio: '' }), 'Nothing was changed');
  step('members edit their own profile; limits are enforced');

  await erin.createSkill({ title: 'Garden design', category: 'Home', description: '', creditsPerHour: 0.5 });
  const garden = (await dave.discover({ query: 'Garden design' }))[0];
  assert.equal((await dave.getAvailability(eId)).windows.length, 0, 'no windows = any time');
  await erin.setAvailability([{ weekday: 1, startMin: 9 * 60, endMin: 12 * 60 }, { weekday: 3, startMin: 14 * 60, endMin: 18 * 60 }]);
  await rejects(erin.setAvailability([{ weekday: 1, startMin: 600, endMin: 700 }, { weekday: 1, startMin: 650, endMin: 800 }]), 'do not overlap');
  const av = await dave.getAvailability(eId);
  assert.equal(av.windows.length, 2, 'failed update left the saved windows untouched');
  // The client's slot rule must agree with the server's, hour by hour, for Monday and Tuesday next week.
  const nextMonday = new Date(); nextMonday.setDate(nextMonday.getDate() + ((1 - nextMonday.getDay() + 7) % 7 || 7) + 7); nextMonday.setHours(0, 0, 0, 0);
  let accepted = 0;
  for (const [dayOffset, hour] of [[0, 8], [0, 9], [0, 11], [0, 12], [1, 10], [0, 10]] as const) {
    const start = new Date(nextMonday.getTime() + dayOffset * 86400_000 + hour * 3600_000);
    const client = slotAllowed(av, start.getTime(), 0.5);
    let server = true;
    try { await dave.bookSession(garden.id, start, 0.5); accepted++; } catch (e: any) { server = false; assert.match(e.message, /isn't available at that time/); }
    assert.equal(client, server, `client and server disagree at ${start.toISOString()}`);
  }
  assert.ok(accepted >= 2 && accepted < 6, 'some slots accepted, some refused');
  step('availability limits bookings; client and server agree on every slot');

  // Blocking
  await dave.blockUser(eId);
  assert.ok((await dave.discover()).every((x) => x.ownerId !== eId), 'blocker no longer sees the blocked person');
  assert.ok((await erin.discover()).every((x) => x.ownerId !== dId));
  await rejects(dave.bookSession(garden.id, new Date(Date.now() + 40 * 86400_000), 0.5), 'no longer available');
  assert.deepEqual((await dave.blockedUsers()).map((b) => b.name), ['Erin']);
  assert.deepEqual(await erin.blockedUsers(), [], 'the blocked person cannot see who blocked them');
  await rejects(dave.blockUser(dId), "can't do that");
  await dave.unblockUser(eId);
  assert.ok((await dave.discover()).some((x) => x.ownerId === eId));
  step('blocking hides both people from each other, stops booking, is private and reversible');

  // Reporting and moderation
  await dave.reportUser(eId, 'no_show', 'Did not turn up');
  await rejects(dave.reportUser(dId, 'spam', ''), "can't do that");
  assert.equal(await dave.isAdmin(), false);
  await rejects(dave.adminReports(), 'access');
  await rejects(dave.resolveDispute(randomUUID(), 'pay'), 'access');
  psql(`update profiles set is_admin = true where id = '${fId}'`);
  assert.equal(await frank.isAdmin(), true);
  const reports = await frank.adminReports();
  assert.ok(reports.some((r) => r.reporterName === 'Dave D.' && r.targetName === 'Erin' && r.reason === 'no_show'));
  await frank.resolveReport(reports.find((r) => r.targetId === eId)!.id);
  assert.ok((await frank.adminReports()).every((r) => r.targetId !== eId));

  const booked = (await dave.mySessions()).find((x) => x.status === 'requested')!;
  await erin.respond(booked.id, true);
  psql(`update bookings set starts_at = now() - interval '2 hours', ends_at = now() - interval '90 minutes' where id = '${booked.id}'`);
  const before = await dave.getBalance();
  await dave.dispute(booked.id);
  const disputes = await frank.adminDisputes();
  const disputed = disputes.find((d) => d.id === booked.id)!;
  assert.equal(disputed.requesterName, 'Dave D.'); assert.equal(disputed.providerName, 'Erin');
  await frank.resolveDispute(booked.id, 'refund');
  assert.equal(await dave.getBalance(), before + booked.credits, 'refund returns the held credits');
  await rejects(frank.resolveDispute(booked.id, 'pay'), 'any more');
  const daveNotes = await dave.notices();
  assert.ok(daveNotes.some((n) => n.kind === 'dispute_resolved' && n.params.outcome === 'refund' && n.params.role === 'requester'));
  step('reports and disputes reach moderators only; resolving a dispute is final and notifies both sides');
  console.log('API INTEGRATION TESTS PASSED');
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
