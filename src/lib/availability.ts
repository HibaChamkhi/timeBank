import type { Availability, AvailabilityWindow } from '../data/types';

/** Simple presets keep the editor touch-friendly; they are stored as ordinary weekly windows. */
export const PRESETS = [
  { key: 'morning', startMin: 8 * 60, endMin: 12 * 60 },
  { key: 'afternoon', startMin: 12 * 60, endMin: 17 * 60 },
  { key: 'evening', startMin: 17 * 60, endMin: 21 * 60 },
] as const;
export type PresetKey = (typeof PRESETS)[number]['key'];

export const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/**
 * Whether a session starting at `startMs` for `hours` fits entirely inside one of the provider's windows.
 * Mirrors the database rule: convert to the provider's local wall time with their UTC offset, same day only.
 */
export function slotAllowed(av: Availability, startMs: number, hours: number): boolean {
  if (!av.windows.length) return true;
  const local = new Date(startMs + av.utcOffsetMin * 60_000);
  const weekday = local.getUTCDay();
  const start = local.getUTCHours() * 60 + local.getUTCMinutes();
  const end = start + Math.round(hours * 60);
  return av.windows.some((w) => w.weekday === weekday && w.startMin <= start && w.endMin >= end);
}

/** weekday → selected presets, for windows that fully cover a preset. */
export function windowsToSelection(windows: AvailabilityWindow[]): Record<number, PresetKey[]> {
  const out: Record<number, PresetKey[]> = {};
  for (let d = 0; d < 7; d++) {
    out[d] = PRESETS.filter((p) => windows.some((w) => w.weekday === d && w.startMin <= p.startMin && w.endMin >= p.endMin)).map((p) => p.key);
  }
  return out;
}

/** Selected presets → windows, merging neighbours (morning + afternoon becomes 08:00–17:00). */
export function selectionToWindows(sel: Record<number, PresetKey[]>): AvailabilityWindow[] {
  const out: AvailabilityWindow[] = [];
  for (let d = 0; d < 7; d++) {
    const ranges = PRESETS.filter((p) => (sel[d] ?? []).includes(p.key)).map((p) => ({ startMin: p.startMin, endMin: p.endMin }));
    for (const r of ranges) {
      const last = out[out.length - 1];
      if (last && last.weekday === d && last.endMin === r.startMin) last.endMin = r.endMin;
      else out.push({ weekday: d, ...r });
    }
  }
  return out;
}
