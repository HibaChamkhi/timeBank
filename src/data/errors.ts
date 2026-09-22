import { t } from '../i18n/core';
import type { Key } from '../i18n/core';

const CODES = [
  'insufficient_credits', 'time_slot_taken', 'start_in_past', 'invalid_hours', 'cannot_book_own_skill', 'skill_not_found',
  'session_not_started', 'invalid_status', 'invalid_rating', 'already_reviewed', 'forbidden', 'booking_not_found', 'not_authenticated',
  'outside_availability', 'invalid_availability', 'invalid_reason', 'invalid_target',
] as const;
type Code = (typeof CODES)[number];

export class AppError extends Error {}

/** Database error codes become messages, in the active language, that say what happened and what to do next. */
export function friendlyError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const raw = String((error as { message?: string } | null)?.message ?? '');
  const code = CODES.find((c) => raw.includes(c));
  return new AppError(code ? t(`error.${code}` as Key) : t('error.generic'));
}

export const fail = (code: Code): never => {
  throw new AppError(t(`error.${code}` as Key));
};
