import { describe, it, expect } from 'vitest';
import { make, d, db } from './helpers';
import { addItem } from '@/engine/inventory';
import { describeOutcomes } from '@/engine/derive';
import { validateItem } from '@/content/validate';
import { matchesTime } from '@/ui/components/spells';
import type { ItemDefinition } from '@/types/content';

const revivingHands: ItemDefinition = {
  id: 'custom-reviving-hands', name: 'Reviving Hands', category: 'wondrous', type: 'Wondrous item (gloves)', rarity: 'very-rare', weight: 0, magical: true,
  attunement: { required: true }, source: { book: 'Homebrew', kind: 'custom' }, description: 'Very rare gloves.',
  spells: [{ spellId: 'revivify', uses: 1, recharge: 'long' }],
  effects: [
    { id: 'rh-heal', name: 'Warding touch', activation: 'attuned', trigger: 'on-heal', target: 'target', outcomes: [{ kind: 'spell-effect', spellId: 'blade-ward' }] },
    { id: 'rh-revive', name: 'Deathless touch', activation: 'attuned', trigger: 'on-revive', target: 'target', outcomes: [{ kind: 'spell-effect', spellId: 'death-ward' }] },
  ],
};

describe('items that cast spells and trigger on heal/revive', () => {
  it('validates', () => {
    expect(validateItem(revivingHands).filter((i) => i.level === 'error')).toEqual([]);
    expect(validateItem({ ...revivingHands, spells: [{ spellId: '' }] }).some((i) => i.level === 'error')).toBe(true);
  });
  it('grants Revivify (1/long rest) only while equipped and attuned', () => {
    let c = addItem(make({ classes: [{ id: 'cleric', level: 5 }], scores: { wis: 16 } }), revivingHands);
    expect(d(c).spells.some((s) => s.spellId === 'revivify' && s.granted)).toBe(false);
    c.inventory[0].equipped = true; c.inventory[0].attuned = true;
    const r = d(c);
    const rev = r.spells.find((s) => s.spellId === 'revivify' && s.granted)!;
    expect(rev.uses).toMatchObject({ max: 1, used: 0 });
    expect(rev.sourceLabel).toContain('Reviving Hands');
    expect(r.resources.some((x) => x.id === rev.uses!.resourceId)).toBe(true);
  });
  it('surfaces on-heal and on-revive triggers with spell effects', () => {
    const c = addItem(make(), revivingHands);
    c.inventory[0].equipped = true; c.inventory[0].attuned = true;
    const r = d(c);
    expect(r.triggers.map((t) => t.trigger).sort()).toEqual(['on-heal', 'on-revive']);
    expect(r.triggers.find((t) => t.trigger === 'on-revive')!.text).toMatch(/Death Ward/);
    expect(describeOutcomes(revivingHands.effects[0], undefined, db)).toMatch(/When you heal a creature: apply the effect of blade ward/i);
  });
  it('charge-based item spells expose remaining charges', () => {
    const wand = { ...db.items.get('mi-wand-of-magic-missiles')!, spells: [{ spellId: 'magic-missile', chargeCost: 1 }] };
    const c = addItem(make(), wand);
    c.inventory[0].equipped = true;
    const s = d(c).spells.find((x) => x.spellId === 'magic-missile')!;
    expect(s.charges).toMatchObject({ cost: 1, remaining: 7, max: 7 });
  });
});

describe('spell filters', () => {
  it('casting time buckets work for 2014 and 2024 wording', () => {
    expect(matchesTime('1 action', 'action')).toBe(true);
    expect(matchesTime('Action', 'action')).toBe(true);
    expect(matchesTime('1 bonus action', 'bonus')).toBe(true);
    expect(matchesTime('Bonus Action', 'action')).toBe(false);
    expect(matchesTime('1 minute', 'long')).toBe(true);
  });
});
