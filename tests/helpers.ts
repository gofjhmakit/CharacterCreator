import { ContentDB } from '@/content/registry';
import { bundledContent } from '@/content';
import { newCharacter } from '@/engine/factory';
import { derive } from '@/engine/derive';
import { addItem, instantiateItem } from '@/engine/inventory';
import type { Character } from '@/types/character';
import type { Ability } from '@/types/core';

export const db = new ContentDB(bundledContent());
export const db24 = new ContentDB(bundledContent('dnd5e-2024'), [], 'dnd5e-2024');

export interface MakeOpts {
  race?: string;
  subrace?: string;
  background?: string;
  classes?: { id: string; level: number; sub?: string }[];
  scores?: Partial<Record<Ability, number>>;
  choices?: Record<string, string[]>;
  equip?: string[];
  carry?: string[];
  ruleset?: 'dnd5e-2014' | 'dnd5e-2024';
}

export function make(o: MakeOpts = {}): Character {
  const D = o.ruleset === 'dnd5e-2024' ? db24 : db;
  let c = newCharacter({ draft: false, ruleset: o.ruleset ?? 'dnd5e-2014' });
  c.race = { raceId: o.race ?? 'human', subraceId: o.subrace ?? (o.race || o.ruleset === 'dnd5e-2024' ? undefined : 'human-standard') };
  c.background = { backgroundId: o.background ?? '' };
  c.classes = (o.classes ?? [{ id: 'fighter', level: 1 }]).map((x) => ({ classId: x.id, subclassId: x.sub, level: x.level, hpRolls: [] }));
  c.abilities.base = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...o.scores };
  c.choices = o.choices ?? {};
  for (const id of o.equip ?? []) {
    const def = D.items.get(id);
    if (!def) throw new Error(`no item ${id}`);
    const inst = instantiateItem(def);
    inst.equipped = true;
    if (def.attunement?.required) inst.attuned = true;
    c.inventory.push(inst);
  }
  for (const id of o.carry ?? []) c = addItem(c, D.items.get(id)!, 1, D, false);
  return c;
}

export const d = (c: Character) => derive(c, c.ruleset === 'dnd5e-2024' ? db24 : db);
