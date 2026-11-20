// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChoiceEditor, choiceComplete } from '@/ui/components/ChoiceEditor';
import { FeaturesTab } from '@/ui/views/tabs/FeaturesTab';
import { SpellsTab } from '@/ui/views/tabs/SpellsTab';
import { HpPanel } from '@/ui/views/panels';
import { RulesetProvider } from '@/ui/ruleset';
import { useApp } from '@/state/store';
import { make, d } from './helpers';

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
