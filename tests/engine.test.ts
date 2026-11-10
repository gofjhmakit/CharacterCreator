import { describe, it, expect } from 'vitest';
import { abilityMod, proficiencyBonus, levelForXp } from '@/types/core';
import { make, d, db } from './helpers';
import { computeSpellSlots, pactMagic, FULL_CASTER_SLOTS } from '@/engine/spellSlots';
import { evalFormula, safeFormula } from '@/engine/formula';

describe('ability modifiers', () => {
  it('follows floor((score-10)/2)', () => {
    const table: [number, number][] = [[1, -5], [2, -4], [3, -4], [8, -1], [9, -1], [10, 0], [11, 0], [12, 1], [15, 2], [18, 4], [20, 5], [30, 10]];
    for (const [s, m] of table) expect(abilityMod(s)).toBe(m);
  });
});

describe('proficiency bonus', () => {
  it('progresses +2..+6 by total level', () => {
    const exp = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];
    exp.forEach((pb, i) => expect(proficiencyBonus(i + 1)).toBe(pb));
  });
  it('uses total level for multiclass', () => {
    const c = make({ classes: [{ id: 'fighter', level: 3 }, { id: 'wizard', level: 2 }], scores: { str: 13, int: 13 } });
    expect(d(c).profBonus).toBe(3);
  });
  it('XP thresholds', () => {
    expect(levelForXp(0)).toBe(1); expect(levelForXp(299)).toBe(1); expect(levelForXp(300)).toBe(2);
    expect(levelForXp(6500)).toBe(5); expect(levelForXp(355000)).toBe(20);
  });
});

describe('formula evaluator (no eval)', () => {
  it('evaluates arithmetic and functions', () => {
    expect(evalFormula('1 + 2 * 3', {})).toBe(7);
    expect(evalFormula('max(1, cha)', { cha: -1 })).toBe(1);
    expect(evalFormula('steps(cl, 1, 2, 3, 3, 6, 4)', { cl: 5 })).toBe(3);
    expect(evalFormula('floor(cl / 2)', { cl: 5 })).toBe(2);
  });
  it('rejects code injection safely', () => {
    expect(() => evalFormula('alert(1)', {})).toThrow();
    expect(() => evalFormula('constructor', {})).toThrow();
    expect(safeFormula('process.exit()', {}, 7)).toBe(7);
  });
});

describe('racial features', () => {
  it('applies racial ASI and traits once', () => {
    const c = make({ race: 'dwarf', subrace: 'hill-dwarf', classes: [{ id: 'cleric', level: 3, sub: 'life' }], scores: { con: 14, wis: 15 } });
    const r = d(c);
    expect(r.abilities.con.score).toBe(16);
    expect(r.abilities.wis.score).toBe(16);
    expect(r.speed.walk.value).toBe(25);
    expect(r.senses.find((s) => s.name === 'darkvision')?.range).toBe(60);
    expect(r.resistances.filter((x) => x.type === 'poison')).toHaveLength(1);
    expect(r.proficiencies.languages).toEqual(expect.arrayContaining(['Common', 'Dwarvish']));
    // Hill dwarf toughness: +1 per level. Cleric 3, d8, con +3: 8+3 + (5+3)*2 = 27, +3 = 30
    expect(r.hp.max).toBe(30);
  });
  it('drow replaces darkvision with superior darkvision and adds innate spells by level', () => {
    const c1 = make({ race: 'elf', subrace: 'drow', classes: [{ id: 'rogue', level: 1 }] });
    const r1 = d(c1);
    expect(r1.senses.find((s) => s.name === 'darkvision')?.range).toBe(120);
    expect(r1.spells.map((s) => s.spellId)).toContain('dancing-lights');
    expect(r1.spells.map((s) => s.spellId)).not.toContain('faerie-fire');
    const c3 = make({ race: 'elf', subrace: 'drow', classes: [{ id: 'rogue', level: 3 }] });
    expect(d(c3).spells.map((s) => s.spellId)).toContain('faerie-fire');
  });
  it('half-elf flexible ability choices', () => {
    const c = make({ race: 'half-elf', choices: { 'race:asi-1': ['str', 'con'] } });
    const r = d(c);
    expect(r.abilities.cha.score).toBe(12);
    expect(r.abilities.str.score).toBe(11);
    expect(r.abilities.con.score).toBe(11);
  });
  it('variant human ignores +1 all and gets feat', () => {
    const c = make({ race: 'human', subrace: 'variant-human', choices: { 'subrace:asi-1': ['dex', 'con'], 'subrace:vh-feat:feat': ['alert'] } });
    const r = d(c);
    expect(r.abilities.str.score).toBe(10);
    expect(r.abilities.dex.score).toBe(11);
    expect(r.initiative.total).toBe(5); // dex 11 → 0, alert +5
  });
});

describe('skills, expertise, saves, initiative', () => {
  it('skill proficiency and expertise', () => {
    const c = make({ classes: [{ id: 'rogue', level: 1 }], scores: { dex: 16 }, choices: { 'class:rogue:skills': ['stealth', 'perception', 'acrobatics', 'deception'], 'class:rogue:rogue-expertise-1:expertise': ['stealth', 'perception'] } });
    const r = d(c);
    expect(r.skills.stealth.total).toBe(3 + 4);
    expect(r.skills.acrobatics.total).toBe(3 + 2);
    expect(r.skills.athletics.total).toBe(0);
    expect(r.passives.perception.total).toBe(10 + 0 + 4);
  });
  it('jack of all trades adds half proficiency to unproficient checks and initiative', () => {
    const c = make({ classes: [{ id: 'bard', level: 2 }], scores: { dex: 14 } });
    const r = d(c);
    expect(r.skills.athletics.total).toBe(1);
    expect(r.initiative.total).toBe(2 + 1);
  });
  it('saving throws from first class only', () => {
    const c = make({ classes: [{ id: 'fighter', level: 1 }, { id: 'wizard', level: 1 }], scores: { str: 14, con: 12, int: 13 } });
    const r = d(c);
    expect(r.saves.str.proficient).toBe(true);
    expect(r.saves.con.proficient).toBe(true);
    expect(r.saves.int.proficient).toBe(false);
    expect(r.saves.str.total).toBe(2 + 2);
  });
  it('aura of protection adds CHA to saves', () => {
    const c = make({ classes: [{ id: 'paladin', level: 6, sub: 'devotion' }], scores: { cha: 16 } });
    const r = d(c);
    expect(r.saves.wis.total).toBe(0 + 3 + 3);
    expect(r.saves.str.total).toBe(0 + 3);
  });
});

describe('armor class', () => {
  it('unarmored = 10 + DEX', () => {
    expect(d(make({ scores: { dex: 14 } })).ac.total).toBe(12);
  });
  it('light, medium (dex cap 2), heavy (no dex), shield', () => {
    expect(d(make({ scores: { dex: 18 }, equip: ['leather-armor'] })).ac.total).toBe(11 + 4);
    expect(d(make({ scores: { dex: 18 }, equip: ['half-plate-armor'] })).ac.total).toBe(15 + 2);
    expect(d(make({ scores: { dex: 18, str: 15 }, equip: ['plate-armor', 'shield'] })).ac.total).toBe(18 + 2);
  });
  it('barbarian unarmored defense vs armor: best valid formula, no stacking', () => {
    const r = d(make({ classes: [{ id: 'barbarian', level: 1 }], scores: { dex: 14, con: 16 } }));
    expect(r.ac.total).toBe(10 + 2 + 3);
    expect(r.ac.formula).toMatch(/Unarmored Defense/);
    const r2 = d(make({ classes: [{ id: 'barbarian', level: 1 }], scores: { dex: 14, con: 16 }, equip: ['scale-mail'] }));
    expect(r2.ac.total).toBe(14 + 2);
    expect(r2.ac.candidates.find((x) => /Unarmored Defense/.test(x.label))?.valid).toBe(false);
  });
  it('monk unarmored defense invalid with shield', () => {
    const r = d(make({ classes: [{ id: 'monk', level: 1 }], scores: { dex: 16, wis: 16 } }));
    expect(r.ac.total).toBe(16);
    const r2 = d(make({ classes: [{ id: 'monk', level: 1 }], scores: { dex: 16, wis: 16 }, equip: ['shield'] }));
    expect(r2.ac.total).toBe(10 + 3 + 2);
  });
  it('fighting style defense requires armor; ring/cloak stack; same item does not stack', () => {
    const c = make({ classes: [{ id: 'fighter', level: 1 }], scores: { dex: 10, str: 15 }, equip: ['chain-mail', 'mi-ring-of-protection', 'mi-cloak-of-protection'], choices: { 'class:fighter:fighter-fighting-style:style': ['fs-defense'] } });
    expect(d(c).ac.total).toBe(16 + 1 + 1 + 1);
    const c2 = make({ scores: { dex: 10 }, equip: ['mi-ring-of-protection', 'mi-ring-of-protection'] });
    expect(d(c2).ac.total).toBe(11);
  });
  it('+N armor and shields', () => {
    expect(d(make({ scores: { dex: 10, str: 15 }, equip: ['plate-armor-plus-2', 'shield-plus-1'] })).ac.total).toBe(18 + 2 + 2 + 1);
  });
  it('bracers of defense only while unarmored and no shield', () => {
    expect(d(make({ scores: { dex: 14 }, equip: ['mi-bracers-of-defense'] })).ac.total).toBe(14);
    expect(d(make({ scores: { dex: 14 }, equip: ['mi-bracers-of-defense', 'leather-armor'] })).ac.total).toBe(13);
  });
  it('draconic resilience 13 + dex', () => {
    expect(d(make({ classes: [{ id: 'sorcerer', level: 1, sub: 'draconic' }], scores: { dex: 14 } })).ac.total).toBe(15);
  });
  it('manual override', () => {
    const c = make({ scores: { dex: 14 } });
    c.settings.overrides.ac = 21;
    expect(d(c).ac.total).toBe(21);
  });
});

describe('hit points & hit dice', () => {
  it('max at first level, average afterwards, con per level', () => {
    const c = make({ classes: [{ id: 'fighter', level: 5 }], scores: { con: 14 } });
    expect(d(c).hp.max).toBe(10 + 2 + 4 * (6 + 2));
  });
  it('uses rolled HP when recorded', () => {
    const c = make({ classes: [{ id: 'wizard', level: 3 }], scores: { con: 12 } });
    c.classes[0].hpRolls = [1, 6];
    expect(d(c).hp.max).toBe(6 + 1 + (1 + 1) + (6 + 1));
  });
  it('multiclass: second class uses average from its first level, hit dice grouped by die', () => {
    const c = make({ classes: [{ id: 'fighter', level: 2 }, { id: 'wizard', level: 2 }], scores: { con: 10, str: 13, int: 13 } });
    const r = d(c);
    expect(r.hp.max).toBe(10 + 6 + 4 + 4);
    expect(r.hitDice).toEqual([expect.objectContaining({ die: 10, total: 2 }), expect.objectContaining({ die: 6, total: 2 })]);
  });
  it('tough feat +2 per level', () => {
    const c = make({ classes: [{ id: 'fighter', level: 4 }], scores: { con: 10 }, choices: { 'class:fighter:asi-4': ['feat:tough'] } });
    expect(d(c).hp.max).toBe(10 + 3 * 6 + 8);
  });
});

describe('spellcasting', () => {
  it('spell save DC and attack bonus', () => {
    const r = d(make({ classes: [{ id: 'wizard', level: 5 }], scores: { int: 18 } }));
    expect(r.casters[0].dc.total).toBe(8 + 3 + 4);
    expect(r.casters[0].attack.total).toBe(3 + 4);
    expect(r.casters[0].preparedLimit).toBe(4 + 5);
  });
  it('full caster slot table', () => {
    expect(computeSpellSlots([{ progression: 'full', level: 1 }]).slots.slice(0, 2)).toEqual([2, 0]);
    expect(computeSpellSlots([{ progression: 'full', level: 5 }]).slots.slice(0, 3)).toEqual([4, 3, 2]);
    expect(computeSpellSlots([{ progression: 'full', level: 20 }]).slots).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });
  it('single-class half and third casters round up', () => {
    expect(computeSpellSlots([{ progression: 'half', level: 1 }]).slots[0]).toBe(0);
    expect(computeSpellSlots([{ progression: 'half', level: 2 }]).slots[0]).toBe(2);
    expect(computeSpellSlots([{ progression: 'half', level: 5 }]).slots.slice(0, 2)).toEqual([4, 2]);
    expect(computeSpellSlots([{ progression: 'third', level: 3 }]).slots[0]).toBe(2);
    expect(computeSpellSlots([{ progression: 'third', level: 7 }]).slots.slice(0, 2)).toEqual([4, 2]);
  });
  it('multiclass spellcasting rounds down per class and sums', () => {
    // Paladin 5 (2) + Sorcerer 3 (3) = 5 → 4/3/2
    expect(computeSpellSlots([{ progression: 'half', level: 5 }, { progression: 'full', level: 3 }]).slots.slice(0, 3)).toEqual([4, 3, 2]);
    // Fighter EK 7 (2) + Wizard 3 (3) = 5
    expect(computeSpellSlots([{ progression: 'third', level: 7 }, { progression: 'full', level: 3 }]).casterLevel).toBe(5);
    // Paladin 1 + Ranger 1 = 0
    expect(computeSpellSlots([{ progression: 'half', level: 1 }, { progression: 'half', level: 1 }]).casterLevel).toBe(0);
  });
  it('pact magic is separate from spell slots', () => {
    expect(pactMagic(1)).toEqual({ slots: 1, slotLevel: 1 });
    expect(pactMagic(5)).toEqual({ slots: 2, slotLevel: 3 });
    expect(pactMagic(11)).toEqual({ slots: 3, slotLevel: 5 });
    expect(pactMagic(17)).toEqual({ slots: 4, slotLevel: 5 });
    const c = make({ classes: [{ id: 'warlock', level: 3, sub: 'fiend' }, { id: 'sorcerer', level: 2, sub: 'draconic' }], scores: { cha: 16 } });
    const r = d(c);
    expect(r.pact).toEqual({ slots: 2, level: 2, used: 0 });
    expect(r.slots.map((s) => s.max)).toEqual([3]);
  });
  it('eldritch knight gets third-caster slots only from 3rd level with subclass', () => {
    expect(d(make({ classes: [{ id: 'fighter', level: 2 }], scores: { int: 14 } })).slots).toEqual([]);
    const r = d(make({ classes: [{ id: 'fighter', level: 3, sub: 'eldritch-knight' }], scores: { int: 14 } }));
    expect(r.slots.map((s) => s.max)).toEqual([2]);
    expect(r.casters[0].spellsKnown).toBe(3);
  });
  it('domain spells are always prepared and do not count against limit', () => {
    const r = d(make({ classes: [{ id: 'cleric', level: 3, sub: 'twilight' }], scores: { wis: 16 } }));
    const always = r.spells.filter((s) => s.alwaysPrepared).map((s) => s.spellId);
    expect(always).toEqual(expect.arrayContaining(['faerie-fire', 'sleep', 'moonbeam', 'see-invisibility']));
    expect(always).not.toContain('aura-of-vitality');
  });
  it('FULL table sanity', () => expect(FULL_CASTER_SLOTS[17]).toEqual([4, 3, 3, 3, 2, 1, 1, 1, 1]));
});

describe('class progression & subclass feature unlocking', () => {
  it('does not grant features before their level', () => {
    const r1 = d(make({ classes: [{ id: 'fighter', level: 1 }] }));
    expect(r1.features.some((f) => f.def.id === 'action-surge')).toBe(false);
    const r2 = d(make({ classes: [{ id: 'fighter', level: 2 }] }));
    expect(r2.features.some((f) => f.def.id === 'action-surge')).toBe(true);
  });
  it('twilight cleric gets features at correct levels', () => {
    const lvl1 = d(make({ classes: [{ id: 'cleric', level: 1, sub: 'twilight' }], scores: { wis: 16 } }));
    expect(lvl1.senses.find((s) => s.name === 'darkvision')?.range).toBe(300);
    expect(lvl1.proficiencies.armor).toContain('Heavy armor');
    expect(lvl1.features.some((f) => f.def.id === 'twilight-sanctuary')).toBe(false);
    const lvl2 = d(make({ classes: [{ id: 'cleric', level: 2, sub: 'twilight' }], scores: { wis: 16 } }));
    expect(lvl2.features.some((f) => f.def.id === 'twilight-sanctuary')).toBe(true);
    expect(lvl2.resources.find((x) => x.id === 'channel-divinity')?.max).toBe(1);
    const lvl6 = d(make({ classes: [{ id: 'cleric', level: 6, sub: 'twilight' }], scores: { wis: 16 } }));
    expect(lvl6.resources.find((x) => x.id === 'steps-of-night')?.max).toBe(3);
    expect(lvl6.resources.find((x) => x.id === 'channel-divinity')?.max).toBe(2);
  });
  it('subclass selected below its level is not applied', () => {
    const r = d(make({ classes: [{ id: 'fighter', level: 2, sub: 'champion' }] }));
    expect(r.features.some((f) => f.def.id === 'improved-critical')).toBe(false);
    expect(r.warnings.join(' ')).toMatch(/level 3 is required/);
  });
  it('champion crit range and replaced feature', () => {
    const r = d(make({ classes: [{ id: 'fighter', level: 15, sub: 'champion' }], scores: { str: 16 }, equip: ['longsword'] }));
    expect(r.attacks[0].critRange).toBe(18);
    expect(r.features.some((f) => f.def.id === 'improved-critical')).toBe(false);
  });
  it('resources scale: rage, ki, bardic inspiration recharge change at 5', () => {
    expect(d(make({ classes: [{ id: 'barbarian', level: 6 }] })).resources.find((r) => r.id === 'rage')?.max).toBe(4);
    expect(d(make({ classes: [{ id: 'monk', level: 1 }] })).resources.find((r) => r.id === 'ki')).toBeUndefined();
    expect(d(make({ classes: [{ id: 'monk', level: 7 }] })).resources.find((r) => r.id === 'ki')?.max).toBe(7);
    const b4 = d(make({ classes: [{ id: 'bard', level: 4 }], scores: { cha: 16 } })).resources.find((r) => r.id === 'bardic-inspiration')!;
    expect(b4).toMatchObject({ max: 3, recharge: 'long', die: 'd6' });
    const b5 = d(make({ classes: [{ id: 'bard', level: 5 }], scores: { cha: 16 } })).resources.find((r) => r.id === 'bardic-inspiration')!;
    expect(b5).toMatchObject({ max: 3, recharge: 'short', die: 'd8' });
  });
  it('ASI applies and is capped at 20', () => {
    const c = make({ classes: [{ id: 'fighter', level: 4 }], scores: { str: 19 }, choices: { 'class:fighter:asi-4': ['str', 'str'] } });
    expect(d(c).abilities.str.score).toBe(20);
  });
  it('primal champion raises max to 24', () => {
    const c = make({ classes: [{ id: 'barbarian', level: 20 }], scores: { str: 20, con: 18 } });
    const r = d(c);
    expect(r.abilities.str.score).toBe(24);
    expect(r.abilities.con.score).toBe(23); // 18 + 1 (human) + 4
  });
});

describe('equipment & attacks', () => {
  it('finesse uses better of STR/DEX, proficiency applies', () => {
    const r = d(make({ classes: [{ id: 'rogue', level: 1 }], scores: { str: 8, dex: 16 }, equip: ['rapier'] }));
    const a = r.attacks.find((x) => x.name === 'Rapier')!;
    expect(a.ability).toBe('dex');
    expect(a.attack.total).toBe(3 + 2);
    expect(a.damageBonus.total).toBe(3);
  });
  it('non-proficient weapon gets no proficiency', () => {
    const r = d(make({ classes: [{ id: 'wizard', level: 1 }], scores: { str: 14 }, equip: ['greataxe'] }));
    const a = r.attacks.find((x) => x.name === 'Greataxe')!;
    expect(a.proficient).toBe(false);
    expect(a.attack.total).toBe(2);
  });
  it('magic weapon bonuses and archery style', () => {
    const c = make({ classes: [{ id: 'fighter', level: 1 }], scores: { dex: 16 }, equip: ['longbow-plus-1'], choices: { 'class:fighter:fighter-fighting-style:style': ['fs-archery'] } });
    const a = d(c).attacks.find((x) => x.itemInstanceId)!;
    expect(a.attack.total).toBe(3 + 2 + 1 + 2);
    expect(a.damageBonus.total).toBe(3 + 1);
  });
  it('dueling applies only with one one-handed melee weapon', () => {
    const base = { classes: [{ id: 'fighter', level: 1 }], scores: { str: 16 }, choices: { 'class:fighter:fighter-fighting-style:style': ['fs-dueling'] } };
    expect(d(make({ ...base, equip: ['longsword', 'shield'] })).attacks[0].damageBonus.total).toBe(5);
    expect(d(make({ ...base, equip: ['greatsword'] })).attacks[0].damageBonus.total).toBe(3);
  });
  it('rage damage applies only to STR melee while raging and not in heavy armor', () => {
    const c = make({ classes: [{ id: 'barbarian', level: 9 }], scores: { str: 16 }, equip: ['greataxe'] });
    expect(d(c).attacks[0].damageBonus.total).toBe(3);
    c.combat.toggles.rage = true;
    const r = d(c);
    expect(r.attacks[0].damageBonus.total).toBe(3 + 3);
    expect(r.resistances.map((x) => x.type)).toEqual(expect.arrayContaining(['bludgeoning', 'piercing', 'slashing']));
    expect(r.checks.str.mode).toBe('advantage');
  });
  it('monk martial arts die and dex for unarmed', () => {
    const r = d(make({ classes: [{ id: 'monk', level: 5 }], scores: { dex: 16, str: 10 } }));
    const u = r.attacks.find((a) => a.kind === 'unarmed')!;
    expect(u.damageDice).toBe('1d6');
    expect(u.ability).toBe('dex');
  });
  it('sneak attack rider expands dice by rogue level', () => {
    const r = d(make({ classes: [{ id: 'rogue', level: 5 }], scores: { dex: 16 }, equip: ['shortsword'] }));
    const rider = r.attacks[0].riders.find((x) => x.label === 'Sneak Attack')!;
    expect(rider.outcomes?.[0].dice).toBe('3d6');
  });
  it('heavy armor STR requirement reduces speed; dwarves ignore it', () => {
    expect(d(make({ scores: { str: 10 }, equip: ['plate-armor'] })).speed.walk.value).toBe(20);
    expect(d(make({ race: 'dwarf', subrace: 'mountain-dwarf', scores: { str: 10 }, equip: ['plate-armor'] })).speed.walk.value).toBe(25);
  });
  it('carrying capacity and push/drag/lift; powerful build doubles', () => {
    const r = d(make({ scores: { str: 15 } }));
    expect(r.carrying.capacity).toBe(16 * 15); // human +1 STR
    expect(r.carrying.pushDragLift).toBe(16 * 30);
    expect(d(make({ race: 'goliath', scores: { str: 15 } })).carrying.capacity).toBe(17 * 15 * 2);
  });
});

describe('item effect activation and attunement', () => {
  it('effects require equipped + attuned when attunement is required', () => {
    const c = make({ scores: { dex: 10 }, equip: ['mi-ring-of-protection'] });
    expect(d(c).ac.total).toBe(11);
    c.inventory[0].attuned = false;
    expect(d(c).ac.total).toBe(10);
    c.inventory[0].attuned = true;
    c.inventory[0].equipped = false;
    expect(d(c).ac.total).toBe(10);
  });
  it('belt of giant strength sets score; lower score belt has no effect', () => {
    const c = make({ scores: { str: 22 }, equip: ['mi-belt-of-giant-strength-hill'] });
    // base 22 is capped at 20 by normal max; belt sets 21
    expect(d(c).abilities.str.score).toBe(21);
  });
  it('attunement over limit warns', () => {
    const c = make({ equip: ['mi-ring-of-protection', 'mi-cloak-of-protection', 'mi-bracers-of-defense', 'mi-amulet-of-health'] });
    expect(d(c).warnings.join(' ')).toMatch(/limit is 3/);
  });
  it('flame tongue extra damage only when toggled ablaze', () => {
    const c = make({ scores: { str: 14 }, equip: ['mi-flame-tongue'] });
    let r = d(c);
    expect(r.toggles.some((t) => t.name === 'Ablaze')).toBe(true);
    const atk = () => r.attacks.find((a) => a.name === 'Flame Tongue')!;
    expect(atk().extraDamage).toEqual([]);
    c.inventory[0].toggles = { [c.inventory[0].item.effects[0].id]: true };
    r = d(c);
    expect(atk().extraDamage).toEqual([expect.objectContaining({ dice: '2d6', type: 'fire' })]);
  });
});

describe('conditions', () => {
  it('poisoned imposes disadvantage on attacks and checks', () => {
    const c = make({ equip: ['dagger'] });
    c.combat.conditions = ['poisoned'];
    const r = d(c);
    expect(r.attacks[0].attack.mode).toBe('disadvantage');
    expect(r.skills.athletics.mode).toBe('disadvantage');
  });
  it('grappled sets speed to 0; unconscious implies prone and incapacitated', () => {
    const c = make();
    c.combat.conditions = ['grappled'];
    expect(d(c).speed.walk.value).toBe(0);
    c.combat.conditions = ['unconscious'];
    expect(d(c).activeConditions).toEqual(expect.arrayContaining(['unconscious', 'prone', 'incapacitated']));
  });
  it('advantage and disadvantage cancel regardless of count', () => {
    const c = make({ classes: [{ id: 'barbarian', level: 7 }] }); // feral instinct: adv initiative
    c.combat.conditions = ['poisoned']; // dis on checks (initiative is a DEX check)
    expect(d(c).initiative.mode).toBe('normal');
  });
  it('exhaustion levels', () => {
    const c = make({ classes: [{ id: 'fighter', level: 1 }], scores: { con: 10 } });
    c.combat.exhaustion = 2;
    expect(d(c).speed.walk.value).toBe(15);
    c.combat.exhaustion = 4;
    expect(d(c).hp.max).toBe(5);
  });
  it('condition immunity granted by features', () => {
    expect(d(make({ classes: [{ id: 'paladin', level: 10 }] })).conditionImmunities.map((x) => x.type)).toContain('frightened');
  });
});

describe('multiclass', () => {
  it('multiclass proficiencies are the reduced set', () => {
    const r = d(make({ classes: [{ id: 'wizard', level: 1 }, { id: 'fighter', level: 1 }], scores: { int: 13, str: 13 } }));
    expect(r.proficiencies.armor).toEqual(expect.arrayContaining(['Light armor', 'Medium armor', 'Shields']));
    expect(r.proficiencies.armor).not.toContain('Heavy armor');
    expect(r.saves.str.proficient).toBe(false);
  });
  it('class line shows levels', () => {
    expect(d(make({ classes: [{ id: 'fighter', level: 5, sub: 'champion' }, { id: 'wizard', level: 3, sub: 'evocation' }], scores: { str: 13, int: 13 } })).classLine).toBe('Fighter (Champion) 5 / Wizard (School of Evocation) 3');
  });
});

describe('content references', () => {
  it('db exposes subclasses for cleric incl. twilight', () => {
    expect(db.subclassesFor('cleric').map((s) => s.id)).toContain('twilight');
  });
});
