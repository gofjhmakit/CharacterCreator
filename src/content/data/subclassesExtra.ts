// Additional published options, represented by original mechanical summaries.
import type { SubclassDef } from '@/types/content';
import { SCAG, TCE, FTD, choice, adv, eff, mod } from './helpers';
import { sc, f, res, domainSpells, oathSpells, patronSpells } from './subclassHelpers';

const VRGR = { book: 'VRGtR', kind: 'summary' } as const;
const DMG = { book: 'DMG 2014', kind: 'summary' } as const;

export const EXTRA_SUBCLASSES: SubclassDef[] = [
  sc('barbarian', 'beast', 'Path of the Beast', TCE, 'Rage manifests as predatory natural weapons.', [
    f(3, 'form-of-the-beast', 'Form of the Beast', 'Each rage grants a natural weapon using STR: bite (1d8 piercing; once per turn heal PB when below half HP), claws (1d6 slashing; one extra claw attack per Attack action), or tail (1d8 piercing, reach; reaction adds d8 AC against one attack).', { manual: true }),
    f(6, 'bestial-soul', 'Bestial Soul', 'Your natural weapons count as magical. After a rest, choose a swimming speed and underwater breathing, a climbing speed including ceilings, or enhanced jumps.', { manual: true }),
    f(10, 'infectious-fury', 'Infectious Fury', 'After a natural-weapon hit, force a WIS save (DC 8 + PB + CON): 2d12 psychic damage or a reaction melee attack against another creature you choose. PB uses per long rest.', { resource: res('infectious-fury', 'Infectious Fury', 'prof', 'long') }),
    f(14, 'call-the-hunt', 'Call the Hunt', 'When raging, choose up to CON modifier willing allies within 30 ft. Gain 5 temp HP per ally; each ally can add d6 damage to one attack hit per turn during your rage. PB uses per long rest.', { resource: res('call-the-hunt', 'Call the Hunt', 'prof', 'long') }),
  ]),
  sc('barbarian', 'battlerager', 'Path of the Battlerager', SCAG, 'Spiked-armor fighters; traditionally restricted to dwarves unless the DM permits otherwise.', [
    f(3, 'battlerager-armor', 'Battlerager Armor', 'While raging in spiked armor, make a bonus-action spike attack for 1d4 + STR piercing. A successful grapple deals 3 piercing damage. Spiked armor must be added as custom equipment.', { manual: true }),
    f(6, 'reckless-abandon', 'Reckless Abandon', 'Using Reckless Attack while raging grants CON modifier temp HP (minimum 1). They expire when the rage ends.', { manual: true }),
    f(10, 'battlerager-charge', 'Battlerager Charge', 'While raging, you may Dash as a bonus action.'),
    f(14, 'spiked-retribution', 'Spiked Retribution', 'While raging in spiked armor and not incapacitated, a creature within 5 ft that hits you in melee takes 3 piercing damage.', { manual: true }),
  ]),
  sc('bard', 'creation', 'College of Creation', TCE, 'Songs bring the echoes of creation to life.', [
    f(3, 'mote-of-potential', 'Mote of Potential', 'Your Bardic Inspiration gains an extra benefit: checks can reroll the inspiration die; attacks can cause a thunder burst (CON save); saves grant temp HP equal to the die + CHA.', { manual: true }),
    f(3, 'performance-of-creation', 'Performance of Creation', 'Action: create a nonmagical item worth at most 20 gp per bard level. Maximum size: Medium, Large at 6th, Huge at 14th. It lasts PB hours. One free use per long rest; further uses cost a 2nd-level or higher slot.', { activation: 'action', resource: res('performance-of-creation', 'Performance of Creation', 1, 'long') }),
    f(6, 'animating-performance', 'Animating Performance', 'Action: animate a Large or smaller nonmagical item for 1 hour as a Dancing Item companion. Command it with a bonus action, including when granting Bardic Inspiration. One free use per long rest; further uses cost a 3rd-level or higher slot.', { activation: 'action', resource: res('animating-performance', 'Animating Performance', 1, 'long'), manual: true }),
    f(14, 'creative-crescendo', 'Creative Crescendo', 'Performance of Creation has no gold limit and can maintain CHA modifier items (minimum two); only one may be larger than Small.', { manual: true }),
  ]),
  sc('bard', 'spirits', 'College of Spirits', VRGR, 'Stories carried by spirits empower your magic.', [
    f(3, 'guiding-whispers', 'Guiding Whispers', 'Learn Guidance; its range is 60 ft when you cast it.', { grants: { spells: [{ spellId: 'guidance', mode: 'always-prepared', ability: 'cha', note: 'Range 60 ft' }] } }),
    f(3, 'spiritual-focus', 'Spiritual Focus', 'Use a candle, crystal ball, skull, spirit board or tarokka deck as a bard focus. From 6th level, add d6 to one damage or healing roll of a bard spell cast through it.', { manual: true }),
    f(3, 'tales-from-beyond', 'Tales from Beyond', 'Bonus action while holding your spiritual focus: spend Bardic Inspiration and roll that die on the Spirit Tales table. Use an action to bestow the stored tale on a creature within 30 ft. Consult the sourcebook for the tale table.', { activation: 'bonus', usesResource: 'bardic-inspiration', manual: true }),
    f(6, 'spirit-session', 'Spirit Session', 'After a one-hour ritual, temporarily learn a divination or necromancy spell from any class. Its level cannot exceed PB, the number of participants, or a spell level you can cast. Once per long rest.', { resource: res('spirit-session', 'Spirit Session', 1, 'long'), choices: [choice('spell', 'Spirit Session spell (check ritual limits)', 'spell', 1, { spellFilter: { schools: ['divination', 'necromancy'] }, spellMode: 'known' })] }),
    f(14, 'mystical-connection', 'Mystical Connection', 'Roll twice for Tales from Beyond and choose either result; on matching dice you may choose any tale available to your inspiration die.'),
  ]),
  sc('cleric', 'arcana', 'Arcana Domain', SCAG, 'Clerics who guard and study arcane magic.', [
    f(1, 'arcane-initiate', 'Arcane Initiate', 'Gain Arcana proficiency and two wizard cantrips, treated as cleric cantrips.', { grants: { skills: ['arcana'] }, choices: [choice('cantrips', 'Wizard cantrips', 'spell', 2, { spellFilter: { classes: ['wizard'], levels: [0] }, spellMode: 'always-prepared' })] }),
    f(2, 'arcane-abjuration', 'Channel Divinity: Arcane Abjuration', 'Action: one celestial, elemental, fey or fiend within 30 ft makes a WIS save or is turned. From 5th level, sufficiently weak targets are banished instead; consult the domain’s CR table.', { activation: 'action', usesResource: 'channel-divinity', manual: true }),
    f(6, 'spell-breaker', 'Spell Breaker', 'When a spell of 1st level or higher heals an ally, you may also end a spell affecting that ally if its level is no higher than the healing spell’s slot.', { manual: true }),
    f(8, 'arcana-potent-spellcasting', 'Potent Spellcasting', 'Add WIS modifier to damage from cleric cantrips.', { manual: true }),
    f(17, 'arcane-mastery', 'Arcane Mastery', 'Choose one wizard spell of each level from 6th through 9th; they are always-prepared cleric domain spells.', { choices: [6, 7, 8, 9].map((level) => choice(`spell-${level}`, `Level ${level} wizard spell`, 'spell', 1, { spellFilter: { classes: ['wizard'], levels: [level] }, spellMode: 'always-prepared' })) }),
  ], { spells: domainSpells(['detect-magic', 'magic-missile'], ['magic-weapon', 'arcanists-magic-aura'], ['dispel-magic', 'magic-circle'], ['arcane-eye', 'secret-chest'], ['planar-binding', 'teleportation-circle']) }),
  sc('fighter', 'purple-dragon-knight', 'Purple Dragon Knight (Banneret)', SCAG, 'An inspiring battlefield leader.', [
    f(3, 'rallying-cry', 'Rallying Cry', 'When using Second Wind, up to three allies within 60 ft who can see or hear you also regain HP equal to your fighter level.', { manual: true }),
    f(7, 'royal-envoy', 'Royal Envoy', 'Gain Persuasion proficiency and double your proficiency bonus for Persuasion. If already proficient, choose Animal Handling, Insight, Intimidation or Performance instead for the new proficiency.', { grants: { skills: ['persuasion'], expertise: ['persuasion'] } }),
    f(10, 'inspiring-surge', 'Inspiring Surge', 'When using Action Surge, one ally within 60 ft who can see or hear you can spend a reaction to make a melee or ranged weapon attack. Two allies at 18th level.', { manual: true }),
    f(15, 'bulwark', 'Bulwark', 'When Indomitable rerolls an INT, WIS or CHA save against an effect, one ally within 60 ft who also failed that save may reroll if they can see or hear you.', { manual: true }),
  ]),
  sc('monk', 'long-death', 'Way of the Long Death', SCAG, 'Monks who study mortality and refuse its embrace.', [
    f(3, 'touch-of-death', 'Touch of Death', 'When you reduce a creature within 5 ft to 0 HP, gain temp HP equal to your monk level + WIS modifier (minimum 1).', { manual: true }),
    f(6, 'hour-of-reaping', 'Hour of Reaping', 'Action: creatures within 30 ft that can see you make a WIS save or are frightened of you until the end of your next turn.', { activation: 'action', manual: true }),
    f(11, 'mastery-of-death', 'Mastery of Death', 'When reduced to 0 HP, spend 1 ki (no action) to remain at 1 HP.', { usesResource: 'ki' }),
    f(17, 'touch-of-the-long-death', 'Touch of the Long Death', 'Action: touch a creature and spend 1-10 ki. It makes a CON save, taking 2d10 necrotic per ki spent, or half on success.', { activation: 'action', manual: true }),
  ]),
  sc('monk', 'sun-soul', 'Way of the Sun Soul', SCAG, 'Monks who channel their life force into radiant power.', [
    f(3, 'radiant-sun-bolt', 'Radiant Sun Bolt', 'Your Attack action can include 30-ft ranged spell attacks using DEX and your Martial Arts die for radiant damage. After doing so, spend 1 ki to fire two more as a bonus action.', { manual: true }),
    f(6, 'searing-arc-strike', 'Searing Arc Strike', 'After the Attack action, spend 2 ki to cast Burning Hands as a bonus action. Each additional ki raises its level by one, up to half your monk level in total ki (rounded down).', { manual: true }),
    f(11, 'searing-sunburst', 'Searing Sunburst', 'Action: a 20-ft-radius burst within 150 ft deals 2d6 radiant on a failed CON save, none on success. Spend up to 3 ki to add 2d6 per point.', { activation: 'action', manual: true }),
    f(17, 'sun-shield', 'Sun Shield', 'Shed bright light 30 ft and dim light another 30 ft (bonus action to dismiss or restore). While lit, a reaction deals 5 + WIS radiant damage to a creature that hits you in melee.', { manual: true }),
  ]),
  sc('paladin', 'oathbreaker', 'Oathbreaker', DMG, 'A DM-approved villainous option for paladins who abandon their oaths.', [
    f(3, 'control-undead', 'Channel Divinity: Control Undead', 'Action: an undead within 30 ft with CR lower than your paladin level makes a WIS save or obeys you for 24 hours.', { activation: 'action', usesResource: 'channel-divinity', manual: true }),
    f(3, 'dreadful-aspect', 'Channel Divinity: Dreadful Aspect', 'Action: chosen creatures within 30 ft that can see you make a WIS save or are frightened for 1 minute. A target ending its turn more than 30 ft away can repeat the save.', { activation: 'action', usesResource: 'channel-divinity', manual: true }),
    f(7, 'aura-of-hate', 'Aura of Hate', 'You and fiends and undead within 10 ft (30 ft at 18th) add CHA modifier, minimum 1, to melee weapon damage. This also benefits hostile fiends and undead.', { effects: [eff('aura-of-hate', [mod('damage', 'max(1, cha)', { scope: 'melee-weapon' })])] }),
    f(15, 'supernatural-resistance', 'Supernatural Resistance', 'Resist bludgeoning, piercing and slashing damage from nonmagical weapons.', { effects: [eff('supernatural-resistance', [{ target: 'resistance:all-nonmagical-bps', op: 'grant' }])] }),
    f(20, 'dread-lord', 'Dread Lord', 'Action: surround yourself with gloom for 1 minute. Frightened enemies starting within 30 ft take 4d10 psychic; attacks against you and allies in the gloom have disadvantage. Bonus action: make a melee spell attack for 3d10 + CHA necrotic. Once per long rest.', { activation: 'action', resource: res('dread-lord', 'Dread Lord', 1, 'long'), manual: true }),
  ], { spells: oathSpells(['hellish-rebuke', 'inflict-wounds'], ['crown-of-madness', 'darkness'], ['animate-dead', 'bestow-curse'], ['blight', 'confusion'], ['contagion', 'dominate-person']) }),
  sc('ranger', 'drakewarden', 'Drakewarden', FTD, 'Rangers bonded to a growing draconic spirit.', [
    f(3, 'draconic-gift', 'Draconic Gift', 'Learn Draconic (or another language if already known) and Thaumaturgy as a ranger cantrip.', { grants: { languages: ['Draconic'], spells: [{ spellId: 'thaumaturgy', mode: 'always-prepared', ability: 'wis' }] } }),
    f(3, 'drake-companion', 'Drake Companion', 'Action: summon a Small drake (AC 14 + PB; HP 5 + 5 per ranger level). Choose acid, cold, fire, lightning or poison for its essence; the drake is immune to that damage. It acts after you and requires a bonus action to command actions other than Dodge. One free summon per long rest, then a 1st-level or higher spell slot.', { activation: 'action', resource: res('drake-companion', 'Summon Drake', 1, 'long'), manual: true }),
    f(7, 'bond-of-fang-and-scale', 'Bond of Fang and Scale', 'The drake becomes Medium, gains flight equal to its walk (but cannot fly while carrying you), and its bite gains d6 essence damage. You may ride it and resist its essence’s damage type.', { choices: [choice('essence', 'Drake essence (change when summoned)', 'damage-type', 1, { from: ['acid', 'cold', 'fire', 'lightning', 'poison'] })], manual: true }),
    f(11, 'drakes-breath', "Drake's Breath", 'Action: you or the drake breathes a 30-ft cone for 8d6 acid, cold, fire, lightning or poison (DEX save for half); 10d6 at 15th. Once per long rest, or spend a 3rd-level or higher slot.', { activation: 'action', resource: res('drakes-breath', "Drake's Breath", 1, 'long'), manual: true }),
    f(15, 'perfected-bond', 'Perfected Bond', 'The drake becomes Large and can fly while carrying you; its bite gains another d6 essence damage. Reaction when either of you takes damage within 30 ft: grant resistance to that damage instance.', { activation: 'reaction', manual: true }),
  ]),
  sc('warlock', 'undying', 'The Undying', SCAG, 'A pact with a being that has escaped mortality.', [
    f(1, 'among-the-dead', 'Among the Dead', 'Learn Spare the Dying, gain advantage against disease, and make undead pass a WIS save to attack you (exceptions apply after you harm them).', { grants: { spells: [{ spellId: 'spare-the-dying', mode: 'always-prepared', ability: 'cha' }] }, effects: [eff('among-the-dead', [adv('save:all', 'against disease')])], manual: true }),
    f(6, 'defy-death', 'Defy Death', 'Once per long rest, regain 1d8 + CON HP when you succeed on a death save or stabilize someone with Spare the Dying.', { resource: res('defy-death', 'Defy Death', 1, 'long'), manual: true }),
    f(10, 'undying-nature', 'Undying Nature', 'You need no breath, food, water or sleep, and age ten times more slowly. Rest still requires relaxation.'),
    f(14, 'indestructible-life', 'Indestructible Life', 'Bonus action: heal 1d8 + warlock level and reattach a severed body part you hold against its stump. Once per short or long rest.', { activation: 'bonus', resource: res('indestructible-life', 'Indestructible Life', 1, 'short'), effects: [{ id: 'indestructible-life', trigger: 'on-use', outcomes: [{ kind: 'heal', dice: '1d8+{cl}' }] }] }),
  ], { spells: patronSpells(['false-life', 'ray-of-sickness'], ['blindness-deafness', 'silence'], ['feign-death', 'speak-with-dead'], ['aura-of-life', 'death-ward'], ['contagion', 'legend-lore']) }),
];
