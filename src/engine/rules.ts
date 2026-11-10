// Ruleset profiles: the handful of core-rule differences between the 2014 and 2024 editions.
// Content differences (classes, species, feats…) live in the per-ruleset content databases.
import type { RulesetId } from '@/types/core';
import type { FeatCategory } from '@/types/content';

export interface RulesProfile {
  id: RulesetId;
  label: string;
  /** Exhaustion: 2014 = six cumulative effects; 2024 = −2 per level to d20 tests and −5 ft speed per level. */
  exhaustion: '2014' | '2024';
  /** Hit Dice regained on a long rest. */
  longRestHitDice: 'half' | 'all';
  /** Where ability score increases at creation come from. */
  originAsi: 'race' | 'background';
  /** 2024: Common + N languages of choice granted by character origin. */
  originLanguages?: { granted: string[]; choose: number };
  /** Feat categories selectable in place of an Ability Score Improvement. */
  asiFeatCategories?: FeatCategory[];
  /** Weapon Mastery exists. */
  weaponMastery: boolean;
  /** Monk Martial Arts die by monk level (thresholds). */
  martialArts: [number, number][];
  /** Monk weapons: 2014 = simple melee (no two-handed/heavy) + shortsword; 2024 = simple melee + martial melee with Light. */
  monkWeapons: '2014' | '2024';
  /** Max HP minimum per level after CON (both editions effectively 1). */
  terms: { race: string; races: string };
}

export const RULES: Record<RulesetId, RulesProfile> = {
  'dnd5e-2014': {
    id: 'dnd5e-2014', label: 'D&D 5e (2014)', exhaustion: '2014', longRestHitDice: 'half', originAsi: 'race',
    weaponMastery: false, martialArts: [[1, 4], [5, 6], [11, 8], [17, 10]], monkWeapons: '2014', terms: { race: 'Race', races: 'Races' },
  },
  'dnd5e-2024': {
    id: 'dnd5e-2024', label: 'D&D 5e (2024)', exhaustion: '2024', longRestHitDice: 'all', originAsi: 'background',
    originLanguages: { granted: ['Common'], choose: 2 }, asiFeatCategories: ['general'], weaponMastery: true,
    martialArts: [[1, 6], [5, 8], [11, 10], [17, 12]], monkWeapons: '2024', terms: { race: 'Species', races: 'Species' },
  },
};

export const rulesFor = (id: RulesetId | undefined): RulesProfile => RULES[id ?? 'dnd5e-2014'] ?? RULES['dnd5e-2014'];

export const stepValue = (table: [number, number][], level: number): number => table.reduce((v, [l, x]) => (level >= l ? x : v), 0);
