// Core rule vocabulary shared by content, engine and UI.

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const ABILITY_NAMES: Record<Ability, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const SKILLS = {
  acrobatics: { name: 'Acrobatics', ability: 'dex' },
  'animal-handling': { name: 'Animal Handling', ability: 'wis' },
  arcana: { name: 'Arcana', ability: 'int' },
  athletics: { name: 'Athletics', ability: 'str' },
  deception: { name: 'Deception', ability: 'cha' },
  history: { name: 'History', ability: 'int' },
  insight: { name: 'Insight', ability: 'wis' },
  intimidation: { name: 'Intimidation', ability: 'cha' },
  investigation: { name: 'Investigation', ability: 'int' },
  medicine: { name: 'Medicine', ability: 'wis' },
  nature: { name: 'Nature', ability: 'int' },
  perception: { name: 'Perception', ability: 'wis' },
  performance: { name: 'Performance', ability: 'cha' },
  persuasion: { name: 'Persuasion', ability: 'cha' },
  religion: { name: 'Religion', ability: 'int' },
  'sleight-of-hand': { name: 'Sleight of Hand', ability: 'dex' },
  stealth: { name: 'Stealth', ability: 'dex' },
  survival: { name: 'Survival', ability: 'wis' },
} as const satisfies Record<string, { name: string; ability: Ability }>;
export type SkillId = keyof typeof SKILLS;
export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

export const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const CONDITION_IDS = [
  'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible',
  'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious',
] as const;
export type ConditionId = (typeof CONDITION_IDS)[number];

export type Size = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
export const SIZES: Size[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

export type MovementMode = 'walk' | 'fly' | 'swim' | 'climb' | 'burrow';
export const MOVEMENT_MODES: MovementMode[] = ['walk', 'fly', 'swim', 'climb', 'burrow'];

export type Recharge = 'none' | 'short' | 'long' | 'dawn' | 'turn' | 'manual';
export const RECHARGE_LABEL: Record<Recharge, string> = {
  none: 'Does not recharge',
  short: 'Short or long rest',
  long: 'Long rest',
  dawn: 'Daily at dawn',
  turn: 'Each turn',
  manual: 'Manual / DM',
};

export type Rarity = 'none' | 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary' | 'artifact' | 'varies';
export const RARITIES: Rarity[] = ['none', 'common', 'uncommon', 'rare', 'very-rare', 'legendary', 'artifact', 'varies'];
export const RARITY_LABEL: Record<Rarity, string> = {
  none: 'Mundane', common: 'Common', uncommon: 'Uncommon', rare: 'Rare', 'very-rare': 'Very Rare',
  legendary: 'Legendary', artifact: 'Artifact', varies: 'Varies',
};

export type RulesetId = 'dnd5e-2014' | 'dnd5e-2024';
export const RULESETS: Record<RulesetId, { name: string; supported: boolean }> = {
  'dnd5e-2014': { name: 'D&D 5e (2014)', supported: true },
  'dnd5e-2024': { name: 'D&D 5e (2024)', supported: true },
};

export type ProficiencyLevel = 0 | 0.5 | 1 | 2; // none, half (JoAT), proficient, expertise

export const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral',
  'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil', 'Unaligned',
];

export const STANDARD_LANGUAGES = [
  'Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
];
export const EXOTIC_LANGUAGES = [
  'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon',
  'Aquan', 'Auran', 'Ignan', 'Terran', 'Druidic', "Thieves' Cant", 'Gith', 'Quori', 'Leonin', 'Loxodon', 'Minotaur', 'Vedalken',
];

export const ARTISAN_TOOLS = [
  "Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies", "Carpenter's tools",
  "Cartographer's tools", "Cobbler's tools", "Cook's utensils", "Glassblower's tools", "Jeweler's tools",
  "Leatherworker's tools", "Mason's tools", "Painter's supplies", "Potter's tools", "Smith's tools",
  "Tinker's tools", "Weaver's tools", "Woodcarver's tools",
];
export const MUSICAL_INSTRUMENTS = [
  'Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol',
];
export const GAMING_SETS = ['Dice set', 'Dragonchess set', 'Playing card set', 'Three-Dragon Ante set'];
export const OTHER_TOOLS = [
  'Disguise kit', 'Forgery kit', 'Herbalism kit', "Navigator's tools", "Poisoner's kit", "Thieves' tools",
  'Vehicles (land)', 'Vehicles (water)',
];
export const ALL_TOOLS = [...ARTISAN_TOOLS, ...MUSICAL_INSTRUMENTS, ...GAMING_SETS, ...OTHER_TOOLS];

export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);
export const proficiencyBonus = (totalLevel: number): number =>
  Math.ceil(Math.max(1, Math.min(20, totalLevel)) / 4) + 1;
export const levelForXp = (xp: number): number => {
  let lvl = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) if (xp >= XP_THRESHOLDS[i]) lvl = i + 1;
  return lvl;
};
export const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
