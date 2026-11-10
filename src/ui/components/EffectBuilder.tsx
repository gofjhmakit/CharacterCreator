// Structured, code-free effect editor. Produces validated Effect objects (no eval, no JSON editing).
import type { Effect, Modifier, ModifierTarget, Outcome, Trigger, AttackScope, EffectActivation, SaveSpec } from '@/types/content';
import { ABILITIES, ABILITY_NAMES, CONDITION_IDS, DAMAGE_TYPES, MOVEMENT_MODES, SKILLS, SKILL_IDS, type Recharge } from '@/types/core';
import { uid } from '@/engine/factory';
import { titleCase, Field } from './common';
import { isValidDice } from '@/dice/dice';
import { validateFormula, FORMULA_VARS } from '@/engine/formula';
import { describeOutcomes } from '@/engine/derive';

type Sub = 'none' | 'ability' | 'ability-all' | 'skill' | 'damage' | 'movement' | 'condition' | 'sense' | 'roll';
interface Kind { id: string; label: string; sub: Sub; build: (sub: string) => ModifierTarget; op?: Modifier['op']; value?: 'number' | 'dice' | 'none' | 'range'; scope?: boolean; group: string }

const KINDS: Kind[] = [
  { id: 'ac', label: 'AC bonus', sub: 'none', build: () => 'ac', value: 'number', group: 'Defense' },
  { id: 'ac-formula', label: 'Alternative AC calculation', sub: 'none', build: () => 'ac-formula', value: 'none', group: 'Defense' },
  { id: 'resistance', label: 'Damage resistance', sub: 'damage', build: (s) => `resistance:${s}` as ModifierTarget, op: 'grant', value: 'none', group: 'Defense' },
  { id: 'immunity', label: 'Damage immunity', sub: 'damage', build: (s) => `immunity:${s}` as ModifierTarget, op: 'grant', value: 'none', group: 'Defense' },
  { id: 'vulnerability', label: 'Damage vulnerability', sub: 'damage', build: (s) => `vulnerability:${s}` as ModifierTarget, op: 'grant', value: 'none', group: 'Defense' },
  { id: 'cond-immunity', label: 'Condition immunity', sub: 'condition', build: (s) => `condition-immunity:${s}` as ModifierTarget, op: 'grant', value: 'none', group: 'Defense' },
  { id: 'damage-reduction', label: 'Damage reduction (flat)', sub: 'none', build: () => 'damage-reduction', value: 'number', group: 'Defense' },
  { id: 'attack', label: 'Attack roll bonus', sub: 'none', build: () => 'attack', value: 'number', scope: true, group: 'Offense' },
  { id: 'damage', label: 'Damage bonus (flat)', sub: 'none', build: () => 'damage', value: 'number', scope: true, group: 'Offense' },
  { id: 'extra-damage', label: 'Extra damage dice', sub: 'damage', build: () => 'extra-damage', value: 'dice', scope: true, group: 'Offense' },
  { id: 'crit-range', label: 'Critical hit range (e.g. 19)', sub: 'none', build: () => 'crit-range', value: 'number', group: 'Offense' },
  { id: 'spell-dc', label: 'Spell save DC bonus', sub: 'none', build: () => 'spell-dc', value: 'number', group: 'Offense' },
  { id: 'spell-attack', label: 'Spell attack bonus', sub: 'none', build: () => 'spell-attack', value: 'number', group: 'Offense' },
  { id: 'ability', label: 'Ability score bonus', sub: 'ability', build: (s) => `ability:${s}` as ModifierTarget, value: 'number', group: 'Abilities' },
  { id: 'ability-set', label: 'Ability score becomes (minimum)', sub: 'ability', build: (s) => `ability-set:${s}` as ModifierTarget, op: 'set', value: 'number', group: 'Abilities' },
  { id: 'save', label: 'Saving throw bonus', sub: 'ability-all', build: (s) => `save:${s}` as ModifierTarget, value: 'number', group: 'Rolls' },
  { id: 'check', label: 'Ability check bonus', sub: 'ability-all', build: (s) => `check:${s}` as ModifierTarget, value: 'number', group: 'Rolls' },
  { id: 'skill', label: 'Skill bonus', sub: 'skill', build: (s) => `skill:${s}` as ModifierTarget, value: 'number', group: 'Rolls' },
  { id: 'initiative', label: 'Initiative bonus', sub: 'none', build: () => 'initiative', value: 'number', group: 'Rolls' },
  { id: 'advantage', label: 'Advantage on…', sub: 'roll', build: (s) => s as ModifierTarget, op: 'advantage', value: 'none', group: 'Rolls' },
  { id: 'disadvantage', label: 'Disadvantage on…', sub: 'roll', build: (s) => s as ModifierTarget, op: 'disadvantage', value: 'none', group: 'Rolls' },
  { id: 'skill-prof', label: 'Skill proficiency', sub: 'skill', build: (s) => `prof:skill:${s}` as ModifierTarget, op: 'grant', value: 'none', group: 'Rolls' },
  { id: 'save-prof', label: 'Saving throw proficiency', sub: 'ability', build: (s) => `prof:save:${s}` as ModifierTarget, op: 'grant', value: 'none', group: 'Rolls' },
  { id: 'passive', label: 'Passive score bonus', sub: 'skill', build: (s) => `passive:${s}` as ModifierTarget, value: 'number', group: 'Rolls' },
  { id: 'speed', label: 'Speed bonus', sub: 'movement', build: (s) => `speed:${s}` as ModifierTarget, value: 'number', group: 'Movement & senses' },
  { id: 'speed-min', label: 'Speed becomes at least', sub: 'movement', build: (s) => `speed:${s}` as ModifierTarget, op: 'max', value: 'number', group: 'Movement & senses' },
  { id: 'sense', label: 'Sense (range in ft)', sub: 'sense', build: (s) => `sense:${s}` as ModifierTarget, value: 'number', group: 'Movement & senses' },
  { id: 'hp-max', label: 'Max HP bonus', sub: 'none', build: () => 'hp-max', value: 'number', group: 'Other' },
  { id: 'hp-per-level', label: 'Max HP per level', sub: 'none', build: () => 'hp-per-level', value: 'number', group: 'Other' },
  { id: 'attunement-slots', label: 'Extra attunement slots', sub: 'none', build: () => 'attunement-slots', value: 'number', group: 'Other' },
  { id: 'carry', label: 'Carrying capacity multiplier', sub: 'none', build: () => 'carry-multiplier', value: 'number', group: 'Other' },
];

const ROLL_TARGETS: { id: string; label: string }[] = [
  { id: 'attack', label: 'Attack rolls' }, { id: 'initiative', label: 'Initiative' },
  { id: 'save:all', label: 'All saving throws' }, ...ABILITIES.map((a) => ({ id: `save:${a}`, label: `${ABILITY_NAMES[a]} saves` })),
  { id: 'check:all', label: 'All ability checks' }, ...ABILITIES.map((a) => ({ id: `check:${a}`, label: `${ABILITY_NAMES[a]} checks` })),
  ...SKILL_IDS.map((s) => ({ id: `skill:${s}`, label: `${SKILLS[s].name} checks` })),
];
const SENSES = ['darkvision', 'blindsight', 'tremorsense', 'truesight'];
const SCOPES: AttackScope[] = ['this-item', 'all', 'weapon', 'melee', 'ranged', 'melee-weapon', 'ranged-weapon', 'spell', 'unarmed', 'thrown'];
const SCOPE_LABEL: Record<AttackScope, string> = { 'this-item': 'This item only', all: 'All attacks', weapon: 'Weapon attacks', melee: 'Melee attacks', ranged: 'Ranged attacks', 'melee-weapon': 'Melee weapon attacks', 'ranged-weapon': 'Ranged weapon attacks', spell: 'Spell attacks', unarmed: 'Unarmed strikes', thrown: 'Thrown weapons' };
const TRIGGERS: { id: Trigger | 'passive'; label: string }[] = [
  { id: 'passive', label: 'Passive (continuous)' }, { id: 'on-hit', label: 'On hit' }, { id: 'on-crit', label: 'On critical hit' }, { id: 'on-attack', label: 'On attack' },
  { id: 'on-damage-taken', label: 'When taking damage' }, { id: 'on-use', label: 'When using the item / feature' }, { id: 'start-of-turn', label: 'Start of turn' }, { id: 'end-of-turn', label: 'End of turn' }, { id: 'reaction', label: 'As a reaction' },
];
const ACTIVATIONS: { id: EffectActivation; label: string }[] = [
  { id: 'equipped', label: 'While equipped (and attuned if required)' }, { id: 'attuned', label: 'While attuned' }, { id: 'carried', label: 'While carried' }, { id: 'toggle', label: 'Toggled on/off during play' }, { id: 'always', label: 'Always' },
];
const OUTCOMES: { id: Outcome['kind']; label: string }[] = [
  { id: 'damage', label: 'Deal damage' }, { id: 'heal', label: 'Heal' }, { id: 'temp-hp', label: 'Grant temporary HP' }, { id: 'condition', label: 'Apply condition' }, { id: 'prone', label: 'Knock prone' },
  { id: 'push', label: 'Push (ft)' }, { id: 'bonus', label: 'Grant a bonus' }, { id: 'penalty', label: 'Impose a penalty' }, { id: 'resource-restore', label: 'Restore a resource' }, { id: 'resource-consume', label: 'Consume a resource' }, { id: 'text', label: 'Other (describe)' },
];

export function kindOf(m: Modifier): { kind: Kind; sub: string } {
  const t = m.target as string;
  const op = m.op ?? 'add';
  if (op === 'advantage' || op === 'disadvantage') return { kind: KINDS.find((k) => k.id === op)!, sub: t };
  if (t === 'extra-damage') return { kind: KINDS.find((k) => k.id === 'extra-damage')!, sub: m.damageType ?? 'fire' };
  for (const k of KINDS) {
    if ((k.op ?? 'add') !== op || k.id === 'advantage' || k.id === 'disadvantage') continue;
    if (k.sub === 'none') { if (k.build('') === t) return { kind: k, sub: '' }; continue; }
    const prefix = k.build('X').slice(0, -1);
    if (t.startsWith(prefix)) return { kind: k, sub: t.slice(prefix.length) };
  }
  return { kind: KINDS[0], sub: '' };
}

export function newEffect(): Effect {
  return { id: uid('fx'), name: 'New effect', activation: 'equipped', modifiers: [] };
}

export function effectProblems(e: Effect): string[] {
  const p: string[] = [];
  for (const m of e.modifiers ?? []) {
    if (m.target === 'extra-damage' && !isValidDice(String(m.value ?? ''))) p.push(`Extra damage “${m.value}” is not valid dice (e.g. 1d6).`);
    if (m.formula !== undefined) { const err = validateFormula(m.formula, FORMULA_VARS); if (err) p.push(`Formula “${m.formula}”: ${err}`); }
  }
  for (const o of [...(e.outcomes ?? []), ...(e.save?.onFailure ?? []), ...(e.save?.onSuccess ?? [])]) {
    if ((o.kind === 'damage' || o.kind === 'heal' || o.kind === 'temp-hp') && o.dice && !isValidDice(o.dice.replace(/\{[^}]*\}/g, '1'))) p.push(`“${o.dice}” is not valid dice.`);
  }
  if (e.save?.dc.kind === 'formula') { const err = validateFormula(e.save.dc.formula, FORMULA_VARS); if (err) p.push(`DC formula: ${err}`); }
  return p;
}

export function EffectBuilder({ effects, onChange, context = 'item' }: { effects: Effect[]; onChange: (e: Effect[]) => void; context?: 'item' | 'feature' }) {
  const upd = (i: number, e: Effect) => onChange(effects.map((x, j) => (j === i ? e : x)));
  return (
    <div className="stack">
      {effects.length === 0 && <p className="small muted">No mechanical effects. Add one to make this {context} change your character’s numbers, add on-hit riders, or track uses.</p>}
      {effects.map((e, i) => <EffectCard key={e.id} e={e} context={context} onChange={(x) => upd(i, x)} onRemove={() => onChange(effects.filter((_, j) => j !== i))} onDuplicate={() => onChange([...effects.slice(0, i + 1), { ...structuredClone(e), id: uid('fx'), name: `${e.name ?? 'Effect'} (copy)` }, ...effects.slice(i + 1)])} />)}
      <div className="row">
        <button className="small" onClick={() => onChange([...effects, { ...newEffect(), activation: context === 'item' ? 'equipped' : 'always' }])}>+ Passive modifier effect</button>
        <button className="small" onClick={() => onChange([...effects, { ...newEffect(), name: 'On hit', trigger: 'on-hit', scope: 'this-item', activation: context === 'item' ? 'equipped' : 'always', outcomes: [] }])}>+ Triggered effect (on hit, on use…)</button>
        <button className="small" onClick={() => onChange([...effects, { ...newEffect(), name: 'Manual effect', manual: true, description: '', activation: context === 'item' ? 'equipped' : 'always' }])}>+ Manual / descriptive</button>
      </div>
    </div>
  );
}

function EffectCard({ e, onChange, onRemove, onDuplicate, context }: { e: Effect; onChange: (e: Effect) => void; onRemove: () => void; onDuplicate: () => void; context: 'item' | 'feature' }) {
  const triggered = !!e.trigger && e.trigger !== 'passive';
  const problems = effectProblems(e);
  return (
    <div className="panel" style={{ background: 'var(--bg-2)' }}>
      <div className="row" style={{ marginBottom: 8 }}>
        <input value={e.name ?? ''} onChange={(x) => onChange({ ...e, name: x.target.value })} placeholder="Effect name" style={{ maxWidth: 260, fontWeight: 700 }} aria-label="Effect name" />
        <span className="spacer" />
        {e.manual && <span className="badge manual">manual</span>}
        <button className="small ghost" onClick={onDuplicate}>Duplicate</button>
        <button className="small ghost danger" onClick={onRemove}>Remove</button>
      </div>
      <div className="field-row">
        <Field label="Active when">
          <select value={e.activation ?? (context === 'item' ? 'equipped' : 'always')} onChange={(x) => onChange({ ...e, activation: x.target.value as EffectActivation })}>
            {ACTIVATIONS.filter((a) => context === 'item' || a.id === 'always' || a.id === 'toggle').map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="Trigger">
          <select value={e.trigger ?? 'passive'} onChange={(x) => { const t = x.target.value as Trigger; onChange({ ...e, trigger: t === 'passive' ? undefined : t, ...(t !== 'passive' && !e.outcomes ? { outcomes: [] } : {}) }); }}>
            {TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
        {triggered && ['on-hit', 'on-crit', 'on-attack'].includes(e.trigger!) && (
          <Field label="Applies to">
            <select value={e.scope ?? 'this-item'} onChange={(x) => onChange({ ...e, scope: x.target.value as AttackScope })}>{SCOPES.filter((s) => context === 'item' || s !== 'this-item').map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}</select>
          </Field>
        )}
      </div>
      <label className="field" style={{ marginTop: 8 }}>Description<textarea rows={2} value={e.description ?? ''} onChange={(x) => onChange({ ...e, description: x.target.value })} placeholder={e.manual ? 'Describe what happens — shown during play as a manual effect.' : 'Optional rules text shown with the effect.'} /></label>
      <label className="check small" style={{ marginTop: 6 }}><input type="checkbox" checked={!!e.manual} onChange={(x) => onChange({ ...e, manual: x.target.checked })} />Show as a manual effect (needs resolving by hand)</label>

      {!e.manual && !triggered && <ModifierList mods={e.modifiers ?? []} onChange={(m) => onChange({ ...e, modifiers: m })} context={context} />}
      {!e.manual && triggered && <TriggeredEditor e={e} onChange={onChange} />}

      <div className="field-row" style={{ marginTop: 8 }}>
        <label className="check small"><input type="checkbox" checked={!!e.oncePerTurn} onChange={(x) => onChange({ ...e, oncePerTurn: x.target.checked || undefined })} />Once per turn</label>
        <label className="check small"><input type="checkbox" checked={!!e.uses} onChange={(x) => onChange({ ...e, uses: x.target.checked ? { max: 1, recharge: 'long' } : undefined })} />Limited uses</label>
        {e.uses && <>
          <Field label="Uses"><input type="text" value={String(e.uses.max)} onChange={(x) => onChange({ ...e, uses: { ...e.uses!, max: /^\d+$/.test(x.target.value) ? Number(x.target.value) : x.target.value } })} placeholder="3 or prof" /></Field>
          <Field label="Recharge"><select value={e.uses.recharge} onChange={(x) => onChange({ ...e, uses: { ...e.uses!, recharge: x.target.value as Recharge } })}><option value="short">Short or long rest</option><option value="long">Long rest</option><option value="dawn">Dawn</option><option value="none">Never</option><option value="manual">Manual</option></select></Field>
        </>}
        <Field label="Duration"><input value={e.duration ?? ''} onChange={(x) => onChange({ ...e, duration: x.target.value || undefined })} placeholder="e.g. 1 minute" /></Field>
      </div>
      {triggered && <div className="small muted" style={{ marginTop: 6 }}>Preview: {e.description || describeOutcomes(e) || '—'}</div>}
      {problems.length > 0 && <ul className="warnings" style={{ marginTop: 6 }}>{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
    </div>
  );
}

function ModifierList({ mods, onChange, context }: { mods: Modifier[]; onChange: (m: Modifier[]) => void; context: 'item' | 'feature' }) {
  return (
    <div className="stack" style={{ marginTop: 8 }}>
      <span className="caps">Modifiers</span>
      {mods.map((m, i) => <ModifierRow key={i} m={m} context={context} onChange={(x) => onChange(mods.map((y, j) => (j === i ? x : y)))} onRemove={() => onChange(mods.filter((_, j) => j !== i))} />)}
      <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...mods, { target: 'ac', value: 1 }])}>+ Add modifier</button>
    </div>
  );
}

function subOptions(sub: Sub): { id: string; label: string }[] {
  switch (sub) {
    case 'ability': return ABILITIES.map((a) => ({ id: a, label: ABILITY_NAMES[a] }));
    case 'ability-all': return [{ id: 'all', label: 'All' }, ...ABILITIES.map((a) => ({ id: a, label: ABILITY_NAMES[a] }))];
    case 'skill': return SKILL_IDS.map((s) => ({ id: s, label: SKILLS[s].name }));
    case 'damage': return DAMAGE_TYPES.map((d) => ({ id: d, label: titleCase(d) }));
    case 'movement': return MOVEMENT_MODES.map((d) => ({ id: d, label: titleCase(d) }));
    case 'condition': return CONDITION_IDS.map((d) => ({ id: d, label: titleCase(d) }));
    case 'sense': return SENSES.map((d) => ({ id: d, label: titleCase(d) }));
    case 'roll': return ROLL_TARGETS;
    default: return [];
  }
}

function ModifierRow({ m, onChange, onRemove, context }: { m: Modifier; onChange: (m: Modifier) => void; onRemove: () => void; context: 'item' | 'feature' }) {
  const { kind, sub } = kindOf(m);
  const subs = subOptions(kind.sub);
  const setKind = (id: string) => {
    const k = KINDS.find((x) => x.id === id)!;
    const s = subOptions(k.sub)[0]?.id ?? '';
    const next: Modifier = { target: k.build(s), ...(k.op ? { op: k.op } : {}) };
    if (k.value === 'number') next.value = k.id === 'crit-range' ? 19 : k.id === 'carry' ? 2 : 1;
    if (k.value === 'dice') { next.value = '1d6'; next.damageType = 'fire'; next.scope = context === 'item' ? 'this-item' : 'weapon'; }
    if (k.scope && !next.scope) next.scope = context === 'item' ? 'this-item' : 'all';
    if (k.id === 'ac-formula') next.acFormula = { label: 'Natural armor', base: 13, abilities: ['dex'], allowsArmor: false, allowsShield: true };
    if (m.condition) next.condition = m.condition;
    onChange(next);
  };
  const setSub = (s: string) => onChange(kind.id === 'extra-damage' ? { ...m, damageType: s as Modifier['damageType'] } : { ...m, target: kind.build(s) });
  const valueStr = m.formula !== undefined ? String(m.formula) : m.value !== undefined ? String(m.value) : '';
  return (
    <div className="row" style={{ alignItems: 'flex-end', borderTop: '1px dashed var(--line)', paddingTop: 6 }}>
      <Field label="Type">
        <select value={kind.id} onChange={(x) => setKind(x.target.value)} style={{ width: 230 }}>
          {[...new Set(KINDS.map((k) => k.group))].map((g) => <optgroup key={g} label={g}>{KINDS.filter((k) => k.group === g).map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</optgroup>)}
        </select>
      </Field>
      {subs.length > 0 && <Field label={kind.sub === 'damage' ? 'Damage type' : kind.sub === 'roll' ? 'Roll' : 'Target'}><select value={sub} onChange={(x) => setSub(x.target.value)} style={{ width: 180 }}>{subs.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>}
      {kind.value === 'number' && <Field label="Value" hint="number or formula (prof, cha…)"><input value={valueStr} style={{ width: 110 }} onChange={(x) => { const v = x.target.value.trim(); if (/^-?\d+$/.test(v)) onChange({ ...m, value: Number(v), formula: undefined }); else onChange({ ...m, value: undefined, formula: v || 0 }); }} /></Field>}
      {kind.value === 'dice' && <Field label="Dice"><input value={String(m.value ?? '')} style={{ width: 90 }} onChange={(x) => onChange({ ...m, value: x.target.value })} /></Field>}
      {kind.scope && <Field label="Applies to"><select value={m.scope ?? 'all'} onChange={(x) => onChange({ ...m, scope: x.target.value as AttackScope })} style={{ width: 170 }}>{SCOPES.filter((s) => context === 'item' || s !== 'this-item').map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}</select></Field>}
      {kind.id === 'ac-formula' && m.acFormula && <>
        <Field label="Base"><input type="number" value={m.acFormula.base} style={{ width: 70 }} onChange={(x) => onChange({ ...m, acFormula: { ...m.acFormula!, base: Number(x.target.value) || 10 } })} /></Field>
        <Field label="+ Abilities"><select multiple value={m.acFormula.abilities} onChange={(x) => onChange({ ...m, acFormula: { ...m.acFormula!, abilities: [...x.target.selectedOptions].map((o) => o.value as 'dex') } })} style={{ width: 90, height: 64 }}>{ABILITIES.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}</select></Field>
        <label className="check small"><input type="checkbox" checked={m.acFormula.allowsArmor} onChange={(x) => onChange({ ...m, acFormula: { ...m.acFormula!, allowsArmor: x.target.checked } })} />Works with armor</label>
        <label className="check small"><input type="checkbox" checked={m.acFormula.allowsShield} onChange={(x) => onChange({ ...m, acFormula: { ...m.acFormula!, allowsShield: x.target.checked } })} />Shield adds</label>
        <Field label="Label"><input value={m.acFormula.label} onChange={(x) => onChange({ ...m, acFormula: { ...m.acFormula!, label: x.target.value } })} style={{ width: 150 }} /></Field>
      </>}
      <Field label="Only when (optional)" hint="Situational: shown, not auto-applied"><input value={m.condition ?? ''} placeholder="e.g. vs. undead" style={{ width: 170 }} onChange={(x) => onChange({ ...m, condition: x.target.value || undefined })} /></Field>
      <button className="small ghost danger" onClick={onRemove} aria-label="Remove modifier">✕</button>
    </div>
  );
}

function TriggeredEditor({ e, onChange }: { e: Effect; onChange: (e: Effect) => void }) {
  const hasSave = !!e.save;
  const save: SaveSpec = e.save ?? { ability: 'con', dc: { kind: 'fixed', value: 13 }, onFailure: [] };
  return (
    <div className="stack" style={{ marginTop: 8 }}>
      <label className="check"><input type="checkbox" checked={hasSave} onChange={(x) => onChange(x.target.checked ? { ...e, save: { ...save, onFailure: e.outcomes ?? [] }, outcomes: [] } : { ...e, save: undefined, outcomes: e.save?.onFailure ?? [] })} />Target makes a saving throw</label>
      {hasSave ? <>
        <div className="field-row">
          <Field label="Save ability"><select value={save.ability} onChange={(x) => onChange({ ...e, save: { ...save, ability: x.target.value as 'con' } })}>{ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}</select></Field>
          <Field label="DC"><select value={save.dc.kind} onChange={(x) => {
            const k = x.target.value;
            onChange({ ...e, save: { ...save, dc: k === 'fixed' ? { kind: 'fixed', value: 13 } : k === 'spell' ? { kind: 'spell' } : { kind: 'formula', formula: '8 + prof + str' } } });
          }}><option value="fixed">Fixed DC</option><option value="spell">My spell save DC</option><option value="formula">Calculated (formula)</option></select></Field>
          {save.dc.kind === 'fixed' && <Field label="Value"><input type="number" value={save.dc.value} onChange={(x) => onChange({ ...e, save: { ...save, dc: { kind: 'fixed', value: Number(x.target.value) || 10 } } })} /></Field>}
          {save.dc.kind === 'formula' && <Field label="Formula" hint="e.g. 8 + prof + str"><input value={String(save.dc.formula)} onChange={(x) => onChange({ ...e, save: { ...save, dc: { kind: 'formula', formula: x.target.value } } })} /></Field>}
        </div>
        <span className="caps">On a failed save</span>
        <OutcomeList list={save.onFailure} onChange={(o) => onChange({ ...e, save: { ...save, onFailure: o } })} />
        <span className="caps">On a successful save (optional)</span>
        <OutcomeList list={save.onSuccess ?? []} onChange={(o) => onChange({ ...e, save: { ...save, onSuccess: o.length ? o : undefined } })} />
      </> : <>
        <span className="caps">Outcome</span>
        <OutcomeList list={e.outcomes ?? []} onChange={(o) => onChange({ ...e, outcomes: o })} />
      </>}
    </div>
  );
}

function OutcomeList({ list, onChange }: { list: Outcome[]; onChange: (o: Outcome[]) => void }) {
  return (
    <div className="stack">
      {list.map((o, i) => {
        const up = (p: Partial<Outcome>) => onChange(list.map((x, j) => (j === i ? { ...x, ...p } : x)));
        return (
          <div key={i} className="row" style={{ alignItems: 'flex-end' }}>
            <Field label="Kind"><select value={o.kind} onChange={(x) => up({ kind: x.target.value as Outcome['kind'] })} style={{ width: 190 }}>{OUTCOMES.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></Field>
            {['damage', 'heal', 'temp-hp', 'bonus', 'penalty'].includes(o.kind) && <Field label="Dice / amount"><input value={o.dice ?? ''} onChange={(x) => up({ dice: x.target.value })} style={{ width: 100 }} placeholder="1d6" /></Field>}
            {o.kind === 'damage' && <Field label="Type"><select value={o.damageType ?? ''} onChange={(x) => up({ damageType: (x.target.value || undefined) as Outcome['damageType'] })} style={{ width: 130 }}><option value="">—</option>{DAMAGE_TYPES.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</select></Field>}
            {o.kind === 'condition' && <Field label="Condition"><select value={o.condition ?? 'prone'} onChange={(x) => up({ condition: x.target.value as Outcome['condition'] })} style={{ width: 140 }}>{CONDITION_IDS.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</select></Field>}
            {(o.kind === 'push' || o.kind === 'resource-restore' || o.kind === 'resource-consume') && <Field label="Amount"><input type="number" value={o.amount ?? 1} onChange={(x) => up({ amount: Number(x.target.value) })} style={{ width: 80 }} /></Field>}
            {(o.kind === 'resource-restore' || o.kind === 'resource-consume') && <Field label="Resource id"><input value={o.resourceId ?? ''} onChange={(x) => up({ resourceId: x.target.value })} style={{ width: 140 }} placeholder="e.g. ki" /></Field>}
            <Field label="Duration / note"><input value={o.duration ?? o.text ?? ''} onChange={(x) => up(o.kind === 'condition' ? { duration: x.target.value } : { text: x.target.value })} style={{ width: 180 }} /></Field>
            <button className="small ghost danger" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Remove outcome">✕</button>
          </div>
        );
      })}
      <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...list, { kind: 'damage', dice: '1d6' }])}>+ Add outcome</button>
    </div>
  );
}
