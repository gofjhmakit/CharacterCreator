// Mechanical consequences of conditions and exhaustion, expressed as modifiers.
import type { ConditionId } from '@/types/core';
import type { Modifier } from '@/types/content';

export const CONDITION_SUMMARY: Record<ConditionId, string> = {
  blinded: "Can't see; auto-fail sight checks. Attacks against you have advantage; your attacks have disadvantage.",
  charmed: "Can't attack the charmer or target them with harmful effects. Charmer has advantage on social checks with you.",
  deafened: "Can't hear; auto-fail hearing checks.",
  frightened: 'Disadvantage on checks and attacks while the source is in sight; can\'t willingly move closer.',
  grappled: 'Speed 0. Ends if grappler is incapacitated or you are moved out of reach.',
  incapacitated: "Can't take actions or reactions.",
  invisible: "Can't be seen without magic; heavily obscured. Your attacks have advantage; attacks against you have disadvantage.",
  paralyzed: "Incapacitated; can't move or speak. Auto-fail STR and DEX saves. Attacks against you have advantage; hits within 5 ft are crits.",
  petrified: 'Turned to stone; incapacitated. Auto-fail STR/DEX saves, resistance to all damage, immune to poison and disease.',
  poisoned: 'Disadvantage on attack rolls and ability checks.',
  prone: 'Can only crawl. Disadvantage on attacks. Melee attacks within 5 ft against you have advantage, ranged have disadvantage.',
  restrained: 'Speed 0. Disadvantage on attacks and DEX saves. Attacks against you have advantage.',
  stunned: "Incapacitated; can't move; speak falteringly. Auto-fail STR and DEX saves. Attacks against you have advantage.",
  unconscious: 'Incapacitated, prone, drop items. Auto-fail STR/DEX saves. Attacks against you have advantage; hits within 5 ft are crits.',
};

const dis = (target: Modifier['target'], condition?: string): Modifier => ({ target, op: 'disadvantage', ...(condition ? { condition } : {}) });
const adv = (target: Modifier['target']): Modifier => ({ target, op: 'advantage' });
const speed0: Modifier = { target: 'speed:all', op: 'set', value: 0 };
const autoFail = (a: 'str' | 'dex'): Modifier => ({ target: `save:${a}`, op: 'disadvantage', condition: 'automatically fails' });

/** Modifiers applied to *your own* rolls/stats by a condition. */
export const CONDITION_MODIFIERS: Record<ConditionId, Modifier[]> = {
  blinded: [dis('attack'), dis('check:all', 'checks requiring sight auto-fail')],
  charmed: [],
  deafened: [],
  frightened: [dis('attack'), dis('check:all')],
  grappled: [speed0],
  incapacitated: [],
  invisible: [adv('attack')],
  paralyzed: [speed0, autoFail('str'), autoFail('dex')],
  petrified: [speed0, autoFail('str'), autoFail('dex'), { target: 'immunity:poison', op: 'grant' }],
  poisoned: [dis('attack'), dis('check:all')],
  prone: [dis('attack')],
  restrained: [speed0, dis('attack'), dis('save:dex')],
  stunned: [speed0, autoFail('str'), autoFail('dex')],
  unconscious: [speed0, autoFail('str'), autoFail('dex')],
};

/** Conditions implied by others (paralyzed → incapacitated, unconscious → prone...). */
export const IMPLIED_CONDITIONS: Partial<Record<ConditionId, ConditionId[]>> = {
  paralyzed: ['incapacitated'],
  petrified: ['incapacitated'],
  stunned: ['incapacitated'],
  unconscious: ['incapacitated', 'prone'],
};

export const EXHAUSTION_LEVELS = [
  'No exhaustion',
  'Disadvantage on ability checks',
  'Speed halved',
  'Disadvantage on attack rolls and saving throws',
  'Hit point maximum halved',
  'Speed reduced to 0',
  'Death',
];

export function exhaustionModifiers(level: number): Modifier[] {
  const m: Modifier[] = [];
  if (level >= 1) m.push(dis('check:all'));
  if (level >= 3) { m.push(dis('attack')); m.push(dis('save:all')); }
  if (level >= 5) m.push(speed0);
  return m;
}
