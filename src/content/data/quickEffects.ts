// Ready-made temporary effects (common buffs/debuffs) users can apply during play.
import type { Effect } from '@/types/content';
import { mod, adv, grant } from './helpers';

export interface QuickEffect { id: string; name: string; description: string; concentration?: boolean; oneShot?: boolean; effect: Effect }

const q = (id: string, name: string, description: string, modifiers: Effect['modifiers'], concentration = false, extra: Partial<Effect> = {}): QuickEffect => ({ id, name, description, concentration, effect: { id: `qe-${id}`, name, modifiers, ...extra } });

export const QUICK_EFFECTS: QuickEffect[] = [
  q('mage-armor', 'Mage Armor', 'Base AC 13 + DEX while not wearing armor (8 hours).', [mod('ac-formula', undefined, { acFormula: { label: 'Mage Armor (13 + DEX)', base: 13, abilities: ['dex'], allowsArmor: false, allowsShield: true } })]),
  q('shield-spell', 'Shield (spell)', '+5 AC until the start of your next turn.', [mod('ac', 5)]),
  q('shield-of-faith', 'Shield of Faith', '+2 AC (concentration, 10 minutes).', [mod('ac', 2)], true),
  q('haste', 'Haste', '+2 AC, advantage on DEX saves, doubled speed, extra action (concentration).', [mod('ac', 2), adv('save:dex'), mod('speed:walk', 'walk')], true),
  q('barkskin', 'Barkskin', "AC can't be lower than 16 (concentration).", [mod('ac-formula', undefined, { acFormula: { label: 'Barkskin (min 16)', base: 16, abilities: [], allowsArmor: true, allowsShield: false } })], true),
  q('bless', 'Bless', 'Add 1d4 to attack rolls and saving throws (concentration). Rolled automatically.', [mod('attack', 0, { dice: '1d4' }), mod('save:all', 0, { dice: '1d4' })], true),
  q('bane', 'Bane (affected)', 'Subtract 1d4 from attack rolls and saving throws. Rolled automatically.', [mod('attack', 0, { dice: '-1d4' }), mod('save:all', 0, { dice: '-1d4' })]),
  { ...q('guidance', 'Guidance', 'Add 1d4 to your next ability check. Used up by that roll.', [mod('check:all', 0, { dice: '1d4' })]), oneShot: true },
  { ...q('resistance-cantrip', 'Resistance', 'Add 1d4 to your next saving throw. Used up by that roll.', [mod('save:all', 0, { dice: '1d4' })]), oneShot: true },
  ...[6, 8, 10, 12].map((n) => ({ ...q(`bardic-inspiration-d${n}`, `Bardic Inspiration (d${n})`, `Add 1d${n} to your next ability check, attack roll, or saving throw. Used up by that roll.`, [mod('attack', 0, { dice: `1d${n}` }), mod('save:all', 0, { dice: `1d${n}` }), mod('check:all', 0, { dice: `1d${n}` })]), oneShot: true })),
  q('longstrider', 'Longstrider', '+10 ft walking speed (1 hour).', [mod('speed:walk', 10)]),
  q('enlarge', 'Enlarge', 'Advantage on STR checks and saves; weapons deal +1d4 damage (concentration).', [adv('check:str'), adv('save:str'), mod('extra-damage', '1d4', { scope: 'weapon' })], true),
  q('reduce', 'Reduce (affected)', 'Disadvantage on STR checks and saves; weapons deal −1d4 damage.', [{ target: 'check:str', op: 'disadvantage' }, { target: 'save:str', op: 'disadvantage' }]),
  q('heroism', 'Heroism', 'Immune to frightened; temp HP equal to spellcasting modifier each turn (concentration).', [grant('condition-immunity:frightened')], true),
  q('protection-from-energy', 'Protection from Energy', 'Resistance to one damage type (concentration). Edit to choose type; default fire.', [grant('resistance:fire')], true),
  q('stoneskin', 'Stoneskin', 'Resistance to nonmagical B/P/S (concentration).', [grant('resistance:all-nonmagical-bps')], true),
  q('foresight', 'Foresight', "Advantage on attacks, checks, and saves; attacks against you have disadvantage (8 hours).", [adv('attack'), adv('check:all'), adv('save:all')]),
  q('fly', 'Fly', '60 ft flying speed (concentration).', [mod('speed:fly', 60, { op: 'max' })], true),
  q('expeditious-retreat', 'Expeditious Retreat', 'Dash as a bonus action (concentration).', [], true),
  q('death-ward', 'Death Ward', 'The first time you would drop to 0 HP, drop to 1 instead (8 hours).', [], false, { manual: true, description: 'First time reduced to 0 HP: drop to 1 instead.' }),
  q('enhance-ability-bulls', "Enhance Ability (Bull's Strength)", 'Advantage on STR checks; double carrying capacity (concentration).', [adv('check:str'), { target: 'carry-multiplier', value: 2 }], true),
  q('enhance-ability-cats', "Enhance Ability (Cat's Grace)", 'Advantage on DEX checks (concentration).', [adv('check:dex')], true),
  q('enhance-ability-bear', "Enhance Ability (Bear's Endurance)", 'Advantage on CON checks; 2d6 temp HP (concentration).', [adv('check:con')], true),
  q('enhance-ability-owl', "Enhance Ability (Owl's Wisdom)", 'Advantage on WIS checks (concentration).', [adv('check:wis')], true),
  q('enhance-ability-fox', "Enhance Ability (Fox's Cunning)", 'Advantage on INT checks (concentration).', [adv('check:int')], true),
  q('enhance-ability-eagle', "Enhance Ability (Eagle's Splendor)", 'Advantage on CHA checks (concentration).', [adv('check:cha')], true),
  q('pass-without-trace', 'Pass without Trace', '+10 to Stealth checks (concentration).', [mod('skill:stealth', 10)], true),
  q('darkvision-spell', 'Darkvision (spell)', 'Darkvision 60 ft for 8 hours.', [mod('sense:darkvision', 60)]),
  q('blur', 'Blur', 'Attackers have disadvantage against you unless they don’t rely on sight (concentration).', [], true, { manual: true, description: 'Attack rolls against you have disadvantage.' }),
  q('dodge', 'Dodging', 'Attacks against you have disadvantage; advantage on DEX saves (until your next turn).', [adv('save:dex')]),
  q('cover-half', 'Half Cover', '+2 AC and DEX saves.', [mod('ac', 2), mod('save:dex', 2)]),
  q('cover-three-quarters', 'Three-Quarters Cover', '+5 AC and DEX saves.', [mod('ac', 5), mod('save:dex', 5)]),
];
