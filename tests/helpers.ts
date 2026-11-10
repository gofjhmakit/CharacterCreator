import { ContentDB } from '@/content/registry';
import { bundledContent } from '@/content';
import { newCharacter } from '@/engine/factory';
import { derive } from '@/engine/derive';
import { addItem, instantiateItem } from '@/engine/inventory';
import type { Character } from '@/types/character';
import type { Ability } from '@/types/core';

export const db = new ContentDB(bundledContent());

export interface MakeOpts {
  race?: string;
  subrace?: string;
  background?: string;
  classes?: { id: string; level: number; sub?: string }[];
  scores?: Partial<Record<Ability, number>>;
  choices?: Record<string, string[]>;
  equip?: string[];
  carry?: string[];
}

export function make(o: MakeOpts = {}): Character {
  let c = newCharacter({ draft: false });
  c.race = { raceId: o.race ?? 'human', subraceId: o.subrace ?? (o.race ? undefined : 'human-standard') };
  c.background = { backgroundId: o.background ?? '' };
  c.classes = (o.classes ?? [{ id: 'fighter', level: 1 }]).map((x) => ({ classId: x.id, subclassId: x.sub, level: x.level, hpRolls: [] }));
  c.abilities.base = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...o.scores };
  c.choices = o.choices ?? {};
  for (const id of o.equip ?? []) {
    const def = db.items.get(id);
    if (!def) throw new Error(`no item ${id}`);
    const inst = instantiateItem(def);
    inst.equipped = true;
    if (def.attunement?.required) inst.attuned = true;
    c.inventory.push(inst);
  }
  for (const id of o.carry ?? []) c = addItem(c, db.items.get(id)!, 1, db, false);
  return c;
}

export const d = (c: Character) => derive(c, db);
