import { t } from '../i18n/core';
import { fail } from './errors';
import { slotAllowed } from '../lib/availability';
import type { Api, Availability, AvailabilityWindow, BlockedUser, BookingStatus, DisputeItem, LedgerItem, LedgerKind, Message, NewSkill, Notice, Person, ProfileInput, ReportItem, ReportReason, Review, Session, Skill, Stats } from './types';

interface DUser { id: string; name: string; headline: string; bio: string }
interface DSkill { id: string; ownerId: string; title: string; category: string; description: string; rate: number; active: boolean }
interface DBooking {
  id: string; skillId: string; providerId: string; requesterId: string; startsAt: number; endsAt: number; hours: number; credits: number;
  status: BookingStatus; reqConfirmed: boolean; provConfirmed: boolean;
}
interface DReview { id: string; bookingId: string; reviewerId: string; revieweeId: string; rating: number; comment: string; createdAt: number }

const HOUR = 3600_000;
const iso = (t: number) => new Date(t).toISOString();

/**
 * In-memory stand-in for the backend, used when no Supabase project is configured.
 * It applies the same rules as the database so the whole app can be exercised offline.
 */
export class DemoApi implements Api {
  readonly userId = 'me';
  get userName() { return this.user('me').name; }
  private listeners = new Set<() => void>();
  private seq = 100;
  private users: DUser[] = [
    { id: 'me', name: 'Hiba', headline: 'Mobile developer', bio: 'I love helping people ship their first app.' },
    { id: 'u1', name: 'Sarah Martin', headline: 'UI/UX Designer', bio: 'Product designer with 8 years of experience.' },
    { id: 'u2', name: 'Karim Ben Ali', headline: 'English Tutor', bio: 'Certified English teacher. Friendly and patient.' },
    { id: 'u3', name: 'Lea Dubois', headline: 'Career Coach', bio: 'I help people land the job they want.' },
    { id: 'u4', name: 'Omar Haddad', headline: 'Web Developer', bio: 'Full-stack developer. React and Node.' },
    { id: 'u5', name: 'Nadia Rezgui', headline: 'Student', bio: '' },
  ];
  private skills: DSkill[] = [
    { id: 's1', ownerId: 'u1', title: 'UI/UX portfolio review', category: 'Design', description: 'Honest feedback on your portfolio and case studies.', rate: 1, active: true },
    { id: 's2', ownerId: 'u2', title: 'English conversation practice', category: 'Languages', description: 'Relaxed speaking practice, any level.', rate: 1, active: true },
    { id: 's3', ownerId: 'u3', title: 'CV and interview coaching', category: 'Career', description: 'Rewrite your CV and rehearse tough interview questions.', rate: 1.5, active: true },
    { id: 's4', ownerId: 'u4', title: 'React and debugging help', category: 'Technology', description: 'Unblock your React project with a live pairing session.', rate: 2, active: true },
    { id: 's5', ownerId: 'me', title: 'Mobile app help', category: 'Technology', description: 'React Native, Expo and app store questions.', rate: 1.5, active: true },
  ];
  private bookings: DBooking[] = [];
  private reviews: DReview[] = [];
  private ledgerRows: { id: number; bookingId: string | null; kind: LedgerKind; amount: number; at: number }[] = [];
  private msgs: { id: string; bookingId: string; senderId: string; body: string; at: number }[] = [];
  private availability = new Map<string, Availability>();
  private blocked = new Set<string>();
  private reports: { id: string; reporterId: string; targetId: string; reason: ReportReason; details: string; at: number; open: boolean }[] = [];
  private notes: { id: string; kind: string; title: string; body: string; bookingId: string | null; params: Record<string, any>; read: boolean; at: number }[] = [];

  constructor() {
    const now = Date.now();
    this.ledger_add(null, 'welcome_grant', 2, now - 30 * 24 * HOUR);
    // Sessions already completed, so profiles and ratings are not empty.
    this.seedDone('s1', 'u2', 1, 5, 'Sarah spotted three things I had missed. Very useful.', now - 20 * 24 * HOUR);
    this.seedDone('s1', 'u4', 1, 5, 'Clear, kind and practical.', now - 12 * 24 * HOUR);
    this.seedDone('s2', 'u3', 1, 5, 'Great conversation partner.', now - 15 * 24 * HOUR);
    this.seedDone('s4', 'u1', 2, 4, 'Fixed my bug in one session.', now - 9 * 24 * HOUR);
    this.seedDone('s5', 'u3', 1, 5, 'Very clear explanations.', now - 6 * 24 * HOUR);
    // Sarah is only bookable on weekday evenings and Saturday daytime (in this device's time zone).
    const offset = -new Date().getTimezoneOffset();
    const windows: AvailabilityWindow[] = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMin: 17 * 60, endMin: 21 * 60 }));
    windows.push({ weekday: 6, startMin: 8 * 60, endMin: 17 * 60 });
    this.availability.set('u1', { windows, utcOffsetMin: offset });
    // Moderation demo data: a reported session and a report waiting for review (the demo user is a moderator).
    this.push_booking({ skillId: 's4', providerId: 'u4', requesterId: 'u3', startsAt: now - 5 * HOUR, hours: 1, status: 'disputed' });
    this.reports.push({ id: 'rp1', reporterId: 'u2', targetId: 'u5', reason: 'no_show', details: 'Did not join the call.', at: now - 4 * HOUR, open: true });
    // An incoming request waiting for me to accept.
    this.push_booking({ skillId: 's5', providerId: 'me', requesterId: 'u5', startsAt: now + 26 * HOUR, hours: 1, status: 'requested' });
    // A session that already happened; Sarah confirmed, waiting for me.
    const b = this.push_booking({ skillId: 's1', providerId: 'u1', requesterId: 'me', startsAt: now - 2 * HOUR, hours: 1, status: 'accepted' });
    b.provConfirmed = true;
    this.ledger_add(b.id, 'hold', -b.credits, now - 26 * HOUR);
    this.msgs.push({ id: 'm1', bookingId: b.id, senderId: 'u1', body: t('demo.greet'), at: now - 3 * HOUR });
    this.notify('booking_requested', 'New session request', 'Nadia Rezgui requested 1h', this.bookings.find((x) => x.requesterId === 'u5')!.id, { name: 'Nadia Rezgui', hours: 1 }, now - 2 * HOUR);
    this.notify('confirm_needed', 'Confirm your session', 'Sarah Martin confirmed it happened. Confirm to complete it.', b.id, { name: 'Sarah Martin', role: 'requester' }, now - 30 * 60_000);
  }

  // ------------------------------------------------------------ plumbing
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach((l) => l()); }
  private id(p: string) { return `${p}${++this.seq}`; }
  private user(id: string) { return this.users.find((u) => u.id === id)!; }
  private skill(id: string) { return this.skills.find((s) => s.id === id); }
  private ledger_add(bookingId: string | null, kind: LedgerKind, amount: number, at = Date.now()) {
    this.ledgerRows.push({ id: this.ledgerRows.length + 1, bookingId, kind, amount, at });
  }
  private balance() { return this.ledgerRows.reduce((s, r) => s + r.amount, 0); }
  private notify(kind: string, title: string, body: string, bookingId: string | null, params: Record<string, any> = {}, at = Date.now()) {
    this.notes.push({ id: this.id('n'), kind, title, body, bookingId, params, read: false, at });
  }
  private push_booking(x: { skillId: string; providerId: string; requesterId: string; startsAt: number; hours: number; status: BookingStatus }): DBooking {
    const s = this.skill(x.skillId)!;
    const b: DBooking = {
      id: this.id('b'), ...x, endsAt: x.startsAt + x.hours * HOUR, credits: Math.round(x.hours * s.rate * 100) / 100,
      reqConfirmed: false, provConfirmed: false,
    };
    this.bookings.push(b);
    return b;
  }
  private seedDone(skillId: string, requesterId: string, hours: number, rating: number, comment: string, at: number) {
    const s = this.skill(skillId)!;
    const b = this.push_booking({ skillId, providerId: s.ownerId, requesterId, startsAt: at, hours, status: 'completed' });
    b.reqConfirmed = b.provConfirmed = true;
    this.reviews.push({ id: this.id('r'), bookingId: b.id, reviewerId: requesterId, revieweeId: s.ownerId, rating, comment, createdAt: at + 2 * HOUR });
    if (s.ownerId === 'me') this.ledger_add(b.id, 'earn', b.credits, at + HOUR);
    if (requesterId === 'me') { this.ledger_add(b.id, 'hold', -b.credits, at - HOUR); }
  }
  private later(ms: number, fn: () => void) { setTimeout(() => { fn(); this.emit(); }, ms); }
  private find(id: string): DBooking { return this.bookings.find((b) => b.id === id) ?? fail('booking_not_found'); }
  private mine(b: DBooking) { if (b.providerId !== 'me' && b.requesterId !== 'me') fail('forbidden'); }

  private statsOf(userId: string): Stats {
    const rs = this.reviews.filter((r) => r.revieweeId === userId);
    const done = this.bookings.filter((b) => b.status === 'completed');
    const asProv = done.filter((b) => b.providerId === userId);
    return {
      rating: rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : null,
      reviewCount: rs.length,
      sessionsCompleted: done.filter((b) => b.providerId === userId || b.requesterId === userId).length,
      hoursGiven: asProv.reduce((s, b) => s + b.hours, 0),
      peopleHelped: new Set(asProv.map((b) => b.requesterId)).size,
      skillsCount: this.skills.filter((s) => s.ownerId === userId && s.active).length,
    };
  }
  private toSkill(s: DSkill): Skill {
    const o = this.user(s.ownerId), st = this.statsOf(o.id);
    return { id: s.id, title: s.title, category: s.category, description: s.description, creditsPerHour: s.rate, ownerId: o.id, ownerName: o.name, ownerHeadline: o.headline, rating: st.rating, reviewCount: st.reviewCount, sessionsCompleted: st.sessionsCompleted };
  }
  private toSession(b: DBooking): Session {
    const req = b.requesterId === 'me';
    const other = this.user(req ? b.providerId : b.requesterId);
    return {
      id: b.id, skillId: b.skillId, skillTitle: this.skill(b.skillId)?.title ?? '', role: req ? 'requester' : 'provider',
      otherId: other.id, otherName: other.name, startsAt: iso(b.startsAt), endsAt: iso(b.endsAt), hours: b.hours, credits: b.credits, status: b.status,
      iConfirmed: req ? b.reqConfirmed : b.provConfirmed, otherConfirmed: req ? b.provConfirmed : b.reqConfirmed,
      hasReviewed: this.reviews.some((r) => r.bookingId === b.id && r.reviewerId === 'me'),
    };
  }

  // ------------------------------------------------------------ Api
  async getBalance() { return Math.round(this.balance() * 100) / 100; }
  async getStats(userId: string) { return this.statsOf(userId); }

  async discover(opts: { query?: string; category?: string | null } = {}) {
    const q = (opts.query ?? '').trim().toLowerCase();
    return this.skills
      .filter((s) => s.active && s.ownerId !== 'me' && !this.blocked.has(s.ownerId))
      .filter((s) => !opts.category || s.category === opts.category)
      .filter((s) => !q || `${s.title} ${s.description} ${this.user(s.ownerId).name} ${s.category}`.toLowerCase().includes(q))
      .map((s) => this.toSkill(s))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.reviewCount - a.reviewCount);
  }

  async getPerson(userId: string): Promise<Person> {
    const u = this.user(userId);
    return {
      id: u.id, name: u.name, headline: u.headline, bio: u.bio, stats: this.statsOf(u.id),
      skills: this.skills.filter((s) => s.ownerId === u.id && s.active).map((s) => this.toSkill(s)),
      reviews: this.reviews.filter((r) => r.revieweeId === u.id).sort((a, b) => b.createdAt - a.createdAt)
        .map((r): Review => ({ id: r.id, rating: r.rating, comment: r.comment, reviewerName: this.user(r.reviewerId).name, createdAt: iso(r.createdAt) })),
    };
  }

  async createSkill(input: NewSkill) {
    this.skills.push({ id: this.id('s'), ownerId: 'me', title: input.title.trim(), category: input.category, description: input.description.trim(), rate: input.creditsPerHour, active: true });
    this.emit();
  }
  async removeSkill(skillId: string) {
    const s = this.skill(skillId);
    if (s && s.ownerId === 'me') s.active = false;
    this.emit();
  }

  async bookSession(skillId: string, startsAt: Date, hours: number): Promise<Session> {
    if (!(hours > 0 && hours <= 8 && hours * 2 === Math.floor(hours * 2))) fail('invalid_hours');
    const s = this.skills.find((x) => x.id === skillId && x.active) ?? fail('skill_not_found');
    if (this.blocked.has(s.ownerId)) fail('skill_not_found'); // blocking reveals nothing
    if (s.ownerId === 'me') fail('cannot_book_own_skill');
    const start = startsAt.getTime();
    if (start <= Date.now()) fail('start_in_past');
    const end = start + hours * HOUR;
    const av = this.availability.get(s.ownerId);
    if (av && !slotAllowed(av, start, hours)) fail('outside_availability');
    if (this.bookings.some((b) => b.providerId === s.ownerId && (b.status === 'requested' || b.status === 'accepted') && start < b.endsAt && b.startsAt < end)) fail('time_slot_taken');
    const cost = Math.round(hours * s.rate * 100) / 100;
    if (this.balance() - cost < 0) fail('insufficient_credits');
    const b = this.push_booking({ skillId, providerId: s.ownerId, requesterId: 'me', startsAt: start, hours, status: 'requested' });
    this.ledger_add(b.id, 'hold', -cost);
    // The demo provider answers after a few seconds so the flow can be seen end to end.
    this.later(3000, () => {
      if (b.status !== 'requested') return;
      b.status = 'accepted';
      this.notify('booking_accepted', 'Booking accepted', `${this.user(b.providerId).name} accepted your session.`, b.id, { name: this.user(b.providerId).name });
    });
    this.emit();
    return this.toSession(b);
  }

  async mySessions() {
    return this.bookings.filter((b) => b.providerId === 'me' || b.requesterId === 'me').sort((a, b) => b.startsAt - a.startsAt).map((b) => this.toSession(b));
  }

  async respond(sessionId: string, accept: boolean) {
    const b = this.find(sessionId);
    if (b.providerId !== 'me') fail('forbidden');
    if (b.status !== 'requested') fail('invalid_status');
    b.status = accept ? 'accepted' : 'cancelled';
    this.emit();
  }
  async cancel(sessionId: string) {
    const b = this.find(sessionId);
    this.mine(b);
    if (b.status !== 'requested' && b.status !== 'accepted') fail('invalid_status');
    b.status = 'cancelled';
    if (b.requesterId === 'me') this.ledger_add(b.id, 'refund', b.credits);
    this.emit();
  }
  async confirm(sessionId: string) {
    const b = this.find(sessionId);
    this.mine(b);
    if (b.status !== 'accepted') fail('invalid_status');
    if (Date.now() < b.startsAt) fail('session_not_started');
    if (b.requesterId === 'me') b.reqConfirmed = true; else b.provConfirmed = true;
    const finish = () => {
      if (b.status !== 'accepted') return;
      if (b.reqConfirmed && b.provConfirmed) {
        b.status = 'completed';
        if (b.providerId === 'me') {
          this.ledger_add(b.id, 'earn', b.credits);
          this.notify('credits_earned', `You earned ${b.credits}h`, `Session with ${this.user(b.requesterId).name} is complete.`, b.id, { name: this.user(b.requesterId).name, credits: b.credits });
        } else {
          this.notify('session_completed', 'Session complete', `How was it with ${this.user(b.providerId).name}? Leave a review.`, b.id, { name: this.user(b.providerId).name });
        }
      }
    };
    finish();
    if (b.status === 'accepted') {
      // The other person confirms a moment later.
      this.later(2000, () => { b.reqConfirmed = b.provConfirmed = true; finish(); });
    }
    this.emit();
  }
  async dispute(sessionId: string) {
    const b = this.find(sessionId);
    this.mine(b);
    if (b.status !== 'accepted') fail('invalid_status');
    b.status = 'disputed';
    this.emit();
  }

  async submitReview(sessionId: string, rating: number, comment: string) {
    const b = this.find(sessionId);
    this.mine(b);
    if (b.status !== 'completed') fail('invalid_status');
    if (!(rating >= 1 && rating <= 5)) fail('invalid_rating');
    if (this.reviews.some((r) => r.bookingId === b.id && r.reviewerId === 'me')) fail('already_reviewed');
    this.reviews.push({ id: this.id('r'), bookingId: b.id, reviewerId: 'me', revieweeId: b.requesterId === 'me' ? b.providerId : b.requesterId, rating, comment: comment.trim(), createdAt: Date.now() });
    this.emit();
  }

  async ledger(): Promise<LedgerItem[]> {
    return [...this.ledgerRows].reverse().map((r) => ({
      id: String(r.id), kind: r.kind, amount: r.amount, createdAt: iso(r.at),
      title: r.kind === 'welcome_grant' ? '' : this.skill(this.bookings.find((b) => b.id === r.bookingId)?.skillId ?? '')?.title ?? 'Session',
    }));
  }

  async messages(sessionId: string): Promise<Message[]> {
    this.mine(this.find(sessionId));
    return this.msgs.filter((m) => m.bookingId === sessionId).map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, createdAt: iso(m.at) }));
  }
  async sendMessage(sessionId: string, body: string) {
    const b = this.find(sessionId);
    this.mine(b);
    const text = body.trim();
    if (!text) return;
    this.msgs.push({ id: this.id('m'), bookingId: sessionId, senderId: 'me', body: text, at: Date.now() });
    const other = b.requesterId === 'me' ? b.providerId : b.requesterId;
    this.later(2500, () => {
      this.msgs.push({ id: this.id('m'), bookingId: sessionId, senderId: other, body: t('demo.reply'), at: Date.now() });
      this.notify('message', this.user(other).name, t('demo.reply'), sessionId, { name: this.user(other).name, snippet: t('demo.reply') });
    });
    this.emit();
  }

  async notices(): Promise<Notice[]> {
    return [...this.notes].sort((a, b) => b.at - a.at).map((n) => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, bookingId: n.bookingId, params: n.params, read: n.read, createdAt: iso(n.at) }));
  }
  async updateProfile(input: ProfileInput) {
    const u = this.user('me');
    u.name = input.name.trim(); u.headline = input.headline.trim(); u.bio = input.bio.trim();
    this.emit();
  }
  async getAvailability(userId: string): Promise<Availability> {
    return this.availability.get(userId) ?? { windows: [], utcOffsetMin: -new Date().getTimezoneOffset() };
  }
  async setAvailability(windows: AvailabilityWindow[]) {
    this.availability.set('me', { windows, utcOffsetMin: -new Date().getTimezoneOffset() });
    this.emit();
  }
  async blockUser(userId: string) { if (userId === 'me') fail('invalid_target'); this.blocked.add(userId); this.emit(); }
  async unblockUser(userId: string) { this.blocked.delete(userId); this.emit(); }
  async blockedUsers(): Promise<BlockedUser[]> { return [...this.blocked].map((id) => ({ id, name: this.user(id).name })); }
  async reportUser(userId: string, reason: ReportReason, details: string) {
    if (userId === 'me') fail('invalid_target');
    this.reports.push({ id: this.id('rp'), reporterId: 'me', targetId: userId, reason, details: details.trim(), at: Date.now(), open: true });
    this.emit();
  }
  async isAdmin() { return true; }
  async adminDisputes(): Promise<DisputeItem[]> {
    return this.bookings.filter((b) => b.status === 'disputed').map((b) => ({
      id: b.id, skillTitle: this.skill(b.skillId)?.title ?? '', requesterName: this.user(b.requesterId).name, providerName: this.user(b.providerId).name,
      hours: b.hours, credits: b.credits, startsAt: iso(b.startsAt),
    }));
  }
  async adminReports(): Promise<ReportItem[]> {
    return this.reports.filter((r) => r.open).map((r) => ({ id: r.id, reporterName: this.user(r.reporterId).name, targetId: r.targetId, targetName: this.user(r.targetId).name, reason: r.reason, details: r.details, createdAt: iso(r.at) }));
  }
  async resolveDispute(sessionId: string, outcome: 'refund' | 'pay') {
    const b = this.find(sessionId);
    if (b.status !== 'disputed') fail('invalid_status');
    if (outcome === 'refund') {
      b.status = 'cancelled';
      if (b.requesterId === 'me') this.ledger_add(b.id, 'refund', b.credits);
    } else {
      b.status = 'completed'; b.reqConfirmed = b.provConfirmed = true;
      if (b.providerId === 'me') this.ledger_add(b.id, 'earn', b.credits);
    }
    this.emit();
  }
  async resolveReport(reportId: string) {
    const r = this.reports.find((x) => x.id === reportId);
    if (r) r.open = false;
    this.emit();
  }

  async markNoticesRead() { this.notes.forEach((n) => (n.read = true)); this.emit(); }
}
