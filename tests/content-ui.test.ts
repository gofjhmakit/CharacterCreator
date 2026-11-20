// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChoiceEditor, choiceComplete } from '@/ui/components/ChoiceEditor';
import { FeaturesTab } from '@/ui/views/tabs/FeaturesTab';
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
  useApp.setState({ rolls: [], toasts: [] });
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
