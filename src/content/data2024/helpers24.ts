// Helpers for the 2024 (SRD 5.2) content: text lookup, level tables → formulas, feature lists.
import texts from '../srd2024/texts.json';
import tables from '../srd2024/tables.json';
import features from '../srd2024/features.json';
import type { FeatureDef, SourceInfo } from '@/types/content';

const TEXTS = texts as Record<string, string>;
const TABLES = tables as Record<string, Record<string, (number | string | null)[]>>;
const FEATURES = features as { id: string; name: string; level: number; classId?: string; subclassId?: string }[];

export const SRD52: SourceInfo = { book: 'SRD 5.2', kind: 'srd' };
export const PHB24: SourceInfo = { book: 'PHB 2024', kind: 'summary' };

export function T24(key: string, fallback = ''): string { return TEXTS[key] ?? fallback; }

export function table(classId: string, key: string): (number | string)[] {
  return (TABLES[classId]?.[key] ?? []).map((v) => v ?? 0);
}

/** Convert a 20-level numeric table into a `steps(cl, …)` formula (only change points kept). */
export function tableFormula(classId: string, key: string, override?: number[]): string {
  const arr = (override ?? table(classId, key)).map(Number);
  const pts: string[] = [];
  let prev: number | undefined;
  arr.forEach((v, i) => { if (v !== prev) { pts.push(`${i + 1}, ${v}`); prev = v; } });
  return `steps(cl, ${pts.join(', ')})`;
}

export function tableNums(classId: string, key: string): number[] { return table(classId, key).map(Number); }

/** All SRD 5.2 features of a class (no subclass) or of a subclass, with text, merged with a mechanics overlay. */
export function featuresOf(owner: { classId?: string; subclassId?: string }, overlay: Record<string, Partial<FeatureDef>>, source: SourceInfo = SRD52): FeatureDef[] {
  return FEATURES
    .filter((f) => (owner.subclassId ? f.subclassId === owner.subclassId : f.classId === owner.classId && !f.subclassId))
    .map((f) => ({ id: f.id, name: f.name, level: f.level, description: TEXTS[f.id] ?? '', source, ...(overlay[f.id] ?? {}) }));
}
