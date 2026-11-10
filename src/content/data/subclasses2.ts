// Subclasses: Fighter, Monk, Paladin, Ranger.
import type { SubclassDef } from '@/types/content';
import { SRD, PHB, XGE, TCE, SCAG, EGW, FTD, T, mod, adv, grant, flag, eff, toggle, choice, byLevel } from './helpers';
import { sc, f, res, oathSpells, rangerSpells, thirdCaster } from './subclassHelpers';

const fighter: SubclassDef[] = [
  sc('fighter', 'champion', 'Champion', SRD, T('subclass:champion', 'The archetypal Champion focuses on raw physical power honed to deadly perfection.'), [
    f(3, 'improved-critical', 'Improved Critical', T('improved-critical'), { effects: [eff('improved-critical', [mod('crit-range', 19)])] }),
    f(7, 'remarkable-athlete', 'Remarkable Athlete', T('remarkable-athlete'), { effects: [eff('remarkable-athlete', [{ target: 'prof:half-unproficient-initiative', op: 'grant' }])] }),
    f(10, 'additional-fighting-style', 'Additional Fighting Style', T('additional-fighting-style'), { choices: [choice('style', 'Second Fighting Style', 'options', 1, { pool: 'fighting-styles' })] }),
    f(15, 'superior-critical', 'Superior Critical', T('superior-critical'), { replaces: 'improved-critical', effects: [eff('superior-critical', [mod('crit-range', 18)])] }),
    f(18, 'survivor', 'Survivor', T('survivor'), { effects: [{ id: 'survivor', name: 'Survivor', manual: true, description: 'At the start of each turn, regain 5 + CON mod HP if you have no more than half your HP left (and at least 1).' }] }),
  ]),
  sc('fighter', 'battle-master', 'Battle Master', PHB, 'Martial techniques passed down through generations.', [
    f(3, 'combat-superiority', 'Combat Superiority', 'Learn maneuvers (3, +2 at 7th, 10th, 15th) fueled by superiority dice (4 d8s; 5 at 7th, 6 at 15th; d10 at 10th, d12 at 18th). Regain on a short or long rest. Maneuver save DC = 8 + prof + STR or DEX mod.', {
      resource: res('superiority-dice', 'Superiority Dice', byLevel([[3, 4], [7, 5], [15, 6]]), 'short', { die: byLevel([[3, 8], [10, 10], [18, 12]]) }),
      choices: [choice('maneuvers', 'Maneuvers', 'options', byLevel([[3, 3], [7, 5], [10, 7], [15, 9]]), { pool: 'maneuvers' })],
    }),
    f(3, 'student-of-war', 'Student of War', "Proficiency with one type of artisan's tools.", { choices: [choice('tool', "Artisan's tools", 'tool', 1, { from: ["Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies", "Carpenter's tools", "Cartographer's tools", "Cobbler's tools", "Cook's utensils", "Glassblower's tools", "Jeweler's tools", "Leatherworker's tools", "Mason's tools", "Painter's supplies", "Potter's tools", "Smith's tools", "Tinker's tools", "Weaver's tools", "Woodcarver's tools"] })] }),
    f(7, 'know-your-enemy', 'Know Your Enemy', 'Observe a creature for 1 minute to learn how it compares to you in two characteristics.'),
    f(10, 'improved-combat-superiority', 'Improved Combat Superiority', 'Superiority dice become d10s (d12s at 18th).'),
    f(15, 'relentless', 'Relentless', 'When you roll initiative with no superiority dice remaining, regain one.'),
  ]),
  sc('fighter', 'eldritch-knight', 'Eldritch Knight', PHB, 'Fighters who combine martial mastery with abjuration and evocation magic.', [
    f(3, 'ek-spellcasting', 'Spellcasting', 'Cast wizard spells using Intelligence (third-caster). Most spells must be abjuration or evocation, except those learned at 3rd, 8th, 14th, and 20th level.'),
    f(3, 'weapon-bond', 'Weapon Bond', 'Bond with up to two weapons; you can’t be disarmed of them and can summon one to your hand as a bonus action.'),
    f(7, 'war-magic', 'War Magic', 'When you cast a cantrip with your action, make one weapon attack as a bonus action.'),
    f(10, 'eldritch-strike', 'Eldritch Strike', 'A creature you hit with a weapon has disadvantage on its next save against your spell before the end of your next turn.'),
    f(15, 'arcane-charge', 'Arcane Charge', 'When you Action Surge, teleport up to 30 ft.'),
    f(18, 'improved-war-magic', 'Improved War Magic', 'When you cast a spell with your action, make one weapon attack as a bonus action.'),
  ], { spellcasting: thirdCaster('int', 'wizard', [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], ['abjuration', 'evocation']) }),
  sc('fighter', 'samurai', 'Samurai', XGE, 'A fighter whose spirit cannot be broken.', [
    f(3, 'samurai-bonus-proficiency', 'Bonus Proficiency', 'Gain proficiency in History, Insight, Performance, or Persuasion, or learn one language.', { choices: [choice('skill', 'Skill', 'skill', 1, { from: ['history', 'insight', 'performance', 'persuasion'] })] }),
    f(3, 'fighting-spirit', 'Fighting Spirit', 'Bonus action: advantage on weapon attacks this turn and gain temp HP (5; 10 at 10th; 15 at 15th). Three times per long rest.', { activation: 'bonus', resource: res('fighting-spirit', 'Fighting Spirit', 3, 'long'), effects: [toggle('fighting-spirit', 'Fighting Spirit (this turn)', [adv('attack', undefined, { scope: 'weapon' })], { outcomes: [{ kind: 'temp-hp', dice: '{steps(cl,3,5,10,10,15,15)}' }] })] }),
    f(7, 'elegant-courtier', 'Elegant Courtier', 'Add WIS modifier to Persuasion checks; gain WIS save proficiency (or INT/CHA if already proficient).', { effects: [eff('elegant-courtier', [mod('skill:persuasion', 'wis'), { target: 'prof:save:wis', op: 'grant' }])] }),
    f(10, 'tireless-spirit', 'Tireless Spirit', 'When you roll initiative with no Fighting Spirit uses left, regain one.'),
    f(15, 'rapid-strike', 'Rapid Strike', 'Once per turn, forgo advantage on one attack to make an additional attack as part of the Attack action.'),
    f(18, 'strength-before-death', 'Strength before Death', 'When reduced to 0 HP, delay falling unconscious and take an extra turn. Once per long rest.', { resource: res('strength-before-death', 'Strength before Death', 1, 'long') }),
  ]),
  sc('fighter', 'cavalier', 'Cavalier', XGE, 'Mounted warriors and protectors.', [
    f(3, 'cavalier-bonus-proficiency', 'Bonus Proficiency', 'Gain a skill from Animal Handling, History, Insight, Performance, Persuasion (or a language).', { choices: [choice('skill', 'Skill', 'skill', 1, { from: ['animal-handling', 'history', 'insight', 'performance', 'persuasion'] })] }),
    f(3, 'born-to-the-saddle', 'Born to the Saddle', 'Advantage on saves to avoid falling off your mount; mounting/dismounting costs 5 ft.'),
    f(3, 'unwavering-mark', 'Unwavering Mark', 'Mark creatures you hit; they have disadvantage attacking others, and if they damage others you can make a bonus action attack with advantage and extra damage equal to half your fighter level. STR mod times per long rest (min 1).', { resource: res('unwavering-mark', 'Unwavering Mark (bonus attack)', 'max(1, str)', 'long') }),
    f(7, 'warding-maneuver', 'Warding Maneuver', 'Reaction: add 1d8 to a nearby ally’s AC against an attack; resistance if it still hits. CON mod times per long rest (min 1).', { activation: 'reaction', resource: res('warding-maneuver', 'Warding Maneuver', 'max(1, con)', 'long') }),
    f(10, 'hold-the-line', 'Hold the Line', 'Creatures provoke opportunity attacks from you when moving 5 ft within your reach; a hit reduces their speed to 0.'),
    f(15, 'ferocious-charger', 'Ferocious Charger', 'After moving 10 ft straight, a hit can knock the target prone (STR save). Once per turn.', { effects: [{ id: 'ferocious-charger', name: 'Ferocious Charger', trigger: 'on-hit', oncePerTurn: true, save: { ability: 'str', dc: { kind: 'formula', formula: '8 + prof + str' }, onFailure: [{ kind: 'prone' }] }, description: 'After moving at least 10 ft in a straight line.' }] }),
    f(18, 'vigilant-defender', 'Vigilant Defender', 'One special reaction each creature’s turn for opportunity attacks.'),
  ]),
  sc('fighter', 'arcane-archer', 'Arcane Archer', XGE, 'Archers who weave magic into their shots.', [
    f(3, 'arcane-archer-lore', 'Arcane Archer Lore', 'Proficiency in Arcana or Nature; learn prestidigitation or druidcraft.', { choices: [choice('skill', 'Skill', 'skill', 1, { from: ['arcana', 'nature'] }), choice('cantrip', 'Cantrip', 'spell', 1, { spellFilter: { levels: [0] }, spellMode: 'always-prepared', from: ['prestidigitation', 'druidcraft'] })] }),
    f(3, 'arcane-shot', 'Arcane Shot', 'Once per turn on a hit with a shortbow or longbow, apply an Arcane Shot option. Two uses per short rest. Learn options (2, +1 at 7th, 10th, 15th, 18th). DC = 8 + prof + INT.', { resource: res('arcane-shot', 'Arcane Shot', 2, 'short'), choices: [choice('shots', 'Arcane Shot options', 'options', byLevel([[3, 2], [7, 3], [10, 4], [15, 5], [18, 6]]), { pool: 'arcane-shots' })] }),
    f(7, 'magic-arrow', 'Magic Arrow', 'Nonmagical arrows you fire become magical.'),
    f(7, 'curving-shot', 'Curving Shot', 'Bonus action: reroll a missed magic-arrow attack against a different target within 60 ft.'),
    f(15, 'ever-ready-shot', 'Ever-Ready Shot', 'Regain one Arcane Shot use when you roll initiative with none left.'),
  ]),
  sc('fighter', 'echo-knight', 'Echo Knight', EGW, 'Warriors who summon echoes of themselves from unrealized timelines.', [
    f(3, 'manifest-echo', 'Manifest Echo', 'Bonus action: create an echo (AC 14 + prof, 1 HP) within 15 ft. Attack from its space; swap places for 15 ft movement; opportunity attacks through it.', { activation: 'bonus' }),
    f(3, 'unleash-incarnation', 'Unleash Incarnation', 'When you take the Attack action, make one extra melee attack from your echo’s position. CON mod times per long rest (min 1).', { resource: res('unleash-incarnation', 'Unleash Incarnation', 'max(1, con)', 'long') }),
    f(7, 'echo-avatar', 'Echo Avatar', 'Action: see and hear through your echo for 10 minutes; it can move up to 1,000 ft away.'),
    f(10, 'shadow-martyr', 'Shadow Martyr', 'Reaction: teleport your echo to intercept an attack against another creature. Once per short rest.', { resource: res('shadow-martyr', 'Shadow Martyr', 1, 'short') }),
    f(15, 'reclaim-potential', 'Reclaim Potential', 'When your echo is destroyed by damage, gain temp HP 2d6 + CON mod. CON mod times per long rest.', { resource: res('reclaim-potential', 'Reclaim Potential', 'max(1, con)', 'long') }),
    f(18, 'legion-of-one', 'Legion of One', 'Create two echoes; regain one Unleash Incarnation use on initiative if none left.'),
  ]),
  sc('fighter', 'rune-knight', 'Rune Knight', TCE, 'Fighters empowered by giant runes.', [
    f(3, 'rune-knight-bonus-proficiencies', 'Bonus Proficiencies', "Proficiency with smith's tools; learn Giant.", { grants: { tools: ["Smith's tools"], languages: ['Giant'] } }),
    f(3, 'rune-carver', 'Rune Carver', 'Inscribe runes on gear (2; 3 at 7th, 4 at 10th, 5 at 15th). Each rune grants a passive benefit and a once-per-short-rest invocation. Rune save DC = 8 + prof + CON.', { choices: [choice('runes', 'Runes known', 'options', byLevel([[3, 2], [7, 3], [10, 4], [15, 5]]), { pool: 'runes' })] }),
    f(3, 'giants-might', "Giant's Might", 'Bonus action, 1 minute: become Large (if smaller), advantage on STR checks and saves, once per turn +1d6 weapon damage (1d8 at 10th, 1d10 at 18th). Proficiency bonus times per long rest.', {
      activation: 'bonus', resource: res('giants-might', "Giant's Might", 'prof', 'long'),
      effects: [toggle('giants-might', "Giant's Might", [adv('check:str'), adv('save:str'), mod('extra-damage', '1d6', { scope: 'weapon', condition: 'once per turn (1d8 at 10th, 1d10 at 18th)' })])],
    }),
    f(7, 'runic-shield', 'Runic Shield', 'Reaction: force an attacker to reroll an attack against an ally within 60 ft. Proficiency bonus times per long rest.', { activation: 'reaction', resource: res('runic-shield', 'Runic Shield', 'prof', 'long') }),
    f(10, 'great-stature', 'Great Stature', 'Grow 3d4 inches; Giant’s Might damage becomes 1d8.'),
    f(15, 'master-of-runes', 'Master of Runes', 'Invoke each rune twice per short rest.'),
    f(18, 'runic-juggernaut', 'Runic Juggernaut', "Giant's Might damage becomes 1d10; you can become Huge and gain 5 ft reach."),
  ]),
  sc('fighter', 'psi-warrior', 'Psi Warrior', TCE, 'Warriors who augment their might with psionic power.', [
    f(3, 'psionic-power-fighter', 'Psionic Power', 'Psionic Energy dice (2 × proficiency bonus; d6, d8 at 5th, d10 at 11th, d12 at 17th). Protective Field (reaction reduce damage by die + INT), Psionic Strike (once per turn on hit, +die + INT force), Telekinetic Movement. Regain one die as a bonus action once per short rest.', {
      resource: res('psionic-energy', 'Psionic Energy Dice', '2 * prof', 'long', { die: byLevel([[3, 6], [5, 8], [11, 10], [17, 12]]) }),
      effects: [{ id: 'psionic-strike', name: 'Psionic Strike (1 die)', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, consumes: { resourceId: 'psionic-energy', amount: 1 }, outcomes: [{ kind: 'damage', dice: '1d{steps(cl,3,6,5,8,11,10,17,12)}+{int}', damageType: 'force' }] }],
    }),
    f(7, 'telekinetic-adept', 'Telekinetic Adept', 'Psi-Powered Leap (fly speed twice walking speed until end of turn, once per short rest) and Telekinetic Thrust (STR save or prone/pushed on Psionic Strike).'),
    f(10, 'guarded-mind', 'Guarded Mind', 'Resistance to psychic damage; spend a die to end charmed or frightened at the start of your turn.', { grants: { resistances: ['psychic'] } }),
    f(15, 'bulwark-of-force', 'Bulwark of Force', 'Bonus action: grant half cover to up to INT mod creatures for 1 minute. Once per long rest (or spend a die).', { resource: res('bulwark-of-force', 'Bulwark of Force', 1, 'long') }),
    f(18, 'telekinetic-master', 'Telekinetic Master', 'Cast telekinesis without components (INT); while concentrating, make one weapon attack as a bonus action. Once per long rest (or spend a die).', { resource: res('telekinetic-master', 'Telekinetic Master', 1, 'long'), grants: { spells: [{ spellId: 'telekinesis', mode: 'innate', ability: 'int' }] } }),
  ]),
];

const monk: SubclassDef[] = [
  sc('monk', 'open-hand', 'Way of the Open Hand', SRD, T('subclass:open-hand', 'Masters of martial arts combat.'), [
    f(3, 'open-hand-technique', 'Open Hand Technique', T('open-hand-technique')),
    f(6, 'wholeness-of-body', 'Wholeness of Body', T('wholeness-of-body'), { activation: 'action', resource: res('wholeness-of-body', 'Wholeness of Body', 1, 'long') }),
    f(11, 'tranquility', 'Tranquility', T('tranquility')),
    f(17, 'quivering-palm', 'Quivering Palm', T('quivering-palm'), { usesResource: 'ki' }),
  ]),
  sc('monk', 'shadow', 'Way of Shadow', PHB, 'Monks who follow a tradition of stealth and subterfuge.', [
    f(3, 'shadow-arts', 'Shadow Arts', 'Spend 2 ki to cast darkness, darkvision, pass without trace, or silence. You know minor illusion.', { grants: { spells: [{ spellId: 'minor-illusion', mode: 'always-prepared', ability: 'wis' }, { spellId: 'darkness', mode: 'innate', ability: 'wis', note: '2 ki' }, { spellId: 'darkvision', mode: 'innate', note: '2 ki' }, { spellId: 'pass-without-trace', mode: 'innate', note: '2 ki' }, { spellId: 'silence', mode: 'innate', note: '2 ki' }] } }),
    f(6, 'shadow-step', 'Shadow Step', 'Bonus action: teleport up to 60 ft between areas of dim light or darkness; advantage on your next melee attack this turn.', { activation: 'bonus' }),
    f(11, 'cloak-of-shadows-monk', 'Cloak of Shadows', 'Action: become invisible while in dim light or darkness.', { activation: 'action' }),
    f(17, 'opportunist', 'Opportunist', 'Reaction: attack a creature within 5 ft hit by another creature’s attack.', { activation: 'reaction' }),
  ]),
  sc('monk', 'four-elements', 'Way of the Four Elements', PHB, 'Monks who harness elemental power through ki.', [
    f(3, 'disciple-of-the-elements', 'Disciple of the Elements', 'Learn Elemental Attunement and one discipline; learn another at 6th, 11th, and 17th. Spell-like disciplines cost ki; max ki per spell = 2 (5th), 3 (9th), 4 (13th), 5 (17th).', { choices: [choice('disciplines', 'Elemental Disciplines', 'options', byLevel([[3, 2], [6, 3], [11, 4], [17, 5]]), { pool: 'elemental-disciplines' })] }),
  ]),
  sc('monk', 'drunken-master', 'Way of the Drunken Master', XGE, 'Unpredictable martial artists who mimic the sway of a drunkard.', [
    f(3, 'drunken-bonus-proficiencies', 'Bonus Proficiencies', "Proficiency in Performance and brewer's supplies.", { grants: { skills: ['performance'], tools: ["Brewer's supplies"] } }),
    f(3, 'drunken-technique', 'Drunken Technique', 'Flurry of Blows grants Disengage and +10 ft walking speed this turn.'),
    f(6, 'tipsy-sway', 'Tipsy Sway', 'Leap to your feet (5 ft); reaction (1 ki) to redirect a missed melee attack.'),
    f(11, 'drunkards-luck', "Drunkard's Luck", 'Spend 2 ki to cancel disadvantage on a check, attack, or save.'),
    f(17, 'intoxicated-frenzy', 'Intoxicated Frenzy', 'Flurry of Blows makes up to three extra attacks, each against a different creature.'),
  ]),
  sc('monk', 'kensei', 'Way of the Kensei', XGE, 'Monks who train relentlessly with weapons.', [
    f(3, 'path-of-the-kensei', 'Path of the Kensei', "Choose kensei weapons (one melee, one ranged; no heavy/special); Agile Parry (+2 AC after an unarmed strike while wielding a kensei melee weapon), Kensei's Shot (bonus action +1d4 ranged damage), Way of the Brush (calligrapher's or painter's supplies).", { choices: [choice('tool', 'Tool', 'tool', 1, { from: ["Calligrapher's supplies", "Painter's supplies"] })], effects: [eff('agile-parry', [mod('ac', 2, { condition: 'Agile Parry: after an unarmed strike while holding a kensei weapon, until your next turn' })])] }),
    f(6, 'one-with-the-blade', 'One with the Blade', 'Kensei weapons count as magical; Deft Strike (1 ki, add martial arts die to damage once per turn).'),
    f(11, 'sharpen-the-blade', 'Sharpen the Blade', 'Bonus action, 1–3 ki: kensei weapon gains that bonus to attack and damage for 1 minute.'),
    f(17, 'unerring-accuracy', 'Unerring Accuracy', 'Once per turn, reroll a missed monk weapon attack.'),
  ]),
  sc('monk', 'mercy', 'Way of Mercy', TCE, 'Monks who manipulate the life force of others to heal or harm.', [
    f(3, 'implements-of-mercy', 'Implements of Mercy', 'Proficiency in Insight, Medicine, and the herbalism kit.', { grants: { skills: ['insight', 'medicine'], tools: ['Herbalism kit'] } }),
    f(3, 'hand-of-healing', 'Hand of Healing', 'Action (1 ki): heal martial arts die + WIS; can replace one Flurry of Blows strike without spending ki.', { usesResource: 'ki' }),
    f(3, 'hand-of-harm', 'Hand of Harm', 'Once per turn on an unarmed hit, spend 1 ki: +martial arts die + WIS necrotic.', { effects: [{ id: 'hand-of-harm', name: 'Hand of Harm (1 ki)', trigger: 'on-hit', scope: 'unarmed', oncePerTurn: true, consumes: { resourceId: 'ki', amount: 1 }, outcomes: [{ kind: 'damage', dice: '1d{steps(cl,1,4,5,6,11,8,17,10)}+{wis}', damageType: 'necrotic' }] }] }),
    f(6, 'physicians-touch', "Physician's Touch", 'Hand of Healing also ends a disease or condition; Hand of Harm can poison.'),
    f(11, 'flurry-of-healing-and-harm', 'Flurry of Healing and Harm', 'Replace Flurry strikes with Hand of Healing; use Hand of Harm with Flurry without ki once per turn.'),
    f(17, 'hand-of-ultimate-mercy', 'Hand of Ultimate Mercy', 'Action (5 ki): revive a creature dead for no more than 24 hours with 4d10 + WIS HP. Once per long rest.', { resource: res('hand-of-ultimate-mercy', 'Hand of Ultimate Mercy', 1, 'long') }),
  ]),
  sc('monk', 'astral-self', 'Way of the Astral Self', TCE, 'Monks who manifest their astral self.', [
    f(3, 'arms-of-the-astral-self', 'Arms of the Astral Self', 'Bonus action (1 ki): summon astral arms for 10 minutes; use WIS for unarmed strikes, 10 ft reach, force damage; creatures within 10 ft make a DEX save or take 2 × martial arts die force.', { usesResource: 'ki', effects: [toggle('astral-arms', 'Astral Arms', [], { description: 'Unarmed strikes may use WIS, reach +5 ft, deal force damage.' })] }),
    f(6, 'visage-of-the-astral-self', 'Visage of the Astral Self', 'Bonus action (1 ki): astral visage (darkvision 120, advantage on Insight and Intimidation).', { effects: [toggle('astral-visage', 'Astral Visage', [adv('skill:insight'), adv('skill:intimidation')])] }),
    f(11, 'body-of-the-astral-self', 'Body of the Astral Self', 'With arms and visage: reaction Deflect Energy, Empowered Arms (+martial arts die once per turn).'),
    f(17, 'awakened-astral-self', 'Awakened Astral Self', 'Bonus action (5 ki): full astral self for 10 minutes: +2 AC, three attacks with arms.'),
  ]),
  sc('monk', 'ascendant-dragon', 'Way of the Ascendant Dragon', FTD, 'Monks who emulate dragons.', [
    f(3, 'draconic-disciple', 'Draconic Disciple', 'Change unarmed damage type to acid, cold, fire, lightning, or poison; reroll a failed CHA check once per long rest; learn Draconic or another language.', { choices: [choice('language', 'Language', 'language', 1)] }),
    f(3, 'breath-of-the-dragon', 'Breath of the Dragon', 'Replace one attack with a 20-ft cone or 30-ft line breath (DEX save, 2 × martial arts die). Proficiency bonus times per long rest (or 2 ki).', { resource: res('breath-of-the-dragon', 'Breath of the Dragon', 'prof', 'long') }),
    f(6, 'wings-unfurled', 'Wings Unfurled', 'When you use Step of the Wind, gain a flying speed equal to walking speed until end of turn. Proficiency bonus times per long rest.', { resource: res('wings-unfurled', 'Wings Unfurled', 'prof', 'long') }),
    f(11, 'aspect-of-the-wyrm', 'Aspect of the Wyrm', 'Bonus action, 1 minute aura: frightful presence or resistance for allies. Once per long rest (or 3 ki).', { resource: res('aspect-of-the-wyrm', 'Aspect of the Wyrm', 1, 'long') }),
    f(17, 'ascendant-aspect', 'Ascendant Aspect', 'Breath improves, blindsight 10 ft, explosive fury on hit.'),
  ]),
];

const paladin: SubclassDef[] = [
  sc('paladin', 'devotion', 'Oath of Devotion', SRD, T('subclass:devotion', 'The ideals of justice, virtue, and order.'), [
    f(3, 'channel-divinity-sacred-weapon', 'Channel Divinity: Sacred Weapon', T('channel-divinity-sacred-weapon'), { usesResource: 'channel-divinity', effects: [toggle('sacred-weapon', 'Sacred Weapon', [mod('attack', 'max(1, cha)', { scope: 'weapon' })], { description: '1 minute: add CHA mod to weapon attack rolls; weapon sheds light and is magical.' })] }),
    f(3, 'channel-divinity-turn-the-unholy', 'Channel Divinity: Turn the Unholy', T('channel-divinity-turn-the-unholy'), { usesResource: 'channel-divinity' }),
    f(7, 'aura-of-devotion', 'Aura of Devotion', T('aura-of-devotion'), { grants: { conditionImmunities: ['charmed'] } }),
    f(15, 'purity-of-spirit', 'Purity of Spirit', T('purity-of-spirit')),
    f(20, 'holy-nimbus', 'Holy Nimbus', T('holy-nimbus'), { resource: res('holy-nimbus', 'Holy Nimbus', 1, 'long') }),
  ], { spells: oathSpells(['protection-from-evil-and-good', 'sanctuary'], ['lesser-restoration', 'zone-of-truth'], ['beacon-of-hope', 'dispel-magic'], ['freedom-of-movement', 'guardian-of-faith'], ['commune', 'flame-strike']) }),
  sc('paladin', 'ancients', 'Oath of the Ancients', PHB, 'Paladins who preserve light and life.', [
    f(3, 'natures-wrath', "Channel Divinity: Nature's Wrath", 'Action: spectral vines restrain a creature within 10 ft (STR or DEX save; repeat each turn).', { usesResource: 'channel-divinity' }),
    f(3, 'turn-the-faithless', 'Channel Divinity: Turn the Faithless', 'Action: fey and fiends within 30 ft make a WIS save or are turned for 1 minute.', { usesResource: 'channel-divinity' }),
    f(7, 'aura-of-warding', 'Aura of Warding', 'You and friendly creatures within 10 ft have resistance to damage from spells.', { effects: [eff('aura-of-warding', [grant('resistance:force', { condition: 'damage from spells (all types)' })])] }),
    f(15, 'undying-sentinel', 'Undying Sentinel', 'When reduced to 0 HP (not killed outright), drop to 1 HP instead. Once per long rest.', { resource: res('undying-sentinel', 'Undying Sentinel', 1, 'long') }),
    f(20, 'elder-champion', 'Elder Champion', 'Action, 1 minute: regain 10 HP each turn, cast paladin spells as a bonus action, enemies within 10 ft have disadvantage on saves against your spells and Channel Divinity. Once per long rest.', { resource: res('elder-champion', 'Elder Champion', 1, 'long') }),
  ], { spells: oathSpells(['ensnaring-strike', 'speak-with-animals'], ['moonbeam', 'misty-step'], ['plant-growth', 'protection-from-energy'], ['ice-storm', 'stoneskin'], ['commune-with-nature', 'tree-stride']) }),
  sc('paladin', 'vengeance', 'Oath of Vengeance', PHB, 'A solemn commitment to punish those who commit grievous sins.', [
    f(3, 'abjure-enemy', 'Channel Divinity: Abjure Enemy', 'Action: a creature within 60 ft makes a WIS save or is frightened (speed 0) for 1 minute.', { usesResource: 'channel-divinity' }),
    f(3, 'vow-of-enmity', 'Channel Divinity: Vow of Enmity', 'Bonus action: advantage on attack rolls against a creature within 10 ft for 1 minute.', { activation: 'bonus', usesResource: 'channel-divinity', effects: [toggle('vow-of-enmity', 'Vow of Enmity', [adv('attack', 'against the vowed creature')])] }),
    f(7, 'relentless-avenger', 'Relentless Avenger', 'After an opportunity attack hit, move up to half your speed without provoking.'),
    f(15, 'soul-of-vengeance', 'Soul of Vengeance', 'Reaction: melee attack against the target of your Vow of Enmity when it attacks.'),
    f(20, 'avenging-angel', 'Avenging Angel', 'Action, 1 hour: fly 60 ft and an aura of menace (WIS save or frightened). Once per long rest.', { resource: res('avenging-angel', 'Avenging Angel', 1, 'long') }),
  ], { spells: oathSpells(['bane', 'hunters-mark'], ['hold-person', 'misty-step'], ['haste', 'protection-from-energy'], ['banishment', 'dimension-door'], ['hold-monster', 'scrying']) }),
  sc('paladin', 'crown', 'Oath of the Crown', SCAG, 'Paladins sworn to civilization and the rule of law.', [
    f(3, 'champion-challenge', "Channel Divinity: Champion Challenge", 'Bonus action: creatures within 30 ft make a WIS save or can’t willingly move more than 30 ft away from you.', { usesResource: 'channel-divinity' }),
    f(3, 'turn-the-tide', 'Channel Divinity: Turn the Tide', 'Bonus action: each creature within 30 ft at or below half HP regains 1d6 + CHA mod.', { usesResource: 'channel-divinity' }),
    f(7, 'divine-allegiance', 'Divine Allegiance', 'Reaction: take the damage dealt to a creature within 5 ft instead.'),
    f(15, 'unyielding-spirit', 'Unyielding Spirit', 'Advantage on saves to avoid being paralyzed or stunned.', { effects: [eff('unyielding-spirit', [adv('save:all', 'to avoid being paralyzed or stunned')])] }),
    f(20, 'exalted-champion', 'Exalted Champion', 'Action, 1 hour: resistance to nonmagical B/P/S; allies within 30 ft have advantage on death saves and WIS saves. Once per long rest.', { resource: res('exalted-champion', 'Exalted Champion', 1, 'long') }),
  ], { spells: oathSpells(['command', 'compelled-duel'], ['warding-bond', 'spiritual-weapon'], ['crusaders-mantle', 'spirit-guardians'], ['banishment', 'guardian-of-faith'], ['circle-of-power', 'geas']) }),
  sc('paladin', 'conquest', 'Oath of Conquest', XGE, 'Paladins who crush the forces of chaos with fear.', [
    f(3, 'conquering-presence', 'Channel Divinity: Conquering Presence', 'Action: creatures within 30 ft make a WIS save or are frightened for 1 minute.', { usesResource: 'channel-divinity' }),
    f(3, 'conquest-guided-strike', 'Channel Divinity: Guided Strike', 'Gain +10 to an attack roll after seeing the roll.', { usesResource: 'channel-divinity' }),
    f(7, 'aura-of-conquest', 'Aura of Conquest', 'Frightened creatures within 10 ft have speed 0 and take psychic damage equal to half your paladin level at the start of their turns.'),
    f(15, 'scornful-rebuke', 'Scornful Rebuke', 'Creatures that hit you take psychic damage equal to your CHA modifier.'),
    f(20, 'invincible-conqueror', 'Invincible Conqueror', 'Action, 1 minute: resistance to all damage, an extra attack, crits on 19–20. Once per long rest.', { resource: res('invincible-conqueror', 'Invincible Conqueror', 1, 'long') }),
  ], { spells: oathSpells(['armor-of-agathys', 'command'], ['hold-person', 'spiritual-weapon'], ['bestow-curse', 'fear'], ['dominate-beast', 'stoneskin'], ['cloudkill', 'dominate-person']) }),
  sc('paladin', 'redemption', 'Oath of Redemption', XGE, 'Paladins who believe anyone can be redeemed.', [
    f(3, 'emissary-of-peace', 'Channel Divinity: Emissary of Peace', 'Bonus action: +5 to Persuasion checks for 10 minutes.', { usesResource: 'channel-divinity', effects: [toggle('emissary-of-peace', 'Emissary of Peace', [mod('skill:persuasion', 5)])] }),
    f(3, 'rebuke-the-violent', 'Channel Divinity: Rebuke the Violent', 'Reaction: an attacker that damages another creature within 30 ft makes a WIS save or takes radiant damage equal to the damage it dealt.', { usesResource: 'channel-divinity' }),
    f(7, 'aura-of-the-guardian', 'Aura of the Guardian', 'Reaction: take the damage of a creature within 10 ft instead (no reduction).'),
    f(15, 'protective-spirit', 'Protective Spirit', 'At the end of your turn below half HP, regain 1d6 + half your paladin level HP.'),
    f(20, 'emissary-of-redemption', 'Emissary of Redemption', 'Resistance to all damage from creatures; attackers take radiant damage equal to half the damage they deal to you.'),
  ], { spells: oathSpells(['sanctuary', 'sleep'], ['calm-emotions', 'hold-person'], ['counterspell', 'hypnotic-pattern'], ['resilient-sphere', 'stoneskin'], ['hold-monster', 'wall-of-force']) }),
  sc('paladin', 'glory', 'Oath of Glory', TCE, 'Paladins destined for heroic deeds.', [
    f(3, 'peerless-athlete', 'Channel Divinity: Peerless Athlete', 'Bonus action, 10 minutes: advantage on Athletics and Acrobatics, double carrying capacity, +10 ft to jumps.', { usesResource: 'channel-divinity', effects: [toggle('peerless-athlete', 'Peerless Athlete', [adv('skill:athletics'), adv('skill:acrobatics'), { target: 'carry-multiplier', value: 2 }])] }),
    f(3, 'inspiring-smite', 'Channel Divinity: Inspiring Smite', 'After a Divine Smite, distribute 2d8 + paladin level temp HP among creatures within 30 ft.', { usesResource: 'channel-divinity' }),
    f(7, 'aura-of-alacrity', 'Aura of Alacrity', 'Your walking speed increases by 10 ft; allies starting within 5 ft gain the same until end of turn.', { effects: [eff('aura-of-alacrity', [mod('speed:walk', 10)])] }),
    f(15, 'glorious-defense', 'Glorious Defense', 'Reaction: add CHA mod to AC against an attack on you or a creature within 10 ft; if it misses, make a weapon attack. CHA mod times per long rest.', { activation: 'reaction', resource: res('glorious-defense', 'Glorious Defense', 'max(1, cha)', 'long') }),
    f(20, 'living-legend', 'Living Legend', 'Bonus action, 1 minute: advantage on CHA checks, turn a miss into a hit once per turn, reroll failed saves. Once per long rest.', { resource: res('living-legend', 'Living Legend', 1, 'long') }),
  ], { spells: oathSpells(['guiding-bolt', 'heroism'], ['enhance-ability', 'magic-weapon'], ['haste', 'protection-from-energy'], ['compulsion', 'freedom-of-movement'], ['commune', 'flame-strike']) }),
  sc('paladin', 'watchers', 'Oath of the Watchers', TCE, 'Paladins who guard the mortal realm from extraplanar threats.', [
    f(3, 'watchers-will', "Channel Divinity: Watcher's Will", 'Action: you and CHA mod creatures within 30 ft gain advantage on INT, WIS, and CHA saves for 1 minute.', { usesResource: 'channel-divinity', effects: [toggle('watchers-will', "Watcher's Will", [adv('save:int'), adv('save:wis'), adv('save:cha')])] }),
    f(3, 'abjure-the-extraplanar', 'Channel Divinity: Abjure the Extraplanar', 'Action: aberrations, celestials, elementals, fey, and fiends within 30 ft make a WIS save or are turned for 1 minute.', { usesResource: 'channel-divinity' }),
    f(7, 'aura-of-the-sentinel', 'Aura of the Sentinel', 'You and creatures of your choice within 10 ft add your proficiency bonus to initiative.', { effects: [eff('aura-of-the-sentinel', [mod('initiative', 'prof')])] }),
    f(15, 'vigilant-rebuke', 'Vigilant Rebuke', 'Reaction when a creature within 30 ft succeeds on an INT, WIS, or CHA save: the caster takes 2d8 + CHA mod force.'),
    f(20, 'mortal-bulwark', 'Mortal Bulwark', 'Bonus action, 1 minute: truesight 120 ft, advantage vs extraplanar creatures, banish on hit. Once per long rest.', { resource: res('mortal-bulwark', 'Mortal Bulwark', 1, 'long') }),
  ], { spells: oathSpells(['alarm', 'detect-magic'], ['moonbeam', 'see-invisibility'], ['counterspell', 'nondetection'], ['aura-of-purity', 'banishment'], ['hold-monster', 'scrying']) }),
];

const opt = (id: string, name: string, key: string, extra = {}) => ({ id, name, description: T(key), ...extra });

const ranger: SubclassDef[] = [
  sc('ranger', 'hunter', 'Hunter', SRD, T('subclass:hunter', 'Emulating the Hunter archetype means accepting your place as a bulwark between civilization and the terrors of the wilderness.'), [
    f(3, 'hunters-prey', "Hunter's Prey", T('hunters-prey'), { choices: [choice('prey', "Hunter's Prey", 'options', 1, { options: [
      opt('colossus-slayer', 'Colossus Slayer', 'hunters-prey-colossus-slayer', { effects: [{ id: 'colossus-slayer', name: 'Colossus Slayer', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '1d8', text: 'if the target is below its HP maximum' }] }] }),
      opt('giant-killer', 'Giant Killer', 'hunters-prey-giant-killer'),
      opt('horde-breaker', 'Horde Breaker', 'hunters-prey-horde-breaker'),
    ] })] }),
    f(7, 'defensive-tactics', 'Defensive Tactics', T('defensive-tactics'), { choices: [choice('tactic', 'Defensive Tactics', 'options', 1, { options: [
      opt('escape-the-horde', 'Escape the Horde', 'defensive-tactics-escape-the-horde'),
      opt('multiattack-defense', 'Multiattack Defense', 'defensive-tactics-multiattack-defense'),
      opt('steel-will', 'Steel Will', 'defensive-tactics-steel-will', { effects: [eff('steel-will', [adv('save:all', 'against being frightened')])] }),
    ] })] }),
    f(11, 'multiattack', 'Multiattack', T('multiattack'), { choices: [choice('multi', 'Multiattack', 'options', 1, { options: [opt('volley', 'Volley', 'multiattack-volley'), opt('whirlwind-attack', 'Whirlwind Attack', 'multiattack-whirlwind-attack')] })] }),
    f(15, 'superior-hunters-defense', "Superior Hunter's Defense", T('superior-hunters-defense'), { choices: [choice('defense', "Superior Hunter's Defense", 'options', 1, { options: [opt('shd-evasion', 'Evasion', 'superior-hunters-defense-evasion'), opt('stand-against-the-tide', 'Stand Against the Tide', 'superior-hunters-defense-stand-against-the-tide'), opt('shd-uncanny-dodge', 'Uncanny Dodge', 'superior-hunters-defense-uncanny-dodge')] })] }),
  ]),
  sc('ranger', 'beast-master', 'Beast Master', PHB, 'Rangers bonded with an animal companion.', [
    f(3, 'rangers-companion', "Ranger's Companion", 'Gain a beast companion (Medium or smaller, CR 1/4 or lower). It adds your proficiency bonus to AC, attacks, damage, saves, and skills; its HP max is the higher of its normal max or 4 × ranger level. Command it with your action.', { manual: true }),
    f(7, 'exceptional-training', 'Exceptional Training', 'Command your beast to Dash, Disengage, or Help as a bonus action; its attacks count as magical.'),
    f(11, 'bestial-fury', 'Bestial Fury', 'Your beast can make two attacks when commanded to Attack.'),
    f(15, 'share-spells', 'Share Spells', 'Self-targeted spells can also affect your beast within 30 ft.'),
  ]),
  sc('ranger', 'gloom-stalker', 'Gloom Stalker', XGE, 'Rangers at home in the darkest places.', [
    f(3, 'dread-ambusher', 'Dread Ambusher', 'Add WIS mod to initiative. On your first turn, +10 ft speed, and if you take the Attack action you make one extra weapon attack that deals +1d8 damage on a hit.', { effects: [eff('dread-ambusher', [mod('initiative', 'wis')]), { id: 'dread-ambusher-attack', name: 'Dread Ambusher (first turn)', trigger: 'on-hit', scope: 'weapon', outcomes: [{ kind: 'damage', dice: '1d8', text: 'extra attack on your first turn of combat' }] }] }),
    f(3, 'umbral-sight', 'Umbral Sight', 'Darkvision 60 ft (or +30 ft); invisible to creatures relying on darkvision while you are in darkness.', { grants: { senses: { darkvision: 60 } }, effects: [eff('umbral-sight-ext', [mod('sense:darkvision', 90, { condition: 'if you already had darkvision, it increases by 30 ft' })])] }),
    f(7, 'iron-mind', 'Iron Mind', 'Proficiency in Wisdom saving throws (or INT/CHA if you already have it).', { grants: { saves: ['wis'] } }),
    f(11, 'stalkers-flurry', "Stalker's Flurry", 'Once per turn when you miss with a weapon attack, make another weapon attack.'),
    f(15, 'shadowy-dodge', 'Shadowy Dodge', 'Reaction: impose disadvantage on an attack against you made without advantage.', { activation: 'reaction' }),
  ], { spells: rangerSpells('disguise-self', 'rope-trick', 'fear', 'greater-invisibility', 'seeming') }),
  sc('ranger', 'horizon-walker', 'Horizon Walker', XGE, 'Rangers who guard the world against planar threats.', [
    f(3, 'detect-portal', 'Detect Portal', 'Action: sense the distance and direction to the nearest planar portal within 1 mile. Once per short rest.', { resource: res('detect-portal', 'Detect Portal', 1, 'short') }),
    f(3, 'planar-warrior', 'Planar Warrior', 'Bonus action: your next hit on a creature within 30 ft this turn deals force damage and +1d8 force (2d8 at 11th).', { activation: 'bonus', effects: [{ id: 'planar-warrior', name: 'Planar Warrior (bonus action)', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '{steps(cl,3,1,11,2)}d8', damageType: 'force', text: 'all damage becomes force' }] }] }),
    f(7, 'ethereal-step', 'Ethereal Step', 'Bonus action: cast etherealness until end of turn. Once per short rest.', { resource: res('ethereal-step', 'Ethereal Step', 1, 'short') }),
    f(11, 'distant-strike', 'Distant Strike', 'When you take the Attack action, teleport 10 ft before each attack; attacking two creatures grants an extra attack against a third.'),
    f(15, 'spectral-defense', 'Spectral Defense', 'Reaction when hit: gain resistance to that attack’s damage.', { activation: 'reaction' }),
  ], { spells: rangerSpells('protection-from-evil-and-good', 'misty-step', 'haste', 'banishment', 'teleportation-circle') }),
  sc('ranger', 'monster-slayer', 'Monster Slayer', XGE, 'Hunters of vampires, dragons, and fiends.', [
    f(3, 'hunters-sense', "Hunter's Sense", 'Action: learn a creature’s immunities, resistances, and vulnerabilities. WIS mod times per long rest.', { resource: res('hunters-sense', "Hunter's Sense", 'max(1, wis)', 'long') }),
    f(3, 'slayers-prey', "Slayer's Prey", 'Bonus action: designate a creature within 60 ft; the first hit on it each turn deals +1d6.', { activation: 'bonus', effects: [{ id: 'slayers-prey', name: "Slayer's Prey", trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '1d6', text: 'vs. designated target' }] }] }),
    f(7, 'supernatural-defense', 'Supernatural Defense', 'Add 1d6 to saves and grapple-escape checks forced by your Slayer’s Prey target.', { effects: [eff('supernatural-defense', [mod('save:all', 0, { condition: '+1d6 vs. your Slayer’s Prey target' })])] }),
    f(11, 'magic-users-nemesis', "Magic-User's Nemesis", 'Reaction: a creature casting a spell or teleporting within 60 ft makes a WIS save or the spell fails. Once per short rest.', { activation: 'reaction', resource: res('magic-users-nemesis', "Magic-User's Nemesis", 1, 'short') }),
    f(15, 'slayers-counter', "Slayer's Counter", 'Reaction when your prey forces a save: attack it; on a hit you automatically succeed.'),
  ], { spells: rangerSpells('protection-from-evil-and-good', 'zone-of-truth', 'magic-circle', 'banishment', 'hold-monster') }),
  sc('ranger', 'fey-wanderer', 'Fey Wanderer', TCE, 'Rangers touched by the Feywild.', [
    f(3, 'dreadful-strikes', 'Dreadful Strikes', 'Once per turn per creature, your weapon hits deal +1d4 psychic (1d6 at 11th).', { effects: [{ id: 'dreadful-strikes', name: 'Dreadful Strikes', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '1d{steps(cl,3,4,11,6)}', damageType: 'psychic' }] }] }),
    f(3, 'otherworldly-glamour', 'Otherworldly Glamour', 'Add WIS mod (min +1) to CHA checks; gain proficiency in Deception, Performance, or Persuasion.', { effects: [eff('otherworldly-glamour', [mod('check:cha', 'max(1, wis)')])], choices: [choice('skill', 'Skill', 'skill', 1, { from: ['deception', 'performance', 'persuasion'] })] }),
    f(7, 'beguiling-twist', 'Beguiling Twist', 'Advantage on saves against charmed or frightened; reaction to redirect such an effect.', { effects: [eff('beguiling-twist', [adv('save:all', 'against being charmed or frightened')])] }),
    f(11, 'fey-reinforcements', 'Fey Reinforcements', 'Cast summon fey without material components once per long rest (or with a slot); can be non-concentration for 1 minute.', { resource: res('fey-reinforcements', 'Fey Reinforcements', 1, 'long'), grants: { spells: [{ spellId: 'summon-fey', mode: 'always-prepared' }] } }),
    f(15, 'misty-wanderer', 'Misty Wanderer', 'Cast misty step without a slot WIS mod times per long rest; bring a willing creature within 5 ft.', { resource: res('misty-wanderer', 'Misty Wanderer', 'max(1, wis)', 'long') }),
  ], { spells: rangerSpells('charm-person', 'misty-step', 'dispel-magic', 'dimension-door', 'mislead') }),
  sc('ranger', 'swarmkeeper', 'Swarmkeeper', TCE, 'Rangers bonded with a swarm of nature spirits.', [
    f(3, 'gathered-swarm', 'Gathered Swarm', 'You know mage hand. Once per turn on a hit, the swarm deals +1d6 piercing, moves the target 15 ft (STR save), or moves you 5 ft.', { grants: { spells: [{ spellId: 'mage-hand', mode: 'always-prepared' }] }, effects: [{ id: 'gathered-swarm', name: 'Gathered Swarm', trigger: 'on-hit', scope: 'all', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '1d{steps(cl,3,6,11,8)}', damageType: 'piercing', text: 'or push 15 ft (STR save), or move yourself 5 ft' }] }] }),
    f(7, 'writhing-tide', 'Writhing Tide', 'Bonus action: gain a 10-ft flying speed and hover for 1 minute. Proficiency bonus times per long rest.', { resource: res('writhing-tide', 'Writhing Tide', 'prof', 'long'), effects: [toggle('writhing-tide', 'Writhing Tide', [mod('speed:fly', 10, { op: 'max' })])] }),
    f(11, 'mighty-swarm', 'Mighty Swarm', 'Swarm damage becomes 1d8; pushed targets can be knocked prone; you gain half cover when it moves you.'),
    f(15, 'swarming-dispersal', 'Swarming Dispersal', 'Reaction when damaged: gain resistance and teleport 30 ft. Proficiency bonus times per long rest.', { activation: 'reaction', resource: res('swarming-dispersal', 'Swarming Dispersal', 'prof', 'long') }),
  ], { spells: rangerSpells('faerie-fire', 'web', 'gaseous-form', 'arcane-eye', 'insect-plague') }),
];

export const SUBCLASSES_2: SubclassDef[] = [...fighter, ...monk, ...paladin, ...ranger];
export { grant, flag };
