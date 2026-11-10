import { describe, it, expect } from 'vitest';
import { make, d } from './helpers';
import { QUICK_EFFECTS } from '@/content/data/quickEffects';
import { convertText, dist, wt } from '@/ui/units';
import { useApp } from '@/state/store';
import { validateCharacter } from '@/io/schema';
import creatures from '@/content/srd/creatures.json';

const apply = (c: ReturnType<typeof make>, id: string) => {
  const q = QUICK_EFFECTS.find((x) => x.id === id)!;
  c.effects.push({ id: `fx-${id}`, name: q.name, effect: structuredClone(q.effect), oneShot: q.oneShot, createdAt: '' });
};

describe('situational dice', () => {
  it('Bless adds +1d4 to attacks and saves (not checks); Bane subtracts', () => {
    const c = make({ equip: ['dagger'] });
    apply(c, 'bless');
    const r = d(c);
    expect(r.attacks[0].attack.parts.some((p) => p.dice === '1d4')).toBe(true);
    expect(r.saves.wis.parts.some((p) => p.dice === '1d4')).toBe(true);
    expect(r.skills.athletics.parts.some((p) => p.dice)).toBe(false);
    const c2 = make(); apply(c2, 'bane');
    expect(d(c2).saves.dex.parts.find((p) => p.dice)?.dice).toBe('-1d4');
  });
  it('Bardic Inspiration and Guidance are one-shot', () => {
    expect(QUICK_EFFECTS.find((q) => q.id === 'bardic-inspiration-d8')?.oneShot).toBe(true);
    const c = make(); apply(c, 'guidance');
    expect(d(c).skills.stealth.parts.find((p) => p.dice)?.source?.kind).toBe('temp');
  });
});

describe('slot warnings for existing data', () => {
  it('warns when more than two hands or rings are used', () => {
    const r = d(make({ equip: ['greatsword', 'shield'] }));
    expect(r.warnings.join(' ')).toMatch(/3 hands/);
    expect(d(make({ equip: ['longsword', 'shield'] })).warnings.join(' ')).not.toMatch(/hands/);
  });
});

describe('undo', () => {
  it('restores the snapshot before a labelled change, in order', () => {
    const c = make(); c.combat.hpCurrent = 10;
    const st = useApp.getState();
    st.replace(c);
    st.update(c.id, (x) => { x.combat.hpCurrent = 4; }, 'Took 6 damage');
    st.update(c.id, (x) => { x.combat.hpCurrent = 9; }, 'Healed 5');
    st.update(c.id, (x) => { x.identity.name = 'typed'; }); // unlabelled edits are not undo steps
    expect(useApp.getState().undo(c.id)).toBe('Healed 5');
    expect(useApp.getState().characters[c.id].combat.hpCurrent).toBe(4);
    expect(useApp.getState().undo(c.id)).toBe('Took 6 damage');
    expect(useApp.getState().characters[c.id].combat.hpCurrent).toBe(10);
    expect(useApp.getState().undo(c.id)).toBeUndefined();
  });
});

describe('metric display', () => {
  it('converts with table conventions', () => {
    expect(dist(30, 'metric')).toBe('9 m');
    expect(dist(5, 'metric')).toBe('1.5 m');
    expect(wt(10, 'metric')).toBe('5 kg');
    expect(convertText('80/320 ft', 'metric')).toBe('24/96 m');
    expect(convertText('Range 120 feet, 3 lb', 'metric')).toBe('Range 36 m, 1.5 kg');
    expect(convertText('30 ft', 'imperial')).toBe('30 ft');
  });
});

describe('companions', () => {
  it('creature templates and schema validation', () => {
    expect(creatures.find((x) => x.id === 'wolf')).toMatchObject({ ac: 13, hp: 11 });
    const c = make();
    c.companions = [{ id: 'p1', name: 'Hoot', kind: 'familiar', ac: 11, hpMax: 1, hpCurrent: 1, hpTemp: 0, speed: '5 ft., fly 60 ft.', abilities: { str: 3, dex: 13, con: 8, int: 2, wis: 12, cha: 7 }, attacks: [], conditions: [], active: true }, { bad: true } as never];
    const v = validateCharacter(JSON.parse(JSON.stringify(c)));
    expect(v.ok).toBe(true);
    expect(v.character!.companions).toHaveLength(1);
    const old = JSON.parse(JSON.stringify(make())); delete old.companions;
    expect(validateCharacter(old).character!.companions).toEqual([]);
  });
});
