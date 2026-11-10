// 2024 species (SRD 5.2). No ability score increases here — they come from the background.
import type { FeatureDef, RaceDef, SubraceDef, SpellGrant } from '@/types/content';
import type { DamageType } from '@/types/core';
import { SRD52, T24 } from './helpers24';
import { mod, adv, grant, flag, eff, toggle, choice, res } from '../data/helpers';

const t = (id: string, name: string, o: Partial<FeatureDef> = {}): FeatureDef => ({ id, name, description: T24(`trait:${id}`, o.description ?? ''), source: SRD52, ...o, ...(o.description && !T24(`trait:${id}`) ? {} : {}) });
const sp = (spellId: string, minLevel: number, free = true): SpellGrant => ({ spellId, mode: minLevel === 1 && free === false ? 'always-prepared' : 'innate', minLevel, ...(free ? { uses: { max: 1, recharge: 'long' } } : {}) });
const cantrip = (spellId: string): SpellGrant => ({ spellId, mode: 'always-prepared' });
const castAbility = choice('ability', 'Spellcasting ability for these spells', 'options', 1, { options: [{ id: 'cast-int', name: 'Intelligence' }, { id: 'cast-wis', name: 'Wisdom' }, { id: 'cast-cha', name: 'Charisma' }] });
const sub = (id: string, name: string, traits: FeatureDef[], extra: Partial<SubraceDef> = {}): SubraceDef => ({ id, name, source: SRD52, description: '', traits, ...extra });
const species = (r: Omit<RaceDef, 'ruleset' | 'abilityBonuses' | 'source'>): RaceDef => ({ ruleset: 'dnd5e-2024', abilityBonuses: {}, source: SRD52, ...r });
const dv = (range: number) => t(`darkvision-${range}`, `Darkvision (${range} ft.)`, { grants: { senses: { darkvision: range } } });

const DRAGONS: [string, DamageType][] = [['black', 'acid'], ['blue', 'lightning'], ['brass', 'fire'], ['bronze', 'lightning'], ['copper', 'acid'], ['gold', 'fire'], ['green', 'poison'], ['red', 'fire'], ['silver', 'cold'], ['white', 'cold']];
const GIANTS: [string, string, string][] = [
  ['clouds-jaunt', "Cloud's Jaunt", 'Bonus Action: teleport up to 30 ft.'],
  ['fires-burn', "Fire's Burn", 'On a hit, deal an extra 1d10 fire damage.'],
  ['frosts-chill', "Frost's Chill", 'On a hit, deal an extra 1d6 cold damage and reduce speed by 10 ft.'],
  ['hills-tumble', "Hill's Tumble", 'On a hit against a Large or smaller creature, give it the Prone condition.'],
  ['stones-endurance', "Stone's Endurance", 'Reaction when you take damage: reduce it by 1d12 + CON modifier.'],
  ['storms-thunder', "Storm's Thunder", 'Reaction when damaged by a creature within 60 ft: deal 1d8 thunder damage to it.'],
];
const LEGACIES: [string, string, DamageType, string, string, string][] = [
  ['abyssal', 'Abyssal', 'poison', 'poison-spray', 'ray-of-sickness', 'hold-person'],
  ['chthonic', 'Chthonic', 'necrotic', 'chill-touch', 'false-life', 'ray-of-enfeeblement'],
  ['infernal', 'Infernal', 'fire', 'fire-bolt', 'hellish-rebuke', 'darkness'],
];

export const SPECIES_2024: RaceDef[] = [
  species({ id: 'dragonborn', name: 'Dragonborn', description: 'Descendants of dragons who carry their ancestors’ breath and resilience.', size: 'medium', speed: { walk: 30 }, creatureType: 'Humanoid',
    traits: [
      dv(60),
      t('draconic-ancestry', 'Draconic Ancestry'),
      t('draconic-breath-weapon', 'Breath Weapon', { description: 'Replace one attack with a 15-ft cone or 30-ft line: DEX save (DC 8 + CON + PB) for 1d10 damage of your ancestry type (2d10 at 5th, 3d10 at 11th, 4d10 at 17th), half on success. Proficiency bonus times per long rest.',
        resource: res('breath-weapon', 'Breath Weapon', 'prof', 'long'),
        effects: [{ id: 'breath-weapon', name: 'Breath Weapon', trigger: 'on-use', save: { ability: 'dex', dc: { kind: 'formula', formula: '8 + con + prof' }, onFailure: [{ kind: 'damage', dice: '{steps(lvl,1,1,5,2,11,3,17,4)}d10' }], onSuccess: [{ kind: 'text', text: 'half damage' }] } }] }),
      t('draconic-flight', 'Draconic Flight', { level: 5, activation: 'bonus', resource: res('draconic-flight', 'Draconic Flight', 1, 'long'), effects: [toggle('draconic-flight', 'Draconic Flight (10 min)', [mod('speed:fly', 'walk', { op: 'max' })])] }),
    ],
    subraces: DRAGONS.map(([c, d]) => sub(`draconic-ancestor-${c}`, `${c[0].toUpperCase() + c.slice(1)} Dragon (${d})`, [{ id: `draconic-resistance-${d}`, name: 'Damage Resistance', description: `Resistance to ${d} damage. Your Breath Weapon deals ${d} damage.`, source: SRD52, grants: { resistances: [d] } }])),
    subraceRequired: true,
  }),
  species({ id: 'dwarf', name: 'Dwarf', description: 'Bold and hardy folk of stone and forge.', size: 'medium', speed: { walk: 30 }, creatureType: 'Humanoid',
    traits: [
      dv(120),
      t('dwarven-resilience', 'Dwarven Resilience', { grants: { resistances: ['poison'] }, effects: [eff('dwarven-resilience', [adv('save:all', 'to avoid or end the Poisoned condition')])] }),
      t('dwarven-toughness', 'Dwarven Toughness', { effects: [eff('dwarven-toughness', [mod('hp-per-level', 1)])] }),
      t('stonecunning', 'Stonecunning', { activation: 'bonus', resource: res('stonecunning', 'Stonecunning (Tremorsense 60 ft, 10 min)', 'prof', 'long') }),
    ],
  }),
  species({ id: 'elf', name: 'Elf', description: 'A magical people of otherworldly grace.', size: 'medium', speed: { walk: 30 }, creatureType: 'Humanoid',
    traits: [
      dv(60),
      t('elven-lineage', 'Elven Lineage', { choices: [castAbility] }),
      t('fey-ancestry', 'Fey Ancestry', { effects: [eff('fey-ancestry', [adv('save:all', 'to avoid or end the Charmed condition')])] }),
      t('keen-senses', 'Keen Senses', { choices: [choice('skill', 'Keen Senses skill', 'skill', 1, { from: ['insight', 'perception', 'survival'] })] }),
      t('trance', 'Trance'),
    ],
    subraces: [
      sub('elven-lineage-drow', 'Drow', [{ id: 'drow-lineage', name: 'Drow Lineage', description: 'Darkvision 120 ft; Dancing Lights; Faerie Fire (3rd) and Darkness (5th) once per long rest each.', source: SRD52, grants: { senses: { darkvision: 120 }, spells: [cantrip('dancing-lights'), sp('faerie-fire', 3), sp('darkness', 5)] } }]),
      sub('elven-lineage-high-elf', 'High Elf', [{ id: 'high-elf-lineage', name: 'High Elf Lineage', description: 'Prestidigitation (swap for another Wizard cantrip on a long rest); Detect Magic (3rd) and Misty Step (5th) once per long rest each.', source: SRD52, grants: { spells: [cantrip('prestidigitation'), sp('detect-magic', 3), sp('misty-step', 5)] } }]),
      sub('elven-lineage-wood-elf', 'Wood Elf', [{ id: 'wood-elf-lineage', name: 'Wood Elf Lineage', description: 'Speed 35 ft; Druidcraft; Longstrider (3rd) and Pass without Trace (5th) once per long rest each.', source: SRD52, grants: { spells: [cantrip('druidcraft'), sp('longstrider', 3), sp('pass-without-trace', 5)] } }], { speed: { walk: 35 } }),
    ],
    subraceRequired: true,
  }),
  species({ id: 'gnome', name: 'Gnome', description: 'Small, inventive, and endlessly curious.', size: 'small', speed: { walk: 30 }, creatureType: 'Humanoid',
    traits: [
      dv(60),
      t('gnomish-cunning', 'Gnomish Cunning', { effects: [eff('gnomish-cunning', [adv('save:int'), adv('save:wis'), adv('save:cha')])] }),
      t('gnomish-lineage', 'Gnomish Lineage', { choices: [castAbility] }),
    ],
    subraces: [
      sub('gnomish-lineage-forest-gnome', 'Forest Gnome', [{ id: 'forest-gnome-lineage', name: 'Forest Gnome', description: 'Minor Illusion; Speak with Animals always prepared, free proficiency bonus times per long rest.', source: SRD52, grants: { spells: [cantrip('minor-illusion'), { spellId: 'speak-with-animals', mode: 'innate', uses: { max: 'prof', recharge: 'long' } }] } }]),
      sub('gnomish-lineage-rock-gnome', 'Rock Gnome', [{ id: 'rock-gnome-lineage', name: 'Rock Gnome', description: 'Mending and Prestidigitation; build tiny clockwork devices.', source: SRD52, grants: { spells: [cantrip('mending'), cantrip('prestidigitation')] } }]),
    ],
    subraceRequired: true,
  }),
  species({ id: 'goliath', name: 'Goliath', description: 'Towering folk descended from giants.', size: 'medium', speed: { walk: 35 }, creatureType: 'Humanoid',
    traits: [
      t('giant-ancestry', 'Giant Ancestry', { resource: res('giant-ancestry', 'Giant Ancestry', 'prof', 'long') }),
      t('large-form', 'Large Form', { level: 5, activation: 'bonus', resource: res('large-form', 'Large Form', 1, 'long'), effects: [toggle('large-form', 'Large Form (10 min)', [adv('check:str'), mod('speed:walk', 10)])] }),
      t('powerful-build', 'Powerful Build', { effects: [eff('powerful-build', [flag('powerful-build')])] }),
    ],
    subraces: GIANTS.map(([id, name, d]) => sub(`giant-ancestry-${id}`, name, [{ id: `giant-${id}`, name, description: d, source: SRD52, usesResource: 'giant-ancestry' }])),
    subraceRequired: true,
  }),
  species({ id: 'halfling', name: 'Halfling', description: 'Small and practical folk who prize home and comfort.', size: 'small', speed: { walk: 30 }, creatureType: 'Humanoid',
    traits: [
      t('brave', 'Brave', { effects: [eff('brave', [adv('save:all', 'to avoid or end the Frightened condition')])] }),
      t('halfling-nimbleness', 'Halfling Nimbleness'),
      t('luck', 'Luck', { effects: [eff('halfling-lucky', [flag('halfling-lucky')])] }),
      t('naturally-stealthy', 'Naturally Stealthy'),
    ],
  }),
  species({ id: 'human', name: 'Human', description: 'The most adaptable and ambitious people.', size: 'medium', sizeOptions: ['small', 'medium'], speed: { walk: 30 }, creatureType: 'Humanoid',
    traits: [
      t('resourceful', 'Resourceful', { description: 'You gain Heroic Inspiration whenever you finish a Long Rest.' }),
      t('skillful', 'Skillful', { choices: [choice('skill', 'Skillful: one skill', 'skill', 1)] }),
      t('versatile', 'Versatile', { choices: [choice('feat', 'Versatile: an Origin feat', 'feat', 1, { featCategories: ['origin'] })] }),
    ],
  }),
  species({ id: 'orc', name: 'Orc', description: 'Tireless folk gifted by Gruumsh with endurance and drive.', size: 'medium', speed: { walk: 30 }, creatureType: 'Humanoid',
    traits: [
      t('adrenaline-rush', 'Adrenaline Rush', { activation: 'bonus', resource: res('adrenaline-rush', 'Adrenaline Rush', 'prof', 'long', { shortRestRecover: 'prof' }), effects: [{ id: 'adrenaline-rush', name: 'Adrenaline Rush', trigger: 'on-use', outcomes: [{ kind: 'temp-hp', dice: '{prof}' }] }] }),
      dv(120),
      t('relentless-endurance', 'Relentless Endurance', { resource: res('relentless-endurance', 'Relentless Endurance', 1, 'long') }),
    ],
  }),
  species({ id: 'tiefling', name: 'Tiefling', description: 'Mortals touched by the Lower Planes.', size: 'medium', sizeOptions: ['small', 'medium'], speed: { walk: 30 }, creatureType: 'Humanoid',
    traits: [
      dv(60),
      t('fiendish-legacy', 'Fiendish Legacy', { choices: [castAbility] }),
      t('otherworldly-presence', 'Otherworldly Presence', { grants: { spells: [cantrip('thaumaturgy')] } }),
    ],
    subraces: LEGACIES.map(([id, name, dt, c, s3, s5]) => sub(`fiendish-legacy-${id}`, name, [{ id: `legacy-${id}`, name: `${name} Legacy`, description: `Resistance to ${dt} damage; ${c.replace(/-/g, ' ')} cantrip; ${s3.replace(/-/g, ' ')} (3rd) and ${s5.replace(/-/g, ' ')} (5th) once per long rest each.`, source: SRD52, grants: { resistances: [dt], spells: [cantrip(c), sp(s3, 3), sp(s5, 5)] } }])),
    subraceRequired: true,
  }),
];

export { grant };
