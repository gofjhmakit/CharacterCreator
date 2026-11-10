// Subclasses: Rogue, Sorcerer, Warlock, Wizard.
import type { SubclassDef } from '@/types/content';
import { SRD, PHB, XGE, TCE, SCAG, T, mod, adv, grant, eff, toggle, choice, byLevel } from './helpers';
import { sc, f, res, patronSpells, sorcSpells, thirdCaster } from './subclassHelpers';

const PSI_DIE = byLevel([[3, 6], [5, 8], [11, 10], [17, 12]]);

const rogue: SubclassDef[] = [
  sc('rogue', 'thief', 'Thief', SRD, T('subclass:thief', 'You hone your skills in the larcenous arts.'), [
    f(3, 'fast-hands', 'Fast Hands', T('fast-hands'), { activation: 'bonus' }),
    f(3, 'second-story-work', 'Second-Story Work', T('second-story-work'), { grants: { speeds: { climb: 'walk' } } }),
    f(9, 'supreme-sneak', 'Supreme Sneak', T('supreme-sneak'), { effects: [eff('supreme-sneak', [adv('skill:stealth', 'if you move no more than half your speed this turn')])] }),
    f(13, 'use-magic-device', 'Use Magic Device', T('use-magic-device')),
    f(17, 'thiefs-reflexes', "Thief's Reflexes", T('thiefs-reflexes')),
  ]),
  sc('rogue', 'assassin', 'Assassin', PHB, 'Masters of the art of death.', [
    f(3, 'assassin-bonus-proficiencies', 'Bonus Proficiencies', "Proficiency with the disguise kit and the poisoner's kit.", { grants: { tools: ['Disguise kit', "Poisoner's kit"] } }),
    f(3, 'assassinate', 'Assassinate', 'Advantage on attacks against creatures that haven’t taken a turn yet; any hit against a surprised creature is a critical hit.', { effects: [eff('assassinate', [adv('attack', 'against creatures that have not taken a turn in combat yet')])] }),
    f(9, 'infiltration-expertise', 'Infiltration Expertise', 'Spend 7 days and 25 gp to establish a false identity.'),
    f(13, 'impostor', 'Impostor', 'Mimic another person’s speech, writing, and behavior after 3 hours of study; advantage on Deception to avoid detection.'),
    f(17, 'death-strike', 'Death Strike', 'When you hit a surprised creature, it makes a CON save (DC 8 + DEX + prof) or takes double damage.', { effects: [{ id: 'death-strike', name: 'Death Strike', trigger: 'on-hit', save: { ability: 'con', dc: { kind: 'formula', formula: '8 + dex + prof' }, onFailure: [{ kind: 'text', text: 'double the damage of the attack (surprised target)' }] } }] }),
  ]),
  sc('rogue', 'arcane-trickster', 'Arcane Trickster', PHB, 'Rogues who enhance their skills with enchantment and illusion magic.', [
    f(3, 'at-spellcasting', 'Spellcasting', 'Cast wizard spells using Intelligence (third-caster). You know mage hand. Most spells must be enchantment or illusion, except those learned at 3rd, 8th, 14th, and 20th level.', { grants: { spells: [{ spellId: 'mage-hand', mode: 'always-prepared', ability: 'int' }] } }),
    f(3, 'mage-hand-legerdemain', 'Mage Hand Legerdemain', 'Your mage hand is invisible and can stow, pick locks, and pick pockets; control it with Cunning Action.'),
    f(9, 'magical-ambush', 'Magical Ambush', 'If you are hidden when you cast a spell, the target has disadvantage on its save.'),
    f(13, 'versatile-trickster', 'Versatile Trickster', 'Bonus action: use your mage hand to gain advantage on attacks against a creature within 5 ft of it.'),
    f(17, 'spell-thief', 'Spell Thief', 'Reaction when a spell targets you: the caster makes a save; on failure you negate it and can cast it for 8 hours. Once per long rest.', { resource: res('spell-thief', 'Spell Thief', 1, 'long') }),
  ], { spellcasting: thirdCaster('int', 'wizard', [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], ['enchantment', 'illusion']) }),
  sc('rogue', 'mastermind', 'Mastermind', XGE, 'Rogues focused on people and influence.', [
    f(3, 'master-of-intrigue', 'Master of Intrigue', 'Proficiency with the disguise kit, forgery kit, and one gaming set; learn two languages; mimic speech patterns.', { grants: { tools: ['Disguise kit', 'Forgery kit'] }, choices: [choice('gaming', 'Gaming set', 'tool', 1, { from: ['Dice set', 'Dragonchess set', 'Playing card set', 'Three-Dragon Ante set'] }), choice('languages', 'Languages', 'language', 2)] }),
    f(3, 'master-of-tactics', 'Master of Tactics', 'Help as a bonus action, at a range of 30 ft for attacks.', { activation: 'bonus' }),
    f(9, 'insightful-manipulator', 'Insightful Manipulator', 'Study a creature for 1 minute to learn how its mental abilities compare to yours.'),
    f(13, 'misdirection', 'Misdirection', 'Reaction: redirect an attack against you to a creature providing you cover.', { activation: 'reaction' }),
    f(17, 'soul-of-deceit', 'Soul of Deceit', 'Your thoughts can’t be read unless you allow it; magic can’t compel truth from you.'),
  ]),
  sc('rogue', 'swashbuckler', 'Swashbuckler', XGE, 'Flashy duelists.', [
    f(3, 'fancy-footwork', 'Fancy Footwork', 'Creatures you make a melee attack against can’t make opportunity attacks against you this turn.'),
    f(3, 'rakish-audacity', 'Rakish Audacity', 'Add CHA mod to initiative. Sneak Attack works without advantage if you are within 5 ft of the target and no other creature is.', { effects: [eff('rakish-audacity', [mod('initiative', 'cha')])] }),
    f(9, 'panache', 'Panache', 'Action: Persuasion vs Insight to charm or taunt a creature for 1 minute.', { activation: 'action' }),
    f(13, 'elegant-maneuver', 'Elegant Maneuver', 'Bonus action: advantage on your next Acrobatics or Athletics check this turn.', { activation: 'bonus' }),
    f(17, 'master-duelist', 'Master Duelist', 'When you miss with an attack, reroll it with advantage. Once per short rest.', { resource: res('master-duelist', 'Master Duelist', 1, 'short') }),
  ]),
  sc('rogue', 'inquisitive', 'Inquisitive', XGE, 'Rogues who root out secrets.', [
    f(3, 'ear-for-deceit', 'Ear for Deceit', 'Treat a d20 roll of 7 or lower as 8 on Insight checks to detect lies.'),
    f(3, 'eye-for-detail', 'Eye for Detail', 'Bonus action: Perception to spot hidden creatures/objects or Investigation to decipher clues.', { activation: 'bonus' }),
    f(3, 'insightful-fighting', 'Insightful Fighting', 'Bonus action: Insight vs Deception; on success, Sneak Attack against that target without advantage for 1 minute.', { activation: 'bonus' }),
    f(9, 'steady-eye', 'Steady Eye', 'Advantage on Perception and Investigation if you move no more than half your speed.', { effects: [eff('steady-eye', [adv('skill:perception', 'if you move no more than half your speed'), adv('skill:investigation', 'if you move no more than half your speed')])] }),
    f(13, 'unerring-eye', 'Unerring Eye', 'Action: sense illusions and shapechangers within 30 ft. WIS mod times per long rest.', { resource: res('unerring-eye', 'Unerring Eye', 'max(1, wis)', 'long') }),
    f(17, 'eye-for-weakness', 'Eye for Weakness', 'Sneak Attack deals +3d6 against your Insightful Fighting target.'),
  ]),
  sc('rogue', 'scout', 'Scout', XGE, 'Skilled in stealth and surviving far from civilization.', [
    f(3, 'skirmisher', 'Skirmisher', 'Reaction when an enemy ends its turn within 5 ft: move half your speed without provoking.', { activation: 'reaction' }),
    f(3, 'survivalist', 'Survivalist', 'Proficiency and expertise in Nature and Survival.', { grants: { skills: ['nature', 'survival'], expertise: ['nature', 'survival'] } }),
    f(9, 'superior-mobility', 'Superior Mobility', 'Walking speed increases by 10 ft (and climb/swim speeds).', { effects: [eff('superior-mobility', [mod('speed:walk', 10), mod('speed:climb', 10), mod('speed:swim', 10)])] }),
    f(13, 'ambush-master', 'Ambush Master', 'Advantage on initiative; allies have advantage against the first creature you hit in the first round.', { effects: [eff('ambush-master', [adv('initiative')])] }),
    f(17, 'sudden-strike', 'Sudden Strike', 'Make an additional attack as a bonus action when you take the Attack action; Sneak Attack can apply to it against a different target.'),
  ]),
  sc('rogue', 'phantom', 'Phantom', TCE, 'Rogues who walk with the dead.', [
    f(3, 'whispers-of-the-dead', 'Whispers of the Dead', 'After a short or long rest, gain one skill or tool proficiency until you change it.'),
    f(3, 'wails-from-the-grave', 'Wails from the Grave', 'After Sneak Attack, a second creature within 30 ft takes necrotic damage equal to half your Sneak Attack dice. Proficiency bonus times per long rest.', { resource: res('wails-from-the-grave', 'Wails from the Grave', 'prof', 'long'), effects: [{ id: 'wails-from-the-grave', name: 'Wails from the Grave', trigger: 'on-hit', consumes: { resourceId: 'wails-from-the-grave', amount: 1 }, outcomes: [{ kind: 'damage', dice: '{ceil(ceil(cl/2)/2)}d6', damageType: 'necrotic', text: 'to a second creature within 30 ft after Sneak Attack' }] }] }),
    f(9, 'tokens-of-the-departed', 'Tokens of the Departed', 'Create soul trinkets (up to proficiency bonus); advantage on CON saves and death saves while holding one; spend one to use Wails without expending a use.'),
    f(13, 'ghost-walk', 'Ghost Walk', 'Bonus action: spectral form for 10 minutes: fly 10 ft, attacks against you have disadvantage, move through objects. Once per long rest (or destroy a trinket).', { resource: res('ghost-walk', 'Ghost Walk', 1, 'long') }),
    f(17, 'deaths-friend', "Death's Friend", 'Wails damages both creatures; you always have a soul trinket after a long rest.'),
  ]),
  sc('rogue', 'soulknife', 'Soulknife', TCE, 'Rogues who manifest psychic blades.', [
    f(3, 'psionic-power-rogue', 'Psionic Power', 'Psionic Energy dice (2 × proficiency bonus): Psi-Bolstered Knack (add die to a failed proficient check) and Psychic Whispers (telepathy). Regain one die as a bonus action once per short rest.', { resource: res('psionic-energy', 'Psionic Energy Dice', '2 * prof', 'long', { die: PSI_DIE }) }),
    f(3, 'psychic-blades-soulknife', 'Psychic Blades', 'Manifest a psychic blade when attacking: simple melee, finesse, thrown (60 ft), 1d6 psychic; bonus action second blade 1d4.', { manual: true }),
    f(9, 'soul-blades', 'Soul Blades', 'Homing Strikes (add a psionic die to a missed blade attack) and Psychic Teleportation (throw a blade to teleport).'),
    f(13, 'psychic-veil', 'Psychic Veil', 'Action: become invisible for 1 hour. Once per long rest (or spend a die).', { resource: res('psychic-veil', 'Psychic Veil', 1, 'long') }),
    f(17, 'rend-mind', 'Rend Mind', 'When Sneak Attack hits with a psychic blade, the target makes a WIS save or is stunned for 1 minute. Once per long rest (or spend 3 dice).', { resource: res('rend-mind', 'Rend Mind', 1, 'long') }),
  ]),
];

const sorcerer: SubclassDef[] = [
  sc('sorcerer', 'draconic', 'Draconic Bloodline', SRD, T('subclass:draconic', 'Your innate magic comes from draconic magic mingled with your blood.'), [
    f(1, 'dragon-ancestor', 'Dragon Ancestor', T('dragon-ancestor'), {
      grants: { languages: ['Draconic'] },
      choices: [choice('ancestor', 'Dragon ancestor', 'options', 1, { options: ([['black', 'acid'], ['blue', 'lightning'], ['brass', 'fire'], ['bronze', 'lightning'], ['copper', 'acid'], ['gold', 'fire'], ['green', 'poison'], ['red', 'fire'], ['silver', 'cold'], ['white', 'cold']] as const).map(([c, d]) => ({ id: `ancestor-${c}`, name: `${c[0].toUpperCase() + c.slice(1)} (${d})`, description: `Damage type: ${d}. Double proficiency on CHA checks with dragons.` })) })],
    }),
    f(1, 'draconic-resilience', 'Draconic Resilience', T('draconic-resilience'), {
      effects: [eff('draconic-resilience', [mod('hp-per-level', 1), mod('ac-formula', undefined, { acFormula: { label: 'Draconic Resilience (13 + DEX)', base: 13, abilities: ['dex'], allowsArmor: false, allowsShield: true } })])],
    }),
    f(6, 'elemental-affinity', 'Elemental Affinity', T('elemental-affinity'), { effects: [{ id: 'elemental-affinity', name: 'Elemental Affinity', manual: true, description: 'Add CHA mod to one damage roll of spells matching your ancestry type; spend 1 SP for resistance to it for 1 hour.' }] }),
    f(14, 'dragon-wings', 'Dragon Wings', T('dragon-wings'), { activation: 'bonus', effects: [toggle('dragon-wings', 'Dragon Wings', [mod('speed:fly', 'walk', { op: 'max' })])] }),
    f(18, 'draconic-presence', 'Draconic Presence', T('draconic-presence'), { usesResource: 'sorcery-points' }),
  ]),
  sc('sorcerer', 'wild-magic', 'Wild Magic', PHB, 'Your innate magic comes from the forces of chaos.', [
    f(1, 'wild-magic-surge', 'Wild Magic Surge', 'After casting a 1st-level+ sorcerer spell, the DM can have you roll a d20; on a 1, roll on the Wild Magic Surge table.', { manual: true }),
    f(1, 'tides-of-chaos', 'Tides of Chaos', 'Gain advantage on one attack, check, or save. Regain on a long rest (or when the DM triggers a surge).', { resource: res('tides-of-chaos', 'Tides of Chaos', 1, 'long') }),
    f(6, 'bend-luck', 'Bend Luck', 'Reaction (2 sorcery points): add or subtract 1d4 from another creature’s attack, check, or save.', { activation: 'reaction', usesResource: 'sorcery-points' }),
    f(14, 'controlled-chaos', 'Controlled Chaos', 'Roll twice on the Wild Magic Surge table and choose.'),
    f(18, 'spell-bombardment', 'Spell Bombardment', 'Once per turn, when you roll max on a damage die, roll it again and add it.'),
  ]),
  sc('sorcerer', 'storm', 'Storm Sorcery', XGE, 'Your magic comes from elemental air.', [
    f(1, 'wind-speaker', 'Wind Speaker', 'Speak, read, and write Primordial.', { grants: { languages: ['Primordial'] } }),
    f(1, 'tempestuous-magic', 'Tempestuous Magic', 'Bonus action before or after casting a 1st-level+ spell: fly 10 ft without provoking.'),
    f(6, 'heart-of-the-storm', 'Heart of the Storm', 'Resistance to lightning and thunder; casting such spells deals half sorcerer level damage to chosen creatures within 10 ft.', { grants: { resistances: ['lightning', 'thunder'] } }),
    f(6, 'storm-guide', 'Storm Guide', 'Control rain and wind around you.'),
    f(14, 'storms-fury', "Storm's Fury", 'Reaction when hit by a melee attack: deal lightning damage equal to sorcerer level; STR save or pushed 20 ft.', { activation: 'reaction' }),
    f(18, 'wind-soul', 'Wind Soul', 'Immunity to lightning and thunder; flying speed 60 ft (can share).', { grants: { immunities: ['lightning', 'thunder'], speeds: { fly: 60 } } }),
  ]),
  sc('sorcerer', 'shadow-magic', 'Shadow Magic', XGE, 'Your magic comes from the Shadowfell.', [
    f(1, 'eyes-of-the-dark', 'Eyes of the Dark', 'Darkvision 120 ft. From 3rd level, cast darkness for 2 sorcery points and see through it.', { grants: { senses: { darkvision: 120 }, spells: [{ spellId: 'darkness', mode: 'always-prepared', minLevel: 3, note: '2 SP; you can see through it' }] } }),
    f(1, 'strength-of-the-grave', 'Strength of the Grave', 'When reduced to 0 HP (not radiant or crit), CHA save (DC 5 + damage) to drop to 1 HP instead. Once per long rest.', { resource: res('strength-of-the-grave', 'Strength of the Grave', 1, 'long') }),
    f(6, 'hound-of-ill-omen', 'Hound of Ill Omen', 'Bonus action (3 SP): summon a dire-wolf hound that harries a target; the target has disadvantage on saves against your spells while the hound is near.', { usesResource: 'sorcery-points' }),
    f(14, 'shadow-walk', 'Shadow Walk', 'Bonus action in dim light or darkness: teleport up to 120 ft to another such space.'),
    f(18, 'umbral-form', 'Umbral Form', 'Bonus action (6 SP), 1 minute: resistance to all damage except force and radiant; move through objects.', { effects: [toggle('umbral-form', 'Umbral Form', (['acid', 'bludgeoning', 'cold', 'fire', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'slashing', 'thunder'] as const).map((d) => grant(`resistance:${d}`)))] }),
  ]),
  sc('sorcerer', 'divine-soul', 'Divine Soul', XGE, 'Your innate magic comes from a divine source.', [
    f(1, 'divine-magic', 'Divine Magic', 'You can learn cleric spells as sorcerer spells. Choose an affinity for a bonus spell: good (cure wounds), evil (inflict wounds), law (bless), chaos (bane), neutrality (protection from evil and good).', {
      tags: ['extra-list:cleric'],
      choices: [choice('affinity', 'Affinity', 'options', 1, { options: [
        { id: 'affinity-good', name: 'Good', grants: { spells: [{ spellId: 'cure-wounds', mode: 'always-prepared' }] } },
        { id: 'affinity-evil', name: 'Evil', grants: { spells: [{ spellId: 'inflict-wounds', mode: 'always-prepared' }] } },
        { id: 'affinity-law', name: 'Law', grants: { spells: [{ spellId: 'bless', mode: 'always-prepared' }] } },
        { id: 'affinity-chaos', name: 'Chaos', grants: { spells: [{ spellId: 'bane', mode: 'always-prepared' }] } },
        { id: 'affinity-neutrality', name: 'Neutrality', grants: { spells: [{ spellId: 'protection-from-evil-and-good', mode: 'always-prepared' }] } },
      ] })],
    }),
    f(1, 'favored-by-the-gods', 'Favored by the Gods', 'When you fail a save or miss an attack, add 2d4 to the roll. Once per short rest.', { resource: res('favored-by-the-gods', 'Favored by the Gods', 1, 'short') }),
    f(6, 'empowered-healing', 'Empowered Healing', 'Spend 1 SP to reroll healing dice for a creature within 5 ft (once per turn).', { usesResource: 'sorcery-points' }),
    f(14, 'otherworldly-wings', 'Otherworldly Wings', 'Bonus action: manifest wings for a 30-ft flying speed.', { effects: [toggle('otherworldly-wings', 'Otherworldly Wings', [mod('speed:fly', 30, { op: 'max' })])] }),
    f(18, 'unearthly-recovery', 'Unearthly Recovery', 'Bonus action when below half HP: regain HP equal to half your max. Once per long rest.', { resource: res('unearthly-recovery', 'Unearthly Recovery', 1, 'long') }),
  ]),
  sc('sorcerer', 'aberrant-mind', 'Aberrant Mind', TCE, 'Your magic stems from an alien influence.', [
    f(1, 'psionic-spells', 'Psionic Spells', 'You learn additional spells that don’t count against spells known and can be swapped for divination or enchantment spells.'),
    f(1, 'telepathic-speech', 'Telepathic Speech', 'Bonus action: telepathic link with a creature within 30 ft for sorcerer level minutes.'),
    f(6, 'psionic-sorcery', 'Psionic Sorcery', 'Cast Psionic Spells using sorcery points equal to the spell level, without components.', { usesResource: 'sorcery-points' }),
    f(6, 'psychic-defenses', 'Psychic Defenses', 'Resistance to psychic damage; advantage on saves against being charmed or frightened.', { grants: { resistances: ['psychic'] }, effects: [eff('psychic-defenses', [adv('save:all', 'against being charmed or frightened')])] }),
    f(14, 'revelation-in-flesh', 'Revelation in Flesh', 'Bonus action, 1+ SP: gain swim/fly/see-invisible/squeeze benefits for 10 minutes.'),
    f(18, 'warping-implosion', 'Warping Implosion', 'Action: teleport 120 ft; creatures within 30 ft of where you left make a STR save or take 3d10 force and are pulled. Once per long rest (or 5 SP).', { resource: res('warping-implosion', 'Warping Implosion', 1, 'long') }),
  ], { spells: sorcSpells(['arms-of-hadar', 'dissonant-whispers', 'mind-sliver'], ['calm-emotions', 'detect-thoughts'], ['hunger-of-hadar', 'sending'], ['black-tentacles', 'summon-aberration'], ['telepathic-bond', 'telekinesis']) }),
  sc('sorcerer', 'clockwork-soul', 'Clockwork Soul', TCE, 'Your magic is the cosmic force of order.', [
    f(1, 'clockwork-magic', 'Clockwork Magic', 'You learn additional spells that don’t count against spells known.'),
    f(1, 'restore-balance', 'Restore Balance', 'Reaction: cancel advantage or disadvantage on a roll within 60 ft. Proficiency bonus times per long rest.', { activation: 'reaction', resource: res('restore-balance', 'Restore Balance', 'prof', 'long') }),
    f(6, 'bastion-of-law', 'Bastion of Law', 'Action, 1–5 SP: create a ward of d8s that reduce damage to a creature.', { usesResource: 'sorcery-points' }),
    f(14, 'trance-of-order', 'Trance of Order', 'Bonus action, 1 minute: attacks against you can’t have advantage; treat 9 or lower as 10 on attacks, checks, and saves. Once per long rest (or 5 SP).', { resource: res('trance-of-order', 'Trance of Order', 1, 'long') }),
    f(18, 'clockwork-cavalcade', 'Clockwork Cavalcade', 'Action: 30-ft cube heals 100 HP, repairs objects, ends spells of 6th level or lower. Once per long rest (or 7 SP).', { resource: res('clockwork-cavalcade', 'Clockwork Cavalcade', 1, 'long') }),
  ], { spells: sorcSpells(['alarm', 'protection-from-evil-and-good'], ['aid', 'lesser-restoration'], ['dispel-magic', 'protection-from-energy'], ['freedom-of-movement', 'summon-construct'], ['greater-restoration', 'wall-of-force']) }),
];

const warlock: SubclassDef[] = [
  sc('warlock', 'fiend', 'The Fiend', SRD, T('subclass:fiend', 'You have made a pact with a fiend from the lower planes.'), [
    f(1, 'dark-ones-blessing', "Dark One's Blessing", T('dark-ones-blessing'), { effects: [{ id: 'dark-ones-blessing', name: "Dark One's Blessing", manual: true, description: 'When you reduce a hostile creature to 0 HP, gain temp HP = CHA mod + warlock level.' }] }),
    f(6, 'dark-ones-own-luck', "Dark One's Own Luck", T('dark-ones-own-luck'), { resource: res('dark-ones-own-luck', "Dark One's Own Luck", 1, 'short') }),
    f(10, 'fiendish-resilience', 'Fiendish Resilience', T('fiendish-resilience'), { choices: [choice('type', 'Resistance (change on a rest)', 'damage-type', 1)] }),
    f(14, 'hurl-through-hell', 'Hurl Through Hell', T('hurl-through-hell'), { resource: res('hurl-through-hell', 'Hurl Through Hell', 1, 'long') }),
  ], { spells: patronSpells(['burning-hands', 'command'], ['blindness-deafness', 'scorching-ray'], ['fireball', 'stinking-cloud'], ['fire-shield', 'wall-of-fire'], ['flame-strike', 'hallow']) }),
  sc('warlock', 'archfey', 'The Archfey', PHB, 'Your patron is a lord or lady of the fey.', [
    f(1, 'fey-presence', 'Fey Presence', 'Action: creatures in a 10-ft cube make a WIS save or are charmed or frightened until the end of your next turn. Once per short rest.', { resource: res('fey-presence', 'Fey Presence', 1, 'short') }),
    f(6, 'misty-escape', 'Misty Escape', 'Reaction when damaged: turn invisible and teleport up to 60 ft. Once per short rest.', { activation: 'reaction', resource: res('misty-escape', 'Misty Escape', 1, 'short') }),
    f(10, 'beguiling-defenses', 'Beguiling Defenses', 'Immune to being charmed; reaction to turn a charm back on its caster.', { grants: { conditionImmunities: ['charmed'] } }),
    f(14, 'dark-delirium', 'Dark Delirium', 'Action: a creature within 60 ft makes a WIS save or is charmed or frightened for 1 minute in an illusory realm. Once per short rest.', { resource: res('dark-delirium', 'Dark Delirium', 1, 'short') }),
  ], { spells: patronSpells(['faerie-fire', 'sleep'], ['calm-emotions', 'phantasmal-force'], ['blink', 'plant-growth'], ['dominate-beast', 'greater-invisibility'], ['dominate-person', 'seeming']) }),
  sc('warlock', 'great-old-one', 'The Great Old One', PHB, 'Your patron is an entity of unknowable mind.', [
    f(1, 'awakened-mind', 'Awakened Mind', 'Communicate telepathically with any creature within 30 ft that understands a language.'),
    f(6, 'entropic-ward', 'Entropic Ward', 'Reaction: impose disadvantage on an attack against you; if it misses, advantage on your next attack against the attacker. Once per short rest.', { activation: 'reaction', resource: res('entropic-ward', 'Entropic Ward', 1, 'short') }),
    f(10, 'thought-shield', 'Thought Shield', 'Your thoughts can’t be read; resistance to psychic damage; creatures dealing psychic damage to you take the same.', { grants: { resistances: ['psychic'] } }),
    f(14, 'create-thrall', 'Create Thrall', 'Action: charm an incapacitated humanoid indefinitely; communicate telepathically.'),
  ], { spells: patronSpells(['dissonant-whispers', 'hideous-laughter'], ['detect-thoughts', 'phantasmal-force'], ['clairvoyance', 'sending'], ['dominate-beast', 'black-tentacles'], ['dominate-person', 'telekinesis']) }),
  sc('warlock', 'celestial', 'The Celestial', XGE, 'Your patron is a being of the Upper Planes.', [
    f(1, 'celestial-bonus-cantrips', 'Bonus Cantrips', 'You learn light and sacred flame.', { grants: { spells: [{ spellId: 'light', mode: 'always-prepared' }, { spellId: 'sacred-flame', mode: 'always-prepared' }] } }),
    f(1, 'healing-light', 'Healing Light', 'Pool of d6s equal to 1 + warlock level. Bonus action: heal a creature within 60 ft by spending up to CHA mod dice.', { activation: 'bonus', resource: res('healing-light', 'Healing Light (d6s)', '1 + cl', 'long', { pool: true, die: 'd6' }) }),
    f(6, 'radiant-soul', 'Radiant Soul', 'Resistance to radiant damage; add CHA mod to one damage roll of fire or radiant spells.', { grants: { resistances: ['radiant'] } }),
    f(10, 'celestial-resilience', 'Celestial Resilience', 'After a rest, gain temp HP = warlock level + CHA mod; up to five allies gain half warlock level + CHA mod.'),
    f(14, 'searing-vengeance', 'Searing Vengeance', 'When making a death save, instead regain half your HP and stand; enemies within 30 ft take 2d8 + CHA radiant and are blinded. Once per long rest.', { resource: res('searing-vengeance', 'Searing Vengeance', 1, 'long') }),
  ], { spells: patronSpells(['cure-wounds', 'guiding-bolt'], ['flaming-sphere', 'lesser-restoration'], ['daylight', 'revivify'], ['guardian-of-faith', 'wall-of-fire'], ['flame-strike', 'greater-restoration']) }),
  sc('warlock', 'hexblade', 'The Hexblade', XGE, 'Your patron is a mysterious entity from the Shadowfell manifesting through sentient weapons.', [
    f(1, 'hexblades-curse', "Hexblade's Curse", 'Bonus action: curse a creature within 30 ft for 1 minute: +prof to damage against it, crit on 19–20 against it, and regain warlock level + CHA mod HP if it dies. Once per short rest.', {
      activation: 'bonus', resource: res('hexblades-curse', "Hexblade's Curse", 1, 'short'),
      effects: [toggle('hexblades-curse', "Hexblade's Curse", [mod('damage', 'prof', { condition: 'against the cursed target' }), mod('crit-range', 19, { condition: 'against the cursed target' })])],
    }),
    f(1, 'hex-warrior', 'Hex Warrior', 'Proficiency with medium armor, shields, and martial weapons. Use CHA for attack and damage with one bonded one-handed weapon (edit that weapon’s attack ability to CHA in the inventory).', { grants: { armor: ['medium', 'shields'], weapons: ['martial'] } }),
    f(6, 'accursed-specter', 'Accursed Specter', 'Raise a slain humanoid as a specter with temp HP equal to half your warlock level. Once per long rest.', { resource: res('accursed-specter', 'Accursed Specter', 1, 'long') }),
    f(10, 'armor-of-hexes', 'Armor of Hexes', 'Reaction when your cursed target hits you: roll a d6; on 4+, the attack misses.', { activation: 'reaction' }),
    f(14, 'master-of-hexes', 'Master of Hexes', 'When your cursed target dies, move the curse to another creature within 30 ft.'),
  ], { spells: patronSpells(['shield', 'wrathful-smite'], ['blur', 'branding-smite'], ['blink', 'elemental-weapon'], ['phantasmal-killer', 'staggering-smite'], ['banishing-smite', 'cone-of-cold']) }),
  sc('warlock', 'fathomless', 'The Fathomless', TCE, 'Your patron dwells in the ocean depths.', [
    f(1, 'tentacle-of-the-deeps', 'Tentacle of the Deeps', 'Bonus action: summon a tentacle for 1 minute; melee spell attack 1d8 cold (2d8 at 10th) and reduce speed by 10 ft. Proficiency bonus times per long rest.', { activation: 'bonus', resource: res('tentacle-of-the-deeps', 'Tentacle of the Deeps', 'prof', 'long') }),
    f(1, 'gift-of-the-sea', 'Gift of the Sea', 'Swimming speed 40 ft; breathe underwater.', { grants: { speeds: { swim: 40 } } }),
    f(6, 'oceanic-soul', 'Oceanic Soul', 'Resistance to cold damage; understand speech while submerged.', { grants: { resistances: ['cold'] } }),
    f(6, 'guardian-coil', 'Guardian Coil', 'Reaction: reduce damage to a creature within 10 ft of your tentacle by 1d8 (2d8 at 10th).', { activation: 'reaction' }),
    f(10, 'grasping-tentacles', 'Grasping Tentacles', 'Black tentacles is always known; cast it once per long rest without a slot; gain temp HP equal to warlock level when cast.', { resource: res('grasping-tentacles', 'Grasping Tentacles', 1, 'long'), grants: { spells: [{ spellId: 'black-tentacles', mode: 'always-prepared' }] } }),
    f(14, 'fathomless-plunge', 'Fathomless Plunge', 'Action: teleport yourself and five willing creatures up to 1 mile to a body of water. Once per short rest.', { resource: res('fathomless-plunge', 'Fathomless Plunge', 1, 'short') }),
  ], { spells: patronSpells(['create-or-destroy-water', 'thunderwave'], ['gust-of-wind', 'silence'], ['lightning-bolt', 'sleet-storm'], ['control-water', 'summon-elemental'], ['arcane-hand', 'cone-of-cold']) }),
  sc('warlock', 'genie', 'The Genie', TCE, 'Your patron is a noble genie.', [
    f(1, 'genies-vessel', "Genie's Vessel", "Your patron gives you a vessel (spellcasting focus). Bottled Respite: enter it for up to twice your proficiency bonus hours, once per long rest. Genie's Wrath: once per turn on an attack hit, +proficiency bonus damage of your genie's type.", {
      resource: res('bottled-respite', 'Bottled Respite', 1, 'long'),
      choices: [choice('kind', 'Genie kind', 'options', 1, { options: [
        { id: 'genie-dao', name: 'Dao (earth, bludgeoning)', grants: { spells: [{ spellId: 'sanctuary', mode: 'expanded-list' }, { spellId: 'spike-growth', mode: 'expanded-list' }, { spellId: 'meld-into-stone', mode: 'expanded-list' }, { spellId: 'stone-shape', mode: 'expanded-list' }, { spellId: 'wall-of-stone', mode: 'expanded-list' }] } },
        { id: 'genie-djinni', name: 'Djinni (air, thunder)', grants: { spells: [{ spellId: 'thunderwave', mode: 'expanded-list' }, { spellId: 'gust-of-wind', mode: 'expanded-list' }, { spellId: 'wind-wall', mode: 'expanded-list' }, { spellId: 'greater-invisibility', mode: 'expanded-list' }, { spellId: 'seeming', mode: 'expanded-list' }] } },
        { id: 'genie-efreeti', name: 'Efreeti (fire, fire)', grants: { spells: [{ spellId: 'burning-hands', mode: 'expanded-list' }, { spellId: 'scorching-ray', mode: 'expanded-list' }, { spellId: 'fireball', mode: 'expanded-list' }, { spellId: 'fire-shield', mode: 'expanded-list' }, { spellId: 'flame-strike', mode: 'expanded-list' }] } },
        { id: 'genie-marid', name: 'Marid (water, cold)', grants: { spells: [{ spellId: 'fog-cloud', mode: 'expanded-list' }, { spellId: 'blur', mode: 'expanded-list' }, { spellId: 'sleet-storm', mode: 'expanded-list' }, { spellId: 'control-water', mode: 'expanded-list' }, { spellId: 'cone-of-cold', mode: 'expanded-list' }] } },
      ] })],
      effects: [{ id: 'genies-wrath', name: "Genie's Wrath", trigger: 'on-hit', scope: 'all', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '{prof}', text: "damage of your genie's type" }] }],
    }),
    f(6, 'elemental-gift', 'Elemental Gift', "Resistance to your genie's damage type; bonus action to gain a 30-ft flying speed for 10 minutes, proficiency bonus times per long rest.", { resource: res('elemental-gift', 'Elemental Gift (flight)', 'prof', 'long'), choices: [choice('res', "Genie's damage type", 'damage-type', 1, { from: ['bludgeoning', 'thunder', 'fire', 'cold'] })], effects: [toggle('elemental-gift-fly', 'Elemental Gift flight', [mod('speed:fly', 30, { op: 'max' })])] }),
    f(10, 'sanctuary-vessel', 'Sanctuary Vessel', 'Bring up to five willing creatures into your vessel; those inside gain short-rest benefits in 10 minutes plus extra healing.'),
    f(14, 'limited-wish', 'Limited Wish', 'Action: duplicate any spell of 6th level or lower from any list without components. Once per 1d4 long rests.', { resource: res('limited-wish', 'Limited Wish', 1, 'manual') }),
  ], { spells: patronSpells(['detect-evil-and-good'], ['phantasmal-force'], ['create-food-and-water'], ['phantasmal-killer'], ['creation']) }),
  sc('warlock', 'undead', 'The Undead', { book: 'VRGtR', kind: 'summary' }, 'Your patron is a deathless being.', [
    f(1, 'form-of-dread', 'Form of Dread', 'Bonus action, 1 minute: gain 1d10 + warlock level temp HP, immunity to frightened, and once per turn on an attack hit the target makes a WIS save or is frightened. Proficiency bonus times per long rest.', {
      activation: 'bonus', resource: res('form-of-dread', 'Form of Dread', 'prof', 'long'),
      effects: [toggle('form-of-dread', 'Form of Dread', [grant('condition-immunity:frightened')], { outcomes: [{ kind: 'temp-hp', dice: '1d10+{cl}' }] }), { id: 'form-of-dread-fear', name: 'Form of Dread (fear)', trigger: 'on-hit', oncePerTurn: true, save: { ability: 'wis', dc: { kind: 'spell', classId: 'warlock' }, onFailure: [{ kind: 'condition', condition: 'frightened', duration: 'until end of your next turn' }] } }],
    }),
    f(6, 'grave-touched', 'Grave Touched', "You don't need to eat, drink, or breathe. Once per turn on an attack hit, change damage to necrotic; in Form of Dread, roll one extra damage die."),
    f(10, 'necrotic-husk', 'Necrotic Husk', 'Resistance to necrotic damage (immunity in Form of Dread). When reduced to 0 HP, explode to drop to 1 HP instead; once per 1d4 long rests.', { grants: { resistances: ['necrotic'] } }),
    f(14, 'spirit-projection', 'Spirit Projection', 'Action: project your spirit for up to 1 hour. Once per long rest.', { resource: res('spirit-projection', 'Spirit Projection', 1, 'long') }),
  ], { spells: patronSpells(['bane', 'false-life'], ['blindness-deafness', 'phantasmal-force'], ['phantom-steed', 'speak-with-dead'], ['death-ward', 'greater-invisibility'], ['antilife-shell', 'cloudkill']) }),
];

const savant = (school: string) => f(2, `${school}-savant`, `${school[0].toUpperCase() + school.slice(1)} Savant`, `The gold and time to copy ${school} spells into your spellbook is halved.`);

const wizard: SubclassDef[] = [
  sc('wizard', 'evocation', 'School of Evocation', SRD, T('subclass:evocation', 'You focus your study on magic that creates powerful elemental effects.'), [
    f(2, 'evocation-savant', 'Evocation Savant', T('evocation-savant')),
    f(2, 'sculpt-spells', 'Sculpt Spells', T('sculpt-spells')),
    f(6, 'potent-cantrip', 'Potent Cantrip', T('potent-cantrip')),
    f(10, 'empowered-evocation', 'Empowered Evocation', T('empowered-evocation'), { effects: [{ id: 'empowered-evocation', name: 'Empowered Evocation', manual: true, description: 'Add INT modifier to one damage roll of any wizard evocation spell.' }] }),
    f(14, 'overchannel', 'Overchannel', T('overchannel'), { manual: true }),
  ]),
  sc('wizard', 'abjuration', 'School of Abjuration', PHB, 'Magic that blocks, banishes, or protects.', [
    savant('abjuration'),
    f(2, 'arcane-ward', 'Arcane Ward', 'When you cast a 1st-level+ abjuration spell, create a ward with HP = 2 × wizard level + INT mod (once per long rest). It absorbs damage to you; casting abjuration spells restores 2 HP per spell level.', { resource: res('arcane-ward', 'Arcane Ward HP', '2 * cl + int', 'long', { pool: true }) }),
    f(6, 'projected-ward', 'Projected Ward', 'Reaction: your Arcane Ward absorbs damage dealt to a creature within 30 ft.', { activation: 'reaction' }),
    f(10, 'improved-abjuration', 'Improved Abjuration', 'Add your proficiency bonus to ability checks made as part of abjuration spells (counterspell, dispel magic).'),
    f(14, 'spell-resistance', 'Spell Resistance', 'Advantage on saves against spells; resistance to spell damage.', { effects: [eff('spell-resistance', [adv('save:all', 'against spells')])] }),
  ]),
  sc('wizard', 'conjuration', 'School of Conjuration', PHB, 'Magic that produces objects and creatures.', [
    savant('conjuration'),
    f(2, 'minor-conjuration', 'Minor Conjuration', 'Action: conjure a nonmagical object (up to 3 ft, 10 lb) for 1 hour.', { activation: 'action' }),
    f(6, 'benign-transposition', 'Benign Transposition', 'Action: teleport 30 ft or swap with a willing creature. Once per long rest or after casting a conjuration spell.', { resource: res('benign-transposition', 'Benign Transposition', 1, 'long') }),
    f(10, 'focused-conjuration', 'Focused Conjuration', 'Your concentration on conjuration spells can’t be broken by damage.'),
    f(14, 'durable-summons', 'Durable Summons', 'Creatures you summon with conjuration spells have 30 temp HP.'),
  ]),
  sc('wizard', 'divination', 'School of Divination', PHB, 'Magic that reveals the future and the hidden.', [
    savant('divination'),
    f(2, 'portent', 'Portent', 'After a long rest, roll two d20s (three at 14th). Replace any attack, check, or save by a creature you can see with one of these rolls.', { resource: res('portent', 'Portent dice', byLevel([[2, 2], [14, 3]]), 'long') }),
    f(6, 'expert-divination', 'Expert Divination', 'Casting a divination spell of 2nd level+ restores a slot of lower level (max 5th).'),
    f(10, 'the-third-eye', 'The Third Eye', 'Action: darkvision 60 ft, ethereal sight, greater comprehension, or see invisibility until your next rest. Once per short rest.', { resource: res('the-third-eye', 'The Third Eye', 1, 'short') }),
    f(14, 'greater-portent', 'Greater Portent', 'Roll three d20s for Portent.'),
  ]),
  sc('wizard', 'enchantment', 'School of Enchantment', PHB, 'Magic that entrances and beguiles.', [
    savant('enchantment'),
    f(2, 'hypnotic-gaze', 'Hypnotic Gaze', 'Action: a creature within 5 ft makes a WIS save or is charmed (incapacitated, speed 0) while you maintain it.', { activation: 'action' }),
    f(6, 'instinctive-charm', 'Instinctive Charm', 'Reaction: divert an attack against you to another creature (WIS save). Once per long rest per creature.', { activation: 'reaction' }),
    f(10, 'split-enchantment', 'Split Enchantment', 'Single-target enchantment spells of 1st level+ can target a second creature.'),
    f(14, 'alter-memories', 'Alter Memories', 'Make a charmed creature unaware it was charmed and forget up to 1 + CHA mod hours.'),
  ]),
  sc('wizard', 'illusion', 'School of Illusion', PHB, 'Magic that dazzles the senses.', [
    savant('illusion'),
    f(2, 'improved-minor-illusion', 'Improved Minor Illusion', 'You know minor illusion and can create both a sound and an image with one casting.', { grants: { spells: [{ spellId: 'minor-illusion', mode: 'always-prepared' }] } }),
    f(6, 'malleable-illusions', 'Malleable Illusions', 'Action: change the nature of an illusion of 1 minute+ duration.'),
    f(10, 'illusory-self', 'Illusory Self', 'Reaction: an illusory duplicate makes an attack against you miss. Once per short rest.', { activation: 'reaction', resource: res('illusory-self', 'Illusory Self', 1, 'short') }),
    f(14, 'illusory-reality', 'Illusory Reality', 'Bonus action: make one inanimate object in an illusion real for 1 minute.'),
  ]),
  sc('wizard', 'necromancy', 'School of Necromancy', PHB, 'Magic of life, death, and undeath.', [
    savant('necromancy'),
    f(2, 'grim-harvest', 'Grim Harvest', 'Once per turn when you kill a creature with a 1st-level+ spell, regain HP = twice the spell level (three times for necromancy).'),
    f(6, 'undead-thralls', 'Undead Thralls', 'Animate dead is in your spellbook; it affects one extra corpse; your undead gain HP = wizard level and add your proficiency bonus to damage.', { grants: { spells: [{ spellId: 'animate-dead', mode: 'always-prepared' }] } }),
    f(10, 'inured-to-undeath', 'Inured to Undeath', 'Resistance to necrotic damage; your HP maximum can’t be reduced.', { grants: { resistances: ['necrotic'] } }),
    f(14, 'command-undead', 'Command Undead', 'Action: an undead within 60 ft makes a CHA save or becomes your ally.'),
  ]),
  sc('wizard', 'transmutation', 'School of Transmutation', PHB, 'Magic that modifies energy and matter.', [
    savant('transmutation'),
    f(2, 'minor-alchemy', 'Minor Alchemy', 'Temporarily change an object of wood, stone, iron, copper, or silver into another of those materials.'),
    f(6, 'transmuters-stone', "Transmuter's Stone", 'Create a stone granting darkvision 60 ft, +10 ft speed, proficiency in CON saves, or resistance to acid, cold, fire, lightning, or thunder.', { choices: [choice('stone', 'Stone benefit (when carried)', 'options', 1, { options: [
      { id: 'stone-darkvision', name: 'Darkvision 60 ft', grants: { senses: { darkvision: 60 } } },
      { id: 'stone-speed', name: '+10 ft speed', effects: [eff('stone-speed', [mod('speed:walk', 10)])] },
      { id: 'stone-con', name: 'Proficiency in CON saves', grants: { saves: ['con'] } },
      { id: 'stone-acid', name: 'Resistance: acid', grants: { resistances: ['acid'] } },
      { id: 'stone-cold', name: 'Resistance: cold', grants: { resistances: ['cold'] } },
      { id: 'stone-fire', name: 'Resistance: fire', grants: { resistances: ['fire'] } },
      { id: 'stone-lightning', name: 'Resistance: lightning', grants: { resistances: ['lightning'] } },
      { id: 'stone-thunder', name: 'Resistance: thunder', grants: { resistances: ['thunder'] } },
    ] })] }),
    f(10, 'shapechanger', 'Shapechanger', 'Polymorph is in your spellbook; cast it on yourself without a slot (beast CR 1 or lower) once per short rest.', { resource: res('shapechanger', 'Shapechanger', 1, 'short'), grants: { spells: [{ spellId: 'polymorph', mode: 'always-prepared' }] } }),
    f(14, 'master-transmuter', 'Master Transmuter', 'Destroy your transmuter’s stone for a major transformation, restoration, panacea, or restore life.'),
  ]),
  sc('wizard', 'war-magic', 'War Magic', XGE, 'Wizards who blend evocation and abjuration for battle.', [
    f(2, 'arcane-deflection', 'Arcane Deflection', 'Reaction when hit or failing a save: +2 AC or +4 to the save; you can then cast only cantrips until the end of your next turn.', { activation: 'reaction' }),
    f(2, 'tactical-wit', 'Tactical Wit', 'Add your INT modifier to initiative rolls.', { effects: [eff('tactical-wit', [mod('initiative', 'int')])] }),
    f(6, 'power-surge', 'Power Surge', 'Store power surges (max INT mod); once per turn add half your wizard level as force damage to a spell. Gain one when you end a spell with dispel magic or counterspell.', { resource: res('power-surge', 'Power Surges', 'max(1, int)', 'long') }),
    f(10, 'durable-magic', 'Durable Magic', 'While concentrating on a spell, +2 AC and +2 to all saves.', { effects: [toggle('durable-magic', 'Concentrating (Durable Magic)', [mod('ac', 2), mod('save:all', 2)])] }),
    f(14, 'deflecting-shroud', 'Deflecting Shroud', 'When you use Arcane Deflection, up to three creatures within 60 ft take force damage equal to half your wizard level.'),
  ]),
  sc('wizard', 'bladesinging', 'Bladesinging', TCE, 'Wizards who weave swordplay and magic.', [
    f(2, 'training-in-war-and-song', 'Training in War and Song', 'Proficiency with light armor, one one-handed melee weapon, and Performance.', { grants: { armor: ['light'], skills: ['performance'] }, choices: [choice('weapon', 'One-handed melee weapon', 'options', 1, { options: ['dagger', 'handaxe', 'light-hammer', 'mace', 'sickle', 'spear', 'battleaxe', 'flail', 'longsword', 'morningstar', 'rapier', 'scimitar', 'shortsword', 'trident', 'war-pick', 'warhammer', 'whip'].map((w) => ({ id: `bs-${w}`, name: w.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), grants: { weapons: [w] } })) })] }),
    f(2, 'bladesong', 'Bladesong', 'Bonus action, 1 minute (no medium/heavy armor or shield): +INT mod to AC (min +1), +10 ft walking speed, advantage on Acrobatics, +INT mod to CON saves to maintain concentration. Proficiency bonus times per long rest.', {
      activation: 'bonus', resource: res('bladesong', 'Bladesong', 'prof', 'long'),
      effects: [toggle('bladesong', 'Bladesong', [
        mod('ac', 'max(1, int)', { requires: ['light-or-no-armor', 'no-shield'] }),
        mod('speed:walk', 10, { requires: ['light-or-no-armor', 'no-shield'] }),
        adv('skill:acrobatics', undefined, { requires: ['light-or-no-armor', 'no-shield'] }),
        mod('save:con', 'max(1, int)', { condition: 'to maintain concentration' }),
      ])],
    }),
    f(6, 'bladesinger-extra-attack', 'Extra Attack', 'Attack twice when you take the Attack action; one attack can be replaced with a cantrip.'),
    f(10, 'song-of-defense', 'Song of Defense', 'Reaction while Bladesong is active: expend a spell slot to reduce damage by 5 × slot level.', { activation: 'reaction' }),
    f(14, 'song-of-victory', 'Song of Victory', 'While Bladesong is active, add INT mod (min +1) to melee weapon damage.', { effects: [toggle('song-of-victory', 'Bladesong', [mod('damage', 'max(1, int)', { scope: 'melee-weapon' })], { toggleKey: 'bladesong' })] }),
  ]),
  sc('wizard', 'scribes', 'Order of Scribes', TCE, 'Wizards devoted to the spellbook itself.', [
    f(2, 'wizardly-quill', 'Wizardly Quill', 'Bonus action: create a magic quill; copying spells takes 2 minutes per level and no ink.'),
    f(2, 'awakened-spellbook', 'Awakened Spellbook', 'Your spellbook is a focus; swap a spell’s damage type for another from your book; cast a ritual at normal time once per long rest.', { resource: res('awakened-ritual', 'Awakened Spellbook (fast ritual)', 1, 'long') }),
    f(6, 'manifest-mind', 'Manifest Mind', 'Bonus action: manifest your spellbook’s mind within 60 ft; cast spells from its space proficiency bonus times per long rest.', { resource: res('manifest-mind', 'Manifest Mind', 'prof', 'long') }),
    f(10, 'master-scrivener', 'Master Scrivener', 'After a long rest, create a scroll of a 1st- or 2nd-level spell cast one level higher.'),
    f(14, 'one-with-the-word', 'One with the Word', 'Advantage on Arcana checks; reaction to have your spellbook take damage instead of you (spells temporarily lost).', { effects: [eff('one-with-the-word', [adv('skill:arcana')])] }),
  ]),
];

export const SUBCLASSES_3: SubclassDef[] = [...rogue, ...sorcerer, ...warlock, ...wizard];
export { SCAG };
