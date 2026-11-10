import { describe, it, expect } from 'vitest';
import 'fake-indexeddb/auto';
import { make, d, db } from './helpers';
import {
  parseDice, rollExpression, rollD20, roll3d6, roll4d6DropLowest, resolveAdvantage, seededRng, scriptedRng, isValidDice,
} from '@/dice/dice';
import {
  POINT_BUY_COST, validatePointBuy, canIncreasePointBuy, pointBuySpent, assignStandardArray, standardArrayScores, validateStandardArray,
} from '@/engine/abilityGen';
import { applyDamage, applyHealing, setTempHp, rollDeathSave, shortRest, longRest, spendHitDie, useResource, arcaneRecovery, useConsumable } from '@/engine/actions';
import { instantiateItem, addItem, resyncFromTemplate, setAttuned, instanceDiffersFromTemplate } from '@/engine/inventory';
import { searchItems, editDistance } from '@/search/fuzzy';
import { parseImport, exportCharacter, exportBackup } from '@/io/exportImport';
import { migrateCharacter } from '@/io/migrations';
import { validateCharacter } from '@/io/schema';
import { openIndexedDB, localStorageStore } from '@/persistence/db';
import { ContentDB } from '@/content/registry';
import { bundledContent } from '@/content';
import type { ItemDefinition } from '@/types/content';

describe('dice', () => {
  it('parses expressions', () => {
    expect(parseDice('2d6+1d4-1')).toEqual([
      { kind: 'dice', count: 2, sides: 6, sign: 1 }, { kind: 'dice', count: 1, sides: 4, sign: 1 }, { kind: 'const', value: 1, sign: -1 },
    ]);
    expect(parseDice('d20')).toEqual([{ kind: 'dice', count: 1, sides: 20, sign: 1 }]);
    expect(parseDice('d%')).toEqual([{ kind: 'dice', count: 1, sides: 100, sign: 1 }]);
    expect(isValidDice('2d6 + 3')).toBe(true);
    expect(isValidDice('2d6++3')).toBe(false);
    expect(isValidDice('rm -rf')).toBe(false);
  });
  it('rolls within range and totals correctly', () => {
    const rng = seededRng(42);
    for (let i = 0; i < 200; i++) {
      const r = rollExpression('3d6+2', { rng });
      expect(r.total).toBeGreaterThanOrEqual(5);
      expect(r.total).toBeLessThanOrEqual(20);
      expect(r.terms[0].rolls).toHaveLength(3);
    }
  });
  it('critical hits double dice, not modifiers', () => {
    const r = rollExpression('1d8+3', { critical: true, rng: seededRng(1) });
    expect(r.terms[0].rolls).toHaveLength(2);
    expect(r.total).toBe(r.terms[0].rolls[0] + r.terms[0].rolls[1] + 3);
  });
  it('advantage keeps higher, disadvantage lower, shows both dice', () => {
    const adv = rollD20(2, { mode: 'advantage', rng: scriptedRng([5, 17], [20, 20]) });
    expect(adv.terms[0].rolls).toEqual([5, 17]);
    expect(adv.natural).toBe(17);
    expect(adv.total).toBe(19);
    expect(adv.terms[0].dropped).toEqual([0]);
    const dis = rollD20(0, { mode: 'disadvantage', rng: scriptedRng([5, 17], [20, 20]) });
    expect(dis.natural).toBe(5);
  });
  it('advantage sources never stack; any adv + any dis = normal', () => {
    expect(resolveAdvantage(3, 0)).toBe('advantage');
    expect(resolveAdvantage(3, 1)).toBe('normal');
    expect(resolveAdvantage(0, 2)).toBe('disadvantage');
    expect(resolveAdvantage(0, 0)).toBe('normal');
  });
  it('crit range for attacks', () => {
    expect(rollD20(0, { kind: 'attack', critRange: 19, rng: scriptedRng([19], [20]) }).critical).toBe(true);
    expect(rollD20(0, { kind: 'attack', rng: scriptedRng([19], [20]) }).critical).toBe(false);
  });
  it('halfling lucky rerolls natural 1', () => {
    const r = rollD20(0, { rng: scriptedRng([1, 14], [20, 20]), halflingLucky: true });
    expect(r.natural).toBe(14);
  });
  it('3d6 and 4d6 drop lowest', () => {
    const r3 = roll3d6(scriptedRng([2, 3, 4], [6, 6, 6]));
    expect(r3).toEqual({ dice: [2, 3, 4], total: 9 });
    const r4 = roll4d6DropLowest(scriptedRng([6, 1, 5, 3], [6, 6, 6, 6]));
    expect(r4.dice).toEqual([6, 1, 5, 3]);
    expect(r4.dropped).toBe(1);
    expect(r4.total).toBe(14);
    const rng = seededRng(7);
    for (let i = 0; i < 300; i++) { const x = roll4d6DropLowest(rng); expect(x.total).toBeGreaterThanOrEqual(3); expect(x.total).toBeLessThanOrEqual(18); }
  });
});

describe('point buy & standard array', () => {
  it('costs', () => {
    expect(POINT_BUY_COST).toEqual({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 });
  });
  it('validates budget and limits', () => {
    const s = { str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 };
    expect(pointBuySpent(s)).toBe(27);
    expect(validatePointBuy(s).valid).toBe(true);
    expect(validatePointBuy({ ...s, int: 9 }).valid).toBe(false);
    expect(validatePointBuy({ ...s, str: 16 }).valid).toBe(false);
    expect(validatePointBuy({ ...s, str: 7 }).valid).toBe(false);
    expect(canIncreasePointBuy(s, 'int')).toBe(false);
    expect(canIncreasePointBuy({ ...s, str: 14 }, 'int')).toBe(true);
  });
  it('standard array assignment swaps on reuse', () => {
    let a = assignStandardArray({}, 'str', 0);
    a = assignStandardArray(a, 'dex', 1);
    a = assignStandardArray(a, 'dex', 0); // take str's 15 → swap
    expect(a).toEqual({ dex: 0, str: 1 });
    expect(standardArrayScores(a)).toEqual({ str: 14, dex: 15 });
    expect(validateStandardArray(a).valid).toBe(false);
    const full = { str: 0, dex: 1, con: 2, int: 3, wis: 4, cha: 5 };
    expect(validateStandardArray(full).valid).toBe(true);
    expect(validateStandardArray({ ...full, cha: 0 }).valid).toBe(false);
  });
});

describe('combat actions & rests', () => {
  it('temp HP absorbs first; resistances halve', () => {
    let c = make({ classes: [{ id: 'fighter', level: 3 }], scores: { con: 10 } });
    c.combat.hpCurrent = d(c).hp.max; // 10 + 6 + 6 = 22
    c = setTempHp(c, 5);
    const r = applyDamage(c, d(c), 8);
    expect(r.absorbedByTemp).toBe(5);
    expect(r.character.combat.hpCurrent).toBe(19);
    c = make({ race: 'tiefling', classes: [{ id: 'fighter', level: 3 }], scores: { con: 10 } });
    c.combat.hpCurrent = 22;
    expect(applyDamage(c, d(c), 9, 'fire').character.combat.hpCurrent).toBe(22 - 4);
  });
  it('temp HP does not stack', () => {
    let c = make();
    c = setTempHp(c, 8); c = setTempHp(c, 5);
    expect(c.combat.hpTemp).toBe(8);
  });
  it('dropping to 0 → unconscious; massive damage → death; healing revives', () => {
    let c = make({ classes: [{ id: 'wizard', level: 1 }], scores: { con: 10 } });
    c.combat.hpCurrent = 6;
    const r = applyDamage(c, d(c), 8);
    expect(r.character.combat.hpCurrent).toBe(0);
    expect(r.character.combat.conditions).toContain('unconscious');
    expect(r.instantDeath).toBe(false);
    expect(applyDamage(c, d(c), 12).instantDeath).toBe(true);
    const healed = applyHealing(r.character, d(r.character), 3);
    expect(healed.combat.hpCurrent).toBe(3);
    expect(healed.combat.conditions).not.toContain('unconscious');
  });
  it('death saves: nat 20 revives, nat 1 = two failures, three successes stable', () => {
    const c = make(); c.combat.hpCurrent = 0;
    expect(rollDeathSave(c, scriptedRng([20], [20])).status).toBe('revived');
    expect(rollDeathSave(c, scriptedRng([1], [20])).character.combat.deathSaves.failures).toBe(2);
    let s = c;
    for (let i = 0; i < 3; i++) s = rollDeathSave(s, scriptedRng([12], [20])).character;
    expect(s.combat.deathSaves.successes).toBe(3);
    expect(s.combat.stable).toBe(true);
  });
  it('short rest restores short-rest resources and pact slots only', () => {
    let c = make({ classes: [{ id: 'fighter', level: 9 }, { id: 'warlock', level: 2 }], scores: { str: 13, cha: 13 } });
    c = useResource(c, 'second-wind'); c = useResource(c, 'action-surge'); c = useResource(c, 'indomitable');
    c.spells.pactSlotsUsed = 2;
    const { character } = shortRest(c, d(c));
    expect(character.resources['second-wind'].used).toBe(0);
    expect(character.resources['action-surge'].used).toBe(0);
    expect(character.resources['indomitable'].used).toBe(1); // long rest only
    expect(character.spells.pactSlotsUsed).toBe(0);
  });
  it('long rest: full HP, half hit dice back, slots, exhaustion -1', () => {
    let c = make({ classes: [{ id: 'wizard', level: 6 }], scores: { int: 16 } });
    c.combat.hpCurrent = 1; c.combat.hitDiceUsed = { '6': 6 }; c.combat.exhaustion = 2; c.spells.slotsUsed = [0, 4, 3, 2, 0, 0, 0, 0, 0, 0];
    c = useResource(c, 'arcane-recovery');
    const { character } = longRest(c, d(c));
    expect(character.combat.hpCurrent).toBe(d(c).hp.max);
    expect(character.combat.hitDiceUsed['6']).toBe(3);
    expect(character.combat.exhaustion).toBe(1);
    expect(character.spells.slotsUsed.every((x) => x === 0)).toBe(true);
    expect(character.resources['arcane-recovery'].used).toBe(0);
  });
  it('spending hit dice heals die + CON and is limited', () => {
    let c = make({ classes: [{ id: 'fighter', level: 2 }], scores: { con: 14 } });
    c.combat.hpCurrent = 1;
    const r = spendHitDie(c, d(c), 10, undefined, 7);
    expect(r.healed).toBe(9);
    c = r.character;
    c = spendHitDie(c, d(c), 10, undefined, 1).character;
    const r3 = spendHitDie(c, d(c), 10, undefined, 5);
    expect(r3.healed).toBe(0);
  });
  it('arcane recovery budget', () => {
    const c = make({ classes: [{ id: 'wizard', level: 5 }] }); c.spells.slotsUsed = [0, 2, 2, 1, 0, 0, 0, 0, 0, 0];
    expect(arcaneRecovery(c, 5, [3])).not.toBeNull();
    expect(arcaneRecovery(c, 5, [2, 1])).not.toBeNull();
    expect(arcaneRecovery(c, 5, [3, 1])).toBeNull();
  });
  it('dawn recharge rolls item charges', () => {
    let c = make({ carry: ['mi-wand-of-magic-missiles'] });
    c.inventory[0].charges = 0;
    c = longRest(c, d(c), { rng: scriptedRng([3], [6]) }).character;
    expect(c.inventory[0].charges).toBe(4); // 1d6(3)+1
  });
  it('consumables decrement and are removed at 0', () => {
    let c = make({ carry: ['mi-potion-of-healing-common'] });
    c = addItem(c, db.items.get('mi-potion-of-healing-common')!, 1);
    expect(c.inventory[0].quantity).toBe(2);
    c = useConsumable(c, c.inventory[0].id);
    expect(c.inventory[0].quantity).toBe(1);
    c = useConsumable(c, c.inventory[0].id);
    expect(c.inventory).toHaveLength(0);
  });
});

describe('custom item templates vs instances', () => {
  const template: ItemDefinition = {
    ...structuredClone(db.items.get('dagger')!), id: 'custom-holy-banana', name: 'Holy Banana +1 Dagger', magical: true, rarity: 'uncommon',
    source: { book: 'Homebrew', kind: 'custom' }, baseItemId: 'dagger',
    weapon: { ...db.items.get('dagger')!.weapon!, attackBonus: 1, damageBonus: 1 },
    effects: [{ id: 'banana-prone', name: 'Banana slip', activation: 'equipped', trigger: 'on-hit', save: { ability: 'str', dc: { kind: 'fixed', value: 15 }, onFailure: [{ kind: 'prone' }] } }],
  };
  it('instances are snapshots: editing the template does not alter instances', () => {
    const inst = instantiateItem(template);
    const edited = { ...template, name: 'Unholy Banana', weapon: { ...template.weapon!, attackBonus: 3 } };
    expect(inst.item.name).toBe('Holy Banana +1 Dagger');
    expect(inst.item.weapon!.attackBonus).toBe(1);
    expect(instanceDiffersFromTemplate(inst, edited)).toBe(true);
    const synced = resyncFromTemplate({ ...inst, quantity: 3, equipped: true }, edited);
    expect(synced.item.weapon!.attackBonus).toBe(3);
    expect(synced.quantity).toBe(3);
    expect(synced.equipped).toBe(true);
  });
  it('two characters get independent instances', () => {
    let a = make(); let b = make();
    a = addItem(a, template); b = addItem(b, template);
    a.inventory[0].item.name = 'Renamed';
    expect(b.inventory[0].item.name).toBe('Holy Banana +1 Dagger');
    expect(a.inventory[0].id).not.toBe(b.inventory[0].id);
  });
  it('custom effect activates on equip and is removed on unequip', () => {
    let c = make({ scores: { dex: 14 } });
    c = addItem(c, template);
    expect(d(c).attacks.some((x) => x.name.startsWith('Holy Banana'))).toBe(false);
    c.inventory[0].equipped = true;
    const atk = d(c).attacks.find((x) => x.name.startsWith('Holy Banana'))!;
    expect(atk.attack.total).toBe(2 + 2 + 1);
    expect(atk.damageBonus.total).toBe(2 + 1);
    expect(atk.riders[0]).toMatchObject({ dc: 15, saveAbility: 'str' });
    c.inventory[0].equipped = false;
    expect(d(c).attacks.some((x) => x.name.startsWith('Holy Banana'))).toBe(false);
  });
  it('attunement limit enforced on attune action', () => {
    let c = make({ carry: ['mi-ring-of-protection', 'mi-cloak-of-protection', 'mi-bracers-of-defense', 'mi-amulet-of-health'] });
    for (const it of c.inventory.slice(0, 3)) c = setAttuned(c, it.id, true, 3).character;
    const r = setAttuned(c, c.inventory[3].id, true, 3);
    expect(r.warning).toMatch(/limit/);
    expect(r.character.inventory[3].attuned).toBe(false);
    expect(setAttuned(c, make({ carry: ['dagger'] }).inventory[0].id, true, 3).warning).toBeUndefined();
  });
});

describe('fuzzy item search', () => {
  const items = [...db.items.values()];
  const top = (q: string, n = 3) => searchItems(q, items).slice(0, n).map((i) => i.name);
  it('examples from spec', () => {
    expect(top('dag')).toContain('Dagger');
    expect(top('long sw')[0]).toBe('Longsword');
    expect(top('healing pot')).toContain('Potion of Healing');
    expect(top('plate')).toContain('Plate Armor');
  });
  it('typos, aliases, categories, properties, rarity', () => {
    expect(top('longswrod')).toContain('Longsword');
    expect(top('dager')).toContain('Dagger');
    expect(top('lockpicks')).toContain("Thieves' Tools");
    expect(searchItems('finesse', items).map((i) => i.name)).toEqual(expect.arrayContaining(['Dagger', 'Rapier']));
    const lr = searchItems('legendary ring', items);
    expect(lr.length).toBeGreaterThan(0);
    expect(lr.every((i) => i.rarity === 'legendary' && /ring/i.test(i.name + i.category))).toBe(true);
    expect(searchItems('ring', items, { magical: 'magic' }).length).toBeGreaterThan(5);
  });
  it('edit distance', () => {
    expect(editDistance('dager', 'dagger')).toBe(1);
    expect(editDistance('ab', 'ba')).toBe(1);
  });
});

describe('import/export & migration', () => {
  it('round-trips a character export', () => {
    const c = make({ classes: [{ id: 'wizard', level: 3, sub: 'evocation' }], equip: ['quarterstaff'] });
    c.identity.name = 'Elminster Jr.';
    const env = exportCharacter(c, db);
    const p = parseImport(JSON.stringify(env));
    expect(p.errors).toEqual([]);
    expect(p.characters[0].identity.name).toBe('Elminster Jr.');
    expect(p.characters[0].inventory[0].item.name).toBe('Quarterstaff');
  });
  it('rejects malformed input with understandable errors', () => {
    expect(parseImport('not json').errors[0]).toMatch(/not valid JSON/);
    expect(parseImport('{"hello":1}').errors[0]).toMatch(/Unrecognized/);
    expect(parseImport(JSON.stringify({ format: 'grimoire5e', kind: 'character' })).errors[0]).toMatch(/does not contain/);
    const bad = exportCharacter(make(), db) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    bad.character.abilities.base.str = 'strong';
    expect(parseImport(JSON.stringify(bad)).errors.join(' ')).toMatch(/str/);
    const tooHigh = exportCharacter(make(), db) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    tooHigh.character.schemaVersion = 99;
    expect(parseImport(JSON.stringify(tooHigh)).errors.join(' ')).toMatch(/newer version/);
  });
  it('preserves unknown fields', () => {
    const env = exportCharacter(make(), db) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    env.character.futureFeature = { a: 1 };
    const p = parseImport(JSON.stringify(env));
    expect(p.characters[0].extra).toEqual({ futureFeature: { a: 1 } });
  });
  it('migrates v0 → v1', () => {
    const v0 = { id: 'old1', identity: { name: 'Old' }, class: 'fighter', level: 3, hp: { current: 12, temp: 2 }, notes: 'remember the cheese', abilities: { base: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 10 } } };
    const m = migrateCharacter(v0);
    expect(m.applied).toEqual([0]);
    const v = validateCharacter(m.data);
    expect(v.ok).toBe(true);
    expect(v.character!.classes[0]).toMatchObject({ classId: 'fighter', level: 3 });
    expect(v.character!.combat.hpCurrent).toBe(12);
    expect(v.character!.notes.general).toBe('remember the cheese');
  });
  it('character export packages custom content dependencies', () => {
    const custom = new ContentDB(bundledContent(), [{ kind: 'feat', id: 'custom-feat-x', data: { id: 'custom-feat-x', name: 'Homebrew Feat', ruleset: 'dnd5e-2014', description: 'x', source: { book: 'Homebrew', kind: 'custom' } }, createdAt: '', updatedAt: '' }]);
    const c = make(); c.custom.feats = ['custom-feat-x'];
    const env = exportCharacter(c, custom);
    expect(env.customContent?.map((r) => r.id)).toEqual(['custom-feat-x']);
    const p = parseImport(JSON.stringify(env));
    expect(p.content).toHaveLength(1);
  });
  it('backup with multiple characters', () => {
    const p = parseImport(JSON.stringify(exportBackup([make(), make()], [])));
    expect(p.kind).toBe('backup');
    expect(p.characters).toHaveLength(2);
  });
});

describe('persistence', () => {
  it('IndexedDB store CRUD', async () => {
    const s = await openIndexedDB();
    const c = make(); c.identity.name = 'Persisted';
    await s.putCharacter(c);
    expect((await s.getCharacter(c.id))?.identity.name).toBe('Persisted');
    expect((await s.listCharacters()).some((x) => x.id === c.id)).toBe(true);
    await s.putContent({ kind: 'item', id: 'x', data: db.items.get('dagger')! as never, createdAt: '', updatedAt: '' });
    expect((await s.listContent()).find((r) => r.id === 'x')?.kind).toBe('item');
    await s.deleteCharacter(c.id);
    expect(await s.getCharacter(c.id)).toBeUndefined();
  });
  it('memory fallback store', async () => {
    const s = localStorageStore(undefined);
    const c = make();
    await s.putCharacter(c);
    expect((await s.listCharacters())).toHaveLength(1);
  });
});

describe('instance/template comparison', () => {
  it('ignores key order and empty defaults (normalized on load)', async () => {
    const { sameData, instanceDiffersFromTemplate, instantiateItem: inst } = await import('@/engine/inventory');
    const def = db.items.get('longsword')!;
    const i = inst(def);
    i.item = { effects: [], tags: [], aliases: [], ...JSON.parse(JSON.stringify(i.item)) };
    expect(instanceDiffersFromTemplate(i, def)).toBe(false);
    expect(sameData({ a: 1, b: [] }, { a: 1 })).toBe(true);
    expect(sameData({ a: 1 }, { a: 2 })).toBe(false);
  });
});
