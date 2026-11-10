// Display-only unit conversion. Rules values stay imperial internally (5 ft squares, pounds).
// Metric uses the common table conventions: 5 ft = 1.5 m, 1 lb ≈ 0.5 kg.
import { useApp } from '@/state/store';

export type Units = 'imperial' | 'metric';

const m = (ft: number) => { const v = Math.round((ft / 5) * 1.5 * 10) / 10; return Number.isInteger(v) ? String(v) : v.toFixed(1); };
const kg = (lb: number) => { const v = Math.round(lb * 0.5 * 100) / 100; return String(v); };

export function dist(ft: number, u: Units): string { return u === 'metric' ? `${m(ft)} m` : `${ft} ft`; }
export function wt(lb: number, u: Units): string { return u === 'metric' ? `${kg(lb)} kg` : `${+lb.toFixed(2)} lb`; }
/** Convert "30 ft", "80/320 ft", "10-foot", "3 lb" inside free text. */
export function convertText(s: string, u: Units): string {
  if (u !== 'metric' || !s) return s;
  return s
    .replace(/(\d+)\/(\d+) ?ft\.?/g, (_, a, b) => `${m(Number(a))}/${m(Number(b))} m`)
    .replace(/(\d+(?:\.\d+)?) ?(?:ft\.?|feet)(?![a-z])/g, (_, a) => `${m(Number(a))} m`)
    .replace(/(\d+)-foot/g, (_, a) => `${m(Number(a))}-metre`)
    .replace(/(\d+(?:\.\d+)?) ?lb\.?(?![a-z])/g, (_, a) => `${kg(Number(a))} kg`);
}

export function useUnits() {
  const u = useApp((s) => s.prefs.units) as Units;
  return { u, dist: (ft: number) => dist(ft, u), wt: (lb: number) => wt(lb, u), text: (s: string) => convertText(s, u), short: u === 'metric' ? 'm' : 'ft' };
}
