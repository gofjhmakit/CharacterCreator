// Shared option pools: fighting styles, invocations, metamagic, maneuvers, pact boons, etc.
import type { ChoiceOption, OptionPool } from '@/types/content';
import { T, mod, adv, grant, flag, eff, toggle } from './helpers';

const FS: Record<string, ChoiceOption> = {
  archery: { id: 'fs-archery', name: 'Archery', description: T('fighter-fighting-style-archery', '+2 bonus to attack rolls with ranged weapons.'), effects: [eff('fs-archery', [mod('attack', 2, { scope: 'ranged-weapon' })])] },
  defense: { id: 'fs-defense', name: 'Defense', description: T('fighter-fighting-style-defense', '+1 AC while wearing armor.'), effects: [eff('fs-defense', [mod('ac', 1, { requires: ['armored'] })])] },
  dueling: { id: 'fs-dueling', name: 'Dueling', description: T('fighter-fighting-style-dueling', '+2 damage with a melee weapon in one hand and no other weapons.'), effects: [eff('fs-dueling', [mod('damage', 2, { scope: 'melee-weapon', requires: ['one-handed-melee-only'] })])] },
  gwf: { id: 'fs-great-weapon-fighting', name: 'Great Weapon Fighting', description: T('fighter-fighting-style-great-weapon-fighting', 'Reroll 1s and 2s on damage dice for two-handed/versatile melee weapons held in two hands.'), effects: [eff('fs-gwf', [], { manual: true, description: 'Reroll damage dice showing 1 or 2 (two-handed or versatile weapon wielded with two hands).' })] },
  protection: { id: 'fs-protection', name: 'Protection', description: T('fighter-fighting-style-protection', 'Reaction: impose disadvantage on an attack against an adjacent ally while wielding a shield.') },
  twf: { id: 'fs-two-weapon-fighting', name: 'Two-Weapon Fighting', description: T('fighter-fighting-style-two-weapon-fighting', 'Add your ability modifier to the damage of the off-hand attack.'), effects: [eff('fs-twf', [flag('two-weapon-fighting')])] },
  blind: { id: 'fs-blind-fighting', name: 'Blind Fighting (TCoE)', description: 'You have blindsight out to 10 feet.', grants: { senses: { blindsight: 10 } } },
  interception: { id: 'fs-interception', name: 'Interception (TCoE)', description: 'Reaction while wielding a shield or weapon: reduce damage to a nearby creature by 1d10 + proficiency bonus.' },
  superior: { id: 'fs-superior-technique', name: 'Superior Technique (TCoE)', description: 'Learn one Battle Master maneuver and gain one d6 superiority die (short rest).', resource: { id: 'superiority-fs', name: 'Superiority Die (Fighting Style)', max: 1, recharge: 'short', die: 'd6' } },
  thrown: { id: 'fs-thrown-weapon-fighting', name: 'Thrown Weapon Fighting (TCoE)', description: 'Draw a thrown weapon as part of the attack; +2 damage with thrown weapons.', effects: [eff('fs-thrown', [mod('damage', 2, { scope: 'thrown' })])] },
  unarmed: { id: 'fs-unarmed-fighting', name: 'Unarmed Fighting (TCoE)', description: 'Unarmed strikes deal 1d6 (1d8 with both hands free); 1d4 to a creature you grapple at start of your turn.', effects: [eff('fs-unarmed', [], { manual: true, description: 'Unarmed strike damage die 1d6 (1d8 if no weapon/shield).' })] },
  blessed: { id: 'fs-blessed-warrior', name: 'Blessed Warrior (TCoE)', description: 'Learn two cleric cantrips; they count as paladin spells (CHA).' },
  druidic: { id: 'fs-druidic-warrior', name: 'Druidic Warrior (TCoE)', description: 'Learn two druid cantrips; they count as ranger spells (WIS).' },
};

const fsList = (...keys: string[]) => keys.map((k) => FS[k]);

const inv = (id: string, name: string, extra: Partial<ChoiceOption> = {}, key = `eldritch-invocation-${id}`): ChoiceOption => ({ id: `inv-${id}`, name, description: T(key, extra.description ?? ''), ...extra });

const INVOCATIONS: ChoiceOption[] = [
  inv('agonizing-blast', 'Agonizing Blast', { prerequisite: { spell: 'eldritch-blast' }, effects: [eff('inv-agonizing', [], { manual: true, description: 'Add CHA modifier to each Eldritch Blast beam damage.' })] }),
  inv('armor-of-shadows', 'Armor of Shadows', { grants: { spells: [{ spellId: 'mage-armor', mode: 'innate', note: 'At will, no slot' }] } }),
  inv('beast-speech', 'Beast Speech', { grants: { spells: [{ spellId: 'speak-with-animals', mode: 'innate' }] } }),
  inv('beguiling-influence', 'Beguiling Influence', { grants: { skills: ['deception', 'persuasion'] } }),
  inv('book-of-ancient-secrets', 'Book of Ancient Secrets', { prerequisite: { pact: 'pact-tome' } }),
  inv('devils-sight', "Devil's Sight", { grants: { senses: { "devil's sight": 120 } } }),
  inv('eldritch-sight', 'Eldritch Sight', { grants: { spells: [{ spellId: 'detect-magic', mode: 'innate' }] } }),
  inv('eldritch-spear', 'Eldritch Spear', { prerequisite: { spell: 'eldritch-blast' } }),
  inv('eyes-of-the-rune-keeper', 'Eyes of the Rune Keeper'),
  inv('fiendish-vigor', 'Fiendish Vigor', { grants: { spells: [{ spellId: 'false-life', mode: 'innate' }] } }),
  inv('gaze-of-two-minds', 'Gaze of Two Minds'),
  inv('mask-of-many-faces', 'Mask of Many Faces', { grants: { spells: [{ spellId: 'disguise-self', mode: 'innate' }] } }),
  inv('misty-visions', 'Misty Visions', { grants: { spells: [{ spellId: 'silent-image', mode: 'innate' }] } }),
  inv('repelling-blast', 'Repelling Blast', { prerequisite: { spell: 'eldritch-blast' } }),
  inv('thief-of-five-fates', 'Thief of Five Fates', { grants: { spells: [{ spellId: 'bane', mode: 'innate', note: 'Once per long rest using a warlock slot' }] } }),
  inv('voice-of-the-chain-master', 'Voice of the Chain Master', { prerequisite: { pact: 'pact-chain' } }),
  inv('mire-the-mind', 'Mire the Mind', { prerequisite: { level: 5 }, grants: { spells: [{ spellId: 'slow', mode: 'innate', note: 'Once per long rest using a warlock slot' }] } }),
  inv('one-with-shadows', 'One with Shadows', { prerequisite: { level: 5 } }),
  inv('sign-of-ill-omen', 'Sign of Ill Omen', { prerequisite: { level: 5 }, grants: { spells: [{ spellId: 'bestow-curse', mode: 'innate', note: 'Once per long rest using a warlock slot' }] } }),
  inv('thirsting-blade', 'Thirsting Blade', { prerequisite: { level: 5, pact: 'pact-blade' } }),
  inv('bewitching-whispers', 'Bewitching Whispers', { prerequisite: { level: 7 }, grants: { spells: [{ spellId: 'compulsion', mode: 'innate', note: 'Once per long rest using a warlock slot' }] } }),
  inv('dreadful-word', 'Dreadful Word', { prerequisite: { level: 7 }, grants: { spells: [{ spellId: 'confusion', mode: 'innate', note: 'Once per long rest using a warlock slot' }] } }),
  inv('sculptor-of-flesh', 'Sculptor of Flesh', { prerequisite: { level: 7 }, grants: { spells: [{ spellId: 'polymorph', mode: 'innate', note: 'Once per long rest using a warlock slot' }] } }),
  inv('ascendant-step', 'Ascendant Step', { prerequisite: { level: 9 }, grants: { spells: [{ spellId: 'levitate', mode: 'innate' }] } }),
  inv('minions-of-chaos', 'Minions of Chaos', { prerequisite: { level: 9 }, grants: { spells: [{ spellId: 'conjure-elemental', mode: 'innate', note: 'Once per long rest using a warlock slot' }] } }),
  inv('otherworldly-leap', 'Otherworldly Leap', { prerequisite: { level: 9 }, grants: { spells: [{ spellId: 'jump', mode: 'innate' }] } }),
  inv('whispers-of-the-grave', 'Whispers of the Grave', { prerequisite: { level: 9 }, grants: { spells: [{ spellId: 'speak-with-dead', mode: 'innate' }] } }),
  inv('lifedrinker', 'Lifedrinker', { prerequisite: { level: 12, pact: 'pact-blade' } }),
  inv('chains-of-carceri', 'Chains of Carceri', { prerequisite: { level: 15, pact: 'pact-chain' } }),
  inv('master-of-myriad-forms', 'Master of Myriad Forms', { prerequisite: { level: 15 }, grants: { spells: [{ spellId: 'alter-self', mode: 'innate' }] } }),
  inv('visions-of-distant-realms', 'Visions of Distant Realms', { prerequisite: { level: 15 }, grants: { spells: [{ spellId: 'arcane-eye', mode: 'innate' }] } }),
  inv('witch-sight', 'Witch Sight', { prerequisite: { level: 15 }, grants: { senses: { truesight: 30 } } }),
  // Non-SRD (summaries)
  { id: 'inv-eldritch-mind', name: 'Eldritch Mind (TCoE)', description: 'Advantage on Constitution saving throws to maintain concentration.', effects: [eff('inv-eldritch-mind', [adv('save:con', 'to maintain concentration')])] },
  { id: 'inv-improved-pact-weapon', name: 'Improved Pact Weapon (XGtE)', description: 'Pact weapon gains +1 to attack and damage (if not already magical) and can be a bow or crossbow; it can serve as a focus.', prerequisite: { pact: 'pact-blade' } },
  { id: 'inv-gift-of-the-ever-living-ones', name: 'Gift of the Ever-Living Ones (XGtE)', description: 'While your familiar is within 100 ft, healing dice you roll are treated as their maximum.', prerequisite: { pact: 'pact-chain' } },
  { id: 'inv-eldritch-smite', name: 'Eldritch Smite (XGtE)', description: 'Once per turn when you hit with your pact weapon, expend a Pact Magic slot: +1d8 force damage plus 1d8 per slot level, and you can knock a Huge or smaller target prone.', prerequisite: { level: 5, pact: 'pact-blade' },
    effects: [{ id: 'inv-eldritch-smite', name: 'Eldritch Smite (pact slot)', trigger: 'on-hit', scope: 'melee-weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '1d8', damageType: 'force', text: '+1d8 force per slot level; may knock Huge or smaller target prone' }, { kind: 'prone' }] }] },
  { id: 'inv-aspect-of-the-moon', name: 'Aspect of the Moon (XGtE)', description: 'You no longer need sleep; you rest by light activity.', prerequisite: { pact: 'pact-tome' } },
  { id: 'inv-cloak-of-flies', name: 'Cloak of Flies (XGtE)', description: 'Bonus action: 5-ft aura of flies; advantage on Intimidation, disadvantage on other CHA checks; creatures starting their turn in it take poison damage equal to your CHA modifier.', prerequisite: { level: 5 } },
  { id: 'inv-tomb-of-levistus', name: 'Tomb of Levistus (XGtE)', description: 'Reaction when you take damage: gain 10 temp HP per warlock level, become incapacitated and gain vulnerability to fire until those HP are gone.', prerequisite: { level: 5 } },
  { id: 'inv-maddening-hex', name: 'Maddening Hex (XGtE)', description: 'Bonus action: psychic damage equal to your CHA modifier to the target cursed by your hex/patron curse and creatures within 5 ft of it.', prerequisite: { level: 5 } },
  { id: 'inv-relentless-hex', name: 'Relentless Hex (XGtE)', description: 'Bonus action: teleport up to 30 ft to a space within 5 ft of a creature cursed by your hex.', prerequisite: { level: 7 } },
  { id: 'inv-shroud-of-shadow', name: 'Shroud of Shadow (XGtE)', description: 'Cast invisibility at will without a slot.', prerequisite: { level: 15 }, grants: { spells: [{ spellId: 'invisibility', mode: 'innate' }] } },
  { id: 'inv-trickster-escape', name: "Trickster's Escape (XGtE)", description: 'Cast freedom of movement on yourself once per long rest without a slot.', prerequisite: { level: 7 }, grants: { spells: [{ spellId: 'freedom-of-movement', mode: 'innate', uses: { max: 1, recharge: 'long' } }] } },
  { id: 'inv-far-scribe', name: 'Far Scribe (XGtE)', description: 'Creatures that write their names in your Book of Shadows can be targeted by sending without a slot.', prerequisite: { level: 5, pact: 'pact-tome' } },
  { id: 'inv-ghostly-gaze', name: 'Ghostly Gaze (XGtE)', description: 'Action: see through solid objects to 30 ft for up to 1 minute (concentration). Once per short rest.', prerequisite: { level: 7 } },
  { id: 'inv-grasp-of-hadar', name: 'Grasp of Hadar (XGtE)', description: 'Once per turn when Eldritch Blast hits, pull the target up to 10 ft closer.', prerequisite: { spell: 'eldritch-blast' } },
  { id: 'inv-lance-of-lethargy', name: 'Lance of Lethargy (XGtE)', description: "Once per turn when Eldritch Blast hits, reduce the target's speed by 10 ft until the end of your next turn.", prerequisite: { spell: 'eldritch-blast' } },
  { id: 'inv-investment-of-the-chain-master', name: 'Investment of the Chain Master (TCoE)', description: 'Your familiar gains a fly or swim speed of 40 ft, magical attacks, uses your spell save DC, and can resist damage with your reaction.', prerequisite: { pact: 'pact-chain' } },
  { id: 'inv-protection-of-the-talisman', name: 'Protection of the Talisman (TCoE)', description: 'When the talisman wearer fails a saving throw, they can add 1d4 to the roll (proficiency bonus times per long rest).', prerequisite: { level: 7, pact: 'pact-talisman' } },
  { id: 'inv-rebuke-of-the-talisman', name: 'Rebuke of the Talisman (TCoE)', description: 'Reaction when the talisman wearer is hit: deal psychic damage equal to your proficiency bonus and push the attacker 10 ft.', prerequisite: { pact: 'pact-talisman' } },
  { id: 'inv-bond-of-the-talisman', name: 'Bond of the Talisman (TCoE)', description: 'You or the talisman wearer can teleport to the other (proficiency bonus times per long rest).', prerequisite: { level: 12, pact: 'pact-talisman' } },
  { id: 'inv-undying-servitude', name: 'Undying Servitude (TCoE)', description: 'Cast animate dead once per long rest without a slot.', prerequisite: { level: 5 }, grants: { spells: [{ spellId: 'animate-dead', mode: 'innate', uses: { max: 1, recharge: 'long' } }] } },
];

const mm = (id: string, name: string, cost: string, key = `metamagic-${id}`): ChoiceOption => ({ id: `mm-${id}`, name: `${name} (${cost})`, description: T(key) });
const METAMAGIC: ChoiceOption[] = [
  mm('careful-spell', 'Careful Spell', '1 SP'),
  mm('distant-spell', 'Distant Spell', '1 SP'),
  mm('empowered-spell', 'Empowered Spell', '1 SP'),
  mm('extended-spell', 'Extended Spell', '1 SP'),
  mm('heightened-spell', 'Heightened Spell', '3 SP'),
  mm('quickened-spell', 'Quickened Spell', '2 SP'),
  mm('subtle-spell', 'Subtle Spell', '1 SP'),
  mm('twinned-spell', 'Twinned Spell', 'SP = spell level'),
  { id: 'mm-seeking-spell', name: 'Seeking Spell (2 SP, TCoE)', description: 'If you miss with a spell attack roll, reroll it; you must use the new roll.' },
  { id: 'mm-transmuted-spell', name: 'Transmuted Spell (1 SP, TCoE)', description: 'Change a spell\'s damage type among acid, cold, fire, lightning, poison, and thunder.' },
];

const man = (id: string, name: string, description: string): ChoiceOption => ({ id: `man-${id}`, name, description });
const MANEUVERS: ChoiceOption[] = [
  man('commanders-strike', "Commander's Strike", 'Forgo one attack and spend a bonus action to let an ally use its reaction to attack, adding the superiority die to damage.'),
  man('disarming-attack', 'Disarming Attack', 'On a hit, add the die to damage; target makes a STR save or drops an item of your choice.'),
  man('distracting-strike', 'Distracting Strike', "On a hit, add the die to damage; the next attack by someone else against the target has advantage before your next turn."),
  man('evasive-footwork', 'Evasive Footwork', 'When you move, add the die to your AC until you stop moving.'),
  man('feinting-attack', 'Feinting Attack', 'Bonus action: advantage on your next attack against a creature within 5 ft this turn; add the die to damage if it hits.'),
  man('goading-attack', 'Goading Attack', 'On a hit, add the die to damage; target makes a WIS save or has disadvantage on attacks against others.'),
  man('lunging-attack', 'Lunging Attack', 'Increase your reach by 5 ft for one melee attack; add the die to damage on a hit.'),
  man('maneuvering-attack', 'Maneuvering Attack', 'On a hit, add the die to damage; an ally can use its reaction to move half its speed without provoking from the target.'),
  man('menacing-attack', 'Menacing Attack', 'On a hit, add the die to damage; target makes a WIS save or is frightened until the end of your next turn.'),
  man('parry', 'Parry', 'Reaction when hit by a melee attack: reduce damage by the die + DEX modifier.'),
  man('precision-attack', 'Precision Attack', 'Add the die to an attack roll (before or after rolling, before the result is known).'),
  man('pushing-attack', 'Pushing Attack', 'On a hit, add the die to damage; Large or smaller target makes a STR save or is pushed up to 15 ft.'),
  man('rally', 'Rally', 'Bonus action: an ally that can see or hear you gains temp HP equal to the die + CHA modifier.'),
  man('riposte', 'Riposte', 'Reaction when a creature misses you with a melee attack: make a melee attack against it, adding the die to damage.'),
  man('sweeping-attack', 'Sweeping Attack', 'On a melee hit, deal the die as damage to another creature within 5 ft if the original roll would hit it.'),
  man('trip-attack', 'Trip Attack', 'On a hit, add the die to damage; Large or smaller target makes a STR save or is knocked prone.'),
  man('ambush', 'Ambush (TCoE)', 'Add the die to a Stealth check or initiative roll (if not incapacitated).'),
  man('bait-and-switch', 'Bait and Switch (TCoE)', 'Swap places with a willing ally within 5 ft; one of you adds the die to AC until your next turn.'),
  man('brace', 'Brace (TCoE)', 'Reaction when a creature you can see moves into your reach: attack it, adding the die to damage.'),
  man('commanding-presence', 'Commanding Presence (TCoE)', 'Add the die to an Intimidation, Performance, or Persuasion check.'),
  man('grappling-strike', 'Grappling Strike (TCoE)', 'After a melee hit, bonus action to grapple, adding the die to the Athletics check.'),
  man('quick-toss', 'Quick Toss (TCoE)', 'Bonus action: draw and make a ranged attack with a thrown weapon, adding the die to damage.'),
  man('tactical-assessment', 'Tactical Assessment (TCoE)', 'Add the die to an Investigation, History, or Insight check.'),
];

const PACT_BOONS: ChoiceOption[] = [
  { id: 'pact-chain', name: 'Pact of the Chain', description: 'Learn find familiar and cast it as a ritual; your familiar can take special forms (imp, pseudodragon, quasit, sprite) and you can forgo an attack to let it attack.', grants: { spells: [{ spellId: 'find-familiar', mode: 'always-prepared' }] } },
  { id: 'pact-blade', name: 'Pact of the Blade', description: 'Action: create a pact weapon in your hand (any melee form); you are proficient with it and it counts as magical. You can bond a magic weapon instead.', grants: { weapons: ['pact weapon'] } },
  { id: 'pact-tome', name: 'Pact of the Tome', description: 'Gain a Book of Shadows with three cantrips from any class\'s spell list; they count as warlock spells.' },
  { id: 'pact-talisman', name: 'Pact of the Talisman (TCoE)', description: 'The wearer of your talisman can add 1d4 to a failed ability check (proficiency bonus times per long rest).', resource: { id: 'talisman', name: 'Talisman', max: 'prof', recharge: 'long' } },
];

const ENEMIES = ['Aberrations', 'Beasts', 'Celestials', 'Constructs', 'Dragons', 'Elementals', 'Fey', 'Fiends', 'Giants', 'Monstrosities', 'Oozes', 'Plants', 'Undead', 'Two humanoid races'];
const TERRAINS = ['Arctic', 'Coast', 'Desert', 'Forest', 'Grassland', 'Mountain', 'Swamp', 'Underdark'];

const RUNES: ChoiceOption[] = [
  { id: 'rune-cloud', name: 'Cloud Rune', description: 'Advantage on Sleight of Hand and Deception. Reaction: redirect an attack that hits a creature within 30 ft to another creature. 1/short rest.', effects: [eff('rune-cloud', [adv('skill:sleight-of-hand'), adv('skill:deception')])] },
  { id: 'rune-fire', name: 'Fire Rune', description: 'Double proficiency on tool checks. On hit: extra 2d6 fire and STR save or restrained (1 minute). 1/short rest.' },
  { id: 'rune-frost', name: 'Frost Rune', description: 'Advantage on Animal Handling and Intimidation. Bonus action: +2 to STR and CON checks/saves for 10 minutes. 1/short rest.', effects: [eff('rune-frost', [adv('skill:animal-handling'), adv('skill:intimidation')])] },
  { id: 'rune-stone', name: 'Stone Rune', description: 'Advantage on Insight; darkvision 120 ft. Reaction: WIS save or charmed (incapacitated) 1 minute. 1/short rest.', effects: [eff('rune-stone', [adv('skill:insight')])], grants: { senses: { darkvision: 120 } } },
  { id: 'rune-hill', name: 'Hill Rune (lvl 7)', description: 'Advantage on saves vs. poison, resistance to poison. Bonus action: resistance to B/P/S for 1 minute. 1/short rest.', grants: { resistances: ['poison'] }, prerequisite: { level: 7 } },
  { id: 'rune-storm', name: 'Storm Rune (lvl 7)', description: 'Advantage on Arcana; can\'t be surprised. Bonus action: prophetic state for 1 minute, granting advantage/disadvantage via reaction. 1/short rest.', effects: [eff('rune-storm', [adv('skill:arcana')])], prerequisite: { level: 7 } },
];

export const POOLS: OptionPool[] = [
  { id: 'fighting-styles', name: 'Fighting Styles (Fighter)', options: fsList('archery', 'defense', 'dueling', 'gwf', 'protection', 'twf', 'blind', 'interception', 'superior', 'thrown', 'unarmed') },
  { id: 'fighting-styles-paladin', name: 'Fighting Styles (Paladin)', options: fsList('defense', 'dueling', 'gwf', 'protection', 'blind', 'interception', 'blessed') },
  { id: 'fighting-styles-ranger', name: 'Fighting Styles (Ranger)', options: fsList('archery', 'defense', 'dueling', 'twf', 'blind', 'druidic', 'thrown') },
  { id: 'invocations', name: 'Eldritch Invocations', options: INVOCATIONS },
  { id: 'metamagic', name: 'Metamagic', options: METAMAGIC },
  { id: 'maneuvers', name: 'Battle Master Maneuvers', options: MANEUVERS },
  { id: 'pact-boons', name: 'Pact Boons', options: PACT_BOONS },
  { id: 'favored-enemies', name: 'Favored Enemies', options: ENEMIES.map((e) => ({ id: `enemy-${e.toLowerCase().replace(/\s+/g, '-')}`, name: e })) },
  { id: 'favored-terrains', name: 'Favored Terrains', options: TERRAINS.map((t) => ({ id: `terrain-${t.toLowerCase()}`, name: t })) },
  { id: 'runes', name: 'Rune Knight Runes', options: RUNES },
  { id: 'arcane-shots', name: 'Arcane Shot Options', options: [
    ['banishing', 'Banishing Arrow', 'CHA save or banished to the Feywild until end of its next turn (lvl 18: +2d6 force).'],
    ['beguiling', 'Beguiling Arrow', '+2d6 psychic; WIS save or charmed by an ally of your choice.'],
    ['bursting', 'Bursting Arrow', '2d6 force to the target and each creature within 10 ft.'],
    ['enfeebling', 'Enfeebling Arrow', '+2d6 necrotic; CON save or its weapon damage is halved.'],
    ['grasping', 'Grasping Arrow', '+2d6 poison; brambles reduce speed by 10 ft and deal 2d6 slashing on movement.'],
    ['piercing', 'Piercing Arrow', 'Arrow becomes a 30-ft line; DEX save for weapon damage + 1d6 piercing.'],
    ['seeking', 'Seeking Arrow', 'Ignore cover; DEX save or take weapon damage + 1d6 force and you learn its location.'],
    ['shadow', 'Shadow Arrow', '+2d6 psychic; WIS save or can\'t see beyond 5 ft.'],
  ].map(([id, name, d]) => ({ id: `shot-${id}`, name, description: d })) },
  { id: 'elemental-disciplines', name: 'Elemental Disciplines', options: [
    ['elemental-attunement', 'Elemental Attunement', 'Minor elemental manipulation (0 ki).'],
    ['fangs-of-the-fire-snake', 'Fangs of the Fire Snake', '+10 ft reach for unarmed strikes, fire damage; 1 ki for +1d10 fire.'],
    ['fist-of-four-thunders', 'Fist of Four Thunders', 'Cast thunderwave (2 ki).'],
    ['fist-of-unbroken-air', 'Fist of Unbroken Air', '2 ki: STR save, 3d10 bludgeoning and push 20 ft and prone.'],
    ['rush-of-the-gale-spirits', 'Rush of the Gale Spirits', 'Cast gust of wind (2 ki).'],
    ['shape-the-flowing-river', 'Shape the Flowing River', 'Shape water and ice (1 ki).'],
    ['sweeping-cinder-strike', 'Sweeping Cinder Strike', 'Cast burning hands (2 ki).'],
    ['water-whip', 'Water Whip', '2 ki: DEX save, 3d10 bludgeoning and pulled or prone.'],
    ['clench-of-the-north-wind', 'Clench of the North Wind (6th)', 'Cast hold person (3 ki).'],
    ['gong-of-the-summit', 'Gong of the Summit (6th)', 'Cast shatter (3 ki).'],
    ['eternal-mountain-defense', 'Eternal Mountain Defense (11th)', 'Cast stoneskin on self (5 ki).'],
    ['flames-of-the-phoenix', 'Flames of the Phoenix (11th)', 'Cast fireball (4 ki).'],
    ['mist-stance', 'Mist Stance (11th)', 'Cast gaseous form on self (4 ki).'],
    ['ride-the-wind', 'Ride the Wind (11th)', 'Cast fly on self (4 ki).'],
    ['breath-of-winter', 'Breath of Winter (17th)', 'Cast cone of cold (6 ki).'],
    ['river-of-hungry-flame', 'River of Hungry Flame (17th)', 'Cast wall of fire (5 ki).'],
    ['wave-of-rolling-earth', 'Wave of Rolling Earth (17th)', 'Cast wall of stone (6 ki).'],
  ].map(([id, name, d]) => ({ id: `disc-${id}`, name, description: d })) },
  { id: 'totem-spirits', name: 'Totem Spirits', options: [
    { id: 'totem-bear', name: 'Bear', description: 'While raging, resistance to all damage except psychic.', effects: [toggle('totem-bear-rage', 'Raging', [
      ...(['acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison', 'radiant', 'thunder'] as const).map((d) => grant(`resistance:${d}`, { requires: ['no-heavy-armor'] })),
    ], { toggleKey: 'rage' })] },
    { id: 'totem-eagle', name: 'Eagle', description: 'While raging (no heavy armor), opportunity attacks against you have disadvantage and you can Dash as a bonus action.' },
    { id: 'totem-wolf', name: 'Wolf', description: 'While raging, allies have advantage on melee attacks against hostile creatures within 5 ft of you.' },
    { id: 'totem-elk', name: 'Elk (SCAG)', description: 'While raging (no heavy armor), your walking speed increases by 15 ft.', effects: [toggle('totem-elk-rage', 'Raging', [mod('speed:walk', 15, { requires: ['no-heavy-armor'] })], { toggleKey: 'rage' })] },
    { id: 'totem-tiger', name: 'Tiger (SCAG)', description: 'While raging, +10 ft to long jump and +3 ft to high jump.' },
  ] },
];

export { FS as FIGHTING_STYLES };
