export interface Stats {
  rating: number | null;
  reviewCount: number;
  sessionsCompleted: number;
  hoursGiven: number;
  peopleHelped: number;
  skillsCount: number;
}

export interface Skill {
  id: string;
  title: string;
  category: string;
  description: string;
  creditsPerHour: number;
  ownerId: string;
  ownerName: string;
  ownerHeadline: string;
  rating: number | null;
  reviewCount: number;
  sessionsCompleted: number;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
}

export interface Person {
  id: string;
  name: string;
  headline: string;
  bio: string;
  stats: Stats;
  skills: Skill[];
  reviews: Review[];
}

export type BookingStatus = 'requested' | 'accepted' | 'completed' | 'cancelled' | 'disputed';

export interface Session {
  id: string;
  skillId: string;
  skillTitle: string;
  role: 'provider' | 'requester';
  otherId: string;
  otherName: string;
  startsAt: string;
  endsAt: string;
  hours: number;
  credits: number;
  status: BookingStatus;
  iConfirmed: boolean;
  otherConfirmed: boolean;
  hasReviewed: boolean;
}

export type LedgerKind = 'welcome_grant' | 'hold' | 'earn' | 'refund';
export interface LedgerItem {
  id: string;
  kind: LedgerKind;
  amount: number;
  createdAt: string;
  title: string;
}

export interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface Notice {
  id: string;
  kind: string;
  title: string;
  body: string;
  bookingId: string | null;
  params: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface NewSkill {
  title: string;
  category: string;
  description: string;
  creditsPerHour: number;
}

export interface AvailabilityWindow { weekday: number; startMin: number; endMin: number }
/** Weekly windows in the provider's local time; no windows means bookable at any time. */
export interface Availability { windows: AvailabilityWindow[]; utcOffsetMin: number }

export type ReportReason = 'spam' | 'harassment' | 'no_show' | 'unsafe' | 'other';
export const REPORT_REASONS: ReportReason[] = ['spam', 'harassment', 'no_show', 'unsafe', 'other'];

export interface BlockedUser { id: string; name: string }
export interface DisputeItem { id: string; skillTitle: string; requesterName: string; providerName: string; hours: number; credits: number; startsAt: string }
export interface ReportItem { id: string; reporterName: string; targetId: string; targetName: string; reason: ReportReason; details: string; createdAt: string }
export interface ProfileInput { name: string; headline: string; bio: string }

export const CATEGORIES = ['Technology', 'Languages', 'Design', 'Career', 'Education', 'Finance', 'Wellness', 'Home', 'Creative', 'Community'] as const;

/** Everything the screens need. Two implementations: Supabase, and an in-memory demo. */
export interface Api {
  readonly userId: string;
  readonly userName: string;
  getBalance(): Promise<number>;
  getStats(userId: string): Promise<Stats>;
  discover(opts?: { query?: string; category?: string | null }): Promise<Skill[]>;
  getPerson(userId: string): Promise<Person>;
  createSkill(input: NewSkill): Promise<void>;
  removeSkill(skillId: string): Promise<void>;
  bookSession(skillId: string, startsAt: Date, hours: number): Promise<Session>;
  mySessions(): Promise<Session[]>;
  respond(sessionId: string, accept: boolean): Promise<void>;
  cancel(sessionId: string): Promise<void>;
  confirm(sessionId: string): Promise<void>;
  dispute(sessionId: string): Promise<void>;
  submitReview(sessionId: string, rating: number, comment: string): Promise<void>;
  ledger(): Promise<LedgerItem[]>;
  messages(sessionId: string): Promise<Message[]>;
  sendMessage(sessionId: string, body: string): Promise<void>;
  notices(): Promise<Notice[]>;
  markNoticesRead(): Promise<void>;
  updateProfile(input: ProfileInput): Promise<void>;
  getAvailability(userId: string): Promise<Availability>;
  setAvailability(windows: AvailabilityWindow[]): Promise<void>;
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
  blockedUsers(): Promise<BlockedUser[]>;
  reportUser(userId: string, reason: ReportReason, details: string, sessionId?: string): Promise<void>;
  isAdmin(): Promise<boolean>;
  adminDisputes(): Promise<DisputeItem[]>;
  adminReports(): Promise<ReportItem[]>;
  resolveDispute(sessionId: string, outcome: 'refund' | 'pay'): Promise<void>;
  resolveReport(reportId: string): Promise<void>;
}
