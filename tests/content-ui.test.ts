// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChoiceEditor, choiceComplete } from '@/ui/components/ChoiceEditor';
import { FeaturesTab } from '@/ui/views/tabs/FeaturesTab';
import { SpellsTab } from '@/ui/views/tabs/SpellsTab';
import { HpPanel } from '@/ui/views/panels';
import { SpellEditor } from '@/ui/views/ContentEditors';
import { availableSpells } from '@/ui/components/spells';
import { RulesetProvider } from '@/ui/ruleset';
import { addItem } from '@/engine/inventory';
import type { SpellDef } from '@/types/content';
import { useApp } from '@/state/store';
import { make, d, db } from './helpers';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  useApp.setState({ rolls: [], toasts: [], prefs: { ...useApp.getState().prefs, autoAdvantage: true } });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function click(element: Element | undefined | null) {
  expect(element).toBeTruthy();
  act(() => element!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

function knowledgeUseButton() {
  const feature = [...container.querySelectorAll('.feature')].find((entry) => entry.querySelector('h4')?.textContent?.includes('Knowledge from a Past Life'));
  return [...(feature?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find((button) => button.textContent?.startsWith('Use'));
}

describe('flexible racial ability editor', () => {
  it.each(['shadar-kai', 'reborn'])('selects any three distinct abilities for %s', (race) => {
    const c = make({ race });
    const render = () => {
      const derived = d(c);
      const cv = derived.choices.find((choice) => choice.key === 'race:asi')!;
      root.render(createElement(ChoiceEditor, { cv, ch: c, d: derived, onChange: (values) => {
        c.choices[cv.key] = values;
        render();
      } }));
    };
    act(render);
    click([...container.querySelectorAll('button')].find((button) => button.textContent === '+1 to three'));
    for (const ability of ['DEX', 'CON', 'WIS']) {
      click([...container.querySelectorAll('label')].find((label) => label.textContent?.startsWith(ability))?.querySelector('input'));
    }
    expect(c.choices['race:asi']).toEqual(['dex', 'con', 'wis']);
    expect(container.querySelector<HTMLInputElement>('label input:not(:checked)')?.disabled).toBe(true);
    const derived = d(c);
    expect(derived.abilities.dex.score).toBe(11);
    expect(derived.abilities.str.score).toBe(10);
    const cv = derived.choices.find((choice) => choice.key === 'race:asi')!;
    expect(choiceComplete(cv)).toBe(true);
    expect(choiceComplete({ ...cv, selected: ['str', 'dex', 'con', 'int', 'wis', 'cha'] })).toBe(false);
    expect(choiceComplete({ ...cv, selected: ['dex', 'dex', 'dex'] })).toBe(false);
  });
});

describe('Knowledge from a Past Life action', () => {
  it.each(['dnd5e-2014', 'dnd5e-2024'] as const)('rolls a bonus and spends exactly one use in %s', (ruleset) => {
    const c = make({ ruleset, race: 'reborn' });
    const render = () => root.render(createElement(RulesetProvider, { value: ruleset }, createElement(FeaturesTab, {
      ch: c, d: d(c), set: (recipe) => { recipe(c); render(); }, replace: vi.fn(),
    })));
    act(render);
    click(knowledgeUseButton());
    const rolls = useApp.getState().rolls;
    expect(rolls).toHaveLength(1);
    expect(rolls[0]).toMatchObject({ label: 'Knowledge from a Past Life', kind: 'custom' });
    expect(rolls[0].total).toBeGreaterThanOrEqual(1);
    expect(rolls[0].total).toBeLessThanOrEqual(6);
    expect(c.resources['knowledge-from-a-past-life'].used).toBe(1);
    click(knowledgeUseButton());
    expect(c.resources['knowledge-from-a-past-life'].used).toBe(2);
    expect(knowledgeUseButton()?.disabled).toBe(true);
    click(knowledgeUseButton());
    expect(useApp.getState().rolls).toHaveLength(2);
  });

  it('does not spend a use when the roll fails', () => {
    const c = make({ race: 'reborn' });
    const derived = d(c);
    const feature = derived.features.find((f) => f.def.id === 'knowledge-from-a-past-life')!;
    feature.def = { ...feature.def, effects: [{ id: 'invalid-roll', trigger: 'on-use', outcomes: [{ kind: 'bonus', dice: 'invalid' }] }] };
    act(() => root.render(createElement(FeaturesTab, { ch: c, d: derived, set: (recipe) => recipe(c), replace: vi.fn() })));
    click(knowledgeUseButton());
    expect(c.resources['knowledge-from-a-past-life']?.used ?? 0).toBe(0);
    expect(useApp.getState().rolls).toHaveLength(0);
    expect(useApp.getState().toasts.some((toast) => toast.kind === 'error')).toBe(true);
  });
});

describe('Reborn death-save button', () => {
  it.each(['dnd5e-2014', 'dnd5e-2024'] as const)('rolls two d20s and keeps the higher in %s', (ruleset) => {
    const c = make({ ruleset, race: 'reborn' });
    c.combat.hpCurrent = 0;
    const replace = vi.fn();
    act(() => root.render(createElement(RulesetProvider, { value: ruleset }, createElement(HpPanel, {
      ch: c, d: d(c), set: vi.fn(), replace,
    }))));
    click([...container.querySelectorAll('button')].find((button) => button.textContent === 'Roll death save'));
    const rolls = useApp.getState().rolls;
    expect(rolls).toHaveLength(1);
    expect(rolls[0]).toMatchObject({ kind: 'death-save', mode: 'advantage' });
    expect(rolls[0].terms[0].rolls).toHaveLength(2);
    expect(rolls[0].natural).toBe(Math.max(...rolls[0].terms[0].rolls));
    expect(replace).toHaveBeenCalledOnce();
  });

  it('respects the preference to disable automatic advantage', () => {
    useApp.setState({ prefs: { ...useApp.getState().prefs, autoAdvantage: false } });
    const c = make({ race: 'reborn' });
    c.combat.hpCurrent = 0;
    act(() => root.render(createElement(HpPanel, { ch: c, d: d(c), set: vi.fn(), replace: vi.fn() })));
    click([...container.querySelectorAll('button')].find((button) => button.textContent === 'Roll death save'));
    const roll = useApp.getState().rolls[0];
    expect(roll.mode).toBe('normal');
    expect(roll.terms[0].rolls).toHaveLength(1);
  });

  it('reports invalid death-save dice without replacing the character or recording a roll', () => {
    const c = make({ race: 'reborn' });
    c.combat.hpCurrent = 0;
    c.effects.push({ id: 'invalid', name: 'Invalid dice', createdAt: '', oneShot: true, effect: { id: 'invalid', modifiers: [{ target: 'save:death', op: 'add', dice: 'invalid' }] } });
    const replace = vi.fn();
    act(() => root.render(createElement(HpPanel, { ch: c, d: d(c), set: vi.fn(), replace })));
    click([...container.querySelectorAll('button')].find((button) => button.textContent === 'Roll death save'));
    expect(replace).not.toHaveBeenCalled();
    expect(useApp.getState().rolls).toHaveLength(0);
    expect(useApp.getState().toasts.some((toast) => toast.kind === 'error')).toBe(true);
    expect(c.effects).toHaveLength(1);
  });
});

describe('Conjure Barrage casting', () => {
  it('retains the damage-roll button for every higher slot', () => {
    const c = make({ classes: [{ id: 'ranger', level: 5 }, { id: 'wizard', level: 15 }] });
    c.spells.entries.push({ id: 'barrage', spellId: 'conjure-barrage', classId: 'ranger', source: 'class', prepared: true });
    act(() => root.render(createElement(SpellsTab, { ch: c, d: d(c), set: vi.fn(), replace: vi.fn() })));
    const spell = [...container.querySelectorAll('tr')].find((entry) => entry.textContent?.includes('Conjure Barrage'));
    click([...spell?.querySelectorAll('button') ?? []].find((button) => button.textContent === 'Cast'));
    const spend = [...document.querySelectorAll('select')].find((select) => [...select.options].some((option) => option.value === 's9'))!;
    expect(spend).toBeTruthy();
    for (let level = 3; level <= 9; level++) {
      act(() => { spend.value = `s${level}`; spend.dispatchEvent(new Event('change', { bubbles: true })); });
      const damage = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Damage 3d8');
      click(damage);
      expect(useApp.getState().rolls[0]).toMatchObject({ label: 'Conjure Barrage damage', expression: '3d8' });
    }
    expect(useApp.getState().rolls).toHaveLength(7);
  });
});

describe('Artificer spell editing and casting', () => {
  it.each(['dnd5e-2014', 'dnd5e-2024'] as const)('assigns a custom spell to the Artificer list in %s', (ruleset) => {
    const onSave = vi.fn<(spell: SpellDef) => void>();
    const initial: SpellDef = { ...db.spells.get('cure-wounds')!, id: 'custom-restoration', name: 'Custom Restoration', classes: [], source: { book: 'Homebrew', kind: 'custom' } };
    act(() => root.render(createElement(RulesetProvider, { value: ruleset }, createElement(SpellEditor, { initial, onSave, onClose: vi.fn() }))));
    click([...document.querySelectorAll('label')].find((label) => label.textContent === 'Artificer')?.querySelector('input'));
    click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Save'));
    expect(onSave).toHaveBeenCalledOnce();
    const saved = onSave.mock.calls[0][0];
    expect(saved.classes).toEqual(['artificer']);
    const c = make({ ruleset, classes: [{ id: 'artificer', level: 1 }] });
    const derived = d(c);
    expect(availableSpells(derived.casters[0], derived, [saved], c)).toEqual([saved]);
  });

  it.each(['dnd5e-2014', 'dnd5e-2024'] as const)('adds and prepares Greater Restoration through the picker without losing Chemical Mastery in %s', (ruleset) => {
    const subclass = ruleset === 'dnd5e-2024' ? 'alchemist-legacy-2024' : 'alchemist';
    const c = make({ ruleset, classes: [{ id: 'artificer', level: 17, sub: subclass }] });
    const render = () => root.render(createElement(RulesetProvider, { value: ruleset }, createElement(SpellsTab, {
      ch: c, d: d(c), set: (recipe) => { recipe(c); render(); }, replace: vi.fn(),
    })));
    const openPicker = () => {
      click([...container.querySelectorAll('button')].find((button) => button.textContent === 'Add / prepare spells'));
      const level = document.querySelector<HTMLSelectElement>('[role="dialog"] select[aria-label="Level"]')!;
      act(() => { level.value = '5'; level.dispatchEvent(new Event('change', { bubbles: true })); });
    };
    const pickerRow = (name: string) => [...document.querySelectorAll('[role="dialog"] tr')].find((row) => row.querySelector('button')?.textContent === name);
    act(render);
    openPicker();
    click([...pickerRow('Greater Restoration')?.querySelectorAll('button') ?? []].find((button) => button.textContent === 'Add'));
    expect(c.spells.entries.find((spell) => spell.spellId === 'greater-restoration')).toMatchObject({ classId: 'artificer', source: 'class', prepared: false });
    const level = document.querySelector<HTMLSelectElement>('[role="dialog"] select[aria-label="Level"]')!;
    act(() => { level.value = '3'; level.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(pickerRow('Gaseous Form')?.textContent).toContain('granted');
    expect([...pickerRow('Gaseous Form')?.querySelectorAll('button') ?? []].some((button) => button.textContent === 'Add')).toBe(false);
    click([...document.querySelectorAll('[role="dialog"] button')].find((button) => button.textContent === 'Done'));
    const normalRow = [...container.querySelectorAll('tr')].find((row) => row.textContent?.includes('Greater Restoration') && !row.textContent.includes('Innate'))!;
    click(normalRow.querySelector('input[type="checkbox"]'));
    expect(c.spells.entries.find((spell) => spell.spellId === 'greater-restoration')?.prepared).toBe(true);
    const resourceId = `spell-use:${subclass}:greater-restoration`;
    const innate = () => d(c).spells.find((spell) => spell.spellId === 'greater-restoration' && spell.kind === 'innate');
    expect(innate()?.uses).toMatchObject({ resourceId, max: 1, used: 0 });
    click([...normalRow.querySelectorAll('button')].find((button) => button.textContent === 'Cast'));
    expect(document.querySelector<HTMLSelectElement>('[role="dialog"] select')?.value).toBe('s5');
    click([...document.querySelectorAll('[role="dialog"] button')].find((button) => button.textContent === 'Cast'));
    expect(c.spells.slotsUsed[5]).toBe(1);
    expect(innate()?.uses?.used).toBe(0);
    openPicker();
    click([...pickerRow('Greater Restoration')?.querySelectorAll('button') ?? []].find((button) => button.textContent?.startsWith('Added')));
    expect(c.spells.entries.some((spell) => spell.spellId === 'greater-restoration')).toBe(false);
    expect(innate()?.uses).toMatchObject({ resourceId, max: 1, used: 0 });
  });

  it('lets a wizard learn spells supplied by another class or an item', () => {
    let c = make({ classes: [{ id: 'wizard', level: 1 }, { id: 'cleric', level: 3, sub: 'light' }] });
    c = addItem(c, db.items.get('mi-wand-of-magic-missiles')!);
    c.inventory[0].equipped = true;
    const render = () => root.render(createElement(SpellsTab, {
      ch: c, d: d(c), set: (recipe) => { recipe(c); render(); }, replace: vi.fn(),
    }));
    act(render);
    click([...container.querySelectorAll('button')].find((button) => button.textContent === 'Add to spellbook'));
    for (const name of ['Burning Hands', 'Magic Missile']) {
      const row = [...document.querySelectorAll('[role="dialog"] tr')].find((row) => row.querySelector('button')?.textContent === name);
      click([...row?.querySelectorAll('button') ?? []].find((button) => button.textContent === 'Add'));
    }
    expect(c.spells.entries.filter((spell) => spell.classId === 'wizard' && spell.inSpellbook).map((spell) => spell.spellId)).toEqual(['burning-hands', 'magic-missile']);
    expect(d(c).spells.find((spell) => spell.spellId === 'burning-hands' && spell.classId === 'cleric')?.alwaysPrepared).toBe(true);
    expect(d(c).spells.find((spell) => spell.spellId === 'magic-missile' && spell.charges)?.charges).toBeDefined();
  });

  it.each(['dnd5e-2014', 'dnd5e-2024'] as const)('casts Chemical Mastery separately from a prepared spell in %s', (ruleset) => {
    const subclass = ruleset === 'dnd5e-2024' ? 'alchemist-legacy-2024' : 'alchemist';
    const c = make({ ruleset, classes: [{ id: 'artificer', level: 19, sub: subclass }] });
    c.spells.entries.push({ id: 'prepared-restoration', spellId: 'greater-restoration', classId: 'artificer', source: 'class', prepared: true });
    const render = () => root.render(createElement(RulesetProvider, { value: ruleset }, createElement(SpellsTab, {
      ch: c, d: d(c), set: (recipe) => { recipe(c); render(); }, replace: vi.fn(),
    })));
    const innateRow = () => [...container.querySelectorAll('tr')].find((row) => row.textContent?.includes('Greater Restoration') && row.textContent.includes('Innate'));
    act(render);
    click([...innateRow()?.querySelectorAll('button') ?? []].find((button) => button.textContent === 'Cast'));
    const spend = document.querySelector<HTMLSelectElement>('[role="dialog"] select')!;
    expect(spend.value).toBe('use');
    click([...document.querySelectorAll('[role="dialog"] button')].find((button) => button.textContent === 'Cast'));
    const resourceId = `spell-use:${subclass}:greater-restoration`;
    expect(c.resources[resourceId]?.used).toBe(1);
    expect(c.spells.slotsUsed.some((used) => used > 0)).toBe(false);
    click([...innateRow()?.querySelectorAll('button') ?? []].find((button) => button.textContent === 'Cast'));
    const exhaustedCast = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent === 'Cast')!;
    expect(exhaustedCast.disabled).toBe(true);
    click(exhaustedCast);
    expect(c.resources[resourceId]?.used).toBe(1);
    const exhaustedSpend = document.querySelector<HTMLSelectElement>('[role="dialog"] select')!;
    act(() => {
      exhaustedSpend.value = 's5';
      exhaustedSpend.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(exhaustedCast.disabled).toBe(false);
    click(exhaustedCast);
    expect(c.resources[resourceId]?.used).toBe(1);
    expect(c.spells.slotsUsed[5]).toBe(1);
    const preparedRow = [...container.querySelectorAll('tr')].find((row) => row.textContent?.includes('Greater Restoration') && row.textContent.includes('Prepared'));
    click([...preparedRow?.querySelectorAll('button') ?? []].find((button) => button.textContent === 'Cast'));
    const preparedSpend = document.querySelector<HTMLSelectElement>('[role="dialog"] select')!;
    expect(preparedSpend.value).toBe('s5');
    expect([...preparedSpend.options].some((option) => option.value === 'use')).toBe(false);
  });

  it('allows item charges independently of spell slots and blocks an exhausted item', () => {
    const wand = { ...db.items.get('mi-wand-of-magic-missiles')!, spells: [{ spellId: 'magic-missile', chargeCost: 1 }] };
    const c = addItem(make({ classes: [{ id: 'wizard', level: 1 }] }), wand);
    c.inventory[0].equipped = true;
    c.inventory[0].charges = 1;
    const render = () => root.render(createElement(SpellsTab, {
      ch: c, d: d(c), set: (recipe) => { recipe(c); render(); }, replace: vi.fn(),
    }));
    const castItem = () => click([...container.querySelectorAll('tr button')].find((button) => button.textContent === 'Cast'));
    const confirmButton = () => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent === 'Cast')!;
    act(render);
    castItem();
    expect(document.querySelector<HTMLSelectElement>('[role="dialog"] select')?.value).toBe('charges');
    expect(confirmButton().disabled).toBe(false);
    click(confirmButton());
    expect(c.inventory[0].charges).toBe(0);
    expect(c.spells.slotsUsed.some((used) => used > 0)).toBe(false);
    castItem();
    expect(confirmButton().disabled).toBe(true);
    click(confirmButton());
    expect(c.inventory[0].charges).toBe(0);
  });
});
