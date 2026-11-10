import { describe, it, expect } from 'vitest';
import { make, d, db24 } from './helpers';
import { validateContentDB } from '@/content/validate';
import { longRest, shortRest, useResource } from '@/engine/actions';
import { setEquipped } from '@/engine/inventory';
import { computeSpellSlots } from '@/engine/spellSlots';

const R = 'dnd5e-2024' as const;

describe('2024 content integrity', () => {
  const issues = validateContentDB(db24);
  it('has no errors', () => {
    const e = issues.filter((i) => i.level === 'error');
    expect(e, JSON.stringify(e.slice(0, 15), null, 1)).toEqual([]);
  });
  it('has no unresolved references', () => {
    const w = issues.filter((i) => i.level === 'warning');
    expect(w, JSON.stringify(w.slice(0, 30), null, 1)).toEqual([]);
  });
  it('covers 12 classes, 48 subclasses, 9 species, 16 backgrounds', () => {
    expect(db24.classes.size).toBe(12);
    expect(db24.subclasses.size).toBe(48);
    expect(db24.races.size).toBe(9);
    expect(db24.backgrounds.size).toBe(16);
    for (const c of db24.classes.values()) expect(db24.subclassesFor(c.id).length, c.id).toBe(4);
    expect(db24.items.get('longsword')?.weapon?.mastery).toBe('sap');
    // 2014 SRD items without a 2024 counterpart are ported (tagged), renamed ones are not duplicated
    expect(db24.items.get('mi-belt-of-giant-strength-hill')?.tags).toContain('from-2014');
    expect(db24.items.get('warhorse')?.category).toBe('mount');
    expect(db24.items.has('crossbow-bolt')).toBe(false);
    expect(db24.items.get('mi-glamoured-studded-leather')?.armor?.baseAc).toBe(12);
    expect([...db24.items.keys()].filter((k) => k.includes('glamoured'))).toHaveLength(1);
    expect(db24.items.get('arrows-plus-1')?.magical).toBe(true);
    expect(db24.items.size).toBeGreaterThan(740);
  });
});

describe('2024 rules', () => {
  it('ability increases come from the background, not the species', () => {
    const c = make({ ruleset: R, race: 'dwarf', background: 'soldier', classes: [{ id: 'fighter', level: 1 }], scores: { str: 15, con: 13 }, choices: { 'background:asi': ['str', 'str', 'con'] } });
    const r = d(c);
    expect(r.abilities.str.score).toBe(17);
    expect(r.abilities.con.score).toBe(14);
    expect(r.abilities.dex.score).toBe(10);
  });
  it('ability split allows at most +2 to one ability and only listed abilities', () => {
    const c = make({ ruleset: R, background: 'soldier', choices: { 'background:asi': ['str', 'str', 'str'] } });
    expect(d(c).abilities.str.score).toBe(12);
    const c2 = make({ ruleset: R, background: 'soldier', choices: { 'background:asi': ['wis', 'str', 'dex'] } });
    expect(d(c2).abilities.wis.score).toBe(10);
  });
  it('background grants its origin feat (with preset choices) and languages Common + 2', () => {
    const c = make({ ruleset: R, background: 'criminal', scores: { dex: 14 }, choices: { 'origin:languages': ['Elvish', 'Dwarvish'] } });
    const r = d(c);
    expect(r.features.some((f) => f.def.id === 'alert')).toBe(true);
    expect(r.initiative.total).toBe(2 + 2); // Alert adds proficiency
    expect(r.proficiencies.languages).toEqual(expect.arrayContaining(['Common', 'Elvish', 'Dwarvish']));
    const acolyte = d(make({ ruleset: R, background: 'acolyte' }));
    expect(acolyte.choices.find((x) => x.key.endsWith('magic-initiate:class'))?.selected).toEqual(['mi-cleric']);
  });
  it('exhaustion: −2 per level to d20 tests and −5 ft speed', () => {
    const c = make({ ruleset: R, race: 'dwarf', scores: { dex: 10 } });
    c.combat.exhaustion = 3;
    const r = d(c);
    expect(r.skills.athletics.total).toBe(-6);
    expect(r.saves.dex.total).toBe(-6);
    expect(r.speed.walk.value).toBe(15);
    expect(r.hp.max).toBe(d(make({ ruleset: R, race: 'dwarf' })).hp.max);
  });
  it('long rest restores all Hit Dice; short rest restores one Rage use', () => {
    let c = make({ ruleset: R, classes: [{ id: 'barbarian', level: 5 }] });
    c.combat.hitDiceUsed = { '12': 5 };
    c = useResource(c, 'rage'); c = useResource(c, 'rage');
    const s = shortRest(c, d(c)).character;
    expect(s.resources.rage.used).toBe(1);
    const l = longRest(c, d(c)).character;
    expect(l.combat.hitDiceUsed['12']).toBe(0);
  });
  it('class tables: rage, second wind, focus, sneak attack, prepared spells', () => {
    expect(d(make({ ruleset: R, classes: [{ id: 'barbarian', level: 20 }] })).resources.find((x) => x.id === 'rage')?.max).toBe(6);
    expect(d(make({ ruleset: R, classes: [{ id: 'fighter', level: 4 }] })).resources.find((x) => x.id === 'second-wind')?.max).toBe(3);
    expect(d(make({ ruleset: R, classes: [{ id: 'monk', level: 5 }] })).resources.find((x) => x.id === 'focus')?.max).toBe(5);
    const cleric = d(make({ ruleset: R, classes: [{ id: 'cleric', level: 5 }], scores: { wis: 16 } }));
    expect(cleric.casters[0].preparedLimit).toBe(9);
    const bard = d(make({ ruleset: R, classes: [{ id: 'bard', level: 1 }] }));
    expect(bard.casters[0].spellsKnown).toBe(4);
  });
  it('paladin and ranger cast from level 1 with 2 slots; multiclass rounds half casters up', () => {
    expect(d(make({ ruleset: R, classes: [{ id: 'paladin', level: 1 }], scores: { cha: 14 } })).slots.map((s) => s.max)).toEqual([2]);
    expect(computeSpellSlots([{ progression: 'half-up', level: 3 }, { progression: 'full', level: 1 }]).casterLevel).toBe(3);
  });
  it('weapon mastery shows on attacks only for mastered weapons', () => {
    const base = { ruleset: R, classes: [{ id: 'fighter', level: 1 }], scores: { str: 16 }, equip: ['longsword'] };
    expect(d(make(base)).attacks[0].mastery).toBeUndefined();
    const r = d(make({ ...base, choices: { 'class:fighter:fighter-weapon-mastery:weapons': ['wm-longsword', 'wm-greataxe', 'wm-longbow'] } }));
    expect(r.attacks[0].mastery?.id).toBe('sap');
    expect(r.masteries).toContain('longsword');
  });
  it('2024 ASI feat choice is restricted to general feats; epic boons allow ability up to 30', () => {
    const r = d(make({ ruleset: R, classes: [{ id: 'fighter', level: 4 }] }));
    const asi = r.choices.find((c) => c.def.kind === 'asi')!;
    expect(asi.def.featCategories).toEqual(['general']);
    const c = make({ ruleset: R, classes: [{ id: 'fighter', level: 19 }], scores: { str: 20 }, choices: { 'class:fighter:fighter-epic-boon:boon': ['boon-of-combat-prowess'], 'class:fighter:fighter-epic-boon:boon:boon-of-combat-prowess:boon-of-combat-prowess:ability': ['str'] } });
    expect(d(c).abilities.str.score).toBe(21);
  });
  it('rogue weapon proficiency: martial weapons with Finesse or Light', () => {
    const r = d(make({ ruleset: R, classes: [{ id: 'rogue', level: 1 }], scores: { dex: 16 }, equip: ['rapier'] }));
    expect(r.attacks[0].proficient).toBe(true);
    const r2 = d(make({ ruleset: R, classes: [{ id: 'rogue', level: 1 }], equip: ['longsword'] }));
    expect(r2.attacks[0].proficient).toBe(false);
  });
  it('species: elf lineage spells by level with chosen ability; dragonborn resistance', () => {
    const c = make({ ruleset: R, race: 'elf', subrace: 'elven-lineage-high-elf', classes: [{ id: 'fighter', level: 3 }], scores: { int: 14 }, choices: { 'race:elven-lineage:ability': ['cast-int'] } });
    const r = d(c);
    const dm = r.spells.find((s) => s.spellId === 'detect-magic')!;
    expect(dm).toBeDefined();
    expect(dm.uses?.max).toBe(1);
    expect(r.spells.some((s) => s.spellId === 'misty-step')).toBe(false);
    expect(dm.dc).toBe(8 + 2 + 2);
    expect(d(make({ ruleset: R, race: 'dragonborn', subrace: 'draconic-ancestor-red' })).resistances.map((x) => x.type)).toContain('fire');
  });
  it('monk 2024 martial arts die d6 at level 1', () => {
    expect(d(make({ ruleset: R, classes: [{ id: 'monk', level: 1 }], scores: { dex: 16 } })).attacks.find((a) => a.kind === 'unarmed')?.damageDice).toBe('1d6');
  });
});

describe('equipment slots', () => {
  it('only one suit of armor and one shield', () => {
    let c = make({ carry: ['leather-armor', 'chain-mail', 'shield', 'shield'] });
    const [leather, chain, s1, s2] = c.inventory;
    c = setEquipped(c, leather.id, true).character;
    const r = setEquipped(c, chain.id, true);
    expect(r.unequipped).toEqual(['Leather Armor']);
    c = setEquipped(r.character, s1.id, true).character;
    c = setEquipped(c, s2.id, true).character;
    expect(c.inventory.filter((i) => i.equipped && i.item.armor?.category === 'shield')).toHaveLength(1);
  });
  it('two hands: shield + one weapon, two-handed weapon needs both', () => {
    let c = make({ carry: ['shield', 'longsword', 'dagger', 'greatsword'] });
    const [shield, sword, dagger, great] = c.inventory;
    c = setEquipped(c, shield.id, true).character;
    c = setEquipped(c, sword.id, true).character;
    const r = setEquipped(c, dagger.id, true);
    expect(r.unequipped).toEqual(['Longsword']);
    const r2 = setEquipped(r.character, great.id, true);
    expect(r2.unequipped.sort()).toEqual(['Dagger', 'Shield'].sort());
    expect(r2.character.inventory.filter((i) => i.equipped).map((i) => i.item.name)).toEqual(['Greatsword']);
  });
  it('two light weapons can be wielded together', () => {
    let c = make({ carry: ['dagger', 'shortsword'] });
    c = setEquipped(c, c.inventory[0].id, true).character;
    const r = setEquipped(c, c.inventory[1].id, true);
    expect(r.unequipped).toEqual([]);
  });
});
