// Spell slot tables (PHB 2014) and multiclass spellcaster level rules.
import type { CasterProgression } from '@/types/content';

/** Multiclass Spellcaster table / full caster table. Index = caster level (1..20), value = slots for levels 1..9. */
export const FULL_CASTER_SLOTS: number[][] = [
  [],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Warlock Pact Magic: [slots, slot level] by warlock level. */
export const PACT_MAGIC: [number, number][] = [
  [0, 0],
  [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
];

/**
 * Caster level contribution for the multiclass spellcaster table (PHB p.164):
 * full = all levels, half (Paladin/Ranger) = floor(level/2), third (EK/AT) = floor(level/3),
 * half-up (Artificer) = ceil(level/2). Pact Magic contributes nothing.
 */
export function casterLevelContribution(progression: CasterProgression, classLevel: number): number {
  switch (progression) {
    case 'full': return classLevel;
    case 'half': return Math.floor(classLevel / 2);
    case 'half-up': return Math.ceil(classLevel / 2);
    case 'third': return Math.floor(classLevel / 3);
    default: return 0;
  }
}

/**
 * Single-class slot level for half/third casters (rounding differs from multiclass rules!).
 * A single-class Paladin 2 has caster level 1 (slots as full 1). Paladin 3 → ceil? PHB Paladin table:
 * L2: 2 1st; L3: 3; L5: 4/2; this equals full-caster table at ceil(level/2) for levels ≥2.
 * Third casters (EK) table: L3: 2 1st; L4: 3; L7: 4/2; equals full table at ceil(level/3) for levels ≥3.
 */
export function singleClassCasterLevel(progression: CasterProgression, classLevel: number): number {
  switch (progression) {
    case 'full': return classLevel;
    case 'half': return classLevel < 2 ? 0 : Math.ceil(classLevel / 2);
    case 'half-up': return Math.ceil(classLevel / 2);
    case 'third': return classLevel < 3 ? 0 : Math.ceil(classLevel / 3);
    default: return 0;
  }
}

export interface CasterEntry { progression: CasterProgression; level: number }

/** Compute standard (non-pact) spell slots for a set of caster classes. */
export function computeSpellSlots(casters: CasterEntry[]): { casterLevel: number; slots: number[] } {
  const relevant = casters.filter((c) => c.progression !== 'none' && c.progression !== 'pact' && c.level > 0);
  if (relevant.length === 0) return { casterLevel: 0, slots: [0, 0, 0, 0, 0, 0, 0, 0, 0] };
  let casterLevel: number;
  if (relevant.length === 1) {
    casterLevel = singleClassCasterLevel(relevant[0].progression, relevant[0].level);
  } else {
    casterLevel = relevant.reduce((s, c) => s + casterLevelContribution(c.progression, c.level), 0);
  }
  casterLevel = Math.min(20, casterLevel);
  const slots = casterLevel > 0 ? [...FULL_CASTER_SLOTS[casterLevel]] : [0, 0, 0, 0, 0, 0, 0, 0, 0];
  return { casterLevel, slots };
}

export function pactMagic(warlockLevel: number): { slots: number; slotLevel: number } {
  const [slots, slotLevel] = PACT_MAGIC[Math.max(0, Math.min(20, warlockLevel))];
  return { slots, slotLevel };
}

/** Highest spell level a class can learn/prepare at a given class level (single-class progression). */
export function maxSpellLevelForClass(progression: CasterProgression, classLevel: number): number {
  if (progression === 'pact') return pactMagic(classLevel).slotLevel;
  const cl = singleClassCasterLevel(progression, classLevel);
  if (cl <= 0) return 0;
  const row = FULL_CASTER_SLOTS[Math.min(20, cl)];
  let max = 0;
  row.forEach((n, i) => { if (n > 0) max = i + 1; });
  return max;
}

/** Sorcerer Flexible Casting: sorcery-point cost to create a slot of a given level. */
export const SORCERY_POINT_SLOT_COST: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };
