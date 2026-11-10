// 2024 subclasses. SRD 5.2 subclasses use SRD text; PHB 2024 subclasses are brief original summaries.
import type { FeatureDef, SubclassDef } from '@/types/content';
import subMeta from '../srd2024/subclasses.json';
import { SRD52, PHB24, featuresOf } from './helpers24';
import { mod, adv, grant, eff, toggle, choice, res, byLevel } from '../data/helpers';

type Blocks = [number, string[]][];
const prep = (b: Blocks) => b.map(([level, spells]) => ({ level, spells, mode: 'always-prepared' as const }));

function srdSub(id: string, classId: string, appId: string, overlay: Record<string, Partial<FeatureDef>>, spells?: Blocks): SubclassDef {
  const m = subMeta.find((s) => s.id === id)!;
  return { id: appId, classId, name: m.name, ruleset: 'dnd5e-2024', source: SRD52, description: m.description, features: featuresOf({ subclassId: id }, overlay), ...(spells ? { spells: prep(spells) } : {}) };
}

const F = (level: number, id: string, name: string, description: string, o: Partial<FeatureDef> = {}): FeatureDef => ({ id, name, level, description, source: PHB24, ...o });
function phb(classId: string, id: string, name: string, description: string, features: FeatureDef[], spells?: Blocks): SubclassDef {
  return { id, classId, name, ruleset: 'dnd5e-2024', source: PHB24, description, features, ...(spells ? { spells: prep(spells) } : {}) };
}

const LAND: Record<string, Blocks> = {
  arid: [[3, ['blur', 'burning-hands', 'fire-bolt']], [5, ['fireball']], [7, ['blight']], [9, ['wall-of-stone']]],
  polar: [[3, ['fog-cloud', 'hold-person', 'ray-of-frost']], [5, ['sleet-storm']], [7, ['ice-storm']], [9, ['cone-of-cold']]],
  temperate: [[3, ['misty-step', 'shocking-grasp', 'sleep']], [5, ['lightning-bolt']], [7, ['freedom-of-movement']], [9, ['tree-stride']]],
  tropical: [[3, ['acid-splash', 'ray-of-sickness', 'web']], [5, ['stinking-cloud']], [7, ['polymorph']], [9, ['insect-plague']]],
};

export const SUBCLASSES_2024: SubclassDef[] = [
  // ---------------------------------------------------------------- SRD 5.2
  srdSub('path-of-the-berserker', 'barbarian', 'berserker-2024', {
    'berserker-frenzy': { effects: [{ id: 'frenzy', name: 'Frenzy (while raging, Reckless)', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '{steps(cl,1,2,9,3,16,4)}d6', text: 'extra damage = Rage Damage bonus in d6s, first STR hit while Reckless' }] }] },
    'berserker-mindless-rage': { effects: [eff('mindless-rage', [grant('condition-immunity:charmed', { condition: 'while raging' }), grant('condition-immunity:frightened', { condition: 'while raging' })])] },
    'berserker-intimidating-presence': { resource: res('intimidating-presence', 'Intimidating Presence', 1, 'long') },
  }),
  srdSub('college-of-lore', 'bard', 'lore-2024', {
    'lore-bonus-proficiencies': { choices: [choice('skills', 'Three skills', 'skill', 3)] },
    'lore-cutting-words': { activation: 'reaction', usesResource: 'bardic-inspiration' },
    'lore-magical-discoveries': { choices: [choice('spells', 'Two spells (Cleric, Druid, or Wizard lists)', 'spell', 2, { spellFilter: { classes: ['cleric', 'druid', 'wizard'] }, spellMode: 'always-prepared' })] },
  }),
  srdSub('life-domain', 'cleric', 'life-2024', {
    'life-disciple-of-life': { effects: [{ id: 'disciple-of-life', name: 'Disciple of Life', manual: true, description: 'Healing spells with slots restore extra HP = 2 + slot level.' }] },
    'life-preserve-life': { usesResource: 'channel-divinity' },
    'life-domain-spells': {},
  }, [[3, ['aid', 'bless', 'cure-wounds', 'lesser-restoration']], [5, ['mass-healing-word', 'revivify']], [7, ['aura-of-life', 'death-ward']], [9, ['greater-restoration', 'mass-cure-wounds']]]),
  srdSub('circle-of-the-land', 'druid', 'land-2024', {
    'land-circle-of-the-land-spells': { choices: [choice('land', 'Land type (change on a long rest)', 'options', 1, { options: Object.entries(LAND).map(([k, b]) => ({ id: `land24-${k}`, name: k[0].toUpperCase() + k.slice(1), grants: { spells: b.flatMap(([lvl, ss]) => ss.map((spellId) => ({ spellId, mode: 'always-prepared' as const, minLevel: lvl }))) } })) })] },
    'land-lands-aid': { usesResource: 'wild-shape' },
    'land-natural-recovery': { resource: res('natural-recovery', 'Natural Recovery', 1, 'long') },
    'land-natures-ward': { grants: { conditionImmunities: ['poisoned'] }, choices: [choice('res', 'Resistance (by land type)', 'damage-type', 1, { from: ['fire', 'cold', 'lightning', 'poison'] })] },
  }),
  srdSub('champion', 'fighter', 'champion-2024', {
    'champion-improved-critical': { effects: [eff('improved-critical', [mod('crit-range', 19)])] },
    'champion-remarkable-athlete': { effects: [eff('remarkable-athlete-24', [adv('initiative'), adv('skill:athletics')])] },
    'champion-additional-fighting-style': { choices: [choice('style', 'Additional Fighting Style feat', 'feat', 1, { featCategories: ['fighting-style'] })] },
    'champion-superior-critical': { replaces: 'champion-improved-critical', effects: [eff('superior-critical', [mod('crit-range', 18)])] },
    'champion-survivor': { effects: [{ id: 'survivor-24', name: 'Survivor', manual: true, description: 'Advantage on death saves; at the start of each turn with ≤ half HP, regain 5 + CON mod HP.' }] },
  }),
  srdSub('warrior-of-the-open-hand', 'monk', 'open-hand-2024', {
    'open-hand-wholeness-of-body': { resource: res('wholeness-of-body', 'Wholeness of Body', 'max(1, wis)', 'long') },
    'open-hand-quivering-palm': { usesResource: 'focus' },
  }),
  srdSub('oath-of-devotion', 'paladin', 'devotion-2024', {
    'devotion-sacred-weapon': { usesResource: 'channel-divinity', effects: [toggle('sacred-weapon', 'Sacred Weapon', [mod('attack', 'max(1, cha)', { scope: 'weapon' })])] },
    'devotion-aura-of-devotion': { grants: { conditionImmunities: ['charmed'] } },
    'devotion-holy-nimbus': { resource: res('holy-nimbus', 'Holy Nimbus', 1, 'long') },
  }, [[3, ['protection-from-evil-and-good', 'shield-of-faith']], [5, ['aid', 'zone-of-truth']], [9, ['beacon-of-hope', 'dispel-magic']], [13, ['freedom-of-movement', 'guardian-of-faith']], [17, ['commune', 'flame-strike']]]),
  srdSub('hunter', 'ranger', 'hunter-2024', {
    'hunter-hunters-prey': { choices: [choice('prey', "Hunter's Prey (change on a rest)", 'options', 1, { options: [
      { id: 'colossus-slayer-24', name: 'Colossus Slayer', effects: [{ id: 'colossus-slayer', name: 'Colossus Slayer', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '1d8', text: 'if the target is missing any HP' }] }] },
      { id: 'horde-breaker-24', name: 'Horde Breaker', description: 'Once per turn, make another attack against a different creature within 5 ft of the original target.' },
    ] })] },
    'hunter-defensive-tactics': { choices: [choice('tactics', 'Defensive Tactics', 'options', 1, { options: [{ id: 'escape-horde-24', name: 'Escape the Horde', description: 'Opportunity attacks against you have Disadvantage.' }, { id: 'multiattack-defense-24', name: 'Multiattack Defense', description: 'After a creature hits you, its other attacks this turn have Disadvantage.' }] })] },
  }),
  srdSub('thief', 'rogue', 'thief-2024', {
    'thief-second-story-work': { grants: { speeds: { climb: 'walk' } } },
    'thief-supreme-sneak': { manual: true },
  }),
  srdSub('draconic-sorcery', 'sorcerer', 'draconic-2024', {
    'draconic-sorcery-draconic-resilience': { effects: [eff('draconic-resilience', [mod('hp-per-level', 1), mod('ac-formula', undefined, { acFormula: { label: 'Draconic Resilience (10 + DEX + CHA)', base: 10, abilities: ['dex', 'cha'], allowsArmor: false, allowsShield: true } })])] },
    'draconic-sorcery-elemental-affinity': { choices: [choice('type', 'Elemental Affinity (resistance)', 'damage-type', 1, { from: ['acid', 'cold', 'fire', 'lightning', 'poison'] })] },
    'draconic-sorcery-dragon-wings': { effects: [toggle('dragon-wings', 'Dragon Wings', [mod('speed:fly', 60, { op: 'max' })])], resource: res('dragon-wings', 'Dragon Wings', 1, 'long') },
  }, [[3, ['alter-self', 'chromatic-orb', 'command', 'dragons-breath']], [5, ['fear', 'fly']], [7, ['arcane-eye', 'charm-monster']], [9, ['legend-lore', 'summon-dragon']]]),
  srdSub('fiend-patron', 'warlock', 'fiend-2024', {
    'fiend-patron-dark-ones-blessing': { effects: [{ id: 'dark-ones-blessing', name: "Dark One's Blessing", manual: true, description: 'When a hostile creature within 10 ft drops to 0 HP, gain temp HP = CHA mod + warlock level (min 1).' }] },
    'fiend-patron-dark-ones-own-luck': { resource: res('dark-ones-own-luck', "Dark One's Own Luck", 'max(1, cha)', 'long') },
    'fiend-patron-fiendish-resilience': { choices: [choice('type', 'Fiendish Resilience (change on a rest)', 'damage-type', 1)] },
    'fiend-patron-hurl-through-hell': { resource: res('hurl-through-hell', 'Hurl Through Hell', 1, 'long') },
  }, [[3, ['burning-hands', 'command', 'scorching-ray', 'suggestion']], [5, ['fireball', 'stinking-cloud']], [7, ['fire-shield', 'wall-of-fire']], [9, ['geas', 'insect-plague']]]),
  srdSub('evoker', 'wizard', 'evoker-2024', {
    'evoker-empowered-evocation': { effects: [{ id: 'empowered-evocation', name: 'Empowered Evocation', manual: true, description: '+INT modifier to one damage roll of a Wizard evocation spell.' }] },
    'evoker-overchannel': { manual: true },
  }),

  // ---------------------------------------------------------------- PHB 2024 (summaries)
  phb('barbarian', 'wild-heart-2024', 'Path of the Wild Heart', 'Barbarians who draw on kinship with animals.', [
    F(3, 'wh-animal-speaker', 'Animal Speaker', 'Cast Beast Sense and Speak with Animals as rituals (WIS).', { grants: { spells: [{ spellId: 'speak-with-animals', mode: 'always-prepared', note: 'Ritual' }] } }),
    F(3, 'wh-rage-of-the-wilds', 'Rage of the Wilds', 'When you Rage choose Bear (resist all but force, necrotic, psychic, radiant), Eagle (Dash/Disengage as part of the Bonus Action) or Wolf (allies have Advantage vs enemies within 5 ft of you).'),
    F(6, 'wh-aspect-of-the-wilds', 'Aspect of the Wilds', 'Choose Owl (60 ft darkvision), Panther (climb speed), or Salmon (swim speed); change on a long rest.'),
    F(10, 'wh-nature-speaker', 'Nature Speaker', 'Cast Commune with Nature as a ritual.'),
    F(14, 'wh-power-of-the-wilds', 'Power of the Wilds', 'While raging choose Falcon (fly), Lion (enemies near you have Disadvantage vs others), or Ram (knock Large or smaller Prone on hit).'),
  ]),
  phb('barbarian', 'world-tree-2024', 'Path of the World Tree', 'Barbarians connected to the cosmic tree Yggdrasil.', [
    F(3, 'wt-vitality-of-the-tree', 'Vitality of the Tree', 'When you Rage gain temp HP equal to barbarian level; while raging, give an ally temp HP (d6s equal to Rage Damage) at the start of your turns.'),
    F(6, 'wt-branches-of-the-tree', 'Branches of the Tree', 'Reaction while raging: a creature within 30 ft makes a STR save or is teleported next to you and its speed becomes 0.', { activation: 'reaction' }),
    F(10, 'wt-battering-roots', 'Battering Roots', 'Your reach increases by 10 ft with Heavy or Versatile melee weapons; use Push or Topple in addition to another mastery.'),
    F(14, 'wt-travel-along-the-tree', 'Travel Along the Tree', 'When you Rage and as a Bonus Action while raging, teleport up to 60 ft; once per Rage teleport up to 150 ft with allies.'),
  ]),
  phb('barbarian', 'zealot-2024', 'Path of the Zealot', 'Barbarians fueled by divine fury.', [
    F(3, 'z-divine-fury', 'Divine Fury', 'While raging, the first creature you hit each turn takes extra 1d6 + half your barbarian level necrotic or radiant damage.', { effects: [{ id: 'divine-fury-24', name: 'Divine Fury', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '1d6+{floor(cl/2)}', text: 'necrotic or radiant, while raging' }] }] }),
    F(3, 'z-warrior-of-the-gods', 'Warrior of the Gods', 'A pool of d12s (4, growing with level) you can spend as a Bonus Action to heal yourself.', { resource: res('warrior-of-the-gods', 'Warrior of the Gods (d12s)', byLevel([[3, 4], [6, 5], [12, 6], [17, 7]]), 'long', { pool: true, die: 'd12' }) }),
    F(6, 'z-fanatical-focus', 'Fanatical Focus', 'Once per Rage, reroll a failed save with a bonus equal to your Rage Damage.'),
    F(10, 'z-zealous-presence', 'Zealous Presence', 'Bonus Action: up to 10 allies gain Advantage on attacks and saves until your next turn. Once per long rest (or spend a Rage).', { resource: res('zealous-presence', 'Zealous Presence', 1, 'long') }),
    F(14, 'z-rage-of-the-gods', 'Rage of the Gods', 'When you Rage, assume a divine form for 1 minute: fly, resist necrotic/psychic/radiant, revive allies by spending Rage uses. Once per long rest.', { resource: res('rage-of-the-gods', 'Rage of the Gods', 1, 'long') }),
  ]),
  phb('bard', 'dance-2024', 'College of Dance', 'Bards who weave magic through movement.', [
    F(3, 'dance-dazzling-footwork', 'Dazzling Footwork', 'While unarmored without a shield: Advantage on Performance, Unarmored Defense (10 + DEX + CHA), unarmed strikes use DEX and deal Bardic Inspiration die + DEX.', { effects: [eff('dance-unarmored', [mod('ac-formula', undefined, { acFormula: { label: 'Dazzling Footwork (10 + DEX + CHA)', base: 10, abilities: ['dex', 'cha'], allowsArmor: false, allowsShield: false } }), adv('skill:performance')])] }),
    F(6, 'dance-inspiring-movement', 'Inspiring Movement', 'Reaction, expend Bardic Inspiration: move half speed and let an ally move too, without provoking.', { usesResource: 'bardic-inspiration' }),
    F(6, 'dance-tandem-footwork', 'Tandem Footwork', 'When you roll Initiative, expend Bardic Inspiration to add the die to your and allies’ initiative.'),
    F(14, 'dance-leading-evasion', 'Leading Evasion', 'Evasion for you and creatures within 5 ft.'),
  ]),
  phb('bard', 'glamour-2024', 'College of Glamour', 'Bards touched by the Feywild.', [
    F(3, 'glam-beguiling-magic', 'Beguiling Magic', 'Always prepared Charm Person and Mirror Image; after casting enchantment/illusion spells, frighten or charm a creature (once per long rest, or spend Bardic Inspiration).', { grants: { spells: [{ spellId: 'charm-person', mode: 'always-prepared' }, { spellId: 'mirror-image', mode: 'always-prepared' }] } }),
    F(3, 'glam-mantle-of-inspiration', 'Mantle of Inspiration', 'Bonus Action, expend Bardic Inspiration: allies gain temp HP and can move without provoking.', { usesResource: 'bardic-inspiration' }),
    F(6, 'glam-mantle-of-majesty', 'Mantle of Majesty', 'Command always prepared; cast it as a Bonus Action each turn for 1 minute. Once per long rest.', { resource: res('mantle-of-majesty', 'Mantle of Majesty', 1, 'long'), grants: { spells: [{ spellId: 'command', mode: 'always-prepared' }] } }),
    F(14, 'glam-unbreakable-majesty', 'Unbreakable Majesty', 'Bonus Action: attackers must succeed on a CHA save or target someone else, 1 minute. Once per short rest.', { resource: res('unbreakable-majesty', 'Unbreakable Majesty', 1, 'short') }),
  ]),
  phb('bard', 'valor-2024', 'College of Valor', 'Daring skalds who inspire heroics.', [
    F(3, 'valor-combat-inspiration', 'Combat Inspiration', 'Bardic Inspiration can be added to AC against an attack or to weapon damage.'),
    F(3, 'valor-martial-training', 'Martial Training', 'Proficiency with Martial weapons, Medium armor and Shields; weapons can be a focus.', { grants: { weapons: ['martial'], armor: ['medium', 'shields'] } }),
    F(6, 'valor-extra-attack', 'Extra Attack', 'Attack twice; one attack can be replaced with a cantrip.'),
    F(14, 'valor-battle-magic', 'Battle Magic', 'After casting a spell with an action, make one weapon attack as a Bonus Action.'),
  ]),
  phb('cleric', 'light-2024', 'Light Domain', 'Clerics of light and truth.', [
    F(3, 'light-radiance-of-the-dawn', 'Radiance of the Dawn', 'Channel Divinity: dispel magical darkness; enemies within 30 ft make a CON save, taking 2d10 + cleric level radiant (half on success).', { usesResource: 'channel-divinity' }),
    F(3, 'light-warding-flare', 'Warding Flare', 'Reaction: impose Disadvantage on an attack against a creature within 30 ft. WIS mod times per long rest.', { activation: 'reaction', resource: res('warding-flare', 'Warding Flare', 'max(1, wis)', 'long') }),
    F(6, 'light-improved-warding-flare', 'Improved Warding Flare', 'Regain all Warding Flare uses on a short rest; the target also gains temp HP.'),
    F(17, 'light-corona-of-light', 'Corona of Light', 'Action: emit sunlight for 1 minute; enemies have Disadvantage on saves vs your fire/radiant spells. WIS mod times per long rest.', { resource: res('corona-of-light', 'Corona of Light', 'max(1, wis)', 'long') }),
  ], [[3, ['burning-hands', 'faerie-fire', 'scorching-ray', 'see-invisibility']], [5, ['daylight', 'fireball']], [7, ['arcane-eye', 'wall-of-fire']], [9, ['flame-strike', 'scrying']]]),
  phb('cleric', 'trickery-2024', 'Trickery Domain', 'Clerics of mischief and deception.', [
    F(3, 'trick-blessing-of-the-trickster', 'Blessing of the Trickster', 'Action: a creature gains Advantage on Stealth checks until your next long rest.'),
    F(3, 'trick-invoke-duplicity', 'Invoke Duplicity', 'Channel Divinity: create an illusory duplicate for 1 minute; cast spells from its space and gain Advantage on attacks against creatures near it.', { usesResource: 'channel-divinity' }),
    F(6, 'trick-tricksters-transposition', "Trickster's Transposition", 'When you move your duplicate, you can swap places with it.'),
    F(17, 'trick-improved-duplicity', 'Improved Duplicity', 'Allies also gain Advantage near the duplicate; it heals allies when it ends.'),
  ], [[3, ['charm-person', 'disguise-self', 'invisibility', 'pass-without-trace']], [5, ['hypnotic-pattern', 'nondetection']], [7, ['confusion', 'dimension-door']], [9, ['dominate-person', 'modify-memory']]]),
  phb('cleric', 'war-2024', 'War Domain', 'Clerics who champion battle.', [
    F(3, 'war-guided-strike', 'Guided Strike', 'Channel Divinity: +10 to a missed attack roll (yours or an ally’s within 30 ft).', { usesResource: 'channel-divinity' }),
    F(3, 'war-war-priest', 'War Priest', 'Bonus Action weapon attack or unarmed strike, WIS mod times per short rest.', { activation: 'bonus', resource: res('war-priest', 'War Priest', 'max(1, wis)', 'short') }),
    F(6, 'war-war-gods-blessing', "War God's Blessing", 'Cast Shield of Faith or Spiritual Weapon with Channel Divinity, without concentration.', { usesResource: 'channel-divinity' }),
    F(17, 'war-avatar-of-battle', 'Avatar of Battle', 'Resistance to bludgeoning, piercing, and slashing damage.', { grants: { resistances: ['bludgeoning', 'piercing', 'slashing'] } }),
  ], [[3, ['guiding-bolt', 'magic-weapon', 'shield-of-faith', 'spiritual-weapon']], [5, ['crusaders-mantle', 'spirit-guardians']], [7, ['fire-shield', 'freedom-of-movement']], [9, ['hold-monster', 'steel-wind-strike']]]),
  phb('druid', 'moon-2024', 'Circle of the Moon', 'Druids who take powerful beast forms.', [
    F(3, 'moon-circle-forms', 'Circle Forms', 'Wild Shape into beasts up to CR = druid level ÷ 3; AC = 13 + WIS (if higher); temp HP = 3 × druid level.'),
    F(3, 'moon-circle-of-the-moon-spells', 'Circle of the Moon Spells', 'Always-prepared moon spells; you can cast them while in Wild Shape.'),
    F(6, 'moon-improved-circle-forms', 'Improved Circle Forms', 'Beast attacks can deal radiant damage; add WIS to CON saves in Wild Shape.'),
    F(10, 'moon-moonlight-step', 'Moonlight Step', 'Bonus Action: teleport 30 ft and gain Advantage on your next attack. WIS mod times per long rest.', { resource: res('moonlight-step', 'Moonlight Step', 'max(1, wis)', 'long') }),
    F(14, 'moon-lunar-form', 'Lunar Form', 'Once per turn +2d10 radiant on a beast-form hit; Moonlight Step can bring an ally.'),
  ], [[3, ['cure-wounds', 'moonbeam', 'starry-wisp']], [5, ['conjure-animals']], [7, ['fount-of-moonlight']], [9, ['mass-cure-wounds']]]),
  phb('druid', 'sea-2024', 'Circle of the Sea', 'Druids who channel the ocean’s fury.', [
    F(3, 'sea-wrath-of-the-sea', 'Wrath of the Sea', 'Bonus Action, expend Wild Shape: 5-ft aura of ocean spray for 10 minutes; a creature in it makes a CON save or takes cold damage and is pushed.', { usesResource: 'wild-shape' }),
    F(6, 'sea-aquatic-affinity', 'Aquatic Affinity', 'Aura grows to 10 ft; swim speed equal to your speed.', { grants: { speeds: { swim: 'walk' } } }),
    F(10, 'sea-stormborn', 'Stormborn', 'While the aura is active: fly speed, resistance to cold, lightning, and thunder.'),
    F(14, 'sea-oceanic-gift', 'Oceanic Gift', 'Manifest the aura around an ally instead (or both, spending two uses).'),
  ], [[3, ['fog-cloud', 'gust-of-wind', 'ray-of-frost', 'shatter', 'thunderwave']], [5, ['lightning-bolt', 'water-breathing']], [7, ['control-water', 'ice-storm']], [9, ['conjure-elemental', 'hold-monster']]]),
  phb('druid', 'stars-2024', 'Circle of the Stars', 'Druids who draw on starlight.', [
    F(3, 'stars-star-map', 'Star Map', 'Guidance and Guiding Bolt always prepared; cast Guiding Bolt free WIS mod times per long rest.', { resource: res('star-map', 'Star Map (Guiding Bolt)', 'max(1, wis)', 'long'), grants: { spells: [{ spellId: 'guidance', mode: 'always-prepared' }, { spellId: 'guiding-bolt', mode: 'always-prepared' }] } }),
    F(3, 'stars-starry-form', 'Starry Form', 'Expend Wild Shape for a 10-minute constellation form: Archer, Chalice, or Dragon.', { usesResource: 'wild-shape', effects: [toggle('starry-form', 'Starry Form', [])] }),
    F(6, 'stars-cosmic-omen', 'Cosmic Omen', 'Reaction: add or subtract 1d6 from a roll (Weal/Woe). WIS mod times per long rest.', { resource: res('cosmic-omen', 'Cosmic Omen', 'max(1, wis)', 'long') }),
    F(10, 'stars-twinkling-constellations', 'Twinkling Constellations', 'Starry Form dice become 2d8; Dragon grants flight; change constellation each turn.'),
    F(14, 'stars-full-of-stars', 'Full of Stars', 'In Starry Form, resistance to bludgeoning, piercing, and slashing.', { effects: [toggle('full-of-stars-24', 'Starry Form', [grant('resistance:bludgeoning'), grant('resistance:piercing'), grant('resistance:slashing')], { toggleKey: 'starry-form' })] }),
  ]),
  phb('fighter', 'battle-master-2024', 'Battle Master', 'Masters of combat maneuvers.', [
    F(3, 'bm-combat-superiority', 'Combat Superiority', 'Learn 3 maneuvers (more later) fueled by four d8 Superiority Dice (more and larger later). DC = 8 + prof + STR or DEX.', {
      resource: res('superiority-dice', 'Superiority Dice', byLevel([[3, 4], [7, 5], [15, 6]]), 'short', { die: byLevel([[3, 8], [10, 10], [18, 12]]) }),
      choices: [choice('maneuvers', 'Maneuvers', 'options', byLevel([[3, 3], [7, 5], [10, 7], [15, 9]]), { pool: 'maneuvers' })],
    }),
    F(3, 'bm-student-of-war', 'Student of War', "Proficiency with one artisan's tool and one Fighter skill.", { choices: [choice('skill', 'Skill', 'skill', 1, { from: ['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'] })] }),
    F(7, 'bm-know-your-enemy', 'Know Your Enemy', 'Bonus Action: learn a creature’s immunities, resistances, and vulnerabilities. Once per long rest (or a Superiority Die).'),
    F(10, 'bm-improved-combat-superiority', 'Improved Combat Superiority', 'Superiority Dice become d10s.'),
    F(15, 'bm-relentless', 'Relentless', 'Once per turn, use a maneuver with a d8 instead of spending a die.'),
    F(18, 'bm-ultimate-combat-superiority', 'Ultimate Combat Superiority', 'Superiority Dice become d12s.'),
  ]),
  phb('fighter', 'eldritch-knight-2024', 'Eldritch Knight', 'Fighters who blend wizardry with weapons.', [
    F(3, 'ek24-spellcasting', 'Spellcasting', 'Cast Wizard spells using INT (third caster); learn Wizard cantrips and spells.'),
    F(3, 'ek24-war-bond', 'War Bond', 'Bond with two weapons; summon one to your hand as a Bonus Action.'),
    F(7, 'ek24-war-magic', 'War Magic', 'Replace one attack of the Attack action with a cantrip.'),
    F(10, 'ek24-eldritch-strike', 'Eldritch Strike', 'A creature you hit has Disadvantage on its next save against your spell.'),
    F(15, 'ek24-arcane-charge', 'Arcane Charge', 'Teleport up to 30 ft when you use Action Surge.'),
    F(18, 'ek24-improved-war-magic', 'Improved War Magic', 'Replace two attacks with a level 1 or 2 Wizard spell.'),
  ]),
  phb('fighter', 'psi-warrior-2024', 'Psi Warrior', 'Warriors who augment their might with psionics.', [
    F(3, 'psi24-psionic-power', 'Psionic Power', 'Psionic Energy Dice (d6; more and larger later): Protective Field, Psionic Strike (+die + INT force once per turn), Telekinetic Movement.', {
      resource: res('psionic-energy', 'Psionic Energy Dice', byLevel([[3, 4], [5, 6], [9, 8], [13, 10], [17, 12]]), 'long', { shortRestRecover: 1, die: byLevel([[3, 6], [5, 8], [11, 10], [17, 12]]) }),
      effects: [{ id: 'psionic-strike-24', name: 'Psionic Strike', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, consumes: { resourceId: 'psionic-energy', amount: 1 }, outcomes: [{ kind: 'damage', dice: '1d{steps(cl,3,6,5,8,11,10,17,12)}+{int}', damageType: 'force' }] }],
    }),
    F(7, 'psi24-telekinetic-adept', 'Telekinetic Adept', 'Psi-Powered Leap and Telekinetic Thrust.'),
    F(10, 'psi24-guarded-mind', 'Guarded Mind', 'Resistance to psychic damage; spend a die to end Charmed or Frightened.', { grants: { resistances: ['psychic'] } }),
    F(15, 'psi24-bulwark-of-force', 'Bulwark of Force', 'Bonus Action: grant Half Cover to creatures within 30 ft for 1 minute.'),
    F(18, 'psi24-telekinetic-master', 'Telekinetic Master', 'Telekinesis always prepared; attack as a Bonus Action while concentrating on it.', { grants: { spells: [{ spellId: 'telekinesis', mode: 'always-prepared' }] } }),
  ]),
  phb('monk', 'mercy-2024', 'Warrior of Mercy', 'Monks who manipulate life force to heal or harm.', [
    F(3, 'mercy24-hand-of-harm', 'Hand of Harm', 'Once per turn on an unarmed hit, spend 1 Focus: +Martial Arts die + WIS necrotic.', { effects: [{ id: 'hand-of-harm-24', name: 'Hand of Harm (1 Focus)', trigger: 'on-hit', scope: 'unarmed', oncePerTurn: true, consumes: { resourceId: 'focus', amount: 1 }, outcomes: [{ kind: 'damage', dice: '1d{steps(cl,1,6,5,8,11,10,17,12)}+{wis}', damageType: 'necrotic' }] }] }),
    F(3, 'mercy24-hand-of-healing', 'Hand of Healing', 'Magic action, 1 Focus: heal Martial Arts die + WIS; can replace a Flurry of Blows strike.', { usesResource: 'focus' }),
    F(3, 'mercy24-implements', 'Implements of Mercy', 'Proficiency in Insight, Medicine, and the Herbalism Kit.', { grants: { skills: ['insight', 'medicine'], tools: ['Herbalism Kit'] } }),
    F(6, 'mercy24-physicians-touch', "Physician's Touch", 'Hand of Healing ends conditions; Hand of Harm poisons.'),
    F(11, 'mercy24-flurry-of-healing-and-harm', 'Flurry of Healing and Harm', 'Use Hand of Healing/Harm with Flurry of Blows without Focus (WIS mod times per long rest).'),
    F(17, 'mercy24-hand-of-ultimate-mercy', 'Hand of Ultimate Mercy', '5 Focus: revive a creature dead up to 24 hours. Once per long rest.', { resource: res('hand-of-ultimate-mercy', 'Hand of Ultimate Mercy', 1, 'long') }),
  ]),
  phb('monk', 'shadow-2024', 'Warrior of Shadow', 'Monks who wield darkness.', [
    F(3, 'shadow24-shadow-arts', 'Shadow Arts', 'Cast Darkness with 1 Focus and see through it; darkvision 60 ft; know Minor Illusion.', { grants: { senses: { darkvision: 60 }, spells: [{ spellId: 'minor-illusion', mode: 'always-prepared' }, { spellId: 'darkness', mode: 'innate', note: '1 Focus' }] } }),
    F(6, 'shadow24-shadow-step', 'Shadow Step', 'Bonus Action: teleport 60 ft between dim light/darkness; Advantage on the next melee attack.'),
    F(11, 'shadow24-improved-shadow-step', 'Improved Shadow Step', 'Spend 1 Focus to Shadow Step anywhere and make an unarmed strike.'),
    F(17, 'shadow24-cloak-of-shadows', 'Cloak of Shadows', '3 Focus: become Invisible in dim light/darkness for 1 minute and move through creatures.'),
  ]),
  phb('monk', 'elements-2024', 'Warrior of the Elements', 'Monks who channel elemental power.', [
    F(3, 'elem24-elemental-attunement', 'Elemental Attunement', '1 Focus: 10 minutes of +10 ft reach and elemental damage with unarmed strikes, plus forced movement.', { usesResource: 'focus' }),
    F(3, 'elem24-manipulate-elements', 'Manipulate Elements', 'You know the Elementalism spell.', { grants: { spells: [{ spellId: 'elementalism', mode: 'always-prepared' }] } }),
    F(6, 'elem24-elemental-burst', 'Elemental Burst', '2 Focus: 20-ft sphere, DEX save, three Martial Arts dice of elemental damage.'),
    F(11, 'elem24-stride-of-the-elements', 'Stride of the Elements', 'While attuned, fly and swim speeds equal to your speed.'),
    F(17, 'elem24-elemental-epitome', 'Elemental Epitome', 'Resistance and extra elemental damage while attuned.'),
  ]),
  phb('paladin', 'ancients-2024', 'Oath of the Ancients', 'Paladins who preserve light and life.', [
    F(3, 'anc24-natures-wrath', "Nature's Wrath", 'Channel Divinity: creatures within 15 ft make a STR save or are Restrained for 1 minute.', { usesResource: 'channel-divinity' }),
    F(7, 'anc24-aura-of-warding', 'Aura of Warding', 'You and allies in your aura have resistance to necrotic, psychic, and radiant damage.', { grants: { resistances: ['necrotic', 'psychic', 'radiant'] } }),
    F(15, 'anc24-undying-sentinel', 'Undying Sentinel', 'When reduced to 0 HP, drop to HP = 3 × paladin level instead. Once per long rest.', { resource: res('undying-sentinel', 'Undying Sentinel', 1, 'long') }),
    F(20, 'anc24-elder-champion', 'Elder Champion', 'Bonus Action, 1 minute: regain 10 HP per turn, enemies have Disadvantage on saves vs your spells. Once per long rest.', { resource: res('elder-champion', 'Elder Champion', 1, 'long') }),
  ], [[3, ['ensnaring-strike', 'speak-with-animals']], [5, ['misty-step', 'moonbeam']], [9, ['plant-growth', 'protection-from-energy']], [13, ['ice-storm', 'stoneskin']], [17, ['commune-with-nature', 'tree-stride']]]),
  phb('paladin', 'glory-2024', 'Oath of Glory', 'Paladins destined for heroism.', [
    F(3, 'glory24-inspiring-smite', 'Inspiring Smite', 'Channel Divinity after Divine Smite: distribute 2d8 + paladin level temp HP.', { usesResource: 'channel-divinity' }),
    F(3, 'glory24-peerless-athlete', 'Peerless Athlete', 'Channel Divinity: 1 hour of Advantage on Athletics and Acrobatics and longer jumps.', { usesResource: 'channel-divinity', effects: [toggle('peerless-athlete-24', 'Peerless Athlete', [adv('skill:athletics'), adv('skill:acrobatics')])] }),
    F(7, 'glory24-aura-of-alacrity', 'Aura of Alacrity', '+10 ft speed; allies starting in your aura gain it too.', { effects: [eff('aura-of-alacrity-24', [mod('speed:walk', 10)])] }),
    F(15, 'glory24-glorious-defense', 'Glorious Defense', 'Reaction: add CHA mod to AC of a creature in your aura; attack back if it misses. CHA mod times per long rest.', { resource: res('glorious-defense', 'Glorious Defense', 'max(1, cha)', 'long') }),
    F(20, 'glory24-living-legend', 'Living Legend', 'Bonus Action, 10 minutes: Advantage on CHA checks, turn a miss into a hit once per turn, reroll failed saves. Once per long rest.', { resource: res('living-legend', 'Living Legend', 1, 'long') }),
  ], [[3, ['guiding-bolt', 'heroism']], [5, ['enhance-ability', 'magic-weapon']], [9, ['haste', 'protection-from-energy']], [13, ['compulsion', 'freedom-of-movement']], [17, ['legend-lore', 'yolandes-regal-presence']]]),
  phb('paladin', 'vengeance-2024', 'Oath of Vengeance', 'Paladins sworn to punish evil.', [
    F(3, 'veng24-vow-of-enmity', 'Vow of Enmity', 'Channel Divinity with the Attack action: Advantage on attacks against one creature for 1 minute.', { usesResource: 'channel-divinity', effects: [toggle('vow-of-enmity-24', 'Vow of Enmity', [adv('attack', 'against the vowed creature')])] }),
    F(7, 'veng24-relentless-avenger', 'Relentless Avenger', 'After an opportunity attack hit, reduce the target’s speed to 0 and move half speed.'),
    F(15, 'veng24-soul-of-vengeance', 'Soul of Vengeance', 'Reaction: attack the target of your Vow when it attacks.'),
    F(20, 'veng24-avenging-angel', 'Avenging Angel', 'Bonus Action, 10 minutes: fly 60 ft and frightening aura. Once per long rest.', { resource: res('avenging-angel', 'Avenging Angel', 1, 'long') }),
  ], [[3, ['bane', 'hunters-mark']], [5, ['hold-person', 'misty-step']], [9, ['haste', 'protection-from-energy']], [13, ['banishment', 'dimension-door']], [17, ['hold-monster', 'scrying']]]),
  phb('ranger', 'beast-master-2024', 'Beast Master', 'Rangers bonded with a primal beast.', [
    F(3, 'bm24-primal-companion', 'Primal Companion', 'Summon a Beast of the Land, Sea, or Sky that acts on your turn; command it with a Bonus Action.', { manual: true }),
    F(7, 'bm24-exceptional-training', 'Exceptional Training', 'Your beast can Dash, Disengage, Dodge, or Help as a Bonus Action; its attacks can deal force damage.'),
    F(11, 'bm24-bestial-fury', 'Bestial Fury', 'Your beast attacks twice; its first hit on your Hunter’s Mark target deals extra force damage.'),
    F(15, 'bm24-share-spells', 'Share Spells', 'Self-targeted spells can also affect your beast.'),
  ]),
  phb('ranger', 'fey-wanderer-2024', 'Fey Wanderer', 'Rangers touched by the Feywild.', [
    F(3, 'fw24-dreadful-strikes', 'Dreadful Strikes', 'Once per turn, a weapon hit deals +1d4 psychic (1d6 at 11th).', { effects: [{ id: 'dreadful-strikes-24', name: 'Dreadful Strikes', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '1d{steps(cl,3,4,11,6)}', damageType: 'psychic' }] }] }),
    F(3, 'fw24-otherworldly-glamour', 'Otherworldly Glamour', 'Add WIS mod (min +1) to CHA checks; one skill among Deception, Performance, Persuasion.', { effects: [eff('otherworldly-glamour-24', [mod('check:cha', 'max(1, wis)')])], choices: [choice('skill', 'Skill', 'skill', 1, { from: ['deception', 'performance', 'persuasion'] })] }),
    F(7, 'fw24-beguiling-twist', 'Beguiling Twist', 'Advantage on saves vs Charmed/Frightened; redirect such effects.', { effects: [eff('beguiling-twist-24', [adv('save:all', 'against being charmed or frightened')])] }),
    F(11, 'fw24-fey-reinforcements', 'Fey Reinforcements', 'Summon Fey always prepared; cast it free once per long rest.', { resource: res('fey-reinforcements', 'Fey Reinforcements', 1, 'long'), grants: { spells: [{ spellId: 'summon-fey', mode: 'always-prepared' }] } }),
    F(15, 'fw24-misty-wanderer', 'Misty Wanderer', 'Cast Misty Step free WIS mod times per long rest, bringing an ally.', { resource: res('misty-wanderer', 'Misty Wanderer', 'max(1, wis)', 'long') }),
  ], [[3, ['charm-person']], [5, ['misty-step']], [9, ['summon-fey']], [13, ['dimension-door']], [17, ['mislead']]]),
  phb('ranger', 'gloom-stalker-2024', 'Gloom Stalker', 'Rangers at home in darkness.', [
    F(3, 'gs24-dread-ambusher', 'Dread Ambusher', '+WIS to initiative; +10 ft speed on your first turn; once per turn +2d6 psychic on a hit (WIS mod times per long rest).', { effects: [eff('dread-ambusher-24', [mod('initiative', 'wis')])], resource: res('dread-ambusher', 'Dreadful Strike', 'max(1, wis)', 'long') }),
    F(3, 'gs24-umbral-sight', 'Umbral Sight', 'Darkvision 60 ft (or +60); invisible to darkvision while in darkness.', { grants: { senses: { darkvision: 60 } } }),
    F(7, 'gs24-iron-mind', 'Iron Mind', 'Proficiency in WIS saves (or INT/CHA if you already have it).', { grants: { saves: ['wis'] } }),
    F(11, 'gs24-stalkers-flurry', "Stalker's Flurry", 'Dreadful Strike adds Sudden Strike or Mass Fear.'),
    F(15, 'gs24-shadowy-dodge', 'Shadowy Dodge', 'Reaction: impose Disadvantage on an attack and teleport 30 ft.', { activation: 'reaction' }),
  ], [[3, ['disguise-self']], [5, ['rope-trick']], [9, ['fear']], [13, ['greater-invisibility']], [17, ['seeming']]]),
  phb('rogue', 'arcane-trickster-2024', 'Arcane Trickster', 'Rogues who enhance their craft with arcane magic.', [
    F(3, 'at24-spellcasting', 'Spellcasting', 'Cast Wizard spells using INT (third caster); you know Mage Hand.', { grants: { spells: [{ spellId: 'mage-hand', mode: 'always-prepared', ability: 'int' }] } }),
    F(3, 'at24-mage-hand-legerdemain', 'Mage Hand Legerdemain', 'Invisible Mage Hand that can steal, pick locks, and disarm traps; control it with Cunning Action.'),
    F(9, 'at24-magical-ambush', 'Magical Ambush', 'Spells cast while Invisible impose Disadvantage on the target’s save.'),
    F(13, 'at24-versatile-trickster', 'Versatile Trickster', 'Use Cunning Strike’s Trip through your Mage Hand.'),
    F(17, 'at24-spell-thief', 'Spell Thief', 'Reaction: steal a spell targeting you. Once per long rest.', { resource: res('spell-thief', 'Spell Thief', 1, 'long') }),
  ]),
  phb('rogue', 'assassin-2024', 'Assassin', 'Rogues trained in the art of death.', [
    F(3, 'as24-assassinate', 'Assassinate', 'Advantage on Initiative; Advantage on attacks vs creatures that haven’t acted; +rogue level damage on your first-round Sneak Attack.', { effects: [eff('assassinate-24', [adv('initiative'), adv('attack', 'against creatures that have not taken a turn yet')])] }),
    F(3, 'as24-assassins-tools', "Assassin's Tools", "Proficiency with the Disguise Kit and Poisoner's Kit.", { grants: { tools: ['Disguise Kit', "Poisoner's Kit"] } }),
    F(9, 'as24-infiltration-expertise', 'Infiltration Expertise', 'Masterful mimicry; Steady Aim doesn’t reduce your speed.'),
    F(13, 'as24-envenom-weapons', 'Envenom Weapons', 'Poison from Cunning Strike deals extra 2d6 poison ignoring resistance.'),
    F(17, 'as24-death-strike', 'Death Strike', 'On first-round Sneak Attack hits, the target makes a CON save or takes double damage.'),
  ]),
  phb('rogue', 'soulknife-2024', 'Soulknife', 'Rogues who manifest psychic blades.', [
    F(3, 'sk24-psionic-power', 'Psionic Power', 'Psionic Energy Dice (d6; more and larger later): Psi-Bolstered Knack and Psychic Whispers.', { resource: res('psionic-energy', 'Psionic Energy Dice', byLevel([[3, 4], [5, 6], [9, 8], [13, 10], [17, 12]]), 'long', { shortRestRecover: 1, die: byLevel([[3, 6], [5, 8], [11, 10], [17, 12]]) }) }),
    F(3, 'sk24-psychic-blades', 'Psychic Blades', 'Manifest psychic blades (1d6 psychic, finesse, thrown 60 ft; second blade 1d4 as a Bonus Action). Vex mastery.', { manual: true }),
    F(9, 'sk24-soul-blades', 'Soul Blades', 'Homing Strikes and Psychic Teleportation.'),
    F(13, 'sk24-psychic-veil', 'Psychic Veil', 'Become Invisible for 1 hour. Once per long rest (or spend a die).', { resource: res('psychic-veil', 'Psychic Veil', 1, 'long') }),
    F(17, 'sk24-rend-mind', 'Rend Mind', 'On a Sneak Attack with a blade, WIS save or Stunned for 1 minute. Once per long rest.', { resource: res('rend-mind', 'Rend Mind', 1, 'long') }),
  ]),
  phb('sorcerer', 'aberrant-2024', 'Aberrant Sorcery', 'Your power stems from an alien influence.', [
    F(3, 'ab24-psionic-spells', 'Psionic Spells', 'Always-prepared psionic spells.'),
    F(3, 'ab24-telepathic-speech', 'Telepathic Speech', 'Form a telepathic link with a creature.'),
    F(6, 'ab24-psionic-sorcery', 'Psionic Sorcery', 'Cast Psionic Spells with Sorcery Points, without components.', { usesResource: 'sorcery-points' }),
    F(6, 'ab24-psychic-defenses', 'Psychic Defenses', 'Resistance to psychic damage; Advantage on saves vs Charmed/Frightened.', { grants: { resistances: ['psychic'] }, effects: [eff('psychic-defenses-24', [adv('save:all', 'against being charmed or frightened')])] }),
    F(14, 'ab24-revelation-in-flesh', 'Revelation in Flesh', 'Spend Sorcery Points for flight, swimming, see invisible, or squeezing.'),
    F(18, 'ab24-warping-implosion', 'Warping Implosion', 'Teleport and pull creatures (3d10 force). Once per long rest.', { resource: res('warping-implosion', 'Warping Implosion', 1, 'long') }),
  ], [[3, ['arms-of-hadar', 'calm-emotions', 'detect-thoughts', 'dissonant-whispers', 'mind-sliver']], [5, ['hunger-of-hadar', 'sending']], [7, ['black-tentacles', 'summon-aberration']], [9, ['telepathic-bond', 'telekinesis']]]),
  phb('sorcerer', 'clockwork-2024', 'Clockwork Sorcery', 'Your magic is the cosmic force of order.', [
    F(3, 'cw24-clockwork-spells', 'Clockwork Spells', 'Always-prepared order spells.'),
    F(3, 'cw24-restore-balance', 'Restore Balance', 'Reaction: cancel Advantage or Disadvantage within 60 ft. CHA mod times per long rest.', { resource: res('restore-balance', 'Restore Balance', 'max(1, cha)', 'long') }),
    F(6, 'cw24-bastion-of-law', 'Bastion of Law', 'Spend Sorcery Points to create a damage-absorbing ward of d8s.', { usesResource: 'sorcery-points' }),
    F(14, 'cw24-trance-of-order', 'Trance of Order', 'Bonus Action, 1 minute: attacks against you can’t have Advantage; treat d20 rolls of 9 or lower as 10. Once per long rest.', { resource: res('trance-of-order', 'Trance of Order', 1, 'long') }),
    F(18, 'cw24-clockwork-cavalcade', 'Clockwork Cavalcade', 'Restore up to 100 HP, repair objects, end spells. Once per long rest.', { resource: res('clockwork-cavalcade', 'Clockwork Cavalcade', 1, 'long') }),
  ], [[3, ['aid', 'alarm', 'lesser-restoration', 'protection-from-evil-and-good']], [5, ['dispel-magic', 'protection-from-energy']], [7, ['freedom-of-movement', 'summon-construct']], [9, ['greater-restoration', 'wall-of-force']]]),
  phb('sorcerer', 'wild-magic-2024', 'Wild Magic Sorcery', 'Your magic springs from chaos.', [
    F(3, 'wm24-wild-magic-surge', 'Wild Magic Surge', 'Once per turn after casting a sorcerer spell, roll a d20; on a 20, roll on the Wild Magic Surge table.', { manual: true }),
    F(3, 'wm24-tides-of-chaos', 'Tides of Chaos', 'Gain Advantage on one d20 test; regain on a long rest or a Wild Magic Surge.', { resource: res('tides-of-chaos', 'Tides of Chaos', 1, 'long') }),
    F(6, 'wm24-bend-luck', 'Bend Luck', 'Reaction, 1 Sorcery Point: add or subtract 1d4 from another creature’s d20 roll.', { usesResource: 'sorcery-points' }),
    F(14, 'wm24-controlled-chaos', 'Controlled Chaos', 'Roll twice on the Wild Magic Surge table and choose.'),
    F(18, 'wm24-tamed-surge', 'Tamed Surge', 'After casting a spell with a slot, choose a surge effect. Once per long rest.', { resource: res('tamed-surge', 'Tamed Surge', 1, 'long') }),
  ]),
  phb('warlock', 'archfey-2024', 'Archfey Patron', 'Your patron is a lord or lady of the fey.', [
    F(3, 'af24-steps-of-the-fey', 'Steps of the Fey', 'Cast Misty Step free CHA mod times per long rest, adding Refreshing or Taunting Step.', { resource: res('steps-of-the-fey', 'Steps of the Fey', 'max(1, cha)', 'long') }),
    F(6, 'af24-misty-escape', 'Misty Escape', 'Reaction when damaged: cast Misty Step, with Disappearing or Dreadful Step.'),
    F(10, 'af24-beguiling-defenses', 'Beguiling Defenses', 'Immune to Charmed; reaction to reflect damage once per long rest.', { grants: { conditionImmunities: ['charmed'] } }),
    F(14, 'af24-bewitching-magic', 'Bewitching Magic', 'After casting an enchantment or illusion spell with a slot, cast Misty Step free.'),
  ], [[3, ['calm-emotions', 'faerie-fire', 'misty-step', 'sleep']], [5, ['blink', 'plant-growth']], [7, ['dominate-beast', 'greater-invisibility']], [9, ['dominate-person', 'seeming']]]),
  phb('warlock', 'celestial-2024', 'Celestial Patron', 'Your patron is a being of the Upper Planes.', [
    F(3, 'cel24-healing-light', 'Healing Light', 'Pool of d6s (1 + warlock level); Bonus Action to heal by spending up to CHA mod dice.', { resource: res('healing-light', 'Healing Light (d6s)', '1 + cl', 'long', { pool: true, die: 'd6' }) }),
    F(6, 'cel24-radiant-soul', 'Radiant Soul', 'Resistance to radiant; +CHA to one fire/radiant spell damage roll.', { grants: { resistances: ['radiant'] } }),
    F(10, 'cel24-celestial-resilience', 'Celestial Resilience', 'Temp HP for you and allies after Magical Cunning or a rest.'),
    F(14, 'cel24-searing-vengeance', 'Searing Vengeance', 'When you or an ally makes a death save, restore half HP and blind enemies. Once per long rest.', { resource: res('searing-vengeance', 'Searing Vengeance', 1, 'long') }),
  ], [[3, ['aid', 'cure-wounds', 'guiding-bolt', 'lesser-restoration', 'light', 'sacred-flame']], [5, ['daylight', 'revivify']], [7, ['guardian-of-faith', 'wall-of-fire']], [9, ['greater-restoration', 'summon-celestial']]]),
  phb('warlock', 'great-old-one-2024', 'Great Old One Patron', 'Your patron is an alien entity.', [
    F(3, 'goo24-awakened-mind', 'Awakened Mind', 'Telepathic link with a creature within 30 ft (then up to miles away).'),
    F(3, 'goo24-psychic-spells', 'Psychic Spells', 'Your Warlock enchantment/illusion spells can deal psychic damage and need no V/S components.'),
    F(6, 'goo24-clairvoyant-combatant', 'Clairvoyant Combatant', 'Through your link, impose Disadvantage on the creature’s attacks and gain Advantage against it. Once per short rest.', { resource: res('clairvoyant-combatant', 'Clairvoyant Combatant', 1, 'short') }),
    F(10, 'goo24-eldritch-hex', 'Eldritch Hex', 'Hex also gives Disadvantage on a chosen ability’s saves.'),
    F(10, 'goo24-thought-shield', 'Thought Shield', 'Thoughts can’t be read; resistance to psychic and reflect psychic damage.', { grants: { resistances: ['psychic'] } }),
    F(14, 'goo24-create-thrall', 'Create Thrall', 'Summon Aberration becomes a loyal thrall with temp HP.'),
  ], [[3, ['detect-thoughts', 'dissonant-whispers', 'phantasmal-force', 'hideous-laughter']], [5, ['clairvoyance', 'hunger-of-hadar']], [7, ['confusion', 'summon-aberration']], [9, ['modify-memory', 'telekinesis']]]),
  phb('wizard', 'abjurer-2024', 'Abjurer', 'Wizards who protect and banish.', [
    F(3, 'abj24-abjuration-savant', 'Abjuration Savant', 'Add two Abjuration spells to your spellbook for free (and one more each spell level gained).'),
    F(3, 'abj24-arcane-ward', 'Arcane Ward', 'Casting an abjuration spell creates a ward with HP = 2 × wizard level + INT mod.', { resource: res('arcane-ward', 'Arcane Ward HP', '2 * cl + int', 'long', { pool: true }) }),
    F(6, 'abj24-projected-ward', 'Projected Ward', 'Reaction: your ward absorbs damage for a creature within 30 ft.', { activation: 'reaction' }),
    F(10, 'abj24-spell-breaker', 'Spell Breaker', 'Counterspell and Dispel Magic always prepared; add proficiency to their checks.', { grants: { spells: [{ spellId: 'counterspell', mode: 'always-prepared' }, { spellId: 'dispel-magic', mode: 'always-prepared' }] } }),
    F(14, 'abj24-spell-resistance', 'Spell Resistance', 'Advantage on saves against spells; resistance to spell damage.', { effects: [eff('spell-resistance-24', [adv('save:all', 'against spells')])] }),
  ]),
  phb('wizard', 'diviner-2024', 'Diviner', 'Wizards who peer into the future.', [
    F(3, 'div24-divination-savant', 'Divination Savant', 'Add two Divination spells to your spellbook for free.'),
    F(3, 'div24-portent', 'Portent', 'After a long rest, roll two d20s (three at 14th) to replace d20 tests you can see.', { resource: res('portent', 'Portent dice', byLevel([[3, 2], [14, 3]]), 'long') }),
    F(6, 'div24-expert-divination', 'Expert Divination', 'Casting a Divination spell with a slot of 2nd+ restores a lower-level slot.'),
    F(10, 'div24-the-third-eye', 'The Third Eye', 'Bonus Action: darkvision, see invisibility, or read any language until your next rest. Once per short rest.', { resource: res('the-third-eye', 'The Third Eye', 1, 'short') }),
    F(14, 'div24-greater-portent', 'Greater Portent', 'Roll three d20s for Portent.'),
  ]),
  phb('wizard', 'illusionist-2024', 'Illusionist', 'Wizards who weave convincing illusions.', [
    F(3, 'ill24-illusion-savant', 'Illusion Savant', 'Add two Illusion spells to your spellbook for free.'),
    F(3, 'ill24-improved-illusions', 'Improved Illusions', 'Cast illusions without V components, +60 ft range; Minor Illusion as a Bonus Action with sound and image.', { grants: { spells: [{ spellId: 'minor-illusion', mode: 'always-prepared' }] } }),
    F(6, 'ill24-phantasmal-creatures', 'Phantasmal Creatures', 'Summon Beast and Summon Fey always prepared; cast them as illusions once per long rest free.', { resource: res('phantasmal-creatures', 'Phantasmal Creatures', 1, 'long') }),
    F(10, 'ill24-illusory-self', 'Illusory Self', 'Reaction: an attack against you misses. Once per short rest (or a 2nd-level slot).', { resource: res('illusory-self', 'Illusory Self', 1, 'short') }),
    F(14, 'ill24-illusory-reality', 'Illusory Reality', 'Make one object in your illusion real for 1 minute.'),
  ]),
];
