// Content definitions: races, classes, subclasses, backgrounds, feats, spells, items, features.
// Everything here is *data*. Mechanics are expressed via Effects/Modifiers/Grants/Formulas,
// interpreted by the rules engine. No content definition can contain executable code.

import type {
  Ability, DamageType, MovementMode, Rarity, Recharge, RulesetId, Size, SkillId, ConditionId,
} from './core';

/** Which ruleset a definition belongs to. Custom content may be usable in both ('any'). */
export type RulesetTag = RulesetId | 'any';

/** Where a definition comes from. `license` documents legal basis for bundled data. */
export interface SourceInfo {
  /** Short book/pack key, e.g. "SRD 5.1", "PHB", "TCoE", "Homebrew". */
  book: string;
  /** "srd" = full CC-BY-4.0 text bundled; "summary" = paraphrased mechanics only; "custom" = user content. */
  kind: 'srd' | 'summary' | 'custom';
  page?: number;
}

/**
 * Formula: a number or a safe arithmetic expression string evaluated by engine/formula.ts.
 * Variables: lvl (total level), cl (class level of owning class), prof, str..cha (modifiers),
 * score_str..score_cha (scores). Functions: min, max, floor, ceil, steps(x, l1, v1, l2, v2, ...).
 */
export type Formula = number | string;

// ---------------------------------------------------------------------------
// Modifiers & effects
// ---------------------------------------------------------------------------

export type ModifierTarget =
  | 'ac'                       // flat AC bonus
  | 'ac-formula'               // alternate base AC calculation (see AcFormula)
  | 'attack'                   // attack rolls (scope via `scope`)
  | 'damage'                   // damage rolls (scope via `scope`)
  | 'extra-damage'             // extra damage dice (value = dice string, damageType)
  | `ability:${Ability}`       // ability score bonus
  | `ability-set:${Ability}`   // ability score becomes at least N (Belt of Giant Strength etc.)
  | `ability-max:${Ability}`   // raises the ability maximum (e.g. Barbarian capstone to 24)
  | `save:${Ability}` | 'save:all'
  | `skill:${SkillId}` | 'check:all' | `check:${Ability}`
  | `passive:${SkillId}`
  | 'initiative'
  | `speed:${MovementMode}`    // add (or set with op 'set'/'max') movement
  | 'speed:all'
  | 'hp-max' | 'hp-per-level'
  | 'spell-attack' | 'spell-dc'
  | `resistance:${DamageType}` | 'resistance:all-nonmagical-bps'
  | `immunity:${DamageType}`
  | `vulnerability:${DamageType}`
  | `condition-immunity:${ConditionId}`
  | `sense:${string}`          // darkvision, blindsight, tremorsense, truesight (value = range ft)
  | `prof:skill:${SkillId}` | `expertise:skill:${SkillId}` | `prof:save:${Ability}`
  | 'prof:half-unproficient-checks'    // Jack of All Trades
  | 'prof:half-unproficient-initiative' // Remarkable Athlete (str/dex/con checks)
  | 'crit-range'               // value = lowest natural roll that crits (19, 18)
  | 'damage-reduction'         // flat reduction to incoming damage
  | 'carry-multiplier'         // powerful build etc. (value = multiplier)
  | `resource-max:${string}`   // increase max uses of a resource
  | 'attunement-slots'         // +N attunement slots
  | `flag:${string}`;          // boolean flags interpreted by the engine (see engine/flags.ts)

export type ModifierOp = 'add' | 'set' | 'max' | 'advantage' | 'disadvantage' | 'grant';

export type AttackScope =
  | 'all' | 'melee' | 'ranged' | 'weapon' | 'melee-weapon' | 'ranged-weapon' | 'spell' | 'this-item'
  | 'unarmed' | 'thrown';

export interface AcFormula {
  label: string;
  base: number;
  abilities: Ability[];          // modifiers added (e.g. ['dex','con'])
  allowsArmor: boolean;          // false → only valid while not wearing body armor
  allowsShield: boolean;         // false → invalid while wielding a shield (Monk)
  maxDex?: number;
}

export interface Modifier {
  target: ModifierTarget;
  op?: ModifierOp;               // default 'add'
  value?: number | string;       // number, formula string, or dice string for extra-damage
  formula?: Formula;             // evaluated value (takes precedence over numeric value)
  /** Extra dice added to the roll (Bless "1d4", Bane "-1d4"). Rolled automatically with d20 tests. */
  dice?: string;
  damageType?: DamageType;
  acFormula?: AcFormula;
  scope?: AttackScope;
  /** Free-text condition. Conditional modifiers are displayed but NOT auto-applied. */
  condition?: string;
  /** Requires: wearing armor / no armor / no shield etc. Evaluated by engine. */
  requires?: Requirement[];
}

export type Requirement =
  | 'armored' | 'unarmored' | 'no-shield' | 'shield' | 'no-heavy-armor' | 'not-heavy-armor-equipped'
  | 'wielding-melee' | 'one-handed-melee-only' | 'light-or-no-armor' | 'no-medium-heavy-armor' | 'str-attack';

export type Trigger =
  | 'passive' | 'on-attack' | 'on-hit' | 'on-crit' | 'on-damage-taken' | 'on-use'
  | 'start-of-turn' | 'end-of-turn' | 'on-save' | 'on-check' | 'reaction'
  | 'on-heal'     // when you restore hit points to a creature
  | 'on-revive';  // when you restore a creature from 0 HP or death

export type EffectActivation =
  | 'always'      // always active while the source is active (feature, racial trait)
  | 'equipped'    // item must be equipped
  | 'attuned'     // item must be equipped (if wearable) and attuned
  | 'carried'     // item only needs to be in inventory
  | 'toggle';     // user toggles on/off (Rage, Bladesong, Wild Shape, Mage Armor...)

export type OutcomeKind =
  | 'damage' | 'heal' | 'temp-hp' | 'condition' | 'prone' | 'push' | 'bonus' | 'penalty'
  | 'resource-restore' | 'resource-consume' | 'spell-effect' | 'text';

export interface Outcome {
  kind: OutcomeKind;
  dice?: string;
  damageType?: DamageType;
  condition?: ConditionId;
  amount?: number;
  resourceId?: string;
  text?: string;
  duration?: string;
  /** 'spell-effect': the spell whose effect is applied (e.g. blade-ward, death-ward). */
  spellId?: string;
}

export interface SaveSpec {
  ability: Ability;
  /** Fixed DC or computed from character. */
  dc: { kind: 'fixed'; value: number } | { kind: 'spell'; classId?: string } | { kind: 'formula'; formula: Formula; ability?: Ability };
  onSuccess?: Outcome[];
  onFailure: Outcome[];
}

/**
 * Effect = a bundle of mechanics attached to a source (feature, item, temporary effect).
 * - `modifiers` are continuous and resolved automatically (subject to activation/conditions).
 * - `trigger` + outcomes/save describe event-driven riders; they surface on the relevant UI
 *   (e.g. attack rows show "On hit: DC 15 STR save or prone") and in roll results.
 * - `manual: true` marks anything that cannot be resolved automatically; it is always shown.
 */
export interface Effect {
  id: string;
  name?: string;
  description?: string;
  activation?: EffectActivation;      // default 'always'
  /** For toggle effects: default state. */
  defaultOn?: boolean;
  /** Share toggle state with another effect (e.g. totem add-ons follow the 'rage' toggle). */
  toggleKey?: string;
  modifiers?: Modifier[];
  trigger?: Trigger;
  /** Scope of a triggered effect (which attacks it rides on). */
  scope?: AttackScope;
  /** Who the outcomes apply to: the affected creature (hit / healed / revived) or yourself. */
  target?: 'target' | 'self';
  outcomes?: Outcome[];
  save?: SaveSpec;
  oncePerTurn?: boolean;
  uses?: { max: Formula; recharge: Recharge; resourceId?: string };
  consumes?: { resourceId: string; amount: number };
  duration?: string;
  manual?: boolean;
}

// ---------------------------------------------------------------------------
// Grants (proficiencies, spells, languages...)
// ---------------------------------------------------------------------------

export interface SpellGrant {
  spellId: string;
  /** Minimum level (character level for races, class level for class/subclass). */
  minLevel?: number;
  /** "always-prepared" counts against nothing; "known" adds to known list; "innate" uses own uses. */
  mode: 'always-prepared' | 'known' | 'innate' | 'expanded-list';
  uses?: { max: Formula; recharge: Recharge };
  ability?: Ability;
  castLevel?: number;
  note?: string;
}

export interface Grants {
  skills?: SkillId[];
  expertise?: SkillId[];
  saves?: Ability[];
  armor?: string[];      // 'light' | 'medium' | 'heavy' | 'shields'
  weapons?: string[];    // 'simple' | 'martial' | specific weapon ids
  tools?: string[];
  languages?: string[];
  spells?: SpellGrant[];
  resistances?: DamageType[];
  immunities?: DamageType[];
  conditionImmunities?: ConditionId[];
  senses?: Record<string, number>;
  speeds?: Partial<Record<MovementMode, number | 'walk'>>; // 'walk' = equal to walking speed
}

// ---------------------------------------------------------------------------
// Choices
// ---------------------------------------------------------------------------

export interface ChoiceOption {
  id: string;
  name: string;
  description?: string;
  grants?: Grants;
  effects?: Effect[];
  resource?: ResourceDef;
  prerequisite?: Prerequisite;
  /** Nested features unlocked by this option (e.g. Draconic ancestry). */
  features?: FeatureDef[];
}

export type ChoiceKind =
  | 'options'       // pick from `options`
  | 'skill'         // pick skill proficiencies from `from`
  | 'expertise'     // pick skills you are proficient in for expertise
  | 'language'      // pick languages
  | 'tool'          // pick tools from `from`
  | 'ability'       // pick ability score(s) for +amount
  | 'asi'           // Ability Score Improvement or feat
  | 'feat'          // pick a feat
  | 'spell'         // pick spells (filter)
  | 'damage-type'
  | 'ability-split'; // 2024 background increase: +2/+1 or +1/+1/+1 among `from` (values: 3 picks, max 2 per ability)

export interface ChoiceDef {
  id: string;
  label: string;
  kind: ChoiceKind;
  count: Formula;
  options?: ChoiceOption[];
  /** For skill/tool/language/ability choices: allowed values (empty = any). */
  from?: string[];
  amount?: number;            // ability choices: +N each
  /** Spell choice filter */
  spellFilter?: { classes?: string[]; levels?: number[]; schools?: string[]; ritual?: boolean };
  /** For spell choices: how chosen spells are added. */
  spellMode?: SpellGrant['mode'];
  /** Option list references a shared pool (fighting-styles, invocations, metamagic, maneuvers...). */
  pool?: string;
  optional?: boolean;
  /** Allow choosing the same option multiple times (ASI +1/+1 to same) */
  allowRepeat?: boolean;
  /** Feat / ASI choices: restrict selectable feats to these categories (2024 rules). */
  featCategories?: FeatCategory[];
  /** Feat / ASI choices: hard maximum for the ability score increases (e.g. 30 for Epic Boons). */
  abilityMax?: number;
}

export interface Prerequisite {
  level?: number;                // class level (for invocations) or character level (feats)
  abilities?: Partial<Record<Ability, number>>;
  abilitiesAny?: Partial<Record<Ability, number>>;
  spellcasting?: boolean;
  proficiency?: string;          // armor/weapon proficiency id
  pact?: string;                 // warlock pact boon option id
  spell?: string;                // knows spell id
  race?: string[];
  text?: string;                 // free text, shown but not enforced
}

// ---------------------------------------------------------------------------
// Features & resources
// ---------------------------------------------------------------------------

export interface ResourceDef {
  id: string;
  name: string;
  max: Formula;
  recharge: Recharge;
  /** Long-rest resources that also regain this many uses on a short rest (2024 Rage, Channel Divinity…). */
  shortRestRecover?: Formula;
  /** Die associated (Bardic Inspiration d6 → d12, Superiority d8...). */
  die?: Formula | string;
  /** Pool counts points not uses (Ki, Sorcery Points, Lay on Hands). */
  pool?: boolean;
  /** Resource exists from this class level onwards (multi-level features). */
  minLevel?: number;
}

export type ActivationType = 'passive' | 'action' | 'bonus' | 'reaction' | 'special' | 'free' | 'minute' | 'hour';

export interface FeatureDef {
  ruleset?: RulesetTag;
  id: string;
  name: string;
  description: string;
  /** Class level / character level at which it is gained. */
  level?: number;
  source?: SourceInfo;
  activation?: ActivationType;
  resource?: ResourceDef;
  /** Uses a resource defined elsewhere (Channel Divinity options). */
  usesResource?: string;
  grants?: Grants;
  effects?: Effect[];
  choices?: ChoiceDef[];
  prerequisite?: Prerequisite;
  /** Replaces/upgrades an earlier feature (only the highest-level version is shown). */
  replaces?: string;
  /** Hide from feature list (pure-mechanics helper). */
  hidden?: boolean;
  tags?: string[];
  /** Mechanics not modelled automatically; display as manual. */
  manual?: boolean;
}

// ---------------------------------------------------------------------------
// Races, backgrounds, classes
// ---------------------------------------------------------------------------

export interface SubraceDef {
  id: string;
  name: string;
  description: string;
  source: SourceInfo;
  abilityBonuses?: Partial<Record<Ability, number>>;
  speed?: Partial<Record<MovementMode, number>>;
  traits: FeatureDef[];
  choices?: ChoiceDef[];
  /** Subrace replaces parent's ability bonuses entirely (Variant Human). */
  replacesAbilityBonuses?: boolean;
  /** Subrace removes parent traits by id. */
  removesTraits?: string[];
}

export interface RaceDef {
  id: string;
  name: string;
  ruleset: RulesetTag;
  description: string;
  source: SourceInfo;
  size: Size;
  sizeOptions?: Size[];
  speed: Partial<Record<MovementMode, number>> & { walk: number };
  abilityBonuses: Partial<Record<Ability, number>>;
  traits: FeatureDef[];
  choices?: ChoiceDef[];
  subraces?: SubraceDef[];
  subraceRequired?: boolean;
  /** Age/height guidance */
  details?: { age?: string; height?: string; weight?: string };
  creatureType?: string;
}

export interface BackgroundDef {
  id: string;
  name: string;
  ruleset: RulesetTag;
  description: string;
  source: SourceInfo;
  grants: Grants;
  choices?: ChoiceDef[];
  equipment: StartingItem[];
  gold: number;
  /** 2024: the alternative to the equipment package (usually 50 gp). */
  goldAlternative?: number;
  feature: FeatureDef;
  /** 2024: the three abilities this background can increase (+2/+1 or +1/+1/+1). */
  abilityOptions?: Ability[];
  /** 2024: origin feat granted by the background, with optional pre-set choices (e.g. Magic Initiate: Cleric). */
  originFeat?: { id: string; presetChoices?: Record<string, string[]>; note?: string };
  suggested?: { traits?: string[]; ideals?: string[]; bonds?: string[]; flaws?: string[] };
}

export interface StartingItem {
  itemId: string;
  quantity?: number;
  name?: string; // for unresolvable items (e.g. "a holy symbol")
}

export interface StartingEquipmentChoice {
  label: string;
  options: { label: string; items: StartingItem[]; gold?: number }[];
}

export type CasterProgression = 'full' | 'half' | 'third' | 'pact' | 'none' | 'half-up';
export type PreparationStyle = 'prepared' | 'known' | 'spellbook';

export interface SpellcastingDef {
  ability: Ability;
  progression: CasterProgression;
  style: PreparationStyle;
  /** Class spell list id (usually class id). */
  list: string;
  /** cantrips known by class level (index = level-1). */
  cantrips?: number[];
  /** spells known by class level (known casters). */
  known?: number[];
  /** Number of prepared spells (prepared casters), formula. */
  prepared?: Formula;
  /** First class level with spellcasting (paladin/ranger 2, EK/AT 3). */
  startLevel?: number;
  ritual?: boolean;
  focus?: string;
  /** Third-caster subclasses: restrict school choices (EK: abjuration/evocation). */
  schoolRestriction?: { schools: string[]; freeAt: number[] };
  /** Spellbook: spells added per level. */
  spellbookPerLevel?: number;
  spellbookStart?: number;
}

export interface ClassDef {
  id: string;
  name: string;
  ruleset: RulesetTag;
  description: string;
  source: SourceInfo;
  hitDie: number;
  primaryAbilities: Ability[];
  saves: Ability[];
  skillChoices: { count: number; from: SkillId[] };
  armor: string[];
  weapons: string[];
  tools: string[];
  toolChoices?: { count: number; from: string[] };
  multiclass: {
    prerequisite: { all?: Partial<Record<Ability, number>>; any?: Partial<Record<Ability, number>> };
    grants: Grants;
    skillCount?: number;
    skillFrom?: SkillId[];
  };
  startingEquipment: StartingEquipmentChoice[];
  startingFixed: StartingItem[];
  startingGold: string; // dice expression × 10 etc.
  spellcasting?: SpellcastingDef;
  subclassLevel: number;
  subclassLabel: string;
  asiLevels: number[];
  features: FeatureDef[];
  /** Class-wide resources defined at top level for clarity. */
  resources?: ResourceDef[];
}

export interface SubclassDef {
  id: string;
  classId: string;
  name: string;
  ruleset: RulesetTag;
  description: string;
  source: SourceInfo;
  features: FeatureDef[];
  spellcasting?: SpellcastingDef;
  /** Spells always prepared / added to list at class levels (domain/oath/circle/patron spells). */
  spells?: { level: number; spells: string[]; mode: SpellGrant['mode'] }[];
}

export type FeatCategory = 'origin' | 'general' | 'fighting-style' | 'epic-boon';

export interface FeatDef {
  id: string;
  name: string;
  ruleset: RulesetTag;
  /** 2024 feat category. */
  category?: FeatCategory;
  description: string;
  source: SourceInfo;
  prerequisite?: Prerequisite;
  grants?: Grants;
  effects?: Effect[];
  choices?: ChoiceDef[];
  resource?: ResourceDef;
  /** Feat gives +1 to an ability ("half feat"). */
  abilityIncrease?: { from: Ability[]; amount: number; max?: number };
  repeatable?: boolean;
}

/** Selectable options shared across classes (invocations, metamagic, maneuvers, fighting styles). */
export interface OptionPool {
  id: string;
  name: string;
  options: ChoiceOption[];
}

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

export interface SpellDef {
  id: string;
  name: string;
  level: number; // 0 = cantrip
  school: string;
  castingTime: string;
  range: string;
  components: { v: boolean; s: boolean; m: boolean; material?: string; consumed?: boolean; cost?: string };
  duration: string;
  concentration: boolean;
  ritual: boolean;
  attack?: 'melee' | 'ranged';
  save?: Ability;
  damageTypes?: DamageType[];
  /** damage dice by slot level or by character level (cantrips). */
  damage?: { bySlot?: Record<string, string>; byCharLevel?: Record<string, string> };
  heal?: Record<string, string>;
  classes: string[];
  subclasses?: string[];
  description: string;
  higherLevels?: string;
  tags?: string[];
  source: SourceInfo;
  ruleset?: RulesetTag;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export type ItemCategory =
  | 'weapon' | 'armor' | 'shield' | 'ammunition' | 'gear' | 'tool' | 'instrument' | 'pack'
  | 'container' | 'clothing' | 'consumable' | 'potion' | 'poison' | 'scroll' | 'food'
  | 'ring' | 'amulet' | 'wand' | 'rod' | 'staff' | 'wondrous' | 'mount' | 'vehicle' | 'trade-good'
  | 'focus' | 'treasure' | 'other';

export const ITEM_CATEGORY_LABEL: Record<ItemCategory, string> = {
  weapon: 'Weapon', armor: 'Armor', shield: 'Shield', ammunition: 'Ammunition', gear: 'Adventuring Gear',
  tool: 'Tool', instrument: 'Musical Instrument', pack: 'Equipment Pack', container: 'Container',
  clothing: 'Clothing', consumable: 'Consumable', potion: 'Potion', poison: 'Poison', scroll: 'Scroll',
  food: 'Food & Drink', ring: 'Ring', amulet: 'Amulet / Necklace', wand: 'Wand', rod: 'Rod', staff: 'Staff',
  wondrous: 'Wondrous Item', mount: 'Mount', vehicle: 'Vehicle', 'trade-good': 'Trade Good',
  focus: 'Spellcasting Focus', treasure: 'Treasure', other: 'Other',
};

export const WEAPON_PROPERTIES = [
  'ammunition', 'finesse', 'heavy', 'light', 'loading', 'reach', 'special', 'thrown', 'two-handed',
  'versatile', 'monk', 'silvered', 'adamantine',
] as const;
export type WeaponProperty = (typeof WEAPON_PROPERTIES)[number];

export interface WeaponData {
  category: 'simple' | 'martial';
  kind: 'melee' | 'ranged';
  damage: { dice: string; type: DamageType };
  versatile?: string;
  properties: WeaponProperty[];
  range?: { normal: number; long?: number };
  /** Base weapon id used for proficiency checks (e.g. "longsword"). */
  baseWeapon?: string;
  /** 2024 Weapon Mastery property id (cleave, graze, nick, push, sap, slow, topple, vex). */
  mastery?: string;
  attackBonus?: number;
  damageBonus?: number;
  /** Override attack ability; 'auto' picks STR/DEX per finesse/ranged rules. */
  ability?: 'auto' | Ability;
  extraDamage?: { dice: string; type: DamageType; condition?: string }[];
  critRange?: number;
  critExtraDice?: string;
}

export interface ArmorData {
  category: 'light' | 'medium' | 'heavy' | 'shield';
  baseAc: number;
  /** null = no Dex; number = cap; undefined = full Dex */
  dexCap?: number | null;
  strRequirement?: number;
  stealthDisadvantage?: boolean;
  /** Magical/additional bonus to AC. */
  bonus?: number;
}

export interface ItemSpell {
  spellId: string;
  /** Free casts per recharge period (omit when the spell costs charges or is at will). */
  uses?: number;
  recharge?: Recharge;
  /** Charges spent per cast (uses the item's charges). */
  chargeCost?: number;
  /** Fixed save DC / attack bonus for the item (otherwise the user's own spellcasting). */
  dc?: number;
  attack?: number;
  castLevel?: number;
  note?: string;
}

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  /** Free-form subtype: "Martial Melee Weapon", "Wondrous item", "Potion" ... */
  type?: string;
  aliases?: string[];
  tags?: string[];
  description: string;
  rarity: Rarity;
  weight: number;           // lb, per unit
  cost?: { amount: number; unit: 'cp' | 'sp' | 'ep' | 'gp' | 'pp' };
  magical: boolean;
  attunement?: { required: boolean; restriction?: string };
  source: SourceInfo;
  weapon?: WeaponData;
  armor?: ArmorData;
  charges?: { max: number; recharge: Recharge; rechargeAmount?: string; destroyOnEmpty?: string };
  consumable?: { onUse?: Outcome[]; destroyOnUse?: boolean };
  cursed?: boolean;
  curse?: string;
  activation?: string;
  /** Spells the item lets its user cast (while equipped/attuned as required). */
  spells?: ItemSpell[];
  contents?: { itemId: string; quantity: number }[];
  effects: Effect[];
  /** Base item this definition was derived from (provenance / template). */
  baseItemId?: string;
  notes?: string;
  image?: string; // data URL (custom items only, size limited)
  /** Allows content packs to keep unknown fields. */
  extra?: Record<string, unknown>;
  ruleset?: RulesetTag;
}

// ---------------------------------------------------------------------------
// Custom content collection
// ---------------------------------------------------------------------------

export type ContentKind =
  | 'item' | 'spell' | 'feat' | 'race' | 'class' | 'subclass' | 'background' | 'feature'
  | 'language' | 'proficiency';

export interface CustomLanguage { id: string; name: string; description?: string; source: SourceInfo; ruleset?: RulesetTag }
export interface CustomProficiency { id: string; name: string; group: 'tool' | 'weapon' | 'armor' | 'other'; description?: string; source: SourceInfo; ruleset?: RulesetTag }

export interface ContentByKind {
  item: ItemDefinition;
  spell: SpellDef;
  feat: FeatDef;
  race: RaceDef;
  class: ClassDef;
  subclass: SubclassDef;
  background: BackgroundDef;
  feature: FeatureDef;
  language: CustomLanguage;
  proficiency: CustomProficiency;
}

export interface CustomContentRecord<K extends ContentKind = ContentKind> {
  kind: K;
  id: string;
  data: ContentByKind[K];
  createdAt: string;
  updatedAt: string;
}
