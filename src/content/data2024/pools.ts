// 2024 option pools. Weapon Mastery options are generated from the SRD 5.2 weapon list.
import type { ChoiceOption, ItemDefinition, OptionPool } from '@/types/content';
import items from '../srd2024/items.json';
import { T24 } from './helpers24';
import { POOLS } from '../data/pools';
import { adv, eff, mod } from '../data/helpers';

const weapons = (items as unknown as ItemDefinition[]).filter((i) => i.weapon && !i.magical && i.weapon.mastery);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const WEAPON_MASTERY: ChoiceOption[] = weapons.map((w) => ({ id: `wm-${w.id}`, name: `${w.name} (${cap(w.weapon!.mastery!)})`, description: T24(`mastery:${w.weapon!.mastery}`) }));

const inv = (id: string, name: string, description: string, extra: Partial<ChoiceOption> = {}): ChoiceOption => ({ id: `inv24-${id}`, name, description, ...extra });
const INVOCATIONS_2024: ChoiceOption[] = [
  inv('pact-of-the-blade', 'Pact of the Blade', 'Bonus Action: conjure or bond a pact weapon; you are proficient, it can deal necrotic/psychic/radiant damage, and you can use CHA for its attacks.', { grants: { weapons: ['pact weapon'] } }),
  inv('pact-of-the-chain', 'Pact of the Chain', 'Find Familiar always prepared (special forms available); cast it as a Magic action without a slot.', { grants: { spells: [{ spellId: 'find-familiar', mode: 'always-prepared' }] } }),
  inv('pact-of-the-tome', 'Pact of the Tome', 'A Book of Shadows with three cantrips and two level 1 ritual spells from any class; it is your focus.'),
  inv('agonizing-blast', 'Agonizing Blast', 'Add CHA modifier to the damage of a chosen Warlock damaging cantrip (repeatable).', { prerequisite: { level: 2 }, effects: [eff('inv24-agonizing', [], { manual: true, description: '+CHA modifier to the chosen cantrip’s damage.' })] }),
  inv('armor-of-shadows', 'Armor of Shadows', 'Cast Mage Armor on yourself without a slot.', { grants: { spells: [{ spellId: 'mage-armor', mode: 'innate' }] } }),
  inv('ascendant-step', 'Ascendant Step', 'Cast Levitate on yourself without a slot.', { prerequisite: { level: 5 }, grants: { spells: [{ spellId: 'levitate', mode: 'innate' }] } }),
  inv('devils-sight', "Devil's Sight", 'See normally in magical and nonmagical darkness within 120 ft.', { prerequisite: { level: 2 }, grants: { senses: { "devil's sight": 120 } } }),
  inv('devouring-blade', 'Devouring Blade', 'Thirsting Blade grants two extra attacks.', { prerequisite: { level: 12, text: 'Thirsting Blade' } }),
  inv('eldritch-mind', 'Eldritch Mind', 'Advantage on CON saves to maintain Concentration.', { effects: [eff('inv24-eldritch-mind', [adv('save:con', 'to maintain Concentration')])] }),
  inv('eldritch-smite', 'Eldritch Smite', 'Once per turn on a pact-weapon hit, expend a Pact Magic slot: +1d8 force plus 1d8 per slot level, and knock Huge or smaller Prone.', { prerequisite: { level: 5, text: 'Pact of the Blade' } }),
  inv('eldritch-spear', 'Eldritch Spear', 'A chosen damaging cantrip’s range increases by 30 ft × warlock level.', { prerequisite: { level: 2 } }),
  inv('fiendish-vigor', 'Fiendish Vigor', 'Cast False Life on yourself without a slot (max temp HP).', { prerequisite: { level: 2 }, grants: { spells: [{ spellId: 'false-life', mode: 'innate' }] } }),
  inv('gaze-of-two-minds', 'Gaze of Two Minds', 'Perceive through a willing creature’s senses and cast spells as if from its space.', { prerequisite: { level: 5 } }),
  inv('gift-of-the-depths', 'Gift of the Depths', 'Breathe underwater, swim speed equal to your speed; Water Breathing once per long rest.', { prerequisite: { level: 5 }, grants: { speeds: { swim: 'walk' } } }),
  inv('gift-of-the-protectors', 'Gift of the Protectors', 'Creatures written in your Book of Shadows drop to 1 HP instead of 0 once per long rest.', { prerequisite: { level: 9, text: 'Pact of the Tome' } }),
  inv('investment-of-the-chain-master', 'Investment of the Chain Master', 'Your familiar gains flying/swimming speed, a Bonus Action attack, your save DC, and resistance via your reaction.', { prerequisite: { level: 5, text: 'Pact of the Chain' } }),
  inv('lessons-of-the-first-ones', 'Lessons of the First Ones', 'Gain one Origin feat of your choice (repeatable).', { prerequisite: { level: 2 } }),
  inv('lifedrinker', 'Lifedrinker', 'Pact-weapon hits deal +1d6 necrotic/psychic/radiant and let you spend a Hit Die to heal.', { prerequisite: { level: 9, text: 'Pact of the Blade' } }),
  inv('mask-of-many-faces', 'Mask of Many Faces', 'Cast Disguise Self without a slot.', { prerequisite: { level: 2 }, grants: { spells: [{ spellId: 'disguise-self', mode: 'innate' }] } }),
  inv('master-of-myriad-forms', 'Master of Myriad Forms', 'Cast Alter Self without a slot.', { prerequisite: { level: 5 }, grants: { spells: [{ spellId: 'alter-self', mode: 'innate' }] } }),
  inv('misty-visions', 'Misty Visions', 'Cast Silent Image without a slot.', { prerequisite: { level: 2 }, grants: { spells: [{ spellId: 'silent-image', mode: 'innate' }] } }),
  inv('one-with-shadows', 'One with Shadows', 'In dim light or darkness, cast Invisibility on yourself without a slot.', { prerequisite: { level: 5 }, grants: { spells: [{ spellId: 'invisibility', mode: 'innate' }] } }),
  inv('otherworldly-leap', 'Otherworldly Leap', 'Cast Jump on yourself without a slot.', { prerequisite: { level: 2 }, grants: { spells: [{ spellId: 'jump', mode: 'innate' }] } }),
  inv('repelling-blast', 'Repelling Blast', 'A chosen damaging cantrip can push Large or smaller creatures 10 ft on a hit.', { prerequisite: { level: 2 } }),
  inv('thirsting-blade', 'Thirsting Blade', 'Attack twice with your pact weapon when you take the Attack action.', { prerequisite: { level: 5, text: 'Pact of the Blade' } }),
  inv('visions-of-distant-realms', 'Visions of Distant Realms', 'Cast Arcane Eye without a slot.', { prerequisite: { level: 9 }, grants: { spells: [{ spellId: 'arcane-eye', mode: 'innate' }] } }),
  inv('whispers-of-the-grave', 'Whispers of the Grave', 'Cast Speak with Dead without a slot.', { prerequisite: { level: 7 }, grants: { spells: [{ spellId: 'speak-with-dead', mode: 'innate' }] } }),
  inv('witch-sight', 'Witch Sight', 'Truesight with a range of 30 ft.', { prerequisite: { level: 15 }, grants: { senses: { truesight: 30 } } }),
];

const mm = (id: string, name: string, cost: string, d: string): ChoiceOption => ({ id: `mm24-${id}`, name: `${name} (${cost})`, description: d });
const METAMAGIC_2024: ChoiceOption[] = [
  mm('careful', 'Careful Spell', '1 SP', 'Chosen creatures automatically succeed on the save and take no damage on a success.'),
  mm('distant', 'Distant Spell', '1 SP', 'Double the range, or make a Touch spell reach 30 ft.'),
  mm('empowered', 'Empowered Spell', '1 SP', 'Reroll up to CHA modifier damage dice.'),
  mm('extended', 'Extended Spell', '1 SP', 'Double the duration (max 24 hours); Advantage on its Concentration saves.'),
  mm('heightened', 'Heightened Spell', '2 SP', 'One target has Disadvantage on saves against the spell.'),
  mm('quickened', 'Quickened Spell', '2 SP', 'Cast an Action spell as a Bonus Action (not if you already cast a level 1+ spell this turn).'),
  mm('seeking', 'Seeking Spell', '1 SP', 'Reroll a missed spell attack roll.'),
  mm('subtle', 'Subtle Spell', '1 SP', 'Cast without Verbal, Somatic, or (non-costly) Material components.'),
  mm('transmuted', 'Transmuted Spell', '1 SP', 'Change the damage type among acid, cold, fire, lightning, poison, thunder.'),
  mm('twinned', 'Twinned Spell', '1 SP', 'Increase the spell’s effective level by 1 to target an additional creature when that would allow it.'),
];

export const POOLS_2024: OptionPool[] = [
  { id: 'weapon-mastery', name: 'Weapon Mastery', options: WEAPON_MASTERY },
  { id: 'invocations-2024', name: 'Eldritch Invocations (2024)', options: INVOCATIONS_2024 },
  { id: 'metamagic-2024', name: 'Metamagic (2024)', options: METAMAGIC_2024 },
  ...POOLS.filter((p) => ['maneuvers', 'runes', 'arcane-shots'].includes(p.id)),
];

export { mod };
