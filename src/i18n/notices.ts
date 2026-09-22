import { hours } from '../lib/format';
import type { Notice } from '../data/types';
import { t } from './core';

const fallback = (n: Notice) => ({ title: n.title, body: n.body });

/** Renders a server notification in the active language. Old rows without params fall back to the stored English text. */
export function noticeText(n: Notice): { title: string; body: string } {
  const p = n.params ?? {};
  const name = String(p.name ?? '');
  if (n.kind === 'dispute_resolved' && p.outcome) {
    const key = `notice.dispute_resolved.body${p.outcome === 'refund' ? 'Refund' : 'Pay'}${p.role === 'provider' ? 'Provider' : 'Requester'}` as const;
    return { title: t('notice.dispute_resolved.title'), body: t(key, { credits: hours(Number(p.credits)) }) };
  }
  if (!p.name) return fallback(n);
  switch (n.kind) {
    case 'booking_requested': return { title: t('notice.booking_requested.title'), body: t('notice.booking_requested.body', { name, hours: hours(Number(p.hours)) }) };
    case 'booking_accepted': return { title: t('notice.booking_accepted.title'), body: t('notice.booking_accepted.body', { name }) };
    case 'booking_cancelled': return { title: t('notice.booking_cancelled.title'), body: t(p.refund ? 'notice.booking_cancelled.bodyRefund' : 'notice.booking_cancelled.body', { name }) };
    case 'credits_earned': return { title: t('notice.credits_earned.title', { credits: hours(Number(p.credits)) }), body: t('notice.credits_earned.body', { name }) };
    case 'session_completed': return { title: t('notice.session_completed.title'), body: t('notice.session_completed.body', { name }) };
    case 'booking_disputed': return { title: t('notice.booking_disputed.title'), body: t('notice.booking_disputed.body', { name }) };
    case 'confirm_needed': return { title: t('notice.confirm_needed.title'), body: t(p.role === 'provider' ? 'notice.confirm_needed.bodyProvider' : 'notice.confirm_needed.bodyRequester', { name }) };
    case 'review_received': return { title: t('notice.review_received.title'), body: t('notice.review_received.body', { name, rating: Number(p.rating) }) };
    case 'message': return { title: name, body: String(p.snippet ?? n.body) };
    default: return fallback(n);
  }
}
