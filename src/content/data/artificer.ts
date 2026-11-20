// Artificer (TCoE): class, specialists, and the artificer spell list (applied on top of the bundled spells).
import type { ClassDef, SubclassDef } from '@/types/content';
import { TCE, f, res, mod, eff, choice, byLevel } from './helpers';
import { sc, oathSpells } from './subclassHelpers';
import { ARTISAN_TOOLS } from '@/types/core';

const ASI = [4, 8, 12, 16, 19];
const replacementTool = () => choice('replacement-tool', 'Replacement artisan tool (only if already proficient in the specialist tool)', 'tool', 1, { from: ARTISAN_TOOLS, optional: true });

export const ARTIFICER_CLASS: ClassDef = {
  id: 'artificer', name: 'Artificer', ruleset: 'dnd5e-2014', source: TCE,
  description: 'Masters of magical invention who use tools and infusions to give everyday objects magical power.',
  hitDie: 8, primaryAbilities: ['int'], saves: ['con', 'int'],
  skillChoices: { count: 2, from: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleight-of-hand'] },
  armor: ['light', 'medium', 'shields'], weapons: ['simple'], tools: ["Thieves' tools", "Tinker's tools"],
  toolChoices: { count: 1, from: ["Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies", "Carpenter's tools", "Cartographer's tools", "Cobbler's tools", "Cook's utensils", "Glassblower's tools", "Jeweler's tools", "Leatherworker's tools", "Mason's tools", "Painter's supplies", "Potter's tools", "Smith's tools", "Weaver's tools", "Woodcarver's tools"] },
  multiclass: { prerequisite: { all: { int: 13 } }, grants: { armor: ['light', 'medium', 'shields'], tools: ["Thieves' tools", "Tinker's tools"] } },
  startingEquipment: [
    { label: 'Weapons', options: [{ label: 'Any two simple weapons', items: [{ itemId: '@simple' }, { itemId: '@simple' }] }] },
    { label: 'Armor', options: [{ label: 'Studded leather armor', items: [{ itemId: 'studded-leather-armor' }] }, { label: 'Scale mail', items: [{ itemId: 'scale-mail' }] }] },
  ],
  startingFixed: [{ itemId: 'thieves-tools' }, { itemId: 'dungeoneers-pack' }, { itemId: 'crossbow-light' }, { itemId: 'crossbow-bolt', quantity: 20 }],
  startingGold: '5d4x10',
  spellcasting: {
    ability: 'int', progression: 'half-up', style: 'prepared', list: 'artificer', prepared: 'max(1, int + floor(cl / 2))', startLevel: 1, ritual: true, focus: "Thieves' tools or artisan's tools",
    cantrips: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4],
  },
  subclassLevel: 3, subclassLabel: 'Artificer Specialist', asiLevels: ASI,
  features: [
    f(1, 'magical-tinkering', 'Magical Tinkering', 'Touch a Tiny nonmagical object and give it one of: light 5 ft, a recorded message (6 seconds), a continuous odor or sound, or a static visual effect. INT modifier (min 1) objects at a time.', { manual: true }),
    f(1, 'spellcasting-artificer', 'Spellcasting', 'You prepare INT modifier + half your artificer level (rounded down, min 1) spells from the artificer list. You need thieves’ tools or artisan’s tools as a spellcasting focus, and cast artificer spells as rituals if they have the ritual tag.'),
    f(2, 'infuse-item', 'Infuse Item', 'At the end of a long rest, infuse mundane items with magical infusions you know. Infusions known: 4 (6 at 6th, 8 at 10th, 10 at 14th, 12 at 18th). Infused items at once: 2 (3 at 6th, 4 at 10th, 5 at 14th, 6 at 18th). Track active infusions manually; resting does not end them or clear their count.', {
      resource: res('infused-items', 'Infused items', byLevel([[2, 2], [6, 3], [10, 4], [14, 5], [18, 6]]), 'manual'), manual: true,
    }),
    f(3, 'artificer-specialist', 'Artificer Specialist', 'Choose an artificer specialist.', { tags: ['subclass-placeholder'], hidden: true }),
    f(3, 'right-tool-for-the-job', 'The Right Tool for the Job', 'Magically create a set of artisan’s tools in an unoccupied space within 5 ft at the end of a short or long rest. They last until you use this feature again.'),
    f(6, 'tool-expertise', 'Tool Expertise', 'Your proficiency bonus is doubled for any ability check you make that uses your tool proficiencies.', { manual: true }),
    f(7, 'flash-of-genius', 'Flash of Genius', 'Reaction: when you or a creature within 30 ft makes an ability check or saving throw, add your INT modifier to the roll. INT modifier (min 1) times per long rest.', { activation: 'reaction', resource: res('flash-of-genius', 'Flash of Genius', 'max(1, int)', 'long') }),
    f(10, 'magic-item-adept', 'Magic Item Adept', 'You can attune to up to four magic items at once. Crafting a common or uncommon magic item takes a quarter of the normal time and half the gold.', { effects: [eff('magic-item-adept', [mod('attunement-slots', 1)])] }),
    f(11, 'spell-storing-item', 'Spell-Storing Item', 'After a long rest, store a 1st- or 2nd-level artificer spell (1 action casting time) in a weapon or spellcasting focus. 2 × INT modifier uses (min 2); the item is used up after that or when you use this again.', { manual: true }),
    f(14, 'magic-item-savant', 'Magic Item Savant', 'You can attune to up to five magic items at once, and ignore all class, race, spell, and level requirements on attuning to or using a magic item.', { effects: [eff('magic-item-savant', [mod('attunement-slots', 1)])] }),
    f(18, 'magic-item-master', 'Magic Item Master', 'You can attune to up to six magic items at once.', { effects: [eff('magic-item-master', [mod('attunement-slots', 1)])] }),
    f(20, 'soul-of-artifice', 'Soul of Artifice', 'You gain a +1 bonus to all saving throws per magic item you are currently attuned to. Reaction when reduced to 0 HP: end one of your artificer infusions to drop to 1 HP instead.', { manual: true }),
  ],
};

const sub = (id: string, name: string, desc: string, features: ReturnType<typeof f>[], spells: SubclassDef['spells']) => sc('artificer', id, name, TCE, desc, features, { spells });

export const ARTIFICER_SUBCLASSES: SubclassDef[] = [
  sub('alchemist', 'Alchemist', 'Experts at combining reagents to produce mystical effects.', [
    f(3, 'alchemist-tool-proficiency', 'Tool Proficiency', 'Gain alchemist’s supplies proficiency; if already proficient, choose another artisan tool instead.', { grants: { tools: ["Alchemist's supplies"] }, choices: [replacementTool()] }),
    f(3, 'experimental-elixir', 'Experimental Elixir', 'After a long rest, create one random elixir in an empty flask (two at 6th level, three at 15th). Roll d6: Healing, Swiftness, Resilience, Boldness, Flight, or Transformation. An action and a spell slot create another elixir with an effect you choose.', { resource: res('experimental-elixir', 'Experimental Elixirs', byLevel([[3, 1], [6, 2], [15, 3]]), 'long') }),
    f(5, 'alchemical-savant', 'Alchemical Savant', 'When you cast a spell using alchemist’s supplies as a focus, add your INT modifier (min +1) to one roll that restores HP or deals acid, fire, necrotic, or poison damage.', { manual: true }),
    f(9, 'restorative-reagents', 'Restorative Reagents', 'Elixirs grant 2d6 + INT modifier temp HP; cast lesser restoration without a slot INT modifier (min 1) times per long rest.', { resource: res('restorative-reagents', 'Restorative Reagents (lesser restoration)', 'max(1, int)', 'long') }),
    f(15, 'chemical-mastery', 'Chemical Mastery', 'Resist acid and poison; you cannot be poisoned. Cast Greater Restoration and Heal once each per long rest without slots, components, or preparation, using INT and alchemist’s supplies.', { grants: { resistances: ['acid', 'poison'], conditionImmunities: ['poisoned'], spells: ['greater-restoration', 'heal'].map((spellId) => ({ spellId, mode: 'innate', ability: 'int', uses: { max: 1, recharge: 'long' } })) } }),
  ], oathSpells(['healing-word', 'ray-of-sickness'], ['flaming-sphere', 'acid-arrow'], ['gaseous-form', 'mass-healing-word'], ['blight', 'death-ward'], ['cloudkill', 'raise-dead'])),
  sub('armorer', 'Armorer', 'Armorers modify armor to function almost like a second skin.', [
    f(3, 'tools-of-the-trade', 'Tools of the Trade', 'Gain heavy armor and smith’s tools proficiency. If already proficient with smith’s tools, choose another artisan tool instead.', { grants: { armor: ['heavy'], tools: ["Smith's tools"] }, choices: [replacementTool()] }),
    f(3, 'arcane-armor', 'Arcane Armor', 'Turn armor you wear into Arcane Armor: it covers your body, counts as a spellcasting focus, can’t be removed against your will, and replaces missing limbs. Heavy armor requirements are waived.', { manual: true }),
    f(3, 'armor-model', 'Armor Model', 'Choose Guardian (thunder gauntlets 1d8, Defensive Field) or Infiltrator (Lightning Launcher 1d6 lightning, +5 ft speed, Dampening Field).', { choices: [choice('model', 'Armor Model', 'options', 1, { options: [
      { id: 'guardian', name: 'Guardian', description: 'Thunder Gauntlets (1d8 thunder, target has disadvantage on attacks against others) and Defensive Field (temp HP = artificer level, PB times per long rest).' },
      { id: 'infiltrator', name: 'Infiltrator', description: 'Lightning Launcher (1d6 lightning, once per turn +1d6), +5 ft walking speed, and advantage on Stealth. Enable the Infiltrator Armor toggle while wearing your Arcane Armor; disable it for other armor.', effects: [{ id: 'infiltrator-armor', name: 'Infiltrator Armor', activation: 'toggle', modifiers: [mod('speed:walk', 5, { requires: ['armored'] }), { target: 'skill:stealth', op: 'advantage', requires: ['armored'] }] }] },
    ] })] }),
    f(5, 'armorer-extra-attack', 'Extra Attack', 'You can attack twice, instead of once, whenever you take the Attack action on your turn.'),
    f(9, 'armor-modifications', 'Armor Modifications', 'Your armor’s chest piece, boots, helmet and special weapon can hold separate infusions. You can maintain two extra infused items, but those two must belong to your Arcane Armor.', { effects: [eff('armor-modifications', [mod('resource-max:infused-items', 2)])], manual: true }),
    f(15, 'perfected-armor', 'Perfected Armor', 'Guardian: Thunder Gauntlets can pull Large or smaller creatures. Infiltrator: Lightning Launcher hits make targets glow with disadvantage on attacks and bonus lightning damage.', { manual: true }),
  ], oathSpells(['magic-missile', 'thunderwave'], ['mirror-image', 'shatter'], ['hypnotic-pattern', 'lightning-bolt'], ['fire-shield', 'greater-invisibility'], ['passwall', 'wall-of-force'])),
  sub('artillerist', 'Artillerist', 'Artillerists specialize in using magic to hurl energy, projectiles, and explosions.', [
    f(3, 'artillerist-tool-proficiency', 'Tool Proficiency', 'Gain woodcarver’s tools proficiency; if already proficient, choose another artisan tool instead.', { grants: { tools: ["Woodcarver's tools"] }, choices: [replacementTool()] }),
    f(3, 'eldritch-cannon', 'Eldritch Cannon', 'Action: create a Small or Tiny eldritch cannon (flamethrower, force ballista, or protector) that lasts 1 hour. Once per long rest, or by expending a spell slot.', { activation: 'action', resource: res('eldritch-cannon', 'Eldritch Cannon', 1, 'long') }),
    f(5, 'arcane-firearm', 'Arcane Firearm', 'After a long rest, inscribe a wand, staff, or rod to be an arcane firearm: add 1d8 to one damage roll of an artificer spell cast through it.', { effects: [{ id: 'arcane-firearm', name: 'Arcane Firearm', manual: true, description: '+1d8 to one damage roll of an artificer spell cast through the firearm.' }] }),
    f(9, 'explosive-cannon', 'Explosive Cannon', 'The cannon’s damage rolls gain 1d8. As an action, destroy a cannon within 60 ft to deal 3d8 force damage to creatures within 20 ft of it (DEX save for half).', { manual: true }),
    f(15, 'fortified-position', 'Fortified Position', 'You and your allies have half cover within 10 ft of your cannon, and you can have two cannons at once.', { manual: true }),
  ], oathSpells(['shield', 'thunderwave'], ['scorching-ray', 'shatter'], ['fireball', 'wind-wall'], ['ice-storm', 'wall-of-fire'], ['cone-of-cold', 'wall-of-force'])),
  sub('battle-smith', 'Battle Smith', 'A combination of protector and medic, with a steel defender companion.', [
    f(3, 'battle-smith-tool-proficiency', 'Tool Proficiency', 'Gain smith’s tools proficiency; if already proficient, choose another artisan tool instead.', { grants: { tools: ["Smith's tools"] }, choices: [replacementTool()] }),
    f(3, 'battle-ready', 'Battle Ready', 'Proficiency with martial weapons. When you attack with a magic weapon, you can use your INT modifier instead of STR or DEX for attack and damage rolls.', { grants: { weapons: ['martial'] }, manual: true }),
    f(3, 'steel-defender', 'Steel Defender', 'Create a Medium construct companion (AC 15; HP 2 + INT modifier + 5 per artificer level). It Dodges unless you spend a bonus action to command another action. Mending heals it for 2d6; it also has its own Repair action. Use a companion card to track it.', { manual: true }),
    f(5, 'battle-smith-extra-attack', 'Extra Attack', 'You can attack twice, instead of once, whenever you take the Attack action on your turn.'),
    f(9, 'arcane-jolt', 'Arcane Jolt', 'Once per turn, when your magic weapon or your defender hits, add 2d6 force damage or heal a creature within 30 ft of the target for 2d6. INT modifier uses (minimum 1) per long rest.', { resource: res('arcane-jolt', 'Arcane Jolt', 'max(1, int)', 'long') }),
    f(15, 'improved-defender', 'Improved Defender', 'Arcane Jolt increases to 4d6; your steel defender gains +2 AC and its Deflect Attack deals 1d4 + INT force damage.', { manual: true }),
  ], oathSpells(['heroism', 'shield'], ['branding-smite', 'warding-bond'], ['aura-of-vitality', 'conjure-barrage'], ['aura-of-purity', 'fire-shield'], ['banishing-smite', 'mass-cure-wounds'])),
];

const L = (ids: string) => ids.split(' ');
export const ARTIFICER_SPELL_LIST: string[] = [
  ...L('acid-splash dancing-lights fire-bolt guidance light mage-hand mending message poison-spray prestidigitation ray-of-frost resistance shocking-grasp spare-the-dying booming-blade green-flame-blade thorn-whip'),
  ...L('absorb-elements alarm cure-wounds detect-magic disguise-self expeditious-retreat faerie-fire false-life feather-fall grease identify jump longstrider purify-food-and-drink sanctuary'),
  ...L('aid alter-self arcane-lock blur continual-flame darkvision enhance-ability enlarge-reduce heat-metal invisibility lesser-restoration levitate magic-mouth magic-weapon protection-from-poison rope-trick see-invisibility spider-climb web'),
  ...L('blink create-food-and-water dispel-magic elemental-weapon fly gaseous-form glyph-of-warding haste protection-from-energy revivify water-breathing water-walk'),
  ...L('arcane-eye fabricate freedom-of-movement secret-chest faithful-hound private-sanctum resilient-sphere stone-shape stoneskin summon-construct'),
  ...L('animate-objects arcane-hand creation greater-restoration wall-of-stone'),
];
