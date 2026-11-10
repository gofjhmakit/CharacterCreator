// Races / species (2014). SRD races use SRD text; others are brief mechanical summaries.
import type { FeatureDef, RaceDef, SubraceDef, ChoiceDef } from '@/types/content';
import { SRD, PHB, VGM, MPMM, ERLW, EEPC, MOOT, SCAG, T, mod, adv, grant, flag, eff, choice, res } from './helpers';
import type { DamageType } from '@/types/core';

const t = (id: string, name: string, description: string, o: Partial<FeatureDef> = {}): FeatureDef => ({ id, name, description, ...o });
const dv = (range = 60, name = 'Darkvision'): FeatureDef => t(range > 60 ? `superior-darkvision` : 'darkvision', name, `You can see in dim light within ${range} feet as if it were bright light, and in darkness as if it were dim light (shades of gray only).`, { grants: { senses: { darkvision: range } } });
const langChoice = (n = 1): ChoiceDef => choice('language', n > 1 ? `${n} extra languages` : 'Extra language', 'language', n);
const asiChoice = (n: number, amount: number, exclude: string[] = []): ChoiceDef => choice(`asi-${amount}`, `+${amount} to ${n} abilit${n > 1 ? 'ies' : 'y'} of your choice`, 'ability', n, { amount, from: ['str', 'dex', 'con', 'int', 'wis', 'cha'].filter((a) => !exclude.includes(a)) });
const sub = (id: string, name: string, source: SubraceDef['source'], description: string, abilityBonuses: SubraceDef['abilityBonuses'], traits: FeatureDef[], extra: Partial<SubraceDef> = {}): SubraceDef => ({ id, name, source, description, abilityBonuses, traits, ...extra });
const innate = (spellId: string, minLevel = 1, perDay = 1, ability: 'int' | 'wis' | 'cha' = 'cha', note?: string) => ({ spellId, mode: 'innate' as const, minLevel, ability, ...(perDay ? { uses: { max: perDay, recharge: 'long' as const } } : {}), ...(note ? { note } : {}) });
const cantrip = (spellId: string, ability: 'int' | 'wis' | 'cha' = 'cha') => ({ spellId, mode: 'always-prepared' as const, ability });
const race = (r: Omit<RaceDef, 'ruleset'>): RaceDef => ({ ruleset: 'dnd5e-2014', ...r });

const DRAGON = [['black', 'acid', '5 by 30 ft line (DEX)'], ['blue', 'lightning', '5 by 30 ft line (DEX)'], ['brass', 'fire', '5 by 30 ft line (DEX)'], ['bronze', 'lightning', '5 by 30 ft line (DEX)'], ['copper', 'acid', '5 by 30 ft line (DEX)'], ['gold', 'fire', '15 ft cone (DEX)'], ['green', 'poison', '15 ft cone (CON)'], ['red', 'fire', '15 ft cone (DEX)'], ['silver', 'cold', '15 ft cone (CON)'], ['white', 'cold', '15 ft cone (CON)']] as const;

export const RACES: RaceDef[] = [
  race({
    id: 'human', name: 'Human', source: SRD, size: 'medium', speed: { walk: 30 }, description: T('race:human', 'Humans are the most adaptable and ambitious people.'),
    abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: [t('human-languages', 'Languages', 'Common and one extra language of your choice.', { grants: { languages: ['Common'] }, choices: [langChoice()] })],
    subraces: [
      sub('human-standard', 'Standard Human', SRD, '+1 to all ability scores.', {}, []),
      sub('variant-human', 'Variant Human', PHB, '+1 to two abilities, one skill proficiency, and one feat.', {}, [
        t('vh-skill', 'Skills', 'Gain proficiency in one skill of your choice.', { choices: [choice('skill', 'Skill', 'skill', 1)] }),
        t('vh-feat', 'Feat', 'You gain one feat of your choice.', { choices: [choice('feat', 'Feat', 'feat', 1)] }),
      ], { replacesAbilityBonuses: true, choices: [asiChoice(2, 1)] }),
    ],
    subraceRequired: true,
    details: { age: 'Adult in late teens, live less than a century.', height: "4'8\" – 6'4\"", weight: '110–250 lb' },
  }),
  race({
    id: 'elf', name: 'Elf', source: SRD, size: 'medium', speed: { walk: 30 }, description: T('race:elf', 'Elves are a magical people of otherworldly grace.'),
    abilityBonuses: { dex: 2 },
    traits: [
      dv(),
      t('keen-senses', 'Keen Senses', T('trait:keen-senses', 'Proficiency in Perception.'), { grants: { skills: ['perception'] } }),
      t('fey-ancestry', 'Fey Ancestry', T('trait:fey-ancestry', 'Advantage on saves against being charmed; magic can’t put you to sleep.'), { effects: [eff('fey-ancestry', [adv('save:all', 'against being charmed')])] }),
      t('trance', 'Trance', T('trait:trance', 'You meditate 4 hours instead of sleeping.')),
      t('elf-languages', 'Languages', 'Common and Elvish.', { grants: { languages: ['Common', 'Elvish'] } }),
    ],
    subraces: [
      sub('high-elf', 'High Elf', SRD, T('subrace:high-elf', 'Keen mind and mastery of basic magic.'), { int: 1 }, [
        t('elf-weapon-training', 'Elf Weapon Training', 'Proficiency with longsword, shortsword, shortbow, and longbow.', { grants: { weapons: ['longsword', 'shortsword', 'shortbow', 'longbow'] } }),
        t('high-elf-cantrip', 'Cantrip', 'You know one wizard cantrip of your choice (INT).', { choices: [choice('cantrip', 'Wizard cantrip', 'spell', 1, { spellFilter: { classes: ['wizard'], levels: [0] }, spellMode: 'always-prepared' })] }),
        t('extra-language', 'Extra Language', 'One extra language of your choice.', { choices: [langChoice()] }),
      ]),
      sub('wood-elf', 'Wood Elf', PHB, 'Keen senses and intuition; fleet feet and stealth.', { wis: 1 }, [
        t('wood-elf-weapon-training', 'Elf Weapon Training', 'Proficiency with longsword, shortsword, shortbow, and longbow.', { grants: { weapons: ['longsword', 'shortsword', 'shortbow', 'longbow'] } }),
        t('fleet-of-foot', 'Fleet of Foot', 'Your base walking speed is 35 feet.'),
        t('mask-of-the-wild', 'Mask of the Wild', 'You can attempt to hide when only lightly obscured by foliage, rain, snow, mist, or similar.'),
      ], { speed: { walk: 35 } }),
      sub('drow', 'Drow (Dark Elf)', PHB, 'Elves of the Underdark with superior darkvision and innate magic.', { cha: 1 }, [
        dv(120, 'Superior Darkvision'),
        t('sunlight-sensitivity', 'Sunlight Sensitivity', 'Disadvantage on attack rolls and sight-based Perception checks in direct sunlight.', { effects: [eff('sunlight-sensitivity', [{ target: 'attack', op: 'disadvantage', condition: 'in direct sunlight' }, { target: 'skill:perception', op: 'disadvantage', condition: 'sight-based, in direct sunlight' }])] }),
        t('drow-magic', 'Drow Magic', 'You know dancing lights. At 3rd level cast faerie fire, at 5th darkness, each once per long rest (CHA).', { grants: { spells: [cantrip('dancing-lights'), innate('faerie-fire', 3), innate('darkness', 5)] } }),
        t('drow-weapon-training', 'Drow Weapon Training', 'Proficiency with rapiers, shortswords, and hand crossbows.', { grants: { weapons: ['rapier', 'shortsword', 'crossbow-hand'] } }),
      ], { removesTraits: ['darkvision'] }),
      sub('eladrin', 'Eladrin', MPMM, 'Elves of the Feywild tied to the seasons.', { cha: 1 }, [
        t('fey-step', 'Fey Step', 'Bonus action: teleport up to 30 ft (proficiency bonus times per long rest); season adds an effect from 3rd level.', { resource: res('fey-step', 'Fey Step', 'prof', 'long') }),
      ]),
      sub('sea-elf', 'Sea Elf', MPMM, 'Elves of the ocean depths.', { con: 1 }, [
        t('sea-elf-training', 'Sea Elf Training', 'Proficiency with spear, trident, light crossbow, and net.', { grants: { weapons: ['spear', 'trident', 'crossbow-light', 'net'] } }),
        t('child-of-the-sea', 'Child of the Sea', 'Swimming speed 30 ft; breathe air and water.'),
      ], { speed: { walk: 30, swim: 30 } }),
    ],
    subraceRequired: true,
    details: { age: 'Adult around 100, live up to 750 years.', height: "4'6\" – 6'2\"", weight: '90–170 lb' },
  }),
  race({
    id: 'dwarf', name: 'Dwarf', source: SRD, size: 'medium', speed: { walk: 25 }, description: T('race:dwarf', 'Bold and hardy dwarves are known as skilled warriors, miners, and workers of stone and metal.'),
    abilityBonuses: { con: 2 },
    traits: [
      t('dwarf-speed', 'Speed', 'Your speed is not reduced by wearing heavy armor.', { effects: [eff('dwarf-heavy-armor', [flag('heavy-armor-speed-ok')])] }),
      dv(),
      t('dwarven-resilience', 'Dwarven Resilience', T('trait:dwarven-resilience', 'Advantage on saves against poison and resistance to poison damage.'), { grants: { resistances: ['poison'] }, effects: [eff('dwarven-resilience', [adv('save:all', 'against poison')])] }),
      t('dwarven-combat-training', 'Dwarven Combat Training', 'Proficiency with battleaxe, handaxe, light hammer, and warhammer.', { grants: { weapons: ['battleaxe', 'handaxe', 'light-hammer', 'warhammer'] } }),
      t('tool-proficiency', 'Tool Proficiency', "Proficiency with smith's tools, brewer's supplies, or mason's tools.", { choices: [choice('tool', 'Artisan tool', 'tool', 1, { from: ["Smith's tools", "Brewer's supplies", "Mason's tools"] })] }),
      t('stonecunning', 'Stonecunning', 'Double proficiency on History checks related to the origin of stonework.', { effects: [eff('stonecunning', [mod('skill:history', 'prof', { condition: 'related to the origin of stonework (expertise)' })])] }),
      t('dwarf-languages', 'Languages', 'Common and Dwarvish.', { grants: { languages: ['Common', 'Dwarvish'] } }),
    ],
    subraces: [
      sub('hill-dwarf', 'Hill Dwarf', SRD, T('subrace:hill-dwarf', 'Keen senses, deep intuition, remarkable resilience.'), { wis: 1 }, [
        t('dwarven-toughness', 'Dwarven Toughness', 'Your hit point maximum increases by 1 per level.', { effects: [eff('dwarven-toughness', [mod('hp-per-level', 1)])] }),
      ]),
      sub('mountain-dwarf', 'Mountain Dwarf', PHB, 'Strong and hardy, used to difficult living.', { str: 2 }, [
        t('dwarven-armor-training', 'Dwarven Armor Training', 'Proficiency with light and medium armor.', { grants: { armor: ['light', 'medium'] } }),
      ]),
      sub('duergar', 'Duergar', MPMM, 'Dwarves of the Underdark with psionic power.', { str: 1 }, [
        dv(120, 'Superior Darkvision'),
        t('duergar-magic', 'Duergar Magic', 'From 3rd level cast enlarge/reduce (enlarge only) and from 5th invisibility (self) once per long rest.', { grants: { spells: [innate('enlarge-reduce', 3, 1, 'int'), innate('invisibility', 5, 1, 'int')] } }),
        t('sunlight-sensitivity-duergar', 'Sunlight Sensitivity', 'Disadvantage on attacks and sight-based Perception in direct sunlight.', { effects: [eff('sunlight-sensitivity', [{ target: 'attack', op: 'disadvantage', condition: 'in direct sunlight' }])] }),
      ], { removesTraits: ['darkvision'] }),
    ],
    subraceRequired: true,
    details: { age: 'Adult at 50, live about 350 years.', height: "4' – 5'", weight: '~150 lb' },
  }),
  race({
    id: 'halfling', name: 'Halfling', source: SRD, size: 'small', speed: { walk: 25 }, description: T('race:halfling', 'Small and practical, halflings prize home and comfort.'),
    abilityBonuses: { dex: 2 },
    traits: [
      t('lucky', 'Lucky', T('trait:lucky', 'When you roll a 1 on an attack roll, ability check, or saving throw, reroll the die and use the new roll.'), { effects: [eff('halfling-lucky', [flag('halfling-lucky')])] }),
      t('brave', 'Brave', T('trait:brave', 'Advantage on saves against being frightened.'), { effects: [eff('brave', [adv('save:all', 'against being frightened')])] }),
      t('halfling-nimbleness', 'Halfling Nimbleness', T('trait:halfling-nimbleness', 'You can move through the space of any creature larger than you.')),
      t('halfling-languages', 'Languages', 'Common and Halfling.', { grants: { languages: ['Common', 'Halfling'] } }),
    ],
    subraces: [
      sub('lightfoot-halfling', 'Lightfoot', SRD, T('subrace:lightfoot-halfling', 'Adept at hiding.'), { cha: 1 }, [
        t('naturally-stealthy', 'Naturally Stealthy', 'You can attempt to hide when obscured only by a creature at least one size larger.'),
      ]),
      sub('stout-halfling', 'Stout', PHB, 'Hardier than average, with some resistance to poison.', { con: 1 }, [
        t('stout-resilience', 'Stout Resilience', 'Advantage on saves against poison; resistance to poison damage.', { grants: { resistances: ['poison'] }, effects: [eff('stout-resilience', [adv('save:all', 'against poison')])] }),
      ]),
      sub('ghostwise-halfling', 'Ghostwise', SCAG, 'Telepathic halflings of the wilds.', { wis: 1 }, [
        t('silent-speech', 'Silent Speech', 'Speak telepathically to a creature within 30 ft that shares a language.'),
      ]),
    ],
    subraceRequired: true,
    details: { age: 'Adult at 20, live up to ~150 years.', height: "~3'", weight: '~40 lb' },
  }),
  race({
    id: 'half-elf', name: 'Half-Elf', source: SRD, size: 'medium', speed: { walk: 30 }, description: T('race:half-elf', 'Walking in two worlds but truly belonging to neither.'),
    abilityBonuses: { cha: 2 }, choices: [asiChoice(2, 1, ['cha'])],
    traits: [
      dv(),
      t('fey-ancestry', 'Fey Ancestry', 'Advantage on saves against being charmed; magic can’t put you to sleep.', { effects: [eff('fey-ancestry', [adv('save:all', 'against being charmed')])] }),
      t('skill-versatility', 'Skill Versatility', 'Gain proficiency in two skills of your choice.', { choices: [choice('skills', 'Skills', 'skill', 2)] }),
      t('half-elf-languages', 'Languages', 'Common, Elvish, and one extra language.', { grants: { languages: ['Common', 'Elvish'] }, choices: [langChoice()] }),
    ],
    details: { age: 'Adult at 20, live 180+ years.', height: "5' – 6'", weight: '~150 lb' },
  }),
  race({
    id: 'half-orc', name: 'Half-Orc', source: SRD, size: 'medium', speed: { walk: 30 }, description: T('race:half-orc', 'Strong and fierce, with orc blood in their veins.'),
    abilityBonuses: { str: 2, con: 1 },
    traits: [
      dv(),
      t('menacing', 'Menacing', 'Proficiency in Intimidation.', { grants: { skills: ['intimidation'] } }),
      t('relentless-endurance', 'Relentless Endurance', T('trait:relentless-endurance', 'When reduced to 0 HP but not killed outright, drop to 1 HP instead. Once per long rest.'), { resource: res('relentless-endurance', 'Relentless Endurance', 1, 'long') }),
      t('savage-attacks', 'Savage Attacks', T('trait:savage-attacks', 'On a melee weapon crit, roll one weapon damage die an extra time.'), { effects: [{ id: 'savage-attacks', name: 'Savage Attacks', trigger: 'on-crit', scope: 'melee-weapon', outcomes: [{ kind: 'text', text: 'Roll one additional weapon damage die.' }] }] }),
      t('half-orc-languages', 'Languages', 'Common and Orc.', { grants: { languages: ['Common', 'Orc'] } }),
    ],
  }),
  race({
    id: 'gnome', name: 'Gnome', source: SRD, size: 'small', speed: { walk: 25 }, description: T('race:gnome', 'Energetic tinkerers and pranksters.'),
    abilityBonuses: { int: 2 },
    traits: [
      dv(),
      t('gnome-cunning', 'Gnome Cunning', 'Advantage on INT, WIS, and CHA saves against magic.', { effects: [eff('gnome-cunning', [adv('save:int', 'against magic'), adv('save:wis', 'against magic'), adv('save:cha', 'against magic')])] }),
      t('gnome-languages', 'Languages', 'Common and Gnomish.', { grants: { languages: ['Common', 'Gnomish'] } }),
    ],
    subraces: [
      sub('rock-gnome', 'Rock Gnome', SRD, T('subrace:rock-gnome', 'Natural inventiveness and hardiness.'), { con: 1 }, [
        t('artificers-lore', "Artificer's Lore", 'Add twice your proficiency bonus to History checks about magic items, alchemical objects, or technological devices.', { effects: [eff('artificers-lore', [mod('skill:history', 'prof', { condition: 'about magic items, alchemical objects, or technology' })])] }),
        t('tinker', 'Tinker', "Proficiency with tinker's tools; build tiny clockwork devices.", { grants: { tools: ["Tinker's tools"] } }),
      ]),
      sub('forest-gnome', 'Forest Gnome', PHB, 'Natural knack for illusion and quickness.', { dex: 1 }, [
        t('natural-illusionist', 'Natural Illusionist', 'You know the minor illusion cantrip (INT).', { grants: { spells: [cantrip('minor-illusion', 'int')] } }),
        t('speak-with-small-beasts', 'Speak with Small Beasts', 'Communicate simple ideas with Small or smaller beasts.'),
      ]),
      sub('deep-gnome', 'Deep Gnome (Svirfneblin)', MPMM, 'Gnomes of the Underdark.', { dex: 1 }, [
        dv(120, 'Superior Darkvision'),
        t('stone-camouflage', 'Stone Camouflage', 'Advantage on Stealth checks to hide in rocky terrain.', { effects: [eff('stone-camo', [adv('skill:stealth', 'in rocky terrain')])] }),
      ], { removesTraits: ['darkvision'] }),
    ],
    subraceRequired: true,
  }),
  race({
    id: 'tiefling', name: 'Tiefling', source: SRD, size: 'medium', speed: { walk: 30 }, description: T('race:tiefling', 'Bearing an infernal bloodline.'),
    abilityBonuses: { int: 1, cha: 2 },
    traits: [
      dv(),
      t('hellish-resistance', 'Hellish Resistance', 'Resistance to fire damage.', { grants: { resistances: ['fire'] } }),
      t('infernal-legacy', 'Infernal Legacy', 'You know thaumaturgy. At 3rd level cast hellish rebuke (2nd level) once per long rest; at 5th darkness once per long rest (CHA).', { grants: { spells: [cantrip('thaumaturgy'), innate('hellish-rebuke', 3), innate('darkness', 5)] } }),
      t('tiefling-languages', 'Languages', 'Common and Infernal.', { grants: { languages: ['Common', 'Infernal'] } }),
    ],
  }),
  race({
    id: 'dragonborn', name: 'Dragonborn', source: SRD, size: 'medium', speed: { walk: 30 }, description: T('race:dragonborn', 'Born of dragons, proud and honorable.'),
    abilityBonuses: { str: 2, cha: 1 },
    traits: [
      t('draconic-ancestry', 'Draconic Ancestry', T('trait:draconic-ancestry', 'Choose a dragon type; it determines your breath weapon and damage resistance.'), {
        choices: [choice('ancestry', 'Draconic ancestry', 'options', 1, { options: DRAGON.map(([c, d, shape]) => ({
          id: `dragonborn-${c}`, name: `${c[0].toUpperCase() + c.slice(1)} (${d})`, description: `Breath weapon: ${shape}. Resistance to ${d} damage.`,
          grants: { resistances: [d as DamageType] },
        })) })],
      }),
      t('breath-weapon', 'Breath Weapon', 'Action: exhale destructive energy (DC 8 + CON + prof). 2d6 damage (3d6 at 6th, 4d6 at 11th, 5d6 at 16th), half on success. Once per short or long rest.', {
        activation: 'action', resource: res('breath-weapon', 'Breath Weapon', 1, 'short'),
        effects: [{ id: 'breath-weapon', name: 'Breath Weapon', trigger: 'on-use', save: { ability: 'dex', dc: { kind: 'formula', formula: '8 + con + prof' }, onFailure: [{ kind: 'damage', dice: '{steps(lvl,1,2,6,3,11,4,16,5)}d6' }], onSuccess: [{ kind: 'text', text: 'half damage' }] }, description: 'Save ability depends on ancestry (DEX or CON).' }],
      }),
      t('dragonborn-languages', 'Languages', 'Common and Draconic.', { grants: { languages: ['Common', 'Draconic'] } }),
    ],
  }),
  race({
    id: 'aasimar', name: 'Aasimar', source: VGM, size: 'medium', speed: { walk: 30 }, description: 'Mortals with a spark of celestial power.',
    abilityBonuses: { cha: 2 },
    traits: [
      dv(),
      t('celestial-resistance', 'Celestial Resistance', 'Resistance to necrotic and radiant damage.', { grants: { resistances: ['necrotic', 'radiant'] } }),
      t('healing-hands', 'Healing Hands', 'Action: touch a creature to restore HP equal to your level. Once per long rest.', { activation: 'action', resource: res('healing-hands', 'Healing Hands', 1, 'long') }),
      t('light-bearer', 'Light Bearer', 'You know the light cantrip (CHA).', { grants: { spells: [cantrip('light')] } }),
      t('aasimar-languages', 'Languages', 'Common and Celestial.', { grants: { languages: ['Common', 'Celestial'] } }),
    ],
    subraces: [
      sub('protector-aasimar', 'Protector', VGM, 'Guardians charged with protecting the weak.', { wis: 1 }, [
        t('radiant-soul', 'Radiant Soul', 'From 3rd level, action: transform for 1 minute — fly 30 ft and once per turn +level radiant damage. Once per long rest.', { level: 3, resource: res('aasimar-transform', 'Celestial transformation', 1, 'long') }),
      ]),
      sub('scourge-aasimar', 'Scourge', VGM, 'Imbued with divine energy that blazes.', { con: 1 }, [
        t('radiant-consumption', 'Radiant Consumption', 'From 3rd level: searing light aura for 1 minute (half level radiant to you and nearby creatures), once per turn +level radiant. Once per long rest.', { level: 3, resource: res('aasimar-transform', 'Celestial transformation', 1, 'long') }),
      ]),
      sub('fallen-aasimar', 'Fallen', VGM, 'Touched by dark powers.', { str: 1 }, [
        t('necrotic-shroud', 'Necrotic Shroud', 'From 3rd level: frighten nearby creatures (CHA save), once per turn +level necrotic for 1 minute. Once per long rest.', { level: 3, resource: res('aasimar-transform', 'Celestial transformation', 1, 'long') }),
      ]),
    ],
    subraceRequired: true,
  }),
  race({
    id: 'genasi', name: 'Genasi', source: EEPC, size: 'medium', speed: { walk: 30 }, description: 'Descendants of genies and mortals, carrying elemental power.',
    abilityBonuses: { con: 2 },
    traits: [t('genasi-languages', 'Languages', 'Common and Primordial.', { grants: { languages: ['Common', 'Primordial'] } })],
    subraces: [
      sub('air-genasi', 'Air Genasi', EEPC, 'Breath of the wind.', { dex: 1 }, [
        t('unending-breath', 'Unending Breath', 'Hold your breath indefinitely while not incapacitated.'),
        t('mingle-with-the-wind', 'Mingle with the Wind', 'Cast levitate once per long rest (CON).', { grants: { spells: [innate('levitate', 1, 1, 'cha', 'Uses CON')] } }),
      ]),
      sub('earth-genasi', 'Earth Genasi', EEPC, 'Solid as stone.', { str: 1 }, [
        t('earth-walk', 'Earth Walk', 'Move across difficult terrain made of earth or stone without extra movement.'),
        t('merge-with-stone', 'Merge with Stone', 'Cast pass without trace once per long rest (CON).', { grants: { spells: [innate('pass-without-trace', 1, 1, 'cha', 'Uses CON')] } }),
      ]),
      sub('fire-genasi', 'Fire Genasi', EEPC, 'Flickering with flame.', { int: 1 }, [
        dv(),
        t('fire-resistance', 'Fire Resistance', 'Resistance to fire damage.', { grants: { resistances: ['fire'] } }),
        t('reach-to-the-blaze', 'Reach to the Blaze', 'You know produce flame; at 3rd level cast burning hands once per long rest (CON).', { grants: { spells: [cantrip('produce-flame'), innate('burning-hands', 3)] } }),
      ]),
      sub('water-genasi', 'Water Genasi', EEPC, 'Born of the sea.', { wis: 1 }, [
        t('acid-resistance', 'Acid Resistance', 'Resistance to acid damage.', { grants: { resistances: ['acid'] } }),
        t('amphibious', 'Amphibious', 'Breathe air and water.'),
        t('swim', 'Swim', 'Swimming speed 30 ft.', { grants: { speeds: { swim: 30 } } }),
        t('call-to-the-wave', 'Call to the Wave', 'You know shape water; at 3rd level cast create or destroy water (2nd level) once per long rest (CON).', { grants: { spells: [innate('create-or-destroy-water', 3)] } }),
      ]),
    ],
    subraceRequired: true,
  }),
  race({
    id: 'goliath', name: 'Goliath', source: VGM, size: 'medium', speed: { walk: 30 }, description: 'Towering mountain dwellers who thrive on competition.',
    abilityBonuses: { str: 2, con: 1 },
    traits: [
      t('natural-athlete', 'Natural Athlete', 'Proficiency in Athletics.', { grants: { skills: ['athletics'] } }),
      t('stones-endurance', "Stone's Endurance", 'Reaction when you take damage: reduce it by 1d12 + CON mod. Once per short rest.', { activation: 'reaction', resource: res('stones-endurance', "Stone's Endurance", 1, 'short') }),
      t('powerful-build', 'Powerful Build', 'Count as one size larger for carrying capacity and push/drag/lift.', { effects: [eff('powerful-build', [flag('powerful-build')])] }),
      t('mountain-born', 'Mountain Born', 'Resistance to cold damage; acclimated to high altitude.', { grants: { resistances: ['cold'] } }),
      t('goliath-languages', 'Languages', 'Common and Giant.', { grants: { languages: ['Common', 'Giant'] } }),
    ],
  }),
  race({
    id: 'firbolg', name: 'Firbolg', source: VGM, size: 'medium', speed: { walk: 30 }, description: 'Gentle forest guardians with fey magic.',
    abilityBonuses: { wis: 2, str: 1 },
    traits: [
      t('firbolg-magic', 'Firbolg Magic', 'Cast detect magic and disguise self once per short rest each (WIS).', { grants: { spells: [{ spellId: 'detect-magic', mode: 'innate', ability: 'wis', uses: { max: 1, recharge: 'short' } }, { spellId: 'disguise-self', mode: 'innate', ability: 'wis', uses: { max: 1, recharge: 'short' } }] } }),
      t('hidden-step', 'Hidden Step', 'Bonus action: turn invisible until the start of your next turn or until you attack. Once per short rest.', { activation: 'bonus', resource: res('hidden-step', 'Hidden Step', 1, 'short') }),
      t('powerful-build', 'Powerful Build', 'Count as one size larger for carrying capacity.', { effects: [eff('powerful-build', [flag('powerful-build')])] }),
      t('speech-of-beast-and-leaf', 'Speech of Beast and Leaf', 'Limited communication with beasts and plants; advantage on CHA checks to influence them.'),
      t('firbolg-languages', 'Languages', 'Common, Elvish, and Giant.', { grants: { languages: ['Common', 'Elvish', 'Giant'] } }),
    ],
  }),
  race({
    id: 'tabaxi', name: 'Tabaxi', source: VGM, size: 'medium', speed: { walk: 30, climb: 20 }, description: 'Curious feline wanderers.',
    abilityBonuses: { dex: 2, cha: 1 },
    traits: [
      dv(),
      t('feline-agility', 'Feline Agility', 'When you move on your turn in combat, double your speed until the end of the turn; can’t use again until you move 0 ft on a turn.'),
      t('cats-claws', "Cat's Claws", 'Climbing speed 20 ft; unarmed strikes with claws deal 1d4 slashing.'),
      t('cats-talent', "Cat's Talent", 'Proficiency in Perception and Stealth.', { grants: { skills: ['perception', 'stealth'] } }),
      t('tabaxi-languages', 'Languages', 'Common and one other language.', { grants: { languages: ['Common'] }, choices: [langChoice()] }),
    ],
  }),
  race({
    id: 'kenku', name: 'Kenku', source: VGM, size: 'medium', speed: { walk: 30 }, description: 'Flightless bird-folk who mimic sounds.',
    abilityBonuses: { dex: 2, wis: 1 },
    traits: [
      t('expert-forgery', 'Expert Forgery', 'Advantage on checks to produce forgeries or duplicates of existing objects.'),
      t('kenku-training', 'Kenku Training', 'Proficiency in two of Acrobatics, Deception, Stealth, Sleight of Hand.', { choices: [choice('skills', 'Skills', 'skill', 2, { from: ['acrobatics', 'deception', 'stealth', 'sleight-of-hand'] })] }),
      t('mimicry', 'Mimicry', 'Mimic sounds and voices you have heard (Insight vs Deception to detect).'),
      t('kenku-languages', 'Languages', 'Read and write Common and Auran; speak only through Mimicry.', { grants: { languages: ['Common', 'Auran'] } }),
    ],
  }),
  race({
    id: 'tortle', name: 'Tortle', source: { book: 'TP', kind: 'summary' }, size: 'medium', speed: { walk: 30 }, description: 'Turtle-folk who carry their homes on their backs.',
    abilityBonuses: { str: 2, wis: 1 },
    traits: [
      t('claws-tortle', 'Claws', 'Unarmed strikes deal 1d4 slashing.'),
      t('hold-breath', 'Hold Breath', 'Hold your breath for up to 1 hour.'),
      t('natural-armor-tortle', 'Natural Armor', 'Your shell gives you a base AC of 17 (your DEX modifier doesn’t apply). You can’t wear armor, but can use a shield.', { effects: [eff('tortle-natural-armor', [mod('ac-formula', undefined, { acFormula: { label: 'Tortle shell (17)', base: 17, abilities: [], allowsArmor: false, allowsShield: true } })])] }),
      t('shell-defense', 'Shell Defense', 'Action: withdraw into your shell: +4 AC, advantage on STR and CON saves, prone, speed 0, disadvantage on DEX saves.', { effects: [{ id: 'shell-defense', name: 'Shell Defense', activation: 'toggle', modifiers: [mod('ac', 4), adv('save:str'), adv('save:con'), { target: 'save:dex', op: 'disadvantage' }, { target: 'speed:all', op: 'set', value: 0 }] }] }),
      t('survival-instinct', 'Survival Instinct', 'Proficiency in Survival.', { grants: { skills: ['survival'] } }),
      t('tortle-languages', 'Languages', 'Aquan and Common.', { grants: { languages: ['Common', 'Aquan'] } }),
    ],
  }),
  race({
    id: 'goblin', name: 'Goblin', source: VGM, size: 'small', speed: { walk: 30 }, description: 'Small, nimble, and surprisingly vicious.',
    abilityBonuses: { dex: 2, con: 1 },
    traits: [
      dv(),
      t('fury-of-the-small', 'Fury of the Small', 'Once per short rest, deal extra damage equal to your level to a creature larger than you.', { resource: res('fury-of-the-small', 'Fury of the Small', 1, 'short'), effects: [{ id: 'fury-of-the-small', name: 'Fury of the Small', trigger: 'on-hit', consumes: { resourceId: 'fury-of-the-small', amount: 1 }, outcomes: [{ kind: 'damage', dice: '{lvl}', text: 'vs. a creature larger than you' }] }] }),
      t('nimble-escape', 'Nimble Escape', 'Disengage or Hide as a bonus action.', { activation: 'bonus' }),
      t('goblin-languages', 'Languages', 'Common and Goblin.', { grants: { languages: ['Common', 'Goblin'] } }),
    ],
  }),
  race({
    id: 'hobgoblin', name: 'Hobgoblin', source: VGM, size: 'medium', speed: { walk: 30 }, description: 'Disciplined martial goblinoids.',
    abilityBonuses: { con: 2, int: 1 },
    traits: [
      dv(),
      t('martial-training', 'Martial Training', 'Proficiency with two martial weapons and light armor.', { grants: { armor: ['light'] }, choices: [choice('weapons', 'Martial weapons', 'options', 2, { options: ['longsword', 'battleaxe', 'warhammer', 'rapier', 'scimitar', 'shortsword', 'longbow', 'crossbow-heavy', 'glaive', 'halberd', 'pike', 'greatsword', 'maul', 'morningstar', 'flail', 'war-pick', 'trident', 'whip', 'lance', 'crossbow-hand', 'greataxe'].map((w) => ({ id: `hob-${w}`, name: w.replace(/-/g, ' '), grants: { weapons: [w] } })) })] }),
      t('saving-face', 'Saving Face', 'When you miss an attack or fail a check/save, gain a bonus equal to the number of allies within 30 ft you can see (max +5). Once per short rest.', { resource: res('saving-face', 'Saving Face', 1, 'short') }),
      t('hobgoblin-languages', 'Languages', 'Common and Goblin.', { grants: { languages: ['Common', 'Goblin'] } }),
    ],
  }),
  race({
    id: 'bugbear', name: 'Bugbear', source: VGM, size: 'medium', speed: { walk: 30 }, description: 'Hulking, stealthy goblinoids.',
    abilityBonuses: { str: 2, dex: 1 },
    traits: [
      dv(),
      t('long-limbed', 'Long-Limbed', 'Your reach is 5 ft greater when you make a melee attack on your turn.'),
      t('powerful-build', 'Powerful Build', 'Count as one size larger for carrying capacity.', { effects: [eff('powerful-build', [flag('powerful-build')])] }),
      t('sneaky', 'Sneaky', 'Proficiency in Stealth.', { grants: { skills: ['stealth'] } }),
      t('surprise-attack', 'Surprise Attack', 'If you hit a surprised creature on your first turn, deal an extra 2d6 damage.', { effects: [{ id: 'surprise-attack', name: 'Surprise Attack', trigger: 'on-hit', outcomes: [{ kind: 'damage', dice: '2d6', text: 'vs. a surprised creature on your first turn' }] }] }),
      t('bugbear-languages', 'Languages', 'Common and Goblin.', { grants: { languages: ['Common', 'Goblin'] } }),
    ],
  }),
  race({
    id: 'kobold', name: 'Kobold', source: VGM, size: 'small', speed: { walk: 30 }, description: 'Small draconic creatures with strength in numbers.',
    abilityBonuses: { dex: 2, str: -2 },
    traits: [
      dv(),
      t('grovel-cower-beg', 'Grovel, Cower, and Beg', 'Action: allies gain advantage on attacks against enemies within 10 ft of you until your next turn. Once per short rest.', { resource: res('grovel', 'Grovel, Cower, and Beg', 1, 'short') }),
      t('pack-tactics', 'Pack Tactics', 'Advantage on attacks against a creature if an ally is within 5 ft of it.', { effects: [eff('pack-tactics', [adv('attack', 'if a non-incapacitated ally is within 5 ft of the target')])] }),
      t('sunlight-sensitivity-kobold', 'Sunlight Sensitivity', 'Disadvantage on attacks and sight-based Perception in direct sunlight.', { effects: [eff('sunlight-sensitivity', [{ target: 'attack', op: 'disadvantage', condition: 'in direct sunlight' }])] }),
      t('kobold-languages', 'Languages', 'Common and Draconic.', { grants: { languages: ['Common', 'Draconic'] } }),
    ],
  }),
  race({
    id: 'orc', name: 'Orc', source: VGM, size: 'medium', speed: { walk: 30 }, description: 'Savage raiders driven by their gods.',
    abilityBonuses: { str: 2, con: 1, int: -2 },
    traits: [
      dv(),
      t('aggressive', 'Aggressive', 'Bonus action: move up to your speed toward a hostile creature you can see.', { activation: 'bonus' }),
      t('menacing-orc', 'Menacing', 'Proficiency in Intimidation.', { grants: { skills: ['intimidation'] } }),
      t('powerful-build', 'Powerful Build', 'Count as one size larger for carrying capacity.', { effects: [eff('powerful-build', [flag('powerful-build')])] }),
      t('orc-languages', 'Languages', 'Common and Orc.', { grants: { languages: ['Common', 'Orc'] } }),
    ],
  }),
  race({
    id: 'yuan-ti', name: 'Yuan-ti Pureblood', source: VGM, size: 'medium', speed: { walk: 30 }, description: 'Serpentine humanoids with innate magic.',
    abilityBonuses: { cha: 2, int: 1 },
    traits: [
      dv(),
      t('innate-spellcasting-yuanti', 'Innate Spellcasting', 'You know poison spray; cast animal friendship on snakes at will; at 3rd level cast suggestion once per long rest (CHA).', { grants: { spells: [cantrip('poison-spray'), { spellId: 'animal-friendship', mode: 'innate', ability: 'cha', note: 'Snakes only, at will' }, innate('suggestion', 3)] } }),
      t('magic-resistance', 'Magic Resistance', 'Advantage on saving throws against spells and other magical effects.', { effects: [eff('magic-resistance', [adv('save:all', 'against spells and magical effects')])] }),
      t('poison-immunity', 'Poison Immunity', 'Immune to poison damage and the poisoned condition.', { grants: { immunities: ['poison'], conditionImmunities: ['poisoned'] } }),
      t('yuanti-languages', 'Languages', 'Common, Abyssal, and Draconic.', { grants: { languages: ['Common', 'Abyssal', 'Draconic'] } }),
    ],
  }),
  race({
    id: 'lizardfolk', name: 'Lizardfolk', source: VGM, size: 'medium', speed: { walk: 30, swim: 30 }, description: 'Cold-blooded reptilian survivalists.',
    abilityBonuses: { con: 2, wis: 1 },
    traits: [
      t('bite', 'Bite', 'Unarmed strikes with your bite deal 1d6 piercing.'),
      t('cunning-artisan', 'Cunning Artisan', 'During a short rest, craft a shield, club, javelin, or darts from a slain beast.'),
      t('hold-breath-lizard', 'Hold Breath', 'Hold your breath for up to 15 minutes.'),
      t('hunters-lore', "Hunter's Lore", 'Proficiency in two of Animal Handling, Nature, Perception, Stealth, Survival.', { choices: [choice('skills', 'Skills', 'skill', 2, { from: ['animal-handling', 'nature', 'perception', 'stealth', 'survival'] })] }),
      t('natural-armor-lizard', 'Natural Armor', 'Without armor, your AC is 13 + DEX modifier (shields still apply).', { effects: [eff('lizardfolk-natural-armor', [mod('ac-formula', undefined, { acFormula: { label: 'Natural Armor (13 + DEX)', base: 13, abilities: ['dex'], allowsArmor: false, allowsShield: true } })])] }),
      t('hungry-jaws', 'Hungry Jaws', 'Bonus action: special bite attack; on a hit gain temp HP equal to CON mod. Once per short rest.', { resource: res('hungry-jaws', 'Hungry Jaws', 1, 'short') }),
      t('lizardfolk-languages', 'Languages', 'Common and Draconic.', { grants: { languages: ['Common', 'Draconic'] } }),
    ],
  }),
  race({
    id: 'triton', name: 'Triton', source: VGM, size: 'medium', speed: { walk: 30, swim: 30 }, description: 'Guardians of the ocean depths.',
    abilityBonuses: { str: 1, con: 1, cha: 1 },
    traits: [
      t('amphibious-triton', 'Amphibious', 'Breathe air and water.'),
      t('control-air-and-water', 'Control Air and Water', 'Cast fog cloud; at 3rd level gust of wind; at 5th wall of water; each once per long rest (CHA).', { grants: { spells: [innate('fog-cloud', 1), innate('gust-of-wind', 3)] } }),
      t('emissary-of-the-sea', 'Emissary of the Sea', 'Communicate simple ideas with beasts that breathe water.'),
      t('guardians-of-the-depths', 'Guardians of the Depths', 'Resistance to cold damage; ignore deep-water drawbacks.', { grants: { resistances: ['cold'] } }),
      t('triton-languages', 'Languages', 'Common and Primordial.', { grants: { languages: ['Common', 'Primordial'] } }),
    ],
  }),
  race({
    id: 'changeling', name: 'Changeling', source: ERLW, size: 'medium', speed: { walk: 30 }, description: 'Shapechangers who can alter their appearance at will.',
    abilityBonuses: { cha: 2 }, choices: [asiChoice(1, 1, ['cha'])],
    traits: [
      t('shapechanger', 'Shapechanger', 'Action: change your appearance and voice (not size category beyond Small/Medium).', { activation: 'action' }),
      t('changeling-instincts', 'Changeling Instincts', 'Proficiency in two of Deception, Insight, Intimidation, Persuasion.', { choices: [choice('skills', 'Skills', 'skill', 2, { from: ['deception', 'insight', 'intimidation', 'persuasion'] })] }),
      t('changeling-languages', 'Languages', 'Common and two others.', { grants: { languages: ['Common'] }, choices: [langChoice(2)] }),
    ],
  }),
  race({
    id: 'warforged', name: 'Warforged', source: ERLW, size: 'medium', speed: { walk: 30 }, description: 'Living constructs built for war.',
    abilityBonuses: { con: 2 }, choices: [asiChoice(1, 1, ['con'])],
    traits: [
      t('constructed-resilience', 'Constructed Resilience', 'Advantage on saves against being poisoned; resistance to poison damage; no need to eat, drink, breathe, or sleep; immune to disease.', { grants: { resistances: ['poison'] }, effects: [eff('constructed-resilience', [adv('save:all', 'against being poisoned')])] }),
      t('sentrys-rest', "Sentry's Rest", 'Long rest by spending 6 hours inactive but conscious.'),
      t('integrated-protection', 'Integrated Protection', '+1 bonus to AC; armor takes 1 hour to don/doff.', { effects: [eff('integrated-protection', [mod('ac', 1)])] }),
      t('specialized-design', 'Specialized Design', 'Gain one skill and one tool proficiency.', { choices: [choice('skill', 'Skill', 'skill', 1), choice('tool', 'Tool', 'tool', 1)] }),
      t('warforged-languages', 'Languages', 'Common and one other.', { grants: { languages: ['Common'] }, choices: [langChoice()] }),
    ],
  }),
  race({
    id: 'shifter', name: 'Shifter', source: ERLW, size: 'medium', speed: { walk: 30 }, description: 'Descendants of lycanthropes who can shift into a bestial form.',
    abilityBonuses: {},
    traits: [
      dv(),
      t('shifting', 'Shifting', 'Bonus action: shift for 1 minute, gaining temp HP = level + CON mod (min 1) plus your subrace benefit. Once per short rest.', { activation: 'bonus', resource: res('shifting', 'Shifting', 1, 'short'), effects: [{ id: 'shifting', name: 'Shifted', activation: 'toggle', modifiers: [], outcomes: [{ kind: 'temp-hp', dice: '{max(1, lvl + con)}' }], description: 'Temp HP = level + CON mod.' }] }),
      t('shifter-languages', 'Languages', 'Common.', { grants: { languages: ['Common'] } }),
    ],
    subraces: [
      sub('beasthide', 'Beasthide', ERLW, 'Tough and resilient.', { con: 2, str: 1 }, [t('beasthide-shift', 'Beasthide', 'Proficiency in Athletics; while shifted gain extra 1d6 temp HP and +1 AC.', { grants: { skills: ['athletics'] }, effects: [{ id: 'beasthide-ac', name: 'Shifted', activation: 'toggle', toggleKey: 'shifting', modifiers: [mod('ac', 1)] }] })]),
      sub('longtooth', 'Longtooth', ERLW, 'Fierce and aggressive.', { str: 2, dex: 1 }, [t('longtooth-shift', 'Longtooth', 'Proficiency in Intimidation; while shifted, bonus action fang attack 1d6 + STR piercing.', { grants: { skills: ['intimidation'] } })]),
      sub('swiftstride', 'Swiftstride', ERLW, 'Graceful and quick.', { dex: 2, cha: 1 }, [t('swiftstride-shift', 'Swiftstride', 'Proficiency in Acrobatics; while shifted +10 ft walking speed and reaction to move 10 ft.', { grants: { skills: ['acrobatics'] }, effects: [{ id: 'swiftstride-speed', name: 'Shifted', activation: 'toggle', toggleKey: 'shifting', modifiers: [mod('speed:walk', 10)] }] })]),
      sub('wildhunt', 'Wildhunt', ERLW, 'Keen hunters.', { wis: 2, dex: 1 }, [t('wildhunt-shift', 'Wildhunt', 'Proficiency in Survival; while shifted advantage on WIS checks and no creature within 30 ft can have advantage on attacks against you.', { grants: { skills: ['survival'] }, effects: [{ id: 'wildhunt-adv', name: 'Shifted', activation: 'toggle', toggleKey: 'shifting', modifiers: [adv('check:wis')] }] })]),
    ],
    subraceRequired: true,
  }),
  race({
    id: 'custom-lineage', name: 'Custom Lineage', source: { book: 'TCoE', kind: 'summary' }, size: 'medium', sizeOptions: ['small', 'medium'], speed: { walk: 30 }, description: 'Build your own origin: +2 to one ability, a feat, and darkvision or a skill.',
    abilityBonuses: {}, choices: [asiChoice(1, 2)],
    traits: [
      t('cl-feat', 'Feat', 'You gain one feat of your choice.', { choices: [choice('feat', 'Feat', 'feat', 1)] }),
      t('cl-variable-trait', 'Variable Trait', 'Choose darkvision (60 ft) or proficiency in one skill.', { choices: [choice('trait', 'Variable trait', 'options', 1, { options: [{ id: 'cl-darkvision', name: 'Darkvision 60 ft', grants: { senses: { darkvision: 60 } } }, { id: 'cl-skill', name: 'Skill proficiency', features: [t('cl-skill-pick', 'Skill', 'One skill.', { choices: [choice('skill', 'Skill', 'skill', 1)] })] }] })] }),
      t('cl-languages', 'Languages', 'Common and one other.', { grants: { languages: ['Common'] }, choices: [langChoice()] }),
    ],
  }),
];

// Mark Satyr etc. intentionally not included; add via custom content.
export const _unused = { grant, MOOT };
