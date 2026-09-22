import type { SupabaseClient } from '@supabase/supabase-js';
import { friendlyError } from './errors';
import type { Api, Availability, AvailabilityWindow, BlockedUser, DisputeItem, LedgerItem, Message, NewSkill, Notice, Person, ProfileInput, ReportItem, ReportReason, Review, Session, Skill, Stats } from './types';

const num = (v: unknown) => Number(v ?? 0);

function statsFrom(row: any): Stats {
  return {
    rating: row?.rating == null ? null : num(row.rating),
    reviewCount: num(row?.review_count),
    sessionsCompleted: num(row?.sessions_completed),
    hoursGiven: num(row?.hours_given),
    peopleHelped: num(row?.people_helped),
    skillsCount: num(row?.skills_count),
  };
}

function throwIf(error: unknown) {
  if (error) throw friendlyError(error);
}

/** Real backend. All rules (credits, conflicts, privacy) are enforced by the database. */
export class SupabaseApi implements Api {
  constructor(private db: SupabaseClient, readonly userId: string, readonly userName: string) {}

  async getBalance() {
    const { data, error } = await this.db.from('wallets').select('balance').eq('user_id', this.userId).single();
    throwIf(error);
    return num(data?.balance);
  }

  async getStats(userId: string) {
    const { data, error } = await this.db.rpc('profile_stats', { p_user: userId });
    throwIf(error);
    return statsFrom(Array.isArray(data) ? data[0] : data);
  }

  async discover(opts: { query?: string; category?: string | null } = {}): Promise<Skill[]> {
    const { data, error } = await this.db.rpc('discover_skills', { p_query: opts.query?.trim() || null, p_category: opts.category ?? null });
    throwIf(error);
    return (data ?? []).map((r: any) => ({
      id: r.skill_id, title: r.title, category: r.category, description: r.description, creditsPerHour: num(r.credits_per_hour),
      ownerId: r.owner_id, ownerName: r.owner_name, ownerHeadline: r.owner_headline,
      rating: r.rating == null ? null : num(r.rating), reviewCount: num(r.review_count), sessionsCompleted: num(r.sessions_completed),
    }));
  }

  async getPerson(userId: string): Promise<Person> {
    const [profile, skills, reviews, stats] = await Promise.all([
      this.db.from('profiles').select('id, full_name, headline, bio').eq('id', userId).single(),
      this.db.from('skills').select('id, title, category, description, credits_per_hour').eq('owner_id', userId).eq('active', true).order('created_at'),
      this.db.from('reviews').select('id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name)').eq('reviewee_id', userId).order('created_at', { ascending: false }).limit(20),
      this.getStats(userId),
    ]);
    throwIf(profile.error); throwIf(skills.error); throwIf(reviews.error);
    const p = profile.data!;
    return {
      id: p.id, name: p.full_name, headline: p.headline, bio: p.bio, stats,
      skills: (skills.data ?? []).map((s: any) => ({
        id: s.id, title: s.title, category: s.category, description: s.description, creditsPerHour: num(s.credits_per_hour),
        ownerId: p.id, ownerName: p.full_name, ownerHeadline: p.headline,
        rating: stats.rating, reviewCount: stats.reviewCount, sessionsCompleted: stats.sessionsCompleted,
      })),
      reviews: (reviews.data ?? []).map((r: any): Review => ({
        id: r.id, rating: r.rating, comment: r.comment, createdAt: r.created_at, reviewerName: r.reviewer?.full_name || '—',
      })),
    };
  }

  async createSkill(input: NewSkill) {
    const { error } = await this.db.from('skills').insert({
      owner_id: this.userId, title: input.title.trim(), category: input.category, description: input.description.trim(), credits_per_hour: input.creditsPerHour,
    });
    throwIf(error);
  }

  async removeSkill(skillId: string) {
    // Soft-remove so past sessions keep their skill title.
    const { error } = await this.db.from('skills').update({ active: false }).eq('id', skillId).eq('owner_id', this.userId);
    throwIf(error);
  }

  private sessionFrom(r: any, reviewed: Set<string>): Session {
    const isRequester = r.requester_id === this.userId;
    return {
      id: r.id, skillId: r.skill_id, skillTitle: r.skill?.title ?? '', role: isRequester ? 'requester' : 'provider',
      otherId: isRequester ? r.provider_id : r.requester_id,
      otherName: (isRequester ? r.provider?.full_name : r.requester?.full_name) || '—',
      startsAt: r.starts_at, endsAt: r.ends_at, hours: num(r.hours), credits: num(r.credits), status: r.status,
      iConfirmed: !!(isRequester ? r.requester_confirmed_at : r.provider_confirmed_at),
      otherConfirmed: !!(isRequester ? r.provider_confirmed_at : r.requester_confirmed_at),
      hasReviewed: reviewed.has(r.id),
    };
  }

  private static SESSION_SELECT =
    '*, skill:skills(title), requester:profiles!bookings_requester_id_fkey(full_name), provider:profiles!bookings_provider_id_fkey(full_name)';

  async mySessions(): Promise<Session[]> {
    const [b, r] = await Promise.all([
      this.db.from('bookings').select(SupabaseApi.SESSION_SELECT).order('starts_at', { ascending: false }),
      this.db.from('reviews').select('booking_id').eq('reviewer_id', this.userId),
    ]);
    throwIf(b.error); throwIf(r.error);
    const reviewed = new Set((r.data ?? []).map((x: any) => x.booking_id as string));
    return (b.data ?? []).map((x: any) => this.sessionFrom(x, reviewed));
  }

  private async one(id: string): Promise<Session> {
    const { data, error } = await this.db.from('bookings').select(SupabaseApi.SESSION_SELECT).eq('id', id).single();
    throwIf(error);
    return this.sessionFrom(data, new Set());
  }

  async bookSession(skillId: string, startsAt: Date, hours: number) {
    const { data, error } = await this.db.rpc('book_session', { p_skill_id: skillId, p_starts_at: startsAt.toISOString(), p_hours: hours });
    throwIf(error);
    return this.one((data as any).id);
  }

  private async call(fn: string, args: Record<string, unknown>) {
    const { error } = await this.db.rpc(fn, args);
    throwIf(error);
  }
  respond = (id: string, accept: boolean) => this.call('respond_booking', { p_booking_id: id, p_accept: accept });
  cancel = (id: string) => this.call('cancel_booking', { p_booking_id: id });
  confirm = (id: string) => this.call('confirm_session', { p_booking_id: id });
  dispute = (id: string) => this.call('dispute_booking', { p_booking_id: id });
  submitReview = (id: string, rating: number, comment: string) => this.call('submit_review', { p_booking_id: id, p_rating: rating, p_comment: comment });

  async ledger(): Promise<LedgerItem[]> {
    const { data, error } = await this.db
      .from('ledger_entries')
      .select('id, kind, amount, created_at, booking:bookings(skill:skills(title))')
      .order('id', { ascending: false })
      .limit(50);
    throwIf(error);
    return (data ?? []).map((r: any) => ({
      id: String(r.id), kind: r.kind, amount: num(r.amount), createdAt: r.created_at,
      title: r.kind === 'welcome_grant' ? '' : r.booking?.skill?.title ?? '',
    }));
  }

  async messages(sessionId: string): Promise<Message[]> {
    const { data, error } = await this.db.from('messages').select('id, sender_id, body, created_at').eq('booking_id', sessionId).order('id');
    throwIf(error);
    return (data ?? []).map((m: any) => ({ id: String(m.id), senderId: m.sender_id, body: m.body, createdAt: m.created_at }));
  }

  async sendMessage(sessionId: string, body: string) {
    const { error } = await this.db.from('messages').insert({ booking_id: sessionId, sender_id: this.userId, body: body.trim() });
    throwIf(error);
  }

  async notices(): Promise<Notice[]> {
    const { data, error } = await this.db.from('notifications').select('*').order('id', { ascending: false }).limit(50);
    throwIf(error);
    return (data ?? []).map((n: any) => ({
      id: String(n.id), kind: n.kind, title: n.title, body: n.body, bookingId: n.booking_id, params: n.params ?? {}, read: !!n.read_at, createdAt: n.created_at,
    }));
  }

  async markNoticesRead() {
    await this.call('mark_notifications_read', {});
  }

  async updateProfile(input: ProfileInput) {
    const { error } = await this.db.from('profiles').update({ full_name: input.name.trim(), headline: input.headline.trim(), bio: input.bio.trim() }).eq('id', this.userId);
    throwIf(error);
  }

  async getAvailability(userId: string): Promise<Availability> {
    const [w, p] = await Promise.all([
      this.db.from('availability').select('weekday, start_min, end_min').eq('user_id', userId).order('weekday').order('start_min'),
      this.db.from('profiles').select('utc_offset_min').eq('id', userId).single(),
    ]);
    throwIf(w.error); throwIf(p.error);
    return {
      windows: (w.data ?? []).map((r: any) => ({ weekday: r.weekday, startMin: r.start_min, endMin: r.end_min })),
      utcOffsetMin: num(p.data?.utc_offset_min),
    };
  }

  setAvailability = (windows: AvailabilityWindow[]) =>
    this.call('set_availability', {
      p_windows: windows.map((w) => ({ weekday: w.weekday, start_min: w.startMin, end_min: w.endMin })),
      p_utc_offset_min: -new Date().getTimezoneOffset(),
    });

  blockUser = (userId: string) => this.call('block_user', { p_user: userId });
  unblockUser = (userId: string) => this.call('unblock_user', { p_user: userId });

  async blockedUsers(): Promise<BlockedUser[]> {
    const { data, error } = await this.db.from('blocks').select('blocked_id, blocked:profiles!blocks_blocked_id_fkey(full_name)');
    throwIf(error);
    return (data ?? []).map((r: any) => ({ id: r.blocked_id, name: r.blocked?.full_name || '—' }));
  }

  reportUser = (userId: string, reason: ReportReason, details: string, sessionId?: string) =>
    this.call('report_user', { p_target: userId, p_reason: reason, p_details: details, p_booking: sessionId ?? null });

  async isAdmin() {
    const { data, error } = await this.db.rpc('is_admin');
    throwIf(error);
    return data === true;
  }

  async adminDisputes(): Promise<DisputeItem[]> {
    const { data, error } = await this.db.rpc('admin_disputes');
    throwIf(error);
    return (data ?? []).map((r: any) => ({ id: r.booking_id, skillTitle: r.skill_title, requesterName: r.requester_name, providerName: r.provider_name, hours: num(r.hours), credits: num(r.credits), startsAt: r.starts_at }));
  }

  async adminReports(): Promise<ReportItem[]> {
    const { data, error } = await this.db.rpc('admin_reports');
    throwIf(error);
    return (data ?? []).map((r: any) => ({ id: r.report_id, reporterName: r.reporter_name, targetId: r.target_id, targetName: r.target_name, reason: r.reason, details: r.details, createdAt: r.created_at }));
  }

  resolveDispute = (sessionId: string, outcome: 'refund' | 'pay') => this.call('resolve_dispute', { p_booking_id: sessionId, p_outcome: outcome });
  resolveReport = (reportId: string) => this.call('resolve_report', { p_report_id: reportId });
}
