// 2024 classes (SRD 5.2 text + structured mechanics overlay).
import type { ClassDef, FeatureDef, SpellcastingDef, ChoiceDef, StartingEquipmentChoice } from '@/types/content';
import type { Ability, SkillId } from '@/types/core';
import basics from '../srd2024/classes.json';
import { SRD52, T24, featuresOf, tableFormula, tableNums } from './helpers24';
import { mod, adv, grant, flag, eff, toggle, choice, res, byLevel } from '../data/helpers';

type Basic = (typeof basics)[number];
const B = (id: string) => basics.find((b) => b.id === id) as Basic;

const hide: Partial<FeatureDef> = { hidden: true };
const epicBoon: Partial<FeatureDef> = { choices: [choice('boon', 'Epic Boon (or another feat you qualify for)', 'feat', 1, { featCategories: ['epic-boon', 'general'] })] };
const fightingStyle: Partial<FeatureDef> = { choices: [choice('style', 'Fighting Style feat', 'feat', 1, { featCategories: ['fighting-style'] })] };
const mastery = (count: string | number): Partial<FeatureDef> => ({ choices: [choice('weapons', 'Weapon Mastery (kinds of weapons)', 'options', count, { pool: 'weapon-mastery' })] });
const ASI = [4, 8, 12, 16];

function cls(id: string, o: {
  description: string; primary: Ability[]; asiLevels?: number[]; spellcasting?: SpellcastingDef; overlay: Record<string, Partial<FeatureDef>>;
  extra?: FeatureDef[]; armor?: string[]; weapons?: string[]; tools?: string[]; toolChoices?: { count: number; from: string[] }; mcGrants?: ClassDef['multiclass']['grants']; mcSkill?: number;
  resources?: ClassDef['resources'];
}): ClassDef {
  const b = B(id);
  const overlay: Record<string, Partial<FeatureDef>> = { [`${id}-subclass`]: hide, [`${id}-ability-score-improvement`]: hide, [`${id}-epic-boon`]: epicBoon, ...o.overlay };
  const eqOpts = b.startingEquipment.map((x) => ({ label: x.label, items: x.items.filter((i) => i.itemId !== '@cat:any' || id === 'monk').map((i: { itemId: string; quantity: number; name?: string }) => ({ itemId: i.itemId, quantity: i.quantity, ...(i.name ? { name: i.name } : {}) })), gold: x.gold }));
  const startingEquipment: StartingEquipmentChoice[] = eqOpts.length ? [{ label: 'Starting equipment', options: eqOpts }] : [];
  return {
    id, name: b.name, ruleset: 'dnd5e-2024', description: o.description, source: SRD52,
    hitDie: b.hitDie, primaryAbilities: o.primary, saves: b.saves as Ability[],
    skillChoices: { count: b.skillChoices.count, from: b.skillChoices.from as SkillId[] },
    armor: o.armor ?? b.armor, weapons: o.weapons ?? b.weapons, tools: o.tools ?? b.tools.filter((t) => !/armor/i.test(t)),
    toolChoices: o.toolChoices ?? (b.toolChoices?.from.length ? b.toolChoices : undefined),
    multiclass: { prerequisite: b.multiclass.prerequisite as ClassDef['multiclass']['prerequisite'], grants: o.mcGrants ?? b.multiclass.grants, skillCount: o.mcSkill },
    startingEquipment, startingFixed: [], startingGold: String(eqOpts[eqOpts.length - 1]?.gold ?? 50),
    spellcasting: o.spellcasting, subclassLevel: 3, subclassLabel: 'Subclass', asiLevels: o.asiLevels ?? ASI,
    features: [...featuresOf({ classId: id }, overlay), ...(o.extra ?? [])].sort((a, b2) => (a.level ?? 0) - (b2.level ?? 0)),
    resources: o.resources,
  };
}

const sc = (classId: string, ability: Ability, progression: SpellcastingDef['progression'], style: SpellcastingDef['style'], extra: Partial<SpellcastingDef> = {}): SpellcastingDef => {
  const cantrips = tableNums(classId, 'cantrips_known');
  const prepared = tableNums(classId, 'prepared_spells');
  return {
    ability, progression, style, list: classId,
    ...(cantrips.some((x) => x > 0) ? { cantrips } : {}),
    ...(style === 'known' ? { known: prepared } : { prepared: `max(1, ${tableFormula(classId, 'prepared_spells')})` }),
    ...extra,
  };
};

const ALL_SKILLS = ['acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight-of-hand', 'stealth', 'survival'];
const ARTISAN_OR_INSTRUMENT = ["Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies", "Carpenter's tools", "Cartographer's tools", "Cobbler's tools", "Cook's utensils", "Glassblower's tools", "Jeweler's tools", "Leatherworker's tools", "Mason's tools", "Painter's supplies", "Potter's tools", "Smith's tools", "Tinker's tools", "Weaver's tools", "Woodcarver's tools", 'Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol'];
const ef = (id: string, name: string, description: string, level: number, o: Partial<FeatureDef> = {}): FeatureDef => ({ id, name, description, level, source: SRD52, ...o });
const arcanum = (lvl: number, spellLevel: number): FeatureDef => ef(`warlock-mystic-arcanum-${spellLevel}`, `Mystic Arcanum (level ${spellLevel})`, 'Choose a Warlock spell of this level; cast it once without a spell slot per Long Rest.', lvl, {
  choices: [choice('spell', `Arcanum spell (level ${spellLevel})`, 'spell', 1, { spellFilter: { classes: ['warlock'], levels: [spellLevel] }, spellMode: 'innate' })],
});
const rageDmg = tableFormula('barbarian', 'rage_damage_bonus');

export const CLASSES_2024: ClassDef[] = [
  cls('barbarian', {
    description: 'A fierce warrior fueled by primal Rage.', primary: ['str'],
    overlay: {
      'barbarian-rage': {
        activation: 'bonus', resource: res('rage', 'Rage', tableFormula('barbarian', 'rage_count'), 'long', { shortRestRecover: 1 }),
        effects: [toggle('rage', 'Raging', [
          adv('check:str', undefined, { requires: ['no-heavy-armor'] }), adv('save:str', undefined, { requires: ['no-heavy-armor'] }),
          mod('damage', rageDmg, { scope: 'weapon', requires: ['no-heavy-armor', 'str-attack'] }),
          grant('resistance:bludgeoning', { requires: ['no-heavy-armor'] }), grant('resistance:piercing', { requires: ['no-heavy-armor'] }), grant('resistance:slashing', { requires: ['no-heavy-armor'] }),
        ], { description: 'Bonus Action, not in Heavy armor. Advantage on STR checks/saves, +Rage Damage with STR attacks, B/P/S resistance. No spellcasting or concentration.' })],
      },
      'barbarian-unarmored-defense': { effects: [eff('barbarian-unarmored-defense', [mod('ac-formula', undefined, { acFormula: { label: 'Unarmored Defense (10 + DEX + CON)', base: 10, abilities: ['dex', 'con'], allowsArmor: false, allowsShield: true } })])] },
      'barbarian-weapon-mastery': mastery(tableFormula('barbarian', 'weapon_mastery')),
      'barbarian-danger-sense': { effects: [eff('danger-sense', [adv('save:dex', "unless you have the Incapacitated condition")])] },
      'barbarian-reckless-attack': { effects: [toggle('reckless-attack', 'Reckless Attack', [adv('attack', undefined, { scope: 'weapon', requires: ['str-attack'] })])] },
      'barbarian-primal-knowledge': { choices: [choice('skill', 'Primal Knowledge skill', 'skill', 1, { from: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] })] },
      'barbarian-fast-movement': { effects: [eff('fast-movement', [mod('speed:walk', 10, { requires: ['no-heavy-armor'] })])] },
      'barbarian-feral-instinct': { effects: [eff('feral-instinct', [adv('initiative')])] },
      'barbarian-brutal-strike': { manual: true }, 'barbarian-relentless-rage': { manual: true },
      'barbarian-primal-champion': { effects: [eff('primal-champion', [mod('ability:str', 4), mod('ability:con', 4), mod('ability-max:str', 25), mod('ability-max:con', 25)])] },
    },
  }),
  cls('bard', {
    description: 'An inspiring performer whose magic echoes the music of creation.', primary: ['cha'],
    spellcasting: sc('bard', 'cha', 'full', 'known', { ritual: true, focus: 'Musical instrument' }),
    mcGrants: { armor: ['light'] }, mcSkill: 1,
    overlay: {
      'bard-bardic-inspiration': { activation: 'bonus', resource: res('bardic-inspiration', 'Bardic Inspiration', 'max(1, cha)', 'long', { die: tableFormula('bard', 'bardic_inspiration_die') }) },
      'bard-font-of-inspiration': { resource: res('bardic-inspiration', 'Bardic Inspiration', 'max(1, cha)', 'short', { die: tableFormula('bard', 'bardic_inspiration_die') }) },
      'bard-expertise': { choices: [choice('expertise', 'Expertise (2 skills)', 'expertise', 2)] },
      'bard-jack-of-all-trades': { effects: [eff('jack-of-all-trades', [{ target: 'prof:half-unproficient-checks', op: 'grant' }])] },
      'bard-magical-secrets': { tags: ['extra-list:cleric', 'extra-list:druid', 'extra-list:wizard'] },
      'bard-words-of-creation': { grants: { spells: [{ spellId: 'power-word-heal', mode: 'always-prepared' }, { spellId: 'power-word-kill', mode: 'always-prepared' }] } },
    },
    extra: [ef('bard-expertise-9', 'Expertise (2 more)', 'Gain Expertise in two more of your skill proficiencies.', 9, { choices: [choice('expertise', 'Expertise (2 skills)', 'expertise', 2)] })],
  }),
  cls('cleric', {
    description: 'A priestly champion who wields divine magic.', primary: ['wis'],
    spellcasting: sc('cleric', 'wis', 'full', 'prepared', { ritual: true, focus: 'Holy symbol' }),
    overlay: {
      'cleric-divine-order': { choices: [choice('order', 'Divine Order', 'options', 1, { options: [
        { id: 'order-protector', name: 'Protector', description: 'Proficiency with Martial weapons and Heavy armor.', grants: { weapons: ['martial'], armor: ['heavy'] } },
        { id: 'order-thaumaturge', name: 'Thaumaturge', description: 'One extra Cleric cantrip; add WIS modifier (min +1) to Arcana and Religion checks.', effects: [eff('thaumaturge', [mod('skill:arcana', 'max(1, wis)'), mod('skill:religion', 'max(1, wis)')])],
          features: [ef('thaumaturge-cantrip', 'Thaumaturge cantrip', 'One extra cleric cantrip.', 1, { choices: [choice('cantrip', 'Cleric cantrip', 'spell', 1, { spellFilter: { classes: ['cleric'], levels: [0] }, spellMode: 'always-prepared' })] })] },
      ] })] },
      'cleric-channel-divinity': { usesResource: 'channel-divinity', resource: res('channel-divinity', 'Channel Divinity', tableFormula('cleric', 'channel_divinity_charges'), 'long', { shortRestRecover: 1 }),
        effects: [{ id: 'divine-spark', name: 'Divine Spark', trigger: 'on-use', outcomes: [{ kind: 'heal', dice: '{steps(cl,1,1,7,2,13,3,18,4)}d8+{wis}', text: 'heal, or necrotic/radiant damage (CON save for half)' }] }] },
      'cleric-sear-undead': { manual: true },
      'cleric-blessed-strikes': { choices: [choice('strikes', 'Blessed Strikes', 'options', 1, { options: [
        { id: 'bs-divine-strike', name: 'Divine Strike', description: 'Once per turn, a weapon hit deals +1d8 necrotic or radiant (2d8 at 14th).', effects: [{ id: 'bs-divine-strike', name: 'Divine Strike', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '{steps(cl,7,1,14,2)}d8', text: 'necrotic or radiant' }] }] },
        { id: 'bs-potent', name: 'Potent Spellcasting', description: 'Add WIS modifier to Cleric cantrip damage (14th: also temp HP).', effects: [{ id: 'bs-potent', name: 'Potent Spellcasting', manual: true, description: '+WIS modifier to Cleric cantrip damage.' }] },
      ] })] },
      'cleric-divine-intervention': { resource: res('divine-intervention', 'Divine Intervention', 1, 'long') },
    },
  }),
  cls('druid', {
    description: 'A priest of the Old Faith, wielding nature magic and wild shapes.', primary: ['wis'],
    spellcasting: { ...sc('druid', 'wis', 'full', 'prepared', { ritual: true, focus: 'Druidic focus' }), cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4] },
    overlay: {
      'druid-druidic': { grants: { languages: ['Druidic'], spells: [{ spellId: 'speak-with-animals', mode: 'always-prepared' }] } },
      'druid-primal-order': { choices: [choice('order', 'Primal Order', 'options', 1, { options: [
        { id: 'order-magician', name: 'Magician', description: 'One extra Druid cantrip; add WIS modifier (min +1) to Arcana and Nature checks.', effects: [eff('magician', [mod('skill:arcana', 'max(1, wis)'), mod('skill:nature', 'max(1, wis)')])],
          features: [ef('magician-cantrip', 'Magician cantrip', 'One extra druid cantrip.', 1, { choices: [choice('cantrip', 'Druid cantrip', 'spell', 1, { spellFilter: { classes: ['druid'], levels: [0] }, spellMode: 'always-prepared' })] })] },
        { id: 'order-warden', name: 'Warden', description: 'Proficiency with Martial weapons and Medium armor.', grants: { weapons: ['martial'], armor: ['medium'] } },
      ] })] },
      'druid-wild-shape': { activation: 'bonus', resource: res('wild-shape', 'Wild Shape', tableFormula('druid', 'wild_shape_uses'), 'long', { shortRestRecover: 1 }), effects: [toggle('wild-shape', 'Wild Shaped', [], { manual: true, description: 'Use the beast form’s stat block; temp HP = druid level.' })] },
      'druid-wild-companion': { usesResource: 'wild-shape', grants: { spells: [{ spellId: 'find-familiar', mode: 'always-prepared' }] } },
      'druid-elemental-fury': { choices: [choice('fury', 'Elemental Fury', 'options', 1, { options: [
        { id: 'ef-potent', name: 'Potent Spellcasting', description: 'Add WIS modifier to Druid cantrip damage.', effects: [{ id: 'ef-potent', name: 'Potent Spellcasting', manual: true, description: '+WIS modifier to Druid cantrip damage.' }] },
        { id: 'ef-primal-strike', name: 'Primal Strike', description: 'Once per turn, a weapon or beast-form hit deals +1d8 cold, fire, lightning, or thunder (2d8 at 15th).', effects: [{ id: 'ef-primal-strike', name: 'Primal Strike', trigger: 'on-hit', scope: 'all', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '{steps(cl,7,1,15,2)}d8', text: 'cold, fire, lightning, or thunder' }] }] },
      ] })] },
    },
  }),
  cls('fighter', {
    description: 'A master of martial combat and weapon techniques.', primary: ['str', 'dex'], asiLevels: [4, 6, 8, 12, 14, 16],
    armor: ['light', 'medium', 'heavy', 'shields'], weapons: ['simple', 'martial'], tools: [],
    overlay: {
      'fighter-fighting-style': fightingStyle,
      'fighter-second-wind': { activation: 'bonus', resource: res('second-wind', 'Second Wind', tableFormula('fighter', 'second_wind_uses'), 'long', { shortRestRecover: 1 }), effects: [{ id: 'second-wind-heal', name: 'Second Wind', trigger: 'on-use', outcomes: [{ kind: 'heal', dice: '1d10+{cl}' }] }] },
      'fighter-weapon-mastery': mastery(tableFormula('fighter', 'weapon_mastery')),
      'fighter-action-surge': { resource: res('action-surge', 'Action Surge', byLevel([[2, 1], [17, 2]]), 'short') },
      'fighter-tactical-mind': { usesResource: 'second-wind' },
      'fighter-indomitable': { resource: res('indomitable', 'Indomitable', byLevel([[9, 1], [13, 2], [17, 3]]), 'long') },
      'fighter-two-extra-attacks': { replaces: 'fighter-extra-attack' }, 'fighter-three-extra-attacks': { replaces: 'fighter-two-extra-attacks' },
    },
  }),
  cls('monk', {
    description: 'A martial artist who channels Focus through body and mind.', primary: ['dex', 'wis'],
    weapons: ['simple', 'martial-light'], tools: [], toolChoices: { count: 1, from: ARTISAN_OR_INSTRUMENT },
    resources: [res('focus', 'Focus Points', tableFormula('monk', 'focus_points'), 'short', { pool: true, minLevel: 2 })],
    overlay: {
      'monk-martial-arts': { tags: ['martial-arts'] },
      'monk-unarmored-defense': { effects: [eff('monk-unarmored-defense', [mod('ac-formula', undefined, { acFormula: { label: 'Unarmored Defense (10 + DEX + WIS)', base: 10, abilities: ['dex', 'wis'], allowsArmor: false, allowsShield: false } })])] },
      'monk-monks-focus': { usesResource: 'focus' },
      'monk-unarmored-movement': { effects: [eff('unarmored-movement', [mod('speed:walk', tableFormula('monk', 'unarmored_movement_bonus'), { requires: ['unarmored', 'no-shield'] })])] },
      'monk-uncanny-metabolism': { resource: res('uncanny-metabolism', 'Uncanny Metabolism', 1, 'long') },
      'monk-stunning-strike': { usesResource: 'focus', effects: [{ id: 'stunning-strike', name: 'Stunning Strike (1 Focus)', trigger: 'on-hit', scope: 'melee', oncePerTurn: true, consumes: { resourceId: 'focus', amount: 1 }, save: { ability: 'con', dc: { kind: 'formula', formula: '8 + prof + wis' }, onFailure: [{ kind: 'condition', condition: 'stunned', duration: 'until the start of your next turn' }], onSuccess: [{ kind: 'text', text: 'Speed halved; next attack against it has Advantage' }] } }] },
      'monk-evasion': { manual: true },
      'monk-disciplined-survivor': { effects: [eff('disciplined-survivor', [flag('prof-all-saves')])] },
      'monk-body-and-mind': { effects: [eff('body-and-mind', [mod('ability:dex', 4), mod('ability:wis', 4), mod('ability-max:dex', 25), mod('ability-max:wis', 25)])] },
    },
  }),
  cls('paladin', {
    description: 'A holy warrior bound to a sacred oath.', primary: ['str', 'cha'],
    armor: ['light', 'medium', 'heavy', 'shields'], weapons: ['simple', 'martial'], tools: [],
    spellcasting: sc('paladin', 'cha', 'half-up', 'prepared', { focus: 'Holy symbol' }),
    overlay: {
      'paladin-lay-on-hands': { activation: 'bonus', resource: res('lay-on-hands', 'Lay on Hands (HP pool)', '5 * cl', 'long', { pool: true }) },
      'paladin-weapon-mastery': mastery(2),
      'paladin-fighting-style': fightingStyle,
      'paladin-paladins-smite': { grants: { spells: [{ spellId: 'divine-smite', mode: 'always-prepared' }] }, resource: res('paladins-smite', "Paladin's Smite (free cast)", 1, 'long') },
      'paladin-channel-divinity': { resource: res('channel-divinity', 'Channel Divinity', tableFormula('paladin', 'channel_divinity_charges'), 'long', { shortRestRecover: 1 }) },
      'paladin-faithful-steed': { grants: { spells: [{ spellId: 'find-steed', mode: 'always-prepared' }] }, resource: res('faithful-steed', 'Faithful Steed (free cast)', 1, 'long') },
      'paladin-aura-of-protection': { effects: [eff('aura-of-protection', [mod('save:all', 'max(1, cha)')])] },
      'paladin-aura-of-courage': { grants: { conditionImmunities: ['frightened'] } },
      'paladin-radiant-strikes': { effects: [eff('radiant-strikes', [mod('extra-damage', '1d8', { damageType: 'radiant', scope: 'melee-weapon' })])] },
    },
  }),
  cls('ranger', {
    description: 'A wandering warrior who blends martial skill with primal magic.', primary: ['dex', 'wis'],
    spellcasting: sc('ranger', 'wis', 'half-up', 'known', { focus: 'Druidic focus' }),
    mcSkill: 1,
    overlay: {
      'ranger-favored-enemy': { grants: { spells: [{ spellId: 'hunters-mark', mode: 'always-prepared' }] }, resource: res('favored-enemy', "Favored Enemy (free Hunter's Mark)", tableFormula('ranger', 'favored_enemies'), 'long') },
      'ranger-weapon-mastery': mastery(2),
      'ranger-deft-explorer': { choices: [choice('expertise', 'Expertise (1 skill)', 'expertise', 1), choice('languages', 'Two languages', 'language', 2)] },
      'ranger-fighting-style': fightingStyle,
      'ranger-roving': { effects: [eff('roving', [mod('speed:walk', 10, { requires: ['no-heavy-armor'] })])], grants: { speeds: { climb: 'walk', swim: 'walk' } } },
      'ranger-expertise': { choices: [choice('expertise', 'Expertise (2 skills)', 'expertise', 2)] },
      'ranger-tireless': { resource: res('tireless', 'Tireless (temp HP)', 'max(1, wis)', 'long') },
      'ranger-natures-veil': { activation: 'bonus', resource: res('natures-veil', "Nature's Veil", 'max(1, wis)', 'long') },
      'ranger-feral-senses': { grants: { senses: { blindsight: 30 } } },
    },
  }),
  cls('rogue', {
    description: 'A dexterous expert in stealth and precise strikes.', primary: ['dex'], asiLevels: [4, 8, 10, 12, 16],
    weapons: ['simple', 'martial-finesse-light'], tools: ["Thieves' Tools"],
    mcGrants: { armor: ['light'], tools: ["Thieves' Tools"] }, mcSkill: 1,
    overlay: {
      'rogue-expertise': { choices: [choice('expertise', 'Expertise (2 skills)', 'expertise', 2)] },
      'rogue-sneak-attack': { effects: [{ id: 'sneak-attack', name: 'Sneak Attack', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '{ceil(cl/2)}d6', text: 'Finesse or Ranged weapon; Advantage, or an ally within 5 ft of the target and no Disadvantage.' }] }] },
      'rogue-thieves-cant': { grants: { languages: ["Thieves' Cant"] }, choices: [choice('language', 'One extra language', 'language', 1)] },
      'rogue-weapon-mastery': mastery(2),
      'rogue-cunning-action': { activation: 'bonus' },
      'rogue-cunning-strike': { manual: true }, 'rogue-uncanny-dodge': { activation: 'reaction', manual: true }, 'rogue-evasion': { manual: true },
      'rogue-reliable-talent': { tags: ['reliable-talent'] },
      'rogue-slippery-mind': { grants: { saves: ['wis', 'cha'] } },
      'rogue-stroke-of-luck': { resource: res('stroke-of-luck', 'Stroke of Luck', 1, 'short') },
    },
    extra: [ef('rogue-expertise-6', 'Expertise (2 more)', 'Gain Expertise in two more of your skill proficiencies.', 6, { choices: [choice('expertise', 'Expertise (2 skills)', 'expertise', 2)] })],
  }),
  cls('sorcerer', {
    description: 'A spellcaster with innate magic from a gift or bloodline.', primary: ['cha'],
    spellcasting: sc('sorcerer', 'cha', 'full', 'known', { focus: 'Arcane focus' }),
    resources: [res('sorcery-points', 'Sorcery Points', tableFormula('sorcerer', 'sorcery_points'), 'long', { pool: true, minLevel: 2 })],
    overlay: {
      'sorcerer-innate-sorcery': { activation: 'bonus', resource: res('innate-sorcery', 'Innate Sorcery', 2, 'long'), effects: [toggle('innate-sorcery', 'Innate Sorcery', [mod('spell-dc', 1), adv('attack', undefined, { scope: 'spell' })], { description: '1 minute: +1 spell save DC; Advantage on Sorcerer spell attacks.' })] },
      'sorcerer-font-of-magic': { usesResource: 'sorcery-points', tags: ['flexible-casting'] },
      'sorcerer-metamagic': { choices: [choice('options', 'Metamagic options', 'options', byLevel([[2, 2], [10, 4], [17, 6]]), { pool: 'metamagic-2024' })] },
      'sorcerer-sorcerous-restoration': { resource: res('sorcerous-restoration', 'Sorcerous Restoration', 1, 'long') },
    },
  }),
  cls('warlock', {
    description: 'A wielder of magic granted by a pact with an otherworldly patron.', primary: ['cha'],
    spellcasting: sc('warlock', 'cha', 'pact', 'known', { focus: 'Arcane focus' }),
    overlay: {
      'warlock-eldritch-invocations': { choices: [choice('invocations', 'Eldritch Invocations', 'options', tableFormula('warlock', 'eldritch_invocations'), { pool: 'invocations-2024' })] },
      'warlock-magical-cunning': { resource: res('magical-cunning', 'Magical Cunning', 1, 'long') },
      'warlock-contact-patron': { grants: { spells: [{ spellId: 'contact-other-plane', mode: 'always-prepared' }] }, resource: res('contact-patron', 'Contact Patron', 1, 'long') },
      'warlock-mystic-arcanum': hide,
      'warlock-eldritch-master': { manual: true },
    },
    extra: [arcanum(11, 6), arcanum(13, 7), arcanum(15, 8), arcanum(17, 9)],
  }),
  cls('wizard', {
    description: 'A scholarly magic-user who masters arcane spells through study.', primary: ['int'],
    spellcasting: sc('wizard', 'int', 'full', 'spellbook', { ritual: true, spellbookStart: 6, spellbookPerLevel: 2, focus: 'Arcane focus' }),
    overlay: {
      'wizard-arcane-recovery': { resource: res('arcane-recovery', 'Arcane Recovery', 1, 'long'), tags: ['arcane-recovery'] },
      'wizard-scholar': { choices: [choice('expertise', 'Scholar: Expertise in one', 'expertise', 1, { from: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'] })] },
      'wizard-spell-mastery': { choices: [choice('first', '1st-level mastery spell', 'spell', 1, { spellFilter: { classes: ['wizard'], levels: [1] }, spellMode: 'always-prepared' }), choice('second', '2nd-level mastery spell', 'spell', 1, { spellFilter: { classes: ['wizard'], levels: [2] }, spellMode: 'always-prepared' })] },
      'wizard-signature-spells': { choices: [choice('spells', 'Signature spells (3rd level)', 'spell', 2, { spellFilter: { classes: ['wizard'], levels: [3] }, spellMode: 'always-prepared' })], resource: res('signature-spells', 'Signature Spells', 2, 'short') },
    },
  }),
];

export const _unused2024 = { T24, ALL_SKILLS, ChoiceDefType: null as unknown as ChoiceDef };
