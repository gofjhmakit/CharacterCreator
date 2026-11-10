// Small builders that keep content definitions compact and consistent.
import texts from '../srd/texts.json';
import type { ChoiceDef, Effect, FeatureDef, Modifier, ResourceDef, SourceInfo, Grants } from '@/types/content';
import type { Recharge } from '@/types/core';

const TEXTS = texts as Record<string, string>;

export const SRD: SourceInfo = { book: 'SRD 5.1', kind: 'srd' };
export const PHB: SourceInfo = { book: 'PHB', kind: 'summary' };
export const XGE: SourceInfo = { book: 'XGtE', kind: 'summary' };
export const TCE: SourceInfo = { book: 'TCoE', kind: 'summary' };
export const SCAG: SourceInfo = { book: 'SCAG', kind: 'summary' };
export const VGM: SourceInfo = { book: 'VGtM', kind: 'summary' };
export const MPMM: SourceInfo = { book: 'MotM', kind: 'summary' };
export const EGW: SourceInfo = { book: 'EGtW', kind: 'summary' };
export const ERLW: SourceInfo = { book: 'ERLW', kind: 'summary' };
export const FTD: SourceInfo = { book: "FTD", kind: 'summary' };
export const EEPC: SourceInfo = { book: 'EEPC', kind: 'summary' };
export const MOOT: SourceInfo = { book: 'MOoT', kind: 'summary' };
export const GGR: SourceInfo = { book: 'GGtR', kind: 'summary' };

/** SRD text lookup with graceful fallback. */
export function T(key: string, fallback = ''): string {
  return TEXTS[key] ?? fallback;
}

export interface FOpts {
  activation?: FeatureDef['activation'];
  resource?: ResourceDef;
  usesResource?: string;
  grants?: Grants;
  effects?: Effect[];
  choices?: ChoiceDef[];
  replaces?: string;
  manual?: boolean;
  hidden?: boolean;
  tags?: string[];
  source?: SourceInfo;
}

/** Feature builder: f(level, id, name, description, opts) */
export function f(level: number, id: string, name: string, description: string, o: FOpts = {}): FeatureDef {
  return { id, name, description, level, ...o };
}

export function res(id: string, name: string, max: number | string, recharge: Recharge, extra: Partial<ResourceDef> = {}): ResourceDef {
  return { id, name, max, recharge, ...extra };
}

export const mod = (target: Modifier['target'], value?: number | string, extra: Partial<Modifier> = {}): Modifier => ({ target, ...(value !== undefined ? (typeof value === 'string' && !/^\d+d\d+/.test(value) && value !== 'walk' ? { formula: value } : { value }) : {}), ...extra });
export const adv = (target: Modifier['target'], condition?: string, extra: Partial<Modifier> = {}): Modifier => ({ target, op: 'advantage', ...(condition ? { condition } : {}), ...extra });
export const grant = (target: Modifier['target'], extra: Partial<Modifier> = {}): Modifier => ({ target, op: 'grant', ...extra });
export const flag = (name: string): Modifier => ({ target: `flag:${name}`, op: 'grant' });

export function eff(id: string, modifiers: Modifier[], extra: Partial<Effect> = {}): Effect {
  return { id, modifiers, ...extra };
}
export function toggle(id: string, name: string, modifiers: Modifier[], extra: Partial<Effect> = {}): Effect {
  return { id, name, activation: 'toggle', modifiers, ...extra };
}

export const choice = (id: string, label: string, kind: ChoiceDef['kind'], count: number | string, extra: Partial<ChoiceDef> = {}): ChoiceDef => ({ id, label, kind, count, ...extra });

/** Table helper: value by level (index = level-1). */
export const byLevel = (pairs: [number, number][]): string => `steps(cl, ${pairs.map(([l, v]) => `${l}, ${v}`).join(', ')})`;

export const ALL_SKILLS = [
  'acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation',
  'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight-of-hand', 'stealth', 'survival',
] as const;
