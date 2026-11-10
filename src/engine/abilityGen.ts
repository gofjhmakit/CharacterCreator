// Ability score generation rules: point buy, standard array.
import { ABILITIES, type Ability } from '@/types/core';

export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
export const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export function pointBuyCost(score: number): number | null {
  return score in POINT_BUY_COST ? POINT_BUY_COST[score] : null;
}

export function pointBuySpent(scores: Record<Ability, number>): number {
  return ABILITIES.reduce((sum, a) => sum + (pointBuyCost(scores[a]) ?? Infinity), 0);
}

export interface PointBuyValidation { valid: boolean; spent: number; remaining: number; errors: string[] }

export function validatePointBuy(scores: Record<Ability, number>, budget = POINT_BUY_BUDGET): PointBuyValidation {
  const errors: string[] = [];
  for (const a of ABILITIES) {
    const s = scores[a];
    if (!Number.isInteger(s) || s < POINT_BUY_MIN || s > POINT_BUY_MAX) errors.push(`${a.toUpperCase()} must be between ${POINT_BUY_MIN} and ${POINT_BUY_MAX}.`);
  }
  const spent = errors.length ? NaN : pointBuySpent(scores);
  if (!errors.length && spent > budget) errors.push(`Spent ${spent} points; budget is ${budget}.`);
  return { valid: errors.length === 0, spent, remaining: budget - spent, errors };
}

/** Can score be raised by one without exceeding budget? */
export function canIncreasePointBuy(scores: Record<Ability, number>, a: Ability, budget = POINT_BUY_BUDGET): boolean {
  const s = scores[a];
  if (s >= POINT_BUY_MAX) return false;
  const next = { ...scores, [a]: s + 1 };
  return pointBuySpent(next) <= budget;
}

export function canDecreasePointBuy(scores: Record<Ability, number>, a: Ability): boolean {
  return scores[a] > POINT_BUY_MIN;
}

/**
 * Standard array assignment: ability → index into STANDARD_ARRAY. Each index used at most once.
 * Assigning an index already used by another ability swaps them (easy reassignment).
 */
export function assignStandardArray(
  current: Partial<Record<Ability, number>>,
  ability: Ability,
  index: number | undefined,
): Partial<Record<Ability, number>> {
  const next = { ...current };
  if (index === undefined) { delete next[ability]; return next; }
  const holder = ABILITIES.find((a) => a !== ability && next[a] === index);
  const prev = next[ability];
  next[ability] = index;
  if (holder) {
    if (prev === undefined) delete next[holder];
    else next[holder] = prev;
  }
  return next;
}

export function standardArrayScores(assign: Partial<Record<Ability, number>>): Partial<Record<Ability, number>> {
  const out: Partial<Record<Ability, number>> = {};
  for (const a of ABILITIES) if (assign[a] !== undefined) out[a] = STANDARD_ARRAY[assign[a]!];
  return out;
}

export function validateStandardArray(assign: Partial<Record<Ability, number>>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const used = new Set<number>();
  for (const a of ABILITIES) {
    const i = assign[a];
    if (i === undefined) { errors.push(`${a.toUpperCase()} is not assigned.`); continue; }
    if (i < 0 || i >= STANDARD_ARRAY.length) errors.push(`Invalid value for ${a.toUpperCase()}.`);
    if (used.has(i)) errors.push(`Value ${STANDARD_ARRAY[i]} assigned twice.`);
    used.add(i);
  }
  return { valid: errors.length === 0, errors };
}
