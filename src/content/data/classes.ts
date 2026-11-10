// The 12 core classes (SRD 5.1 text, structured mechanics).
import type { ClassDef, FeatureDef } from '@/types/content';
import { SRD, T, f, res, mod, adv, grant, flag, eff, toggle, choice, byLevel } from './helpers';

const ASI = [4, 8, 12, 16, 19];
const subFeature = (level: number, id: string, name: string, desc: string): FeatureDef => f(level, id, name, desc, { tags: ['subclass-placeholder'], hidden: true });

const RAGE_DMG = byLevel([[1, 2], [9, 3], [16, 4]]);

const barbarian: ClassDef = {
  id: 'barbarian', name: 'Barbarian', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A fierce warrior of primitive background who can enter a battle rage.',
  hitDie: 12, primaryAbilities: ['str'], saves: ['str', 'con'],
  skillChoices: { count: 2, from: ['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
  armor: ['light', 'medium', 'shields'], weapons: ['simple', 'martial'], tools: [],
  multiclass: { prerequisite: { all: { str: 13 } }, grants: { armor: ['shields'], weapons: ['simple', 'martial'] } },
  startingEquipment: [
    { label: 'Primary weapon', options: [{ label: 'Greataxe', items: [{ itemId: 'greataxe' }] }, { label: 'Any martial melee weapon', items: [{ itemId: '@martial-melee' }] }] },
    { label: 'Secondary', options: [{ label: 'Two handaxes', items: [{ itemId: 'handaxe', quantity: 2 }] }, { label: 'Any simple weapon', items: [{ itemId: '@simple' }] }] },
  ],
  startingFixed: [{ itemId: 'explorers-pack' }, { itemId: 'javelin', quantity: 4 }],
  startingGold: '2d4x10',
  subclassLevel: 3, subclassLabel: 'Primal Path', asiLevels: ASI,
  resources: [res('rage', 'Rage', byLevel([[1, 2], [3, 3], [6, 4], [12, 5], [17, 6], [20, 999]]), 'long')],
  features: [
    f(1, 'rage', 'Rage', T('rage'), {
      activation: 'bonus', usesResource: 'rage',
      effects: [toggle('rage', 'Raging', [
        adv('check:str', undefined, { requires: ['no-heavy-armor'] }),
        adv('save:str', undefined, { requires: ['no-heavy-armor'] }),
        mod('damage', RAGE_DMG, { scope: 'melee-weapon', requires: ['no-heavy-armor', 'str-attack'] }),
        grant('resistance:bludgeoning', { requires: ['no-heavy-armor'] }),
        grant('resistance:piercing', { requires: ['no-heavy-armor'] }),
        grant('resistance:slashing', { requires: ['no-heavy-armor'] }),
      ], { description: 'Bonus action. 1 minute. Advantage on STR checks/saves, +rage damage on STR melee weapon attacks, resistance to B/P/S. Cannot cast or concentrate on spells.' })],
    }),
    f(1, 'barbarian-unarmored-defense', 'Unarmored Defense', T('barbarian-unarmored-defense'), {
      effects: [eff('barbarian-unarmored-defense', [mod('ac-formula', undefined, { acFormula: { label: 'Unarmored Defense (10 + DEX + CON)', base: 10, abilities: ['dex', 'con'], allowsArmor: false, allowsShield: true } })])],
    }),
    f(2, 'reckless-attack', 'Reckless Attack', T('reckless-attack'), {
      effects: [toggle('reckless-attack', 'Reckless Attack', [adv('attack', undefined, { scope: 'melee-weapon', requires: ['str-attack'] })], { description: 'Advantage on STR melee weapon attacks this turn; attacks against you have advantage until your next turn.' })],
    }),
    f(2, 'danger-sense', 'Danger Sense', T('danger-sense'), { effects: [eff('danger-sense', [adv('save:dex', "against effects you can see (not blinded, deafened, or incapacitated)")])] }),
    subFeature(3, 'primal-path', 'Primal Path', T('primal-path')),
    f(5, 'barbarian-extra-attack', 'Extra Attack', T('barbarian-extra-attack')),
    f(5, 'fast-movement', 'Fast Movement', T('fast-movement'), { effects: [eff('fast-movement', [mod('speed:walk', 10, { requires: ['no-heavy-armor'] })])] }),
    f(7, 'feral-instinct', 'Feral Instinct', T('feral-instinct'), { effects: [eff('feral-instinct', [adv('initiative')])] }),
    f(9, 'brutal-critical-1-die', 'Brutal Critical (1 die)', T('brutal-critical-1-die'), { tags: ['crit'] }),
    f(11, 'relentless-rage', 'Relentless Rage', T('relentless-rage'), { manual: true }),
    f(13, 'brutal-critical-2-dice', 'Brutal Critical (2 dice)', T('brutal-critical-2-dice'), { replaces: 'brutal-critical-1-die' }),
    f(15, 'persistent-rage', 'Persistent Rage', T('persistent-rage')),
    f(17, 'brutal-critical-3-dice', 'Brutal Critical (3 dice)', T('brutal-critical-3-dice'), { replaces: 'brutal-critical-2-dice' }),
    f(18, 'indomitable-might', 'Indomitable Might', T('indomitable-might'), { manual: true }),
    f(20, 'primal-champion', 'Primal Champion', T('primal-champion'), {
      effects: [eff('primal-champion', [mod('ability:str', 4), mod('ability:con', 4), mod('ability-max:str', 24), mod('ability-max:con', 24)])],
    }),
  ],
};

const BARD_KNOWN = [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22];
const bard: ClassDef = {
  id: 'bard', name: 'Bard', ruleset: 'dnd5e-2014', source: SRD,
  description: 'An inspiring magician whose power echoes the music of creation.',
  hitDie: 8, primaryAbilities: ['cha'], saves: ['dex', 'cha'],
  skillChoices: { count: 3, from: ['acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleight-of-hand', 'stealth', 'survival'] },
  armor: ['light'], weapons: ['simple', 'crossbow-hand', 'longsword', 'rapier', 'shortsword'], tools: [],
  toolChoices: { count: 3, from: ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol'] },
  multiclass: { prerequisite: { all: { cha: 13 } }, grants: { armor: ['light'] }, skillCount: 1 },
  startingEquipment: [
    { label: 'Weapon', options: [{ label: 'Rapier', items: [{ itemId: 'rapier' }] }, { label: 'Longsword', items: [{ itemId: 'longsword' }] }, { label: 'Any simple weapon', items: [{ itemId: '@simple' }] }] },
    { label: 'Pack', options: [{ label: "Diplomat's pack", items: [{ itemId: 'diplomats-pack' }] }, { label: "Entertainer's pack", items: [{ itemId: 'entertainers-pack' }] }] },
    { label: 'Instrument', options: [{ label: 'Lute', items: [{ itemId: 'lute' }] }, { label: 'Any other musical instrument', items: [{ itemId: '@instrument' }] }] },
  ],
  startingFixed: [{ itemId: 'leather-armor' }, { itemId: 'dagger' }],
  startingGold: '5d4x10',
  spellcasting: { ability: 'cha', progression: 'full', style: 'known', list: 'bard', cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], known: BARD_KNOWN, ritual: true, focus: 'Musical instrument' },
  subclassLevel: 3, subclassLabel: 'Bard College', asiLevels: ASI,
  features: [
    f(1, 'spellcasting-bard', 'Spellcasting', T('spellcasting-bard')),
    f(1, 'bardic-inspiration-d6', 'Bardic Inspiration', T('bardic-inspiration-d6'), {
      activation: 'bonus',
      resource: res('bardic-inspiration', 'Bardic Inspiration', 'max(1, cha)', 'long', { die: byLevel([[1, 6], [5, 8], [10, 10], [15, 12]]) }),
    }),
    f(2, 'jack-of-all-trades', 'Jack of All Trades', T('jack-of-all-trades'), { effects: [eff('jack-of-all-trades', [{ target: 'prof:half-unproficient-checks', op: 'grant' }])] }),
    f(2, 'song-of-rest-d6', 'Song of Rest', T('song-of-rest-d6'), { tags: ['short-rest'] }),
    subFeature(3, 'bard-college', 'Bard College', T('bard-college')),
    f(3, 'bard-expertise-1', 'Expertise', T('bard-expertise-1'), { choices: [choice('expertise', 'Expertise skills', 'expertise', 2)] }),
    f(5, 'font-of-inspiration', 'Font of Inspiration', T('font-of-inspiration'), {
      resource: res('bardic-inspiration', 'Bardic Inspiration', 'max(1, cha)', 'short', { die: byLevel([[1, 6], [5, 8], [10, 10], [15, 12]]) }),
    }),
    f(6, 'countercharm', 'Countercharm', T('countercharm'), { activation: 'action' }),
    f(10, 'bard-expertise-2', 'Expertise', T('bard-expertise-2'), { choices: [choice('expertise', 'Expertise skills', 'expertise', 2)] }),
    f(10, 'magical-secrets-1', 'Magical Secrets', T('magical-secrets-1'), { choices: [choice('spells', 'Magical Secrets spells (any class)', 'spell', 2, { spellMode: 'known' })] }),
    f(14, 'magical-secrets-2', 'Magical Secrets', T('magical-secrets-2'), { choices: [choice('spells', 'Magical Secrets spells (any class)', 'spell', 2, { spellMode: 'known' })] }),
    f(18, 'magical-secrets-3', 'Magical Secrets', T('magical-secrets-3'), { choices: [choice('spells', 'Magical Secrets spells (any class)', 'spell', 2, { spellMode: 'known' })] }),
    f(20, 'superior-inspiration', 'Superior Inspiration', T('superior-inspiration')),
  ],
};

const cleric: ClassDef = {
  id: 'cleric', name: 'Cleric', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A priestly champion who wields divine magic in service of a higher power.',
  hitDie: 8, primaryAbilities: ['wis'], saves: ['wis', 'cha'],
  skillChoices: { count: 2, from: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
  armor: ['light', 'medium', 'shields'], weapons: ['simple'], tools: [],
  multiclass: { prerequisite: { all: { wis: 13 } }, grants: { armor: ['light', 'medium', 'shields'] } },
  startingEquipment: [
    { label: 'Weapon', options: [{ label: 'Mace', items: [{ itemId: 'mace' }] }, { label: 'Warhammer (if proficient)', items: [{ itemId: 'warhammer' }] }] },
    { label: 'Armor', options: [{ label: 'Scale mail', items: [{ itemId: 'scale-mail' }] }, { label: 'Leather armor', items: [{ itemId: 'leather-armor' }] }, { label: 'Chain mail (if proficient)', items: [{ itemId: 'chain-mail' }] }] },
    { label: 'Ranged', options: [{ label: 'Light crossbow and 20 bolts', items: [{ itemId: 'crossbow-light' }, { itemId: 'crossbow-bolt', quantity: 20 }] }, { label: 'Any simple weapon', items: [{ itemId: '@simple' }] }] },
    { label: 'Pack', options: [{ label: "Priest's pack", items: [{ itemId: 'priests-pack' }] }, { label: "Explorer's pack", items: [{ itemId: 'explorers-pack' }] }] },
  ],
  startingFixed: [{ itemId: 'shield' }, { itemId: 'emblem' }],
  startingGold: '5d4x10',
  spellcasting: { ability: 'wis', progression: 'full', style: 'prepared', list: 'cleric', cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], prepared: 'max(1, wis + cl)', ritual: true, focus: 'Holy symbol' },
  subclassLevel: 1, subclassLabel: 'Divine Domain', asiLevels: ASI,
  resources: [res('channel-divinity', 'Channel Divinity', byLevel([[2, 1], [6, 2], [18, 3]]), 'short', { minLevel: 2 })],
  features: [
    f(1, 'spellcasting-cleric', 'Spellcasting', T('spellcasting-cleric')),
    subFeature(1, 'divine-domain', 'Divine Domain', T('divine-domain')),
    f(2, 'channel-divinity-1-rest', 'Channel Divinity', T('channel-divinity-1-rest'), { usesResource: 'channel-divinity' }),
    f(2, 'channel-divinity-turn-undead', 'Channel Divinity: Turn Undead', T('channel-divinity-turn-undead'), { activation: 'action', usesResource: 'channel-divinity', effects: [{ id: 'turn-undead', name: 'Turn Undead', trigger: 'on-use', save: { ability: 'wis', dc: { kind: 'spell', classId: 'cleric' }, onFailure: [{ kind: 'text', text: 'Undead within 30 ft is turned for 1 minute or until damaged.' }] } }] }),
    f(5, 'destroy-undead-cr-1-2-or-below', 'Destroy Undead (CR 1/2)', T('destroy-undead-cr-1-2-or-below')),
    f(8, 'destroy-undead-cr-1-or-below', 'Destroy Undead (CR 1)', T('destroy-undead-cr-1-or-below'), { replaces: 'destroy-undead-cr-1-2-or-below' }),
    f(10, 'divine-intervention', 'Divine Intervention', T('divine-intervention'), { activation: 'action', resource: res('divine-intervention', 'Divine Intervention', 1, 'long'), manual: true }),
    f(11, 'destroy-undead-cr-2-or-below', 'Destroy Undead (CR 2)', T('destroy-undead-cr-2-or-below'), { replaces: 'destroy-undead-cr-1-or-below' }),
    f(14, 'destroy-undead-cr-3-or-below', 'Destroy Undead (CR 3)', T('destroy-undead-cr-3-or-below'), { replaces: 'destroy-undead-cr-2-or-below' }),
    f(17, 'destroy-undead-cr-4-or-below', 'Destroy Undead (CR 4)', T('destroy-undead-cr-4-or-below'), { replaces: 'destroy-undead-cr-3-or-below' }),
    f(20, 'divine-intervention-improvement', 'Divine Intervention Improvement', T('divine-intervention-improvement'), { replaces: 'divine-intervention', resource: res('divine-intervention', 'Divine Intervention', 1, 'long') }),
  ],
};

const druid: ClassDef = {
  id: 'druid', name: 'Druid', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A priest of the Old Faith, wielding the powers of nature and adopting animal forms.',
  hitDie: 8, primaryAbilities: ['wis'], saves: ['int', 'wis'],
  skillChoices: { count: 2, from: ['arcana', 'animal-handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
  armor: ['light', 'medium', 'shields'], weapons: ['club', 'dagger', 'dart', 'javelin', 'mace', 'quarterstaff', 'scimitar', 'sickle', 'sling', 'spear'], tools: ['Herbalism kit'],
  multiclass: { prerequisite: { all: { wis: 13 } }, grants: { armor: ['light', 'medium', 'shields'] } },
  startingEquipment: [
    { label: 'Shield or weapon', options: [{ label: 'Wooden shield', items: [{ itemId: 'shield' }] }, { label: 'Any simple weapon', items: [{ itemId: '@simple' }] }] },
    { label: 'Melee', options: [{ label: 'Scimitar', items: [{ itemId: 'scimitar' }] }, { label: 'Any simple melee weapon', items: [{ itemId: '@simple-melee' }] }] },
  ],
  startingFixed: [{ itemId: 'leather-armor' }, { itemId: 'explorers-pack' }, { itemId: 'sprig-of-mistletoe' }],
  startingGold: '2d4x10',
  spellcasting: { ability: 'wis', progression: 'full', style: 'prepared', list: 'druid', cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], prepared: 'max(1, wis + cl)', ritual: true, focus: 'Druidic focus' },
  subclassLevel: 2, subclassLabel: 'Druid Circle', asiLevels: ASI,
  features: [
    f(1, 'druidic', 'Druidic', T('druidic'), { grants: { languages: ['Druidic'] } }),
    f(1, 'spellcasting-druid', 'Spellcasting', T('spellcasting-druid')),
    f(2, 'wild-shape', 'Wild Shape', T('wild-shape-cr-1-4-or-below-no-flying-or-swim-speed', 'Magically assume the shape of a beast you have seen. Max CR 1/4 (no fly/swim) at 2nd, CR 1/2 (no fly) at 4th, CR 1 at 8th.'), {
      activation: 'action',
      resource: res('wild-shape', 'Wild Shape', byLevel([[2, 2], [20, 999]]), 'short'),
      effects: [toggle('wild-shape', 'Wild Shaped', [], { description: "Use the beast's statistics (track its HP separately). Max CR: 1/4 (lvl 2), 1/2 (lvl 4), 1 (lvl 8).", manual: true })],
    }),
    subFeature(2, 'druid-circle', 'Druid Circle', T('druid-circle')),
    f(18, 'druid-timeless-body', 'Timeless Body', T('druid-timeless-body')),
    f(18, 'beast-spells', 'Beast Spells', T('beast-spells')),
    f(20, 'archdruid', 'Archdruid', T('archdruid')),
  ],
};

const FIGHTER_EK_KNOWN = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];
export { FIGHTER_EK_KNOWN };

const fighter: ClassDef = {
  id: 'fighter', name: 'Fighter', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A master of martial combat, skilled with a variety of weapons and armor.',
  hitDie: 10, primaryAbilities: ['str', 'dex'], saves: ['str', 'con'],
  skillChoices: { count: 2, from: ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'] },
  armor: ['light', 'medium', 'heavy', 'shields'], weapons: ['simple', 'martial'], tools: [],
  multiclass: { prerequisite: { any: { str: 13, dex: 13 } }, grants: { armor: ['light', 'medium', 'shields'], weapons: ['simple', 'martial'] } },
  startingEquipment: [
    { label: 'Armor', options: [{ label: 'Chain mail', items: [{ itemId: 'chain-mail' }] }, { label: 'Leather armor, longbow, 20 arrows', items: [{ itemId: 'leather-armor' }, { itemId: 'longbow' }, { itemId: 'arrow', quantity: 20 }] }] },
    { label: 'Weapons', options: [{ label: 'Martial weapon and a shield', items: [{ itemId: '@martial' }, { itemId: 'shield' }] }, { label: 'Two martial weapons', items: [{ itemId: '@martial' }, { itemId: '@martial' }] }] },
    { label: 'Ranged', options: [{ label: 'Light crossbow and 20 bolts', items: [{ itemId: 'crossbow-light' }, { itemId: 'crossbow-bolt', quantity: 20 }] }, { label: 'Two handaxes', items: [{ itemId: 'handaxe', quantity: 2 }] }] },
    { label: 'Pack', options: [{ label: "Dungeoneer's pack", items: [{ itemId: 'dungeoneers-pack' }] }, { label: "Explorer's pack", items: [{ itemId: 'explorers-pack' }] }] },
  ],
  startingFixed: [],
  startingGold: '5d4x10',
  subclassLevel: 3, subclassLabel: 'Martial Archetype', asiLevels: [4, 6, 8, 12, 14, 16, 19],
  features: [
    f(1, 'fighter-fighting-style', 'Fighting Style', T('fighter-fighting-style'), { choices: [choice('style', 'Fighting Style', 'options', 1, { pool: 'fighting-styles' })] }),
    f(1, 'second-wind', 'Second Wind', T('second-wind'), { activation: 'bonus', resource: res('second-wind', 'Second Wind', 1, 'short'), effects: [{ id: 'second-wind-heal', name: 'Second Wind', trigger: 'on-use', outcomes: [{ kind: 'heal', dice: '1d10+{cl}' }] }] }),
    f(2, 'action-surge', 'Action Surge', T('action-surge-1-use'), { resource: res('action-surge', 'Action Surge', byLevel([[2, 1], [17, 2]]), 'short') }),
    subFeature(3, 'martial-archetype', 'Martial Archetype', T('martial-archetype')),
    f(5, 'extra-attack-1', 'Extra Attack', T('extra-attack-1')),
    f(9, 'indomitable', 'Indomitable', T('indomitable-1-use'), { resource: res('indomitable', 'Indomitable', byLevel([[9, 1], [13, 2], [17, 3]]), 'long') }),
    f(11, 'extra-attack-2', 'Extra Attack (2)', T('extra-attack-2'), { replaces: 'extra-attack-1' }),
    f(20, 'extra-attack-3', 'Extra Attack (3)', T('extra-attack-3'), { replaces: 'extra-attack-2' }),
  ],
};

const MONK_MA = byLevel([[1, 4], [5, 6], [11, 8], [17, 10]]);
const monk: ClassDef = {
  id: 'monk', name: 'Monk', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A master of martial arts, harnessing the power of the body in pursuit of physical and spiritual perfection.',
  hitDie: 8, primaryAbilities: ['dex', 'wis'], saves: ['str', 'dex'],
  skillChoices: { count: 2, from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
  armor: [], weapons: ['simple', 'shortsword'], tools: [],
  toolChoices: { count: 1, from: ["Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies", "Carpenter's tools", "Cartographer's tools", "Cobbler's tools", "Cook's utensils", "Glassblower's tools", "Jeweler's tools", "Leatherworker's tools", "Mason's tools", "Painter's supplies", "Potter's tools", "Smith's tools", "Tinker's tools", "Weaver's tools", "Woodcarver's tools", 'Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol'] },
  multiclass: { prerequisite: { all: { dex: 13, wis: 13 } }, grants: { weapons: ['simple', 'shortsword'] } },
  startingEquipment: [
    { label: 'Weapon', options: [{ label: 'Shortsword', items: [{ itemId: 'shortsword' }] }, { label: 'Any simple weapon', items: [{ itemId: '@simple' }] }] },
    { label: 'Pack', options: [{ label: "Dungeoneer's pack", items: [{ itemId: 'dungeoneers-pack' }] }, { label: "Explorer's pack", items: [{ itemId: 'explorers-pack' }] }] },
  ],
  startingFixed: [{ itemId: 'dart', quantity: 10 }],
  startingGold: '5d4',
  subclassLevel: 3, subclassLabel: 'Monastic Tradition', asiLevels: ASI,
  resources: [res('ki', 'Ki Points', 'cl', 'short', { pool: true, minLevel: 2 })],
  features: [
    f(1, 'monk-unarmored-defense', 'Unarmored Defense', T('monk-unarmored-defense'), {
      effects: [eff('monk-unarmored-defense', [mod('ac-formula', undefined, { acFormula: { label: 'Unarmored Defense (10 + DEX + WIS)', base: 10, abilities: ['dex', 'wis'], allowsArmor: false, allowsShield: false } })])],
    }),
    f(1, 'martial-arts', 'Martial Arts', T('martial-arts') + '\n\nMartial Arts die: d4 (1st), d6 (5th), d8 (11th), d10 (17th). Applied automatically to unarmed strikes and monk weapons.', { tags: [`die:${MONK_MA}`] }),
    f(2, 'ki', 'Ki', T('ki'), { usesResource: 'ki' }),
    f(2, 'flurry-of-blows', 'Flurry of Blows', T('flurry-of-blows'), { activation: 'bonus', usesResource: 'ki' }),
    f(2, 'patient-defense', 'Patient Defense', T('patient-defense'), { activation: 'bonus', usesResource: 'ki' }),
    f(2, 'step-of-the-wind', 'Step of the Wind', T('step-of-the-wind'), { activation: 'bonus', usesResource: 'ki' }),
    f(2, 'unarmored-movement-1', 'Unarmored Movement', T('unarmored-movement-1'), {
      effects: [eff('unarmored-movement', [mod('speed:walk', byLevel([[2, 10], [6, 15], [10, 20], [14, 25], [18, 30]]), { requires: ['unarmored', 'no-shield'] })])],
    }),
    subFeature(3, 'monastic-tradition', 'Monastic Tradition', T('monastic-tradition')),
    f(3, 'deflect-missiles', 'Deflect Missiles', T('deflect-missiles'), { activation: 'reaction' }),
    f(4, 'slow-fall', 'Slow Fall', T('slow-fall'), { activation: 'reaction' }),
    f(5, 'monk-extra-attack', 'Extra Attack', T('monk-extra-attack')),
    f(5, 'stunning-strike', 'Stunning Strike', T('stunning-strike'), {
      usesResource: 'ki',
      effects: [{ id: 'stunning-strike', name: 'Stunning Strike (1 ki)', trigger: 'on-hit', scope: 'melee', consumes: { resourceId: 'ki', amount: 1 }, save: { ability: 'con', dc: { kind: 'formula', formula: '8 + prof + wis' }, onFailure: [{ kind: 'condition', condition: 'stunned', duration: 'until the end of your next turn' }] } }],
    }),
    f(6, 'ki-empowered-strikes', 'Ki-Empowered Strikes', T('ki-empowered-strikes')),
    f(7, 'monk-evasion', 'Evasion', T('monk-evasion'), { manual: true }),
    f(7, 'stillness-of-mind', 'Stillness of Mind', T('stillness-of-mind'), { activation: 'action' }),
    f(9, 'unarmored-movement-2', 'Unarmored Movement Improvement', T('unarmored-movement-2')),
    f(10, 'purity-of-body', 'Purity of Body', T('purity-of-body'), { grants: { immunities: ['poison'], conditionImmunities: ['poisoned'] } }),
    f(13, 'tongue-of-the-sun-and-moon', 'Tongue of the Sun and Moon', T('tongue-of-the-sun-and-moon')),
    f(14, 'diamond-soul', 'Diamond Soul', T('diamond-soul'), { effects: [eff('diamond-soul', [flag('prof-all-saves')])] }),
    f(15, 'monk-timeless-body', 'Timeless Body', T('monk-timeless-body')),
    f(18, 'empty-body', 'Empty Body', T('empty-body'), { activation: 'action', usesResource: 'ki' }),
    f(20, 'perfect-self', 'Perfect Self', T('perfect-self')),
  ],
};

const paladin: ClassDef = {
  id: 'paladin', name: 'Paladin', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A holy warrior bound to a sacred oath.',
  hitDie: 10, primaryAbilities: ['str', 'cha'], saves: ['wis', 'cha'],
  skillChoices: { count: 2, from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
  armor: ['light', 'medium', 'heavy', 'shields'], weapons: ['simple', 'martial'], tools: [],
  multiclass: { prerequisite: { all: { str: 13, cha: 13 } }, grants: { armor: ['light', 'medium', 'shields'], weapons: ['simple', 'martial'] } },
  startingEquipment: [
    { label: 'Weapons', options: [{ label: 'Martial weapon and a shield', items: [{ itemId: '@martial' }, { itemId: 'shield' }] }, { label: 'Two martial weapons', items: [{ itemId: '@martial' }, { itemId: '@martial' }] }] },
    { label: 'Secondary', options: [{ label: 'Five javelins', items: [{ itemId: 'javelin', quantity: 5 }] }, { label: 'Any simple melee weapon', items: [{ itemId: '@simple-melee' }] }] },
    { label: 'Pack', options: [{ label: "Priest's pack", items: [{ itemId: 'priests-pack' }] }, { label: "Explorer's pack", items: [{ itemId: 'explorers-pack' }] }] },
  ],
  startingFixed: [{ itemId: 'chain-mail' }, { itemId: 'emblem' }],
  startingGold: '5d4x10',
  spellcasting: { ability: 'cha', progression: 'half', style: 'prepared', list: 'paladin', prepared: 'max(1, cha + floor(cl / 2))', startLevel: 2, focus: 'Holy symbol' },
  subclassLevel: 3, subclassLabel: 'Sacred Oath', asiLevels: ASI,
  resources: [res('channel-divinity', 'Channel Divinity', 1, 'short', { minLevel: 3 })],
  features: [
    f(1, 'divine-sense', 'Divine Sense', T('divine-sense'), { activation: 'action', resource: res('divine-sense', 'Divine Sense', '1 + max(0, cha)', 'long') }),
    f(1, 'lay-on-hands', 'Lay on Hands', T('lay-on-hands'), { activation: 'action', resource: res('lay-on-hands', 'Lay on Hands (HP pool)', '5 * cl', 'long', { pool: true }) }),
    f(2, 'paladin-fighting-style', 'Fighting Style', T('paladin-fighting-style'), { choices: [choice('style', 'Fighting Style', 'options', 1, { pool: 'fighting-styles-paladin' })] }),
    f(2, 'spellcasting-paladin', 'Spellcasting', T('spellcasting-paladin')),
    f(2, 'divine-smite', 'Divine Smite', T('divine-smite'), {
      effects: [{ id: 'divine-smite', name: 'Divine Smite (expend a slot)', trigger: 'on-hit', scope: 'melee-weapon', outcomes: [{ kind: 'damage', dice: '2d8', damageType: 'radiant', text: '+1d8 per slot level above 1st (max 5d8), +1d8 vs undead or fiend' }] }],
    }),
    f(3, 'divine-health', 'Divine Health', T('divine-health')),
    subFeature(3, 'sacred-oath', 'Sacred Oath', T('sacred-oath')),
    f(5, 'paladin-extra-attack', 'Extra Attack', T('paladin-extra-attack')),
    f(6, 'aura-of-protection', 'Aura of Protection', T('aura-of-protection'), { effects: [eff('aura-of-protection', [mod('save:all', 'max(1, cha)')])] }),
    f(10, 'aura-of-courage', 'Aura of Courage', T('aura-of-courage'), { grants: { conditionImmunities: ['frightened'] } }),
    f(11, 'improved-divine-smite', 'Improved Divine Smite', T('improved-divine-smite'), { effects: [eff('improved-divine-smite', [mod('extra-damage', '1d8', { damageType: 'radiant', scope: 'melee-weapon' })])] }),
    f(14, 'cleansing-touch', 'Cleansing Touch', T('cleansing-touch'), { activation: 'action', resource: res('cleansing-touch', 'Cleansing Touch', 'max(1, cha)', 'long') }),
    f(18, 'aura-improvements', 'Aura Improvements', T('aura-improvements')),
  ],
};

const RANGER_KNOWN = [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11];
const ranger: ClassDef = {
  id: 'ranger', name: 'Ranger', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A warrior who uses martial prowess and nature magic to combat threats on the edges of civilization.',
  hitDie: 10, primaryAbilities: ['dex', 'wis'], saves: ['str', 'dex'],
  skillChoices: { count: 3, from: ['animal-handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
  armor: ['light', 'medium', 'shields'], weapons: ['simple', 'martial'], tools: [],
  multiclass: { prerequisite: { all: { dex: 13, wis: 13 } }, grants: { armor: ['light', 'medium', 'shields'], weapons: ['simple', 'martial'] }, skillCount: 1 },
  startingEquipment: [
    { label: 'Armor', options: [{ label: 'Scale mail', items: [{ itemId: 'scale-mail' }] }, { label: 'Leather armor', items: [{ itemId: 'leather-armor' }] }] },
    { label: 'Melee', options: [{ label: 'Two shortswords', items: [{ itemId: 'shortsword', quantity: 2 }] }, { label: 'Two simple melee weapons', items: [{ itemId: '@simple-melee' }, { itemId: '@simple-melee' }] }] },
    { label: 'Pack', options: [{ label: "Dungeoneer's pack", items: [{ itemId: 'dungeoneers-pack' }] }, { label: "Explorer's pack", items: [{ itemId: 'explorers-pack' }] }] },
  ],
  startingFixed: [{ itemId: 'longbow' }, { itemId: 'quiver' }, { itemId: 'arrow', quantity: 20 }],
  startingGold: '5d4x10',
  spellcasting: { ability: 'wis', progression: 'half', style: 'known', list: 'ranger', known: RANGER_KNOWN, startLevel: 2 },
  subclassLevel: 3, subclassLabel: 'Ranger Archetype', asiLevels: ASI,
  features: [
    f(1, 'favored-enemy', 'Favored Enemy', T('favored-enemy-1-type'), {
      choices: [
        choice('enemy', 'Favored enemy type(s)', 'options', byLevel([[1, 1], [6, 2], [14, 3]]), { pool: 'favored-enemies' }),
        choice('language', 'Language of a favored enemy', 'language', byLevel([[1, 1], [6, 2], [14, 3]])),
      ],
      effects: [eff('favored-enemy', [adv('skill:survival', 'tracking favored enemies'), adv('check:int', 'recalling information about favored enemies')])],
    }),
    f(1, 'natural-explorer', 'Natural Explorer', T('natural-explorer-1-terrain-type'), { choices: [choice('terrain', 'Favored terrain(s)', 'options', byLevel([[1, 1], [6, 2], [10, 3]]), { pool: 'favored-terrains' })] }),
    f(2, 'ranger-fighting-style', 'Fighting Style', T('ranger-fighting-style'), { choices: [choice('style', 'Fighting Style', 'options', 1, { pool: 'fighting-styles-ranger' })] }),
    f(2, 'spellcasting-ranger', 'Spellcasting', T('spellcasting-ranger')),
    subFeature(3, 'ranger-archetype', 'Ranger Archetype', T('ranger-archetype')),
    f(3, 'primeval-awareness', 'Primeval Awareness', T('primeval-awareness'), { activation: 'action' }),
    f(5, 'ranger-extra-attack', 'Extra Attack', T('ranger-extra-attack')),
    f(8, 'ranger-lands-stride', "Land's Stride", T('ranger-lands-stride'), { effects: [eff('lands-stride', [adv('save:all', 'against plants magically created or manipulated to impede movement')])] }),
    f(10, 'hide-in-plain-sight', 'Hide in Plain Sight', T('hide-in-plain-sight')),
    f(14, 'vanish', 'Vanish', T('vanish'), { activation: 'bonus' }),
    f(18, 'feral-senses', 'Feral Senses', T('feral-senses')),
    f(20, 'foe-slayer', 'Foe Slayer', T('foe-slayer'), { effects: [eff('foe-slayer', [mod('attack', 'wis', { condition: 'once per turn vs. a favored enemy (or add to damage instead)' })])] }),
  ],
};

const rogue: ClassDef = {
  id: 'rogue', name: 'Rogue', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.',
  hitDie: 8, primaryAbilities: ['dex'], saves: ['dex', 'int'],
  skillChoices: { count: 4, from: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight-of-hand', 'stealth'] },
  armor: ['light'], weapons: ['simple', 'crossbow-hand', 'longsword', 'rapier', 'shortsword'], tools: ["Thieves' tools"],
  multiclass: { prerequisite: { all: { dex: 13 } }, grants: { armor: ['light'], tools: ["Thieves' tools"] }, skillCount: 1 },
  startingEquipment: [
    { label: 'Melee', options: [{ label: 'Rapier', items: [{ itemId: 'rapier' }] }, { label: 'Shortsword', items: [{ itemId: 'shortsword' }] }] },
    { label: 'Secondary', options: [{ label: 'Shortbow, quiver, 20 arrows', items: [{ itemId: 'shortbow' }, { itemId: 'quiver' }, { itemId: 'arrow', quantity: 20 }] }, { label: 'Shortsword', items: [{ itemId: 'shortsword' }] }] },
    { label: 'Pack', options: [{ label: "Burglar's pack", items: [{ itemId: 'burglars-pack' }] }, { label: "Dungeoneer's pack", items: [{ itemId: 'dungeoneers-pack' }] }, { label: "Explorer's pack", items: [{ itemId: 'explorers-pack' }] }] },
  ],
  startingFixed: [{ itemId: 'leather-armor' }, { itemId: 'dagger', quantity: 2 }, { itemId: 'thieves-tools' }],
  startingGold: '4d4x10',
  subclassLevel: 3, subclassLabel: 'Roguish Archetype', asiLevels: [4, 8, 10, 12, 16, 19],
  features: [
    f(1, 'rogue-expertise-1', 'Expertise', T('rogue-expertise-1'), { choices: [choice('expertise', "Expertise (skills or thieves' tools)", 'expertise', 2)] }),
    f(1, 'sneak-attack', 'Sneak Attack', T('sneak-attack'), {
      effects: [{ id: 'sneak-attack', name: 'Sneak Attack', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '{ceil(cl/2)}d6', text: 'Finesse or ranged weapon; advantage, or an ally within 5 ft of the target and no disadvantage.' }] }],
    }),
    f(1, 'thieves-cant', "Thieves' Cant", T('thieves-cant'), { grants: { languages: ["Thieves' Cant"] } }),
    f(2, 'cunning-action', 'Cunning Action', T('cunning-action'), { activation: 'bonus' }),
    subFeature(3, 'roguish-archetype', 'Roguish Archetype', T('roguish-archetype')),
    f(5, 'uncanny-dodge', 'Uncanny Dodge', T('uncanny-dodge'), { activation: 'reaction', manual: true }),
    f(6, 'rogue-expertise-2', 'Expertise', T('rogue-expertise-2'), { choices: [choice('expertise', 'Expertise', 'expertise', 2)] }),
    f(7, 'rogue-evasion', 'Evasion', T('rogue-evasion'), { manual: true }),
    f(11, 'reliable-talent', 'Reliable Talent', T('reliable-talent'), { tags: ['reliable-talent'] }),
    f(14, 'blindsense', 'Blindsense', T('blindsense'), { grants: { senses: { blindsense: 10 } } }),
    f(15, 'slippery-mind', 'Slippery Mind', T('slippery-mind'), { grants: { saves: ['wis'] } }),
    f(18, 'elusive', 'Elusive', T('elusive')),
    f(20, 'stroke-of-luck', 'Stroke of Luck', T('stroke-of-luck'), { resource: res('stroke-of-luck', 'Stroke of Luck', 1, 'short') }),
  ],
};

const SORC_KNOWN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15];
const sorcerer: ClassDef = {
  id: 'sorcerer', name: 'Sorcerer', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A spellcaster who draws on inherent magic from a gift or bloodline.',
  hitDie: 6, primaryAbilities: ['cha'], saves: ['con', 'cha'],
  skillChoices: { count: 2, from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
  armor: [], weapons: ['dagger', 'dart', 'sling', 'quarterstaff', 'crossbow-light'], tools: [],
  multiclass: { prerequisite: { all: { cha: 13 } }, grants: {} },
  startingEquipment: [
    { label: 'Weapon', options: [{ label: 'Light crossbow and 20 bolts', items: [{ itemId: 'crossbow-light' }, { itemId: 'crossbow-bolt', quantity: 20 }] }, { label: 'Any simple weapon', items: [{ itemId: '@simple' }] }] },
    { label: 'Focus', options: [{ label: 'Component pouch', items: [{ itemId: 'component-pouch' }] }, { label: 'Arcane focus (crystal)', items: [{ itemId: 'crystal' }] }] },
    { label: 'Pack', options: [{ label: "Dungeoneer's pack", items: [{ itemId: 'dungeoneers-pack' }] }, { label: "Explorer's pack", items: [{ itemId: 'explorers-pack' }] }] },
  ],
  startingFixed: [{ itemId: 'dagger', quantity: 2 }],
  startingGold: '3d4x10',
  spellcasting: { ability: 'cha', progression: 'full', style: 'known', list: 'sorcerer', cantrips: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6], known: SORC_KNOWN, focus: 'Arcane focus' },
  subclassLevel: 1, subclassLabel: 'Sorcerous Origin', asiLevels: ASI,
  resources: [res('sorcery-points', 'Sorcery Points', 'cl', 'long', { pool: true, minLevel: 2 })],
  features: [
    f(1, 'spellcasting-sorcerer', 'Spellcasting', T('spellcasting-sorcerer')),
    subFeature(1, 'sorcerous-origin', 'Sorcerous Origin', T('sorcerous-origin')),
    f(2, 'font-of-magic', 'Font of Magic', [T('font-of-magic'), T('flexible-casting-creating-spell-slots'), T('flexible-casting-converting-spell-slot')].join('\n\n'), { usesResource: 'sorcery-points', tags: ['flexible-casting'] }),
    f(3, 'metamagic', 'Metamagic', T('metamagic-1'), { choices: [choice('options', 'Metamagic options', 'options', byLevel([[3, 2], [10, 3], [17, 4]]), { pool: 'metamagic' })] }),
    f(20, 'sorcerous-restoration', 'Sorcerous Restoration', T('sorcerous-restoration'), { tags: ['short-rest'] }),
  ],
};

const WARLOCK_KNOWN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];
const arcanum = (lvl: number, spellLevel: number) => f(lvl, `mystic-arcanum-${spellLevel}`, `Mystic Arcanum (${spellLevel}th level)`, 'Choose one warlock spell of this level as an arcanum. You can cast it once without expending a spell slot and regain the ability after a long rest.', {
  choices: [choice('spell', `Arcanum spell (level ${spellLevel})`, 'spell', 1, { spellFilter: { classes: ['warlock'], levels: [spellLevel] }, spellMode: 'innate' })],
  resource: res(`mystic-arcanum-${spellLevel}`, `Mystic Arcanum (${spellLevel})`, 1, 'long'),
});
const warlock: ClassDef = {
  id: 'warlock', name: 'Warlock', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A wielder of magic derived from a bargain with an extraplanar entity.',
  hitDie: 8, primaryAbilities: ['cha'], saves: ['wis', 'cha'],
  skillChoices: { count: 2, from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
  armor: ['light'], weapons: ['simple'], tools: [],
  multiclass: { prerequisite: { all: { cha: 13 } }, grants: { armor: ['light'], weapons: ['simple'] } },
  startingEquipment: [
    { label: 'Weapon', options: [{ label: 'Light crossbow and 20 bolts', items: [{ itemId: 'crossbow-light' }, { itemId: 'crossbow-bolt', quantity: 20 }] }, { label: 'Any simple weapon', items: [{ itemId: '@simple' }] }] },
    { label: 'Focus', options: [{ label: 'Component pouch', items: [{ itemId: 'component-pouch' }] }, { label: 'Arcane focus (orb)', items: [{ itemId: 'orb' }] }] },
    { label: 'Pack', options: [{ label: "Scholar's pack", items: [{ itemId: 'scholars-pack' }] }, { label: "Dungeoneer's pack", items: [{ itemId: 'dungeoneers-pack' }] }] },
  ],
  startingFixed: [{ itemId: 'leather-armor' }, { itemId: '@simple' }, { itemId: 'dagger', quantity: 2 }],
  startingGold: '4d4x10',
  spellcasting: { ability: 'cha', progression: 'pact', style: 'known', list: 'warlock', cantrips: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], known: WARLOCK_KNOWN, focus: 'Arcane focus' },
  subclassLevel: 1, subclassLabel: 'Otherworldly Patron', asiLevels: ASI,
  features: [
    subFeature(1, 'otherworldly-patron', 'Otherworldly Patron', T('otherworldly-patron')),
    f(1, 'pact-magic', 'Pact Magic', T('pact-magic')),
    f(2, 'eldritch-invocations', 'Eldritch Invocations', T('eldritch-invocations'), { choices: [choice('invocations', 'Eldritch Invocations', 'options', byLevel([[2, 2], [5, 3], [7, 4], [9, 5], [12, 6], [15, 7], [18, 8]]), { pool: 'invocations' })] }),
    f(3, 'pact-boon', 'Pact Boon', 'Your patron bestows a gift: choose Pact of the Chain, Pact of the Blade, or Pact of the Tome.', { choices: [choice('boon', 'Pact Boon', 'options', 1, { pool: 'pact-boons' })] }),
    arcanum(11, 6), arcanum(13, 7), arcanum(15, 8), arcanum(17, 9),
    f(20, 'eldritch-master', 'Eldritch Master', 'Spend 1 minute entreating your patron to regain all expended Pact Magic slots. Once per long rest.', { resource: res('eldritch-master', 'Eldritch Master', 1, 'long') }),
  ],
};

const wizard: ClassDef = {
  id: 'wizard', name: 'Wizard', ruleset: 'dnd5e-2014', source: SRD,
  description: 'A scholarly magic-user capable of manipulating the structures of reality.',
  hitDie: 6, primaryAbilities: ['int'], saves: ['int', 'wis'],
  skillChoices: { count: 2, from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'] },
  armor: [], weapons: ['dagger', 'dart', 'sling', 'quarterstaff', 'crossbow-light'], tools: [],
  multiclass: { prerequisite: { all: { int: 13 } }, grants: {} },
  startingEquipment: [
    { label: 'Weapon', options: [{ label: 'Quarterstaff', items: [{ itemId: 'quarterstaff' }] }, { label: 'Dagger', items: [{ itemId: 'dagger' }] }] },
    { label: 'Focus', options: [{ label: 'Component pouch', items: [{ itemId: 'component-pouch' }] }, { label: 'Arcane focus (wand)', items: [{ itemId: 'wand' }] }] },
    { label: 'Pack', options: [{ label: "Scholar's pack", items: [{ itemId: 'scholars-pack' }] }, { label: "Explorer's pack", items: [{ itemId: 'explorers-pack' }] }] },
  ],
  startingFixed: [{ itemId: 'spellbook' }],
  startingGold: '4d4x10',
  spellcasting: { ability: 'int', progression: 'full', style: 'spellbook', list: 'wizard', cantrips: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], prepared: 'max(1, int + cl)', ritual: true, spellbookStart: 6, spellbookPerLevel: 2, focus: 'Arcane focus' },
  subclassLevel: 2, subclassLabel: 'Arcane Tradition', asiLevels: ASI,
  features: [
    f(1, 'spellcasting-wizard', 'Spellcasting', T('spellcasting-wizard', 'You have a spellbook containing six 1st-level wizard spells of your choice. Prepare INT modifier + wizard level spells from your spellbook each day. You can cast wizard spells with the ritual tag as rituals if they are in your spellbook.')),
    f(1, 'arcane-recovery', 'Arcane Recovery', T('arcane-recovery', 'Once per day when you finish a short rest, recover expended spell slots with a combined level up to half your wizard level (rounded up); none can be 6th level or higher.'), { resource: res('arcane-recovery', 'Arcane Recovery', 1, 'long'), tags: ['arcane-recovery'] }),
    subFeature(2, 'arcane-tradition', 'Arcane Tradition', T('arcane-tradition')),
    f(18, 'spell-mastery', 'Spell Mastery', T('spell-mastery', 'Choose a 1st-level and a 2nd-level wizard spell in your spellbook; you can cast them at their lowest level without expending a slot when prepared.'), {
      choices: [choice('first', '1st-level mastery spell', 'spell', 1, { spellFilter: { classes: ['wizard'], levels: [1] }, spellMode: 'always-prepared' }), choice('second', '2nd-level mastery spell', 'spell', 1, { spellFilter: { classes: ['wizard'], levels: [2] }, spellMode: 'always-prepared' })],
    }),
    f(20, 'signature-spells', 'Signature Spells', T('signature-spells', 'Choose two 3rd-level wizard spells as signature spells. They are always prepared, and you can cast each once at 3rd level without a slot per short or long rest.'), {
      choices: [choice('spells', 'Signature spells (3rd level)', 'spell', 2, { spellFilter: { classes: ['wizard'], levels: [3] }, spellMode: 'always-prepared' })],
      resource: res('signature-spells', 'Signature Spells', 2, 'short'),
    }),
  ],
};

export const CLASSES: ClassDef[] = [barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, warlock, wizard];
