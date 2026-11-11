import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { make, db, db24, type MakeOpts } from './helpers';
import { toDmSim, DMSIM_MAX_BYTES, dmSimFilename } from '@/io/dmSimExport';
import type { Character } from '@/types/character';

const spell = (c: Character, spellId: string, classId: string, prepared = true) =>
  c.spells.entries.push({ id: `s-${spellId}`, spellId, classId, source: 'class', prepared });

function build(name: string, o: MakeOpts, spells: [string, string][] = []): Character {
  const c = make(o);
  c.identity.name = name;
  for (const [id, cls] of spells) spell(c, id, cls);
  const D = c.ruleset === 'dnd5e-2024' ? db24 : db;
  c.combat.hpCurrent = 999; // clamped to max on export
  void D;
  return c;
}

const SAMPLES: Character[] = [
  build('Brakka Stonefist', { classes: [{ id: 'fighter', level: 5, sub: 'champion' }], scores: { str: 16, dex: 12, con: 14 }, equip: ['chain-mail', 'shield', 'longsword'], carry: ['mi-potion-of-healing-common'] }),
  build('Lyra Moonwhisper', { race: 'elf', subrace: 'high-elf', classes: [{ id: 'wizard', level: 5 }], scores: { int: 16, dex: 14 }, equip: ['dagger'] }, [['fire-bolt', 'wizard'], ['magic-missile', 'wizard'], ['fireball', 'wizard'], ['shield', 'wizard']]),
  build('Brother Tomas', { classes: [{ id: 'cleric', level: 3, sub: 'life' }], scores: { wis: 16, str: 14 }, equip: ['chain-mail', 'shield', 'mace'] }, [['sacred-flame', 'cleric'], ['cure-wounds', 'cleric'], ['bless', 'cleric'], ['healing-word', 'cleric']]),
  build('Pip Quickfoot', { race: 'halfling', subrace: 'lightfoot', classes: [{ id: 'rogue', level: 3 }, { id: 'bard', level: 2 }], scores: { dex: 16, cha: 14 }, equip: ['rapier', 'leather-armor', 'mi-flame-tongue'] }, [['vicious-mockery', 'bard'], ['healing-word', 'bard']]),
  build('Kael (2024)', { ruleset: 'dnd5e-2024', race: 'human', background: 'soldier', classes: [{ id: 'paladin', level: 6 }], scores: { str: 16, cha: 14, con: 14 }, equip: ['chain-mail', 'shield', 'longsword', 'mi-ring-of-protection'] }, [['bless', 'paladin'], ['cure-wounds', 'paladin']]),
  build('Wren (2024)', { ruleset: 'dnd5e-2024', race: 'elf', background: 'sage', classes: [{ id: 'warlock', level: 5 }], scores: { cha: 16, dex: 14 } }, [['eldritch-blast', 'warlock'], ['hex', 'warlock']]),
];

describe('DM Simulator export', () => {
  for (const c of SAMPLES) {
    it(`exports ${c.identity.name} within the target schema limits`, () => {
      const D = c.ruleset === 'dnd5e-2024' ? db24 : db;
      const { sheet, bytes } = toDmSim(c, D);
      expect(bytes).toBeLessThanOrEqual(DMSIM_MAX_BYTES);
      expect(sheet.name).toBe(c.identity.name);
      expect(sheet.classes.length).toBeGreaterThan(0);
      expect(sheet.hp.current).toBeLessThanOrEqual(sheet.hp.max);
      for (const v of Object.values(sheet.abilities)) expect(v).toBeGreaterThanOrEqual(1);
      const ids = sheet.inventory.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const a of sheet.attacks) if (a.item_id) expect(ids).toContain(a.item_id);
      const rids = sheet.resources.map((r) => r.id);
      for (const f of sheet.features) if (f.resource_id) expect(rids).toContain(f.resource_id);
      for (const k of Object.keys(sheet.skills)) expect(k).toMatch(/^[a-z_]+$/);
      if (process.env.DMSIM_OUT) {
        mkdirSync(process.env.DMSIM_OUT, { recursive: true });
        writeFileSync(join(process.env.DMSIM_OUT, dmSimFilename(c)), JSON.stringify(sheet, null, 2));
      }
    });
  }

  it('maps weapons, magic bonuses and spells the way the target computes them', () => {
    const c = SAMPLES[0];
    const { sheet } = toDmSim(c, db);
    const ls = sheet.attacks.find((a) => a.name === 'Longsword')!;
    expect(ls).toBeTruthy();
    expect(ls.ability).toBe('str');
    expect(ls.proficient).toBe(true);
    expect(sheet.inventory.find((i) => i.id === ls.item_id)!.equipped).toBe(true);
    expect(sheet.inventory.find((i) => i.name === 'Potion of Healing')!.effect?.heal).toMatch(/2d4\+2/);
    const wiz = toDmSim(SAMPLES[1], db).sheet;
    expect(wiz.spellcasting.ability).toBe('int');
    expect(wiz.spellcasting.slots['3'].max).toBe(2);
    expect(wiz.spellcasting.spells.find((s) => s.name === 'Fire Bolt')).toMatchObject({ attack: true, damage: '2d10' });
    expect(wiz.spellcasting.spells.find((s) => s.name === 'Fireball')).toMatchObject({ save: 'dex', damage: '8d6' });
    const cleric = toDmSim(SAMPLES[2], db).sheet;
    expect(cleric.spellcasting.spells.find((s) => s.name === 'Cure Wounds')).toMatchObject({ heal_add_mod: true });
    expect(cleric.spellcasting.spells.find((s) => s.name === 'Cure Wounds')!.heal).toMatch(/^\d+d8$/);
  });

  it('shortens long texts to fit the 60 KB file limit', () => {
    const c = build('Verbose', { classes: [{ id: 'fighter', level: 3 }] });
    for (let i = 0; i < 90; i++) c.custom.features.push({ id: `f${i}`, name: `Feature ${i}`, description: 'x'.repeat(7000), effects: [] });
    const { sheet, bytes, warnings } = toDmSim(c, db);
    expect(bytes).toBeLessThanOrEqual(DMSIM_MAX_BYTES);
    expect(sheet.features.length).toBeGreaterThan(50);
    expect(warnings.some((w) => /60 KB/.test(w))).toBe(true);
  });
});
