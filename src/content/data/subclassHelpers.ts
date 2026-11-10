import type { Effect, FeatureDef, SourceInfo, SpellcastingDef, SubclassDef, SpellGrant } from '@/types/content';
import type { DamageType } from '@/types/core';
import { f, mod, res } from './helpers';

export function sc(classId: string, id: string, name: string, source: SourceInfo, description: string, features: FeatureDef[], extra: Partial<SubclassDef> = {}): SubclassDef {
  return { id, classId, name, ruleset: 'dnd5e-2014', source, description, features: features.map((x) => ({ ...x, source: x.source ?? source })), ...extra };
}

/** Spell list blocks keyed by class level. */
export function spellBlocks(mode: SpellGrant['mode'], blocks: [number, string[]][]): SubclassDef['spells'] {
  return blocks.map(([level, spells]) => ({ level, spells, mode }));
}
export const domainSpells = (a: string[], b: string[], c: string[], d: string[], e: string[]) => spellBlocks('always-prepared', [[1, a], [3, b], [5, c], [7, d], [9, e]]);
export const oathSpells = (a: string[], b: string[], c: string[], d: string[], e: string[]) => spellBlocks('always-prepared', [[3, a], [5, b], [9, c], [13, d], [17, e]]);
export const patronSpells = (a: string[], b: string[], c: string[], d: string[], e: string[]) => spellBlocks('expanded-list', [[1, a], [3, b], [5, c], [7, d], [9, e]]);
export const rangerSpells = (a: string, b: string, c: string, d: string, e: string) => spellBlocks('always-prepared', [[3, [a]], [5, [b]], [9, [c]], [13, [d]], [17, [e]]]);
export const sorcSpells = (a: string[], b: string[], c: string[], d: string[], e: string[]) => spellBlocks('always-prepared', [[1, a], [3, b], [5, c], [7, d], [9, e]]);

export function divineStrike(type: DamageType): FeatureDef {
  return f(8, `divine-strike-${type}`, 'Divine Strike', `Once on each of your turns when you hit a creature with a weapon attack, deal an extra 1d8 ${type} damage (2d8 at 14th level).`, {
    effects: [{ id: `divine-strike-${type}`, name: 'Divine Strike', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '{steps(cl,8,1,14,2)}d8', damageType: type }] }],
  });
}
export const potentSpellcasting = () => f(8, 'potent-spellcasting', 'Potent Spellcasting', 'Add your Wisdom modifier to the damage you deal with any cleric cantrip.', { effects: [{ id: 'potent-spellcasting', name: 'Potent Spellcasting', manual: true, description: '+WIS modifier to cleric cantrip damage.' }] });

export const thirdCaster = (ability: 'int', list: string, cantrips: number[], schools?: string[]): SpellcastingDef => ({
  ability, progression: 'third', style: 'known', list, startLevel: 3, cantrips,
  known: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
  ...(schools ? { schoolRestriction: { schools, freeAt: [3, 8, 14, 20] } } : {}),
});

export const ext = (id: string, name: string, desc: string, extra: Partial<Effect> = {}): Effect => ({ id, name, description: desc, ...extra });
export { f, mod, res };
