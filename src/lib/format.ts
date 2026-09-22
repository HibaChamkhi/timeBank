import { dayNames, monthNames, t } from '../i18n/core';

const pad = (n: number) => String(n).padStart(2, '0');

export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "Tue 21 Sep · 18:00" in the active language (Western digits in every language). */
export function formatWhen(iso: string | Date): string {
  const d = new Date(iso);
  return `${dayNames()[d.getDay()]} ${d.getDate()} ${monthNames()[d.getMonth()]} · ${formatTime(d)}`;
}

export function formatDay(d: Date, today = new Date()): string {
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
  if (diff === 0) return t('day.today');
  if (diff === 1) return t('day.tomorrow');
  return `${dayNames()[d.getDay()]} ${d.getDate()}`;
}

/** "2h ago", "il y a 3 j", "منذ 5 د" */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return t('time.now');
  if (s < 3600) return t('time.minutes', { n: Math.floor(s / 60) });
  if (s < 86400) return t('time.hours', { n: Math.floor(s / 3600) });
  return t('time.days', { n: Math.floor(s / 86400) });
}

/** "1.5h" / "1,5 h" style: number plus the language's hour unit. */
export const hours = (n: number) => `${Number.isInteger(n) ? n : Number(n.toFixed(2))}${t('unit.h')}`;
