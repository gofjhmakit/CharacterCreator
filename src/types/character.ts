// Character data: everything specific to one character. Persisted, versioned, exportable.
// Rule: store *choices and state*, never derived values (those are computed by the engine).

import type { Ability, ConditionId, RulesetId, SkillId, Size } from './core';
import type { Effect, ItemDefinition } from './content';

export const CHARACTER_SCHEMA_VERSION = 1;

export type AbilityMethod = 'point-buy' | 'standard-array' | 'roll-3d6' | 'roll-4d6' | 'manual';

export interface RolledScore {
  id: string;
  dice: number[];      // all dice rolled
  dropped?: number;    // index of dropped die (4d6 drop lowest)
  total: number;
  locked: boolean;
}

export interface AbilityState {
  method: AbilityMethod;
  /** Base scores before racial/feat/item bonuses. */
  base: Record<Ability, number>;
  /** Rolled pool and assignment (ability → rolled score id). */
  rolls?: RolledScore[];
  assignment?: Partial<Record<Ability, string>>;
  /** Standard array assignment (ability → value index). */
  arrayAssignment?: Partial<Record<Ability, number>>;
}

export interface ClassEntry {
  classId: string;
  subclassId?: string;
  level: number;
  /** HP gained at each level of this class after the first character level. null = take average. */
  hpRolls: (number | null)[];
}

/** Instance of an item in a character's inventory. Contains a full *snapshot* of its definition. */
export interface InventoryItem {
  id: string;
  /** Snapshot of the definition at time of adding (copy semantics). Instance edits modify this. */
  item: ItemDefinition;
  /** Provenance: where the snapshot came from. Template edits never propagate automatically. */
  origin: { kind: 'srd' | 'custom' | 'manual'; id?: string; syncedAt?: string };
  quantity: number;
  equipped: boolean;
  attuned: boolean;
  /** Which hand / slot is not modelled; offhand for two-weapon fighting display only. */
  offHand?: boolean;
  charges?: number;
  notes?: string;
  /** Container instance id (bag of holding etc.), optional. */
  containerId?: string;
  /** Weight not counted (e.g. stored at home, bag of holding contents). */
  excludeWeight?: boolean;
  /** Toggle state for item's toggle-activated effects. */
  toggles?: Record<string, boolean>;
}

export type SpellSource = 'class' | 'race' | 'feat' | 'feature' | 'item' | 'custom';

export interface CharacterSpell {
  id: string;
  spellId: string;
  /** Class whose list/ability this spell uses (for class spells) */
  classId?: string;
  source: SpellSource;
  /** Label of the granting feature for non-class spells. */
  sourceLabel?: string;
  prepared: boolean;
  /** Wizard: copied into spellbook. */
  inSpellbook?: boolean;
  favorite?: boolean;
  notes?: string;
  /** For innate spells added manually: uses per day. */
  uses?: { max: number; used: number; recharge: 'long' | 'short' | 'dawn' };
  ability?: Ability;
}

export interface TemporaryEffect {
  id: string;
  name: string;
  effect: Effect;
  duration?: string;
  /** Concentration source */
  concentration?: boolean;
  createdAt: string;
}

export interface NoteEntry {
  id: string;
  title: string;
  body: string;
  date?: string;
  status?: 'active' | 'done' | 'failed' | 'on-hold';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export const NOTE_CATEGORIES = {
  sessions: 'Session Log',
  quests: 'Quests',
  npcs: 'NPCs',
  locations: 'Locations',
  factions: 'Factions & Organizations',
  party: 'Party',
  goals: 'Goals',
  relationships: 'Relationships',
  secrets: 'Secrets',
  treasure: 'Treasure & Discoveries',
} as const;
export type NoteCategory = keyof typeof NOTE_CATEGORIES;

export interface CharacterSettings {
  encumbrance: 'off' | 'standard' | 'variant';
  /** Use average HP on level up by default. */
  hpMethod: 'average' | 'roll' | 'manual';
  /** Manual overrides of derived stats (house rules / DM decisions). */
  overrides: Partial<Record<'ac' | 'maxHp' | 'initiative' | 'speed' | 'passivePerception' | 'spellDc' | 'spellAttack' | 'profBonus', number>>;
  /** Optional rules */
  optional: {
    feats: boolean;
    multiclassing: boolean;
    multiclassPrereqs: boolean;
    flanking?: boolean;
    customOrigin?: boolean;  // TCoE "Customizing your origin": move racial ASIs
  };
  /** Free-form house rules text. */
  houseRules?: string;
  attunementLimit: number;
}

export interface Character {
  schemaVersion: number;
  id: string;
  ruleset: RulesetId;
  createdAt: string;
  updatedAt: string;
  /** True while still in creation wizard. */
  draft?: boolean;
  wizardStep?: number;

  identity: {
    name: string;
    playerName: string;
    alignment: string;
    xp: number;
    /** Milestone leveling: XP not used for level. */
    milestone: boolean;
    age: string;
    height: string;
    weight: string;
    eyes: string;
    skin: string;
    hair: string;
    gender?: string;
    size?: Size;
    appearance: string;
    deity: string;
    faith?: string;
    portrait?: string; // data URL, resized client-side, max ~200 KB
  };

  personality: {
    traits: string;
    ideals: string;
    bonds: string;
    flaws: string;
    backstory: string;
    allies: string;
    organization?: string;
  };

  race: { raceId: string; subraceId?: string };
  background: { backgroundId: string; customFeature?: string };
  classes: ClassEntry[];
  abilities: AbilityState;

  /** All choices keyed by path: e.g. "race:high-elf:cantrip", "class:fighter:1:fighting-style". */
  choices: Record<string, string[]>;

  /** Manually added proficiencies and custom features. */
  custom: {
    skills: Partial<Record<SkillId, 0 | 0.5 | 1 | 2>>;
    saves: Ability[];
    armor: string[];
    weapons: string[];
    tools: string[];
    languages: string[];
    features: { id: string; name: string; description: string; effects: Effect[]; resource?: { name: string; max: number; recharge: 'short' | 'long' | 'dawn' | 'none' } }[];
    /** Extra feats granted outside ASIs (DM boon, background in some games). */
    feats: string[];
    abilityBonuses: Partial<Record<Ability, number>>;
    resistances: string[];
    immunities: string[];
    vulnerabilities: string[];
    conditionImmunities: string[];
    senses: Record<string, number>;
  };

  combat: {
    hpCurrent: number;
    hpTemp: number;
    /** Max HP reduction (e.g. wraith drain). */
    hpMaxReduction: number;
    deathSaves: { successes: number; failures: number };
    /** Hit dice spent per die size: { 8: 2, 10: 1 } */
    hitDiceUsed: Record<string, number>;
    inspiration: boolean;
    conditions: ConditionId[];
    exhaustion: number;
    concentration?: string;
    /** Feature/effect toggles (Rage, Bladesong, Wild Shape...) */
    toggles: Record<string, boolean>;
    /** Dead / stable */
    stable: boolean;
  };

  /** Resource usage: resourceId → used count; and manual max overrides. */
  resources: Record<string, { used: number; maxOverride?: number }>;

  spells: {
    entries: CharacterSpell[];
    /** Expended slots per level (index 1..9) */
    slotsUsed: number[];
    pactSlotsUsed: number;
    /** Manual extra slots (house rules/items) per level */
    bonusSlots?: number[];
  };

  inventory: InventoryItem[];
  currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
  effects: TemporaryEffect[];
  notes: Record<NoteCategory, NoteEntry[]> & { general: string };
  settings: CharacterSettings;

  /** Unknown fields from newer versions/imports are preserved here. */
  extra?: Record<string, unknown>;
}

export interface CharacterSummary {
  id: string;
  name: string;
  level: number;
  classLine: string;
  race: string;
  updatedAt: string;
  portrait?: string;
  draft?: boolean;
  hp?: string;
}
