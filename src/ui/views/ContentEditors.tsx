import { useDb, useRuleset, dbFor } from '@/ui/ruleset';
// Structured editors for custom content (no JSON editing required).
import { useState } from 'react';
import type { BackgroundDef, ClassDef, ContentKind, FeatDef, FeatureDef, RaceDef, SpellDef, SubclassDef, CustomLanguage, CustomProficiency, CasterProgression, PreparationStyle } from '@/types/content';
import { ABILITIES, ABILITY_NAMES, SKILLS, SKILL_IDS, DAMAGE_TYPES, SIZES, type Ability, type SkillId } from '@/types/core';
import { Modal, Field, titleCase } from '../components/common';
import { EffectBuilder } from '../components/EffectBuilder';
import { TagList } from './tabs/AbilitiesTab';
import { uid } from '@/engine/factory';
import { useApp } from '@/state/store';
import { SCHOOLS } from '../components/spells';
import { validateFormula, FORMULA_VARS } from '@/engine/formula';

const CUSTOM = { book: 'Homebrew', kind: 'custom' as const };

/** Which ruleset(s) a custom definition is available in. */
export function RulesetTagSelect({ value, onChange }: { value?: string; onChange: (v: 'dnd5e-2014' | 'dnd5e-2024' | 'any') => void }) {
  return (
    <Field label="Ruleset" hint="Where this content can be used">
      <select value={value ?? 'any'} onChange={(e) => onChange(e.target.value as 'any')}>
        <option value="any">Both 2014 and 2024</option><option value="dnd5e-2014">2014 only</option><option value="dnd5e-2024">2024 only</option>
      </select>
    </Field>
  );
}

export function blankFor(k: ContentKind): { id: string; name: string } {
  const id = uid(k);
  switch (k) {
    case 'spell': return { id, name: '', level: 1, school: 'evocation', castingTime: '1 action', range: '60 feet', components: { v: true, s: true, m: false }, duration: 'Instantaneous', concentration: false, ritual: false, classes: [], description: '', source: CUSTOM } as SpellDef;
    case 'feat': return { id, name: '', ruleset: 'dnd5e-2014', description: '', source: CUSTOM, effects: [] } as FeatDef;
    case 'feature': return { id, name: '', description: '', source: CUSTOM, effects: [] } as FeatureDef;
    case 'background': return { id, name: '', ruleset: 'dnd5e-2014', description: '', source: CUSTOM, grants: { skills: [] }, equipment: [], gold: 10, feature: { id: uid('feat'), name: '', description: '' } } as BackgroundDef;
    case 'race': return { id, name: '', ruleset: 'dnd5e-2014', description: '', source: CUSTOM, size: 'medium', speed: { walk: 30 }, abilityBonuses: {}, traits: [] } as RaceDef;
    case 'subclass': return { id, classId: 'fighter', name: '', ruleset: 'dnd5e-2014', description: '', source: CUSTOM, features: [] } as SubclassDef;
    case 'class': return { id, name: '', ruleset: 'dnd5e-2014', description: '', source: CUSTOM, hitDie: 8, primaryAbilities: ['str'], saves: ['str', 'con'], skillChoices: { count: 2, from: [...SKILL_IDS] }, armor: [], weapons: ['simple'], tools: [], multiclass: { prerequisite: { all: { str: 13 } }, grants: {} }, startingEquipment: [], startingFixed: [], startingGold: '4d4x10', subclassLevel: 3, subclassLabel: 'Subclass', asiLevels: [4, 8, 12, 16, 19], features: [] } as ClassDef;
    case 'language': return { id, name: '', source: CUSTOM } as CustomLanguage;
    case 'proficiency': return { id, name: '', group: 'tool', source: CUSTOM } as CustomProficiency;
    default: return { id, name: '' };
  }
}

function Shell<T extends { id: string; name: string }>({ title, value, onClose, onSave, children, extraErrors = [] }: { title: string; value: T; onClose: () => void; onSave: (v: T) => void; children: React.ReactNode; extraErrors?: string[] }) {
  const errs = [...(!value.name.trim() ? ['Name is required.'] : []), ...extraErrors];
  return (
    <Modal title={title} onClose={onClose} size="wide" footer={<><button onClick={onClose}>Cancel</button><button className="primary" disabled={errs.length > 0} onClick={() => onSave(value)}>Save</button></>}>
      <div className="stack">{children}{errs.length > 0 && <ul className="warnings">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}</div>
    </Modal>
  );
}

function AbilityBonusEditor({ value, onChange }: { value: Partial<Record<Ability, number>>; onChange: (v: Partial<Record<Ability, number>>) => void }) {
  return <div className="row">{ABILITIES.map((a) => <label key={a} className="row tight small">{a.toUpperCase()}<input type="number" className="num-sm" value={value[a] ?? 0} onChange={(e) => { const v = Number(e.target.value) || 0; const n = { ...value }; if (v) n[a] = v; else delete n[a]; onChange(n); }} /></label>)}</div>;
}

function SkillPick({ value, onChange, label }: { value: SkillId[]; onChange: (v: SkillId[]) => void; label: string }) {
  return <div className="stack" style={{ gap: 4 }}><span className="section-label">{label}</span><div className="row">{SKILL_IDS.map((s) => <label key={s} className="check small"><input type="checkbox" checked={value.includes(s)} onChange={(e) => onChange(e.target.checked ? [...value, s] : value.filter((x) => x !== s))} />{SKILLS[s].name}</label>)}</div></div>;
}

/** Edit a list of features (name, level, description, uses, effects). */
export function FeatureListEditor({ features, onChange, withLevel }: { features: FeatureDef[]; onChange: (f: FeatureDef[]) => void; withLevel?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const up = (i: number, p: Partial<FeatureDef>) => onChange(features.map((f, j) => (j === i ? { ...f, ...p } : f)));
  return (
    <div className="stack">
      {features.map((f, i) => (
        <div key={f.id} className="panel" style={{ background: 'var(--bg-2)' }}>
          <div className="row">
            {withLevel && <label className="row tight small">Lvl<input type="number" className="num-sm" min={1} max={20} value={f.level ?? 1} onChange={(e) => up(i, { level: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} /></label>}
            <input value={f.name} placeholder="Feature name" onChange={(e) => up(i, { name: e.target.value })} style={{ maxWidth: 280, fontWeight: 700 }} />
            <span className="spacer" />
            <button className="small ghost" onClick={() => setOpen(open === f.id ? null : f.id)}>{open === f.id ? 'Collapse' : 'Edit details'}</button>
            <button className="small ghost danger" onClick={() => onChange(features.filter((_, j) => j !== i))}>Remove</button>
          </div>
          {open === f.id && (
            <div className="stack" style={{ marginTop: 8 }}>
              <Field label="Description"><textarea rows={3} value={f.description} onChange={(e) => up(i, { description: e.target.value })} /></Field>
              <div className="field-row">
                <Field label="Activation"><select value={f.activation ?? 'passive'} onChange={(e) => up(i, { activation: e.target.value as FeatureDef['activation'] })}>{['passive', 'action', 'bonus', 'reaction', 'special', 'minute', 'hour'].map((a) => <option key={a} value={a}>{titleCase(a)}</option>)}</select></Field>
                <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" checked={!!f.resource} onChange={(e) => up(i, { resource: e.target.checked ? { id: uid('res'), name: f.name || 'Uses', max: 1, recharge: 'long' } : undefined })} />Limited uses / resource</label>
                {f.resource && <>
                  <Field label="Max uses" hint="number or formula: prof, cha, cl, 2*cl…"><input value={String(f.resource.max)} onChange={(e) => up(i, { resource: { ...f.resource!, max: /^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value } })} /></Field>
                  <Field label="Recharge"><select value={f.resource.recharge} onChange={(e) => up(i, { resource: { ...f.resource!, recharge: e.target.value as 'long' } })}><option value="short">Short or long rest</option><option value="long">Long rest</option><option value="dawn">Dawn</option><option value="none">Never</option></select></Field>
                  <Field label="Die (optional)"><input value={String(f.resource.die ?? '')} placeholder="d8" onChange={(e) => up(i, { resource: { ...f.resource!, die: e.target.value || undefined } })} /></Field>
                </>}
              </div>
              {f.resource && typeof f.resource.max === 'string' && validateFormula(f.resource.max, FORMULA_VARS) && <span className="small bad">Invalid formula: {validateFormula(f.resource.max, FORMULA_VARS)}</span>}
              <span className="section-label">Mechanical effects</span>
              <EffectBuilder context="feature" effects={f.effects ?? []} onChange={(effects) => up(i, { effects })} />
            </div>
          )}
        </div>
      ))}
      <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => { const nf: FeatureDef = { id: uid('feat'), name: '', description: '', level: withLevel ? 1 : undefined, effects: [] }; onChange([...features, nf]); setOpen(nf.id); }}>+ Add feature</button>
    </div>
  );
}

export function SpellEditor({ initial, onClose, onSave }: { initial: SpellDef; onClose: () => void; onSave: (s: SpellDef) => void }) {
  const [s, setS] = useState(initial);
  const up = (p: Partial<SpellDef>) => setS({ ...s, ...p });
  const dmg = s.damage?.bySlot?.[String(s.level)] ?? s.damage?.byCharLevel?.['1'] ?? '';
  return (
    <Shell title={initial.name ? `Edit spell: ${initial.name}` : 'New spell'} value={s} onClose={onClose} onSave={onSave}>
      <div className="field-row">
        <Field label="Name" required><input value={s.name} onChange={(e) => up({ name: e.target.value })} /></Field><RulesetTagSelect value={s.ruleset} onChange={(ruleset) => up({ ruleset } as never)} />
        <Field label="Level"><select value={s.level} onChange={(e) => up({ level: Number(e.target.value) })}>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>{i === 0 ? 'Cantrip' : i}</option>)}</select></Field>
        <Field label="School"><select value={s.school} onChange={(e) => up({ school: e.target.value })}>{SCHOOLS.map((x) => <option key={x} value={x}>{titleCase(x)}</option>)}</select></Field>
        <Field label="Casting time"><input value={s.castingTime} onChange={(e) => up({ castingTime: e.target.value })} /></Field>
        <Field label="Range"><input value={s.range} onChange={(e) => up({ range: e.target.value })} /></Field>
        <Field label="Duration"><input value={s.duration} onChange={(e) => up({ duration: e.target.value })} /></Field>
      </div>
      <div className="row">
        {(['v', 's', 'm'] as const).map((c) => <label key={c} className="check"><input type="checkbox" checked={s.components[c]} onChange={(e) => up({ components: { ...s.components, [c]: e.target.checked } })} />{c.toUpperCase()}</label>)}
        {s.components.m && <input placeholder="Material components" value={s.components.material ?? ''} onChange={(e) => up({ components: { ...s.components, material: e.target.value } })} style={{ maxWidth: 320 }} />}
        <label className="check"><input type="checkbox" checked={s.concentration} onChange={(e) => up({ concentration: e.target.checked })} />Concentration</label>
        <label className="check"><input type="checkbox" checked={s.ritual} onChange={(e) => up({ ritual: e.target.checked })} />Ritual</label>
      </div>
      <div className="field-row">
        <Field label="Attack"><select value={s.attack ?? ''} onChange={(e) => up({ attack: (e.target.value || undefined) as SpellDef['attack'] })}><option value="">None</option><option value="melee">Melee spell attack</option><option value="ranged">Ranged spell attack</option></select></Field>
        <Field label="Saving throw"><select value={s.save ?? ''} onChange={(e) => up({ save: (e.target.value || undefined) as Ability })}><option value="">None</option>{ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}</select></Field>
        <Field label="Damage type"><select value={s.damageTypes?.[0] ?? ''} onChange={(e) => up({ damageTypes: e.target.value ? [e.target.value as never] : undefined })}><option value="">None</option>{DAMAGE_TYPES.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</select></Field>
        <Field label={s.level === 0 ? 'Damage (at level 1)' : `Damage at level ${s.level}`}><input value={dmg} placeholder="e.g. 3d6" onChange={(e) => up({ damage: e.target.value ? (s.level === 0 ? { byCharLevel: { '1': e.target.value } } : { bySlot: { [String(s.level)]: e.target.value } }) : undefined })} /></Field>
      </div>
      <div><span className="section-label">Class spell lists</span><div className="row">{['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard', ...[...dbFor(useRuleset()).classes.keys()].filter((k) => dbFor(useRuleset()).isCustom('class', k))].map((c) => <label key={c} className="check small"><input type="checkbox" checked={s.classes.includes(c)} onChange={(e) => up({ classes: e.target.checked ? [...s.classes, c] : s.classes.filter((x) => x !== c) })} />{titleCase(c)}</label>)}</div></div>
      <Field label="Description"><textarea rows={6} value={s.description} onChange={(e) => up({ description: e.target.value })} /></Field>
      <Field label="At higher levels"><textarea rows={2} value={s.higherLevels ?? ''} onChange={(e) => up({ higherLevels: e.target.value || undefined })} /></Field>
      <Field label="Source"><input value={s.source.book} onChange={(e) => up({ source: { ...s.source, book: e.target.value } })} /></Field>
    </Shell>
  );
}

export function FeatEditor({ kind, initial, onClose, onSave }: { kind: 'feat' | 'feature'; initial: FeatDef | FeatureDef; onClose: () => void; onSave: (f: FeatDef) => void }) {
  const [f, setF] = useState(initial as FeatDef);
  const up = (p: Partial<FeatDef>) => setF({ ...f, ...p });
  return (
    <Shell title={initial.name ? `Edit: ${initial.name}` : kind === 'feat' ? 'New feat' : 'New feature'} value={f} onClose={onClose} onSave={onSave}>
      <div className="field-row">
        <Field label="Name" required><input value={f.name} onChange={(e) => up({ name: e.target.value })} /></Field><RulesetTagSelect value={f.ruleset} onChange={(ruleset) => up({ ruleset } as never)} />
        <Field label="Source"><input value={f.source?.book ?? 'Homebrew'} onChange={(e) => up({ source: { ...CUSTOM, book: e.target.value } })} /></Field>
      </div>
      <Field label="Description"><textarea rows={4} value={f.description} onChange={(e) => up({ description: e.target.value })} /></Field>
      {kind === 'feat' && <>
        <div className="field-row">
          <Field label="Prerequisite (text)"><input value={f.prerequisite?.text ?? ''} onChange={(e) => up({ prerequisite: { ...(f.prerequisite ?? {}), text: e.target.value || undefined } })} placeholder="e.g. Strength 13 or higher" /></Field>
          <Field label="Prerequisite: minimum level"><input type="number" min={1} max={20} value={f.prerequisite?.level ?? ''} onChange={(e) => up({ prerequisite: { ...(f.prerequisite ?? {}), level: e.target.value ? Number(e.target.value) : undefined } })} /></Field>
          <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" checked={!!f.prerequisite?.spellcasting} onChange={(e) => up({ prerequisite: { ...(f.prerequisite ?? {}), spellcasting: e.target.checked || undefined } })} />Requires spellcasting</label>
        </div>
        <div className="stack"><span className="section-label">Ability score increase (+1 “half-feat”, optional)</span>
          <div className="row">{ABILITIES.map((a) => <label key={a} className="check small"><input type="checkbox" checked={!!f.abilityIncrease?.from.includes(a)} onChange={(e) => { const from = e.target.checked ? [...(f.abilityIncrease?.from ?? []), a] : (f.abilityIncrease?.from ?? []).filter((x) => x !== a); up({ abilityIncrease: from.length ? { from, amount: 1 } : undefined }); }} />{a.toUpperCase()}</label>)}</div>
        </div>
        <label className="check"><input type="checkbox" checked={!!f.repeatable} onChange={(e) => up({ repeatable: e.target.checked || undefined })} />Can be taken more than once</label>
      </>}
      <div className="field-row">
        <label className="check"><input type="checkbox" checked={!!f.resource} onChange={(e) => up({ resource: e.target.checked ? { id: uid('res'), name: f.name || 'Uses', max: 1, recharge: 'long' } : undefined })} />Limited uses</label>
        {f.resource && <>
          <Field label="Max uses"><input value={String(f.resource.max)} onChange={(e) => up({ resource: { ...f.resource!, max: /^\d+$/.test(e.target.value) ? Number(e.target.value) : e.target.value } })} /></Field>
          <Field label="Recharge"><select value={f.resource.recharge} onChange={(e) => up({ resource: { ...f.resource!, recharge: e.target.value as 'long' } })}><option value="short">Short or long rest</option><option value="long">Long rest</option><option value="dawn">Dawn</option></select></Field>
        </>}
      </div>
      <span className="section-label">Grants</span>
      <SkillPick label="Skill proficiencies" value={(f.grants?.skills ?? []) as SkillId[]} onChange={(skills) => up({ grants: { ...(f.grants ?? {}), skills } })} />
      <TagList label="Languages / tools / armor (one per tag, prefix with armor: or tool:)" values={[...(f.grants?.languages ?? []), ...(f.grants?.tools ?? []).map((t) => `tool:${t}`), ...(f.grants?.armor ?? []).map((t) => `armor:${t}`)]} suggestions={['armor:light', 'armor:medium', 'armor:heavy', 'armor:shields', "tool:Thieves' tools"]} onChange={(v) => up({ grants: { ...(f.grants ?? {}), languages: v.filter((x) => !x.includes(':')), tools: v.filter((x) => x.startsWith('tool:')).map((x) => x.slice(5)), armor: v.filter((x) => x.startsWith('armor:')).map((x) => x.slice(6)) } })} />
      <span className="section-label">Mechanical effects</span>
      <EffectBuilder context="feature" effects={f.effects ?? []} onChange={(effects) => up({ effects })} />
      {kind === 'feature' && <p className="small muted">Custom features can be added to characters from their Features tab (“Add custom feature”), or attached to custom races, classes and subclasses.</p>}
    </Shell>
  );
}

export function BackgroundEditor({ initial, onClose, onSave }: { initial: BackgroundDef; onClose: () => void; onSave: (b: BackgroundDef) => void }) {
  const [b, setB] = useState(initial);
  const up = (p: Partial<BackgroundDef>) => setB({ ...b, ...p });
  return (
    <Shell title={initial.name ? `Edit background: ${initial.name}` : 'New background'} value={b} onClose={onClose} onSave={onSave}>
      <Field label="Name" required><input value={b.name} onChange={(e) => up({ name: e.target.value })} /></Field><RulesetTagSelect value={b.ruleset} onChange={(ruleset) => up({ ruleset } as never)} />
      <Field label="Description"><textarea rows={3} value={b.description} onChange={(e) => up({ description: e.target.value })} /></Field>
      <SkillPick label="Skill proficiencies" value={(b.grants.skills ?? []) as SkillId[]} onChange={(skills) => up({ grants: { ...b.grants, skills } })} />
      <TagList label="Tool proficiencies" values={b.grants.tools ?? []} suggestions={[]} onChange={(tools) => up({ grants: { ...b.grants, tools } })} />
      <TagList label="Languages" values={b.grants.languages ?? []} suggestions={[]} onChange={(languages) => up({ grants: { ...b.grants, languages } })} />
      <div className="field-row">
        <Field label="Extra languages of choice"><input type="number" min={0} max={4} value={Number(b.choices?.find((c) => c.kind === 'language')?.count ?? 0)} onChange={(e) => { const n = Number(e.target.value) || 0; const others = (b.choices ?? []).filter((c) => c.kind !== 'language'); up({ choices: n ? [...others, { id: 'languages', label: 'Languages', kind: 'language', count: n }] : others }); }} /></Field>
        <Field label="Starting gold"><input type="number" min={0} value={b.gold} onChange={(e) => up({ gold: Number(e.target.value) || 0 })} /></Field>
      </div>
      <TagList label="Starting equipment (item ids or names)" values={b.equipment.map((e) => e.itemId)} suggestions={[...dbFor(useRuleset()).items.keys()].slice(0, 400)} onChange={(v) => up({ equipment: v.map((itemId) => ({ itemId })) })} />
      <div className="field-row"><Field label="Feature name"><input value={b.feature.name} onChange={(e) => up({ feature: { ...b.feature, name: e.target.value } })} /></Field></div>
      <Field label="Feature description"><textarea rows={3} value={b.feature.description} onChange={(e) => up({ feature: { ...b.feature, description: e.target.value } })} /></Field>
    </Shell>
  );
}

export function RaceEditor({ initial, onClose, onSave }: { initial: RaceDef; onClose: () => void; onSave: (r: RaceDef) => void }) {
  const [r, setR] = useState(initial);
  const up = (p: Partial<RaceDef>) => setR({ ...r, ...p });
  const dv = r.traits.find((t) => t.id === 'custom-darkvision');
  const langTrait = r.traits.find((t) => t.id === 'custom-languages');
  return (
    <Shell title={initial.name ? `Edit race: ${initial.name}` : 'New race / species'} value={r} onClose={onClose} onSave={onSave}>
      <div className="field-row">
        <Field label="Name" required><input value={r.name} onChange={(e) => up({ name: e.target.value })} /></Field><RulesetTagSelect value={r.ruleset} onChange={(ruleset) => up({ ruleset } as never)} />
        <Field label="Size"><select value={r.size} onChange={(e) => up({ size: e.target.value as RaceDef['size'] })}>{SIZES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select></Field>
        {(['walk', 'fly', 'swim', 'climb', 'burrow'] as const).map((m) => <Field key={m} label={`${titleCase(m)} speed`}><input type="number" min={0} value={r.speed[m] ?? ''} onChange={(e) => up({ speed: { ...r.speed, [m]: e.target.value === '' ? undefined : Number(e.target.value), walk: m === 'walk' ? Number(e.target.value) || 0 : r.speed.walk } })} /></Field>)}
      </div>
      <Field label="Description"><textarea rows={3} value={r.description} onChange={(e) => up({ description: e.target.value })} /></Field>
      <div className="stack"><span className="section-label">Ability score increases</span><AbilityBonusEditor value={r.abilityBonuses} onChange={(abilityBonuses) => up({ abilityBonuses })} /></div>
      <div className="field-row">
        <Field label="Flexible +1 increases (choose)"><input type="number" min={0} max={3} value={Number(r.choices?.find((c) => c.id === 'asi-1')?.count ?? 0)} onChange={(e) => { const n = Number(e.target.value) || 0; const others = (r.choices ?? []).filter((c) => c.id !== 'asi-1'); up({ choices: n ? [...others, { id: 'asi-1', label: `+1 to ${n} abilities`, kind: 'ability', count: n, amount: 1 }] : others }); }} /></Field>
        <Field label="Darkvision (ft)"><input type="number" min={0} value={dv?.grants?.senses?.darkvision ?? ''} onChange={(e) => { const v = Number(e.target.value) || 0; const rest = r.traits.filter((t) => t.id !== 'custom-darkvision'); up({ traits: v ? [{ id: 'custom-darkvision', name: 'Darkvision', description: `You can see in dim light within ${v} feet as if it were bright light.`, grants: { senses: { darkvision: v } } }, ...rest] : rest }); }} /></Field>
      </div>
      <TagList label="Languages" values={langTrait?.grants?.languages ?? []} suggestions={['Common', 'Elvish', 'Dwarvish', 'Draconic']} onChange={(languages) => { const rest = r.traits.filter((t) => t.id !== 'custom-languages'); up({ traits: languages.length ? [...rest, { id: 'custom-languages', name: 'Languages', description: languages.join(', '), grants: { languages } }] : rest }); }} />
      <span className="section-label">Racial traits</span>
      <FeatureListEditor features={r.traits.filter((t) => !t.id.startsWith('custom-'))} onChange={(f) => up({ traits: [...r.traits.filter((t) => t.id.startsWith('custom-')), ...f] })} />
      <p className="small muted">Use effects on a trait to grant resistances (Defense → Damage resistance), skill proficiencies, innate bonuses, natural armor, etc.</p>
    </Shell>
  );
}

export function SubclassEditor({ initial, onClose, onSave }: { initial: SubclassDef; onClose: () => void; onSave: (s: SubclassDef) => void }) {
  const db = useDb();
  const [s, setS] = useState(initial);
  const up = (p: Partial<SubclassDef>) => setS({ ...s, ...p });
  return (
    <Shell title={initial.name ? `Edit subclass: ${initial.name}` : 'New subclass'} value={s} onClose={onClose} onSave={onSave}>
      <div className="field-row">
        <Field label="Name" required><input value={s.name} onChange={(e) => up({ name: e.target.value })} /></Field><RulesetTagSelect value={s.ruleset} onChange={(ruleset) => up({ ruleset } as never)} />
        <Field label="Class"><select value={s.classId} onChange={(e) => up({ classId: e.target.value })}>{[...db.classes.values()].map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Source"><input value={s.source.book} onChange={(e) => up({ source: { ...CUSTOM, book: e.target.value } })} /></Field>
      </div>
      <Field label="Description"><textarea rows={3} value={s.description} onChange={(e) => up({ description: e.target.value })} /></Field>
      <span className="section-label">Features (set the class level each is gained)</span>
      <FeatureListEditor withLevel features={s.features} onChange={(features) => up({ features })} />
      <span className="section-label">Always-prepared / bonus spells by class level</span>
      {(s.spells ?? []).map((b, i) => (
        <div key={i} className="row">
          <label className="row tight small">Lvl<input type="number" className="num-sm" value={b.level} onChange={(e) => up({ spells: s.spells!.map((x, j) => (j === i ? { ...x, level: Number(e.target.value) || 1 } : x)) })} /></label>
          <select value={b.mode} onChange={(e) => up({ spells: s.spells!.map((x, j) => (j === i ? { ...x, mode: e.target.value as 'always-prepared' } : x)) })} style={{ width: 'auto' }}><option value="always-prepared">Always prepared</option><option value="expanded-list">Added to class list</option></select>
          <input className="grow" value={b.spells.join(', ')} placeholder="spell ids, e.g. bless, cure-wounds" onChange={(e) => up({ spells: s.spells!.map((x, j) => (j === i ? { ...x, spells: e.target.value.split(',').map((y) => y.trim()).filter(Boolean) } : x)) })} />
          <button className="small ghost danger" onClick={() => up({ spells: s.spells!.filter((_, j) => j !== i) })}>✕</button>
        </div>
      ))}
      <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => up({ spells: [...(s.spells ?? []), { level: 3, spells: [], mode: 'always-prepared' }] })}>+ Spell block</button>
      <p className="small muted">Spell ids are lowercase with dashes as shown in the spell browser (unknown ids produce a warning on the sheet).</p>
    </Shell>
  );
}

export function ClassEditor({ initial, onClose, onSave }: { initial: ClassDef; onClose: () => void; onSave: (c: ClassDef) => void }) {
  const [c, setC] = useState(initial);
  const up = (p: Partial<ClassDef>) => setC({ ...c, ...p });
  const sc = c.spellcasting;
  return (
    <Shell title={initial.name ? `Edit class: ${initial.name}` : 'New class'} value={c} onClose={onClose} onSave={onSave}>
      <div className="field-row">
        <Field label="Name" required><input value={c.name} onChange={(e) => up({ name: e.target.value })} /></Field><RulesetTagSelect value={c.ruleset} onChange={(ruleset) => up({ ruleset } as never)} />
        <Field label="Hit die"><select value={c.hitDie} onChange={(e) => up({ hitDie: Number(e.target.value) })}>{[6, 8, 10, 12].map((d) => <option key={d} value={d}>d{d}</option>)}</select></Field>
        <Field label="Subclass label"><input value={c.subclassLabel} onChange={(e) => up({ subclassLabel: e.target.value })} /></Field>
        <Field label="Subclass at level"><input type="number" min={1} max={20} value={c.subclassLevel} onChange={(e) => up({ subclassLevel: Number(e.target.value) || 3 })} /></Field>
      </div>
      <Field label="Description"><textarea rows={2} value={c.description} onChange={(e) => up({ description: e.target.value })} /></Field>
      <div className="stack"><span className="section-label">Saving throw proficiencies</span><div className="row">{ABILITIES.map((a) => <label key={a} className="check"><input type="checkbox" checked={c.saves.includes(a)} onChange={(e) => up({ saves: e.target.checked ? [...c.saves, a] : c.saves.filter((x) => x !== a) })} />{ABILITY_NAMES[a]}</label>)}</div></div>
      <div className="field-row"><Field label="Skills to choose"><input type="number" min={0} max={6} value={c.skillChoices.count} onChange={(e) => up({ skillChoices: { ...c.skillChoices, count: Number(e.target.value) || 0 } })} /></Field></div>
      <SkillPick label="Skill list" value={c.skillChoices.from} onChange={(from) => up({ skillChoices: { ...c.skillChoices, from } })} />
      <TagList label="Armor proficiencies" values={c.armor} suggestions={['light', 'medium', 'heavy', 'shields']} onChange={(armor) => up({ armor })} />
      <TagList label="Weapon proficiencies" values={c.weapons} suggestions={['simple', 'martial']} onChange={(weapons) => up({ weapons })} />
      <TagList label="ASI levels" values={c.asiLevels.map(String)} suggestions={['4', '8', '12', '16', '19']} onChange={(v) => up({ asiLevels: v.map(Number).filter((n) => n >= 1 && n <= 20).sort((a, b) => a - b) })} />
      <div className="stack"><span className="section-label">Multiclass prerequisite (minimum scores)</span><AbilityBonusEditor value={c.multiclass.prerequisite.all ?? {}} onChange={(all) => up({ multiclass: { ...c.multiclass, prerequisite: { all } } })} /></div>
      <label className="check"><input type="checkbox" checked={!!sc} onChange={(e) => up({ spellcasting: e.target.checked ? { ability: 'int', progression: 'full', style: 'prepared', list: c.id, prepared: 'max(1, int + cl)', cantrips: Array(20).fill(3) } : undefined })} />Spellcasting</label>
      {sc && <div className="field-row">
        <Field label="Ability"><select value={sc.ability} onChange={(e) => up({ spellcasting: { ...sc, ability: e.target.value as Ability } })}>{ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}</select></Field>
        <Field label="Progression"><select value={sc.progression} onChange={(e) => up({ spellcasting: { ...sc, progression: e.target.value as CasterProgression } })}><option value="full">Full caster</option><option value="half">Half caster (Paladin/Ranger)</option><option value="half-up">Half caster, rounded up</option><option value="third">Third caster</option><option value="pact">Pact Magic</option></select></Field>
        <Field label="Spells"><select value={sc.style} onChange={(e) => up({ spellcasting: { ...sc, style: e.target.value as PreparationStyle } })}><option value="prepared">Prepared from list</option><option value="known">Known</option><option value="spellbook">Spellbook</option></select></Field>
        <Field label="Spell list (class id)"><input value={sc.list} onChange={(e) => up({ spellcasting: { ...sc, list: e.target.value } })} /></Field>
        {sc.style !== 'known' && <Field label="Prepared formula"><input value={String(sc.prepared ?? '')} onChange={(e) => up({ spellcasting: { ...sc, prepared: e.target.value } })} /></Field>}
        <Field label="Cantrips known (all levels)"><input type="number" min={0} value={sc.cantrips?.[0] ?? 0} onChange={(e) => up({ spellcasting: { ...sc, cantrips: Array(20).fill(Number(e.target.value) || 0) } })} /></Field>
        {sc.style === 'known' && <Field label="Spells known at level 1 (+1 per level)"><input type="number" min={0} value={sc.known?.[0] ?? 2} onChange={(e) => { const b = Number(e.target.value) || 0; up({ spellcasting: { ...sc, known: Array.from({ length: 20 }, (_, i) => b + i) } }); }} /></Field>}
      </div>}
      <span className="section-label">Class features</span>
      <FeatureListEditor withLevel features={c.features} onChange={(features) => up({ features })} />
    </Shell>
  );
}

export function SimpleEditor({ kind, initial, onClose, onSave }: { kind: 'language' | 'proficiency'; initial: CustomLanguage | CustomProficiency; onClose: () => void; onSave: (v: { id: string; name: string }) => void }) {
  const [v, setV] = useState(initial);
  return (
    <Shell title={kind === 'language' ? 'Language' : 'Proficiency'} value={v} onClose={onClose} onSave={onSave}>
      <Field label="Name" required><input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field><RulesetTagSelect value={v.ruleset} onChange={(ruleset) => setV({ ...v, ruleset } as never)} />
      {kind === 'proficiency' && <Field label="Group"><select value={(v as CustomProficiency).group} onChange={(e) => setV({ ...(v as CustomProficiency), group: e.target.value as 'tool' })}><option value="tool">Tool</option><option value="weapon">Weapon</option><option value="armor">Armor</option><option value="other">Other</option></select></Field>}
      <Field label="Description"><textarea rows={3} value={v.description ?? ''} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
    </Shell>
  );
}
