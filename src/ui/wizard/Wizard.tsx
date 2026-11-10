import { useDb, dbFor, RulesetProvider } from '@/ui/ruleset';
// Multi-step character creation wizard. Edits a draft character directly (auto-saved),
// so navigating back and forth never loses progress.
import { useMemo, useState } from 'react';
import { useApp, useCharacter } from '@/state/store';
import { derive, type ChoiceView, type Derived } from '@/engine/derive';
import { go } from '../router';
import type { Character } from '@/types/character';
import { ABILITIES, ABILITY_NAMES, ALIGNMENTS, abilityMod, signed, XP_THRESHOLDS, type Ability, RULESETS } from '@/types/core';
import { Field, NumberField, titleCase, Empty } from '../components/common';
import { ChoiceEditor, choiceComplete } from '../components/ChoiceEditor';
import { AbilityGenerator } from './AbilityGenerator';
import { validatePointBuy, validateStandardArray } from '@/engine/abilityGen';
import { EquipmentStep } from './EquipmentStep';
import { SpellPicker, addClassSpell } from '../components/spells';
import { PortraitInput } from '../components/PortraitInput';

const stepLabel = (s: string, ch: Character) => (s === 'Race' && ch.ruleset === 'dnd5e-2024' ? 'Species' : s);
const STEPS = ['Identity', 'Race', 'Class', 'Subclass', 'Background', 'Ability Scores', 'Proficiencies & Choices', 'Equipment', 'Spells', 'Details', 'Review'] as const;

export function Wizard({ id, step }: { id: string; step?: string }) {
  const ch = useCharacter(id);
  const db = useApp((s) => s.dbs[ch?.ruleset ?? 'dnd5e-2014']);
  const update = useApp((s) => s.update);
  if (!ch) return <Empty>Character not found. <a href="#/">Back to list</a></Empty>;
  const d = derive(ch, db);
  const idx = Math.max(0, Math.min(STEPS.length - 1, step !== undefined ? Number(step) : ch.wizardStep ?? 0));
  const set = (recipe: (c: Character) => void) => update(id, recipe);
  const goStep = (n: number) => { set((c) => { c.wizardStep = n; }); go('new', id, String(n)); window.scrollTo(0, 0); };
  const status = stepStatus(ch, d);
  const Step = [IdentityStep, RaceStep, ClassStep, SubclassStep, BackgroundStep, AbilityStep, ChoicesStep, EquipmentStep, SpellsStep, DetailsStep, ReviewStep][idx];

  return (
    <RulesetProvider value={ch.ruleset}>
    <div className="stack">
      <div className="page-head">
        <h1>New character{ch.identity.name ? `: ${ch.identity.name}` : ''}</h1>
        <span className="small muted">Progress is saved automatically. Fields marked * are required.</span>
      </div>
      <div className="wizard">
        <nav className="wizard-steps" aria-label="Creation steps">
          {STEPS.map((s, i) => (
            <button key={s} className={`${i === idx ? 'active' : ''} ${status[i] === 'done' ? 'done' : status[i] === 'todo' ? 'todo' : ''}`} onClick={() => goStep(i)}>
              <span className="n">{status[i] === 'done' ? '✓' : i + 1}</span><span className="label">{stepLabel(s, ch)}</span>
            </button>
          ))}
        </nav>
        <div className="stack">
          <div className="panel">
            <h2 style={{ marginBottom: 12 }}>{stepLabel(STEPS[idx], ch)}</h2>
            <Step ch={ch} d={d} set={set} goStep={goStep} />
          </div>
          <div className="wizard-nav">
            <button onClick={() => goStep(idx - 1)} disabled={idx === 0}>← Back</button>
            {idx < STEPS.length - 1 && <button className="primary" onClick={() => goStep(idx + 1)}>Next: {stepLabel(STEPS[idx + 1], ch)} →</button>}
          </div>
        </div>
      </div>
    </div>
    </RulesetProvider>
  );
}

type StepProps = { ch: Character; d: Derived; set: (r: (c: Character) => void) => void; goStep: (n: number) => void };

function choicesFor(d: Derived, kinds: string[]): ChoiceView[] {
  return d.choices.filter((c) => kinds.includes(c.source.kind));
}

function stepStatus(ch: Character, d: Derived): ('done' | 'todo' | 'optional')[] {
  const cls = d.classes[0];
  const needsSub = cls?.def && cls.level >= cls.def.subclassLevel;
  const raceChoices = choicesFor(d, ['race', 'subrace']).filter((c) => !c.key.startsWith('race:asi') || true);
  const casterNeeds = d.casters.some((cv) => (cv.cantripsKnown ?? 0) > 0 || cv.spellsKnown !== undefined || cv.style === 'spellbook');
  const raceOk = !!ch.race.raceId && (!db_subraceRequired(d, ch) || !!ch.race.subraceId) && raceChoices.every(choiceComplete);
  return [
    ch.identity.name.trim() ? 'done' : 'todo',
    raceOk ? 'done' : 'todo',
    ch.classes.length ? 'done' : 'todo',
    !needsSub ? 'optional' : cls.entry.subclassId ? 'done' : 'todo',
    ch.background.backgroundId && choicesFor(d, ['background']).every(choiceComplete) ? 'done' : 'todo',
    abilitiesValid(ch) ? 'done' : 'todo',
    d.choices.filter((c) => !['race', 'subrace', 'background'].includes(c.source.kind)).every(choiceComplete) ? 'done' : 'todo',
    ch.choices['wizard:equip-applied']?.length ? 'done' : 'optional',
    !casterNeeds ? 'optional' : ch.spells.entries.length ? 'done' : 'todo',
    'optional',
    'optional',
  ];
}
function abilitiesValid(ch: Character): boolean {
  const a = ch.abilities;
  switch (a.method) {
    case 'point-buy': return validatePointBuy(a.base).valid;
    case 'standard-array': return validateStandardArray(a.arrayAssignment ?? {}).valid;
    case 'roll-3d6': case 'roll-4d6': return (a.rolls?.length ?? 0) === 6 && ABILITIES.every((x) => !!a.assignment?.[x]);
    default: return ch.choices['wizard:abilities-done']?.[0] === '1';
  }
}
function db_subraceRequired(d: Derived, ch: Character) { void ch; return d.warnings.some((w) => w.includes('choose a subrace')); }

// ------------------------------------------------------------------ steps

function IdentityStep({ ch, set }: StepProps) {
  const level = ch.classes[0]?.level ?? 1;
  return (
    <div className="stack lg">
      <div className="field-row">
        <Field label="Character name" required><input value={ch.identity.name} onChange={(e) => set((c) => { c.identity.name = e.target.value; })} placeholder="e.g. Seraphine Vale" /></Field>
        <Field label="Player name"><input value={ch.identity.playerName} onChange={(e) => set((c) => { c.identity.playerName = e.target.value; })} /></Field>
        <Field label="Alignment"><select value={ch.identity.alignment} onChange={(e) => set((c) => { c.identity.alignment = e.target.value; })}><option value="">—</option>{ALIGNMENTS.map((a) => <option key={a}>{a}</option>)}</select></Field>
      </div>
      <div className="field-row">
        <Field label="Ruleset" hint="2014 and 2024 content are kept separate. 2024: ability increases and an Origin feat come from the background; Weapon Mastery; new exhaustion.">
          <select value={ch.ruleset} onChange={(e) => {
            const next = e.target.value as Character['ruleset'];
            const hasData = !!(ch.race.raceId || ch.background.backgroundId || ch.classes.length || ch.spells.entries.length);
            if (hasData && !window.confirm('Switching rulesets clears race/species, class, background, choices and spells chosen so far (2014 and 2024 content are not mixed). Continue?')) return;
            set((c) => { c.ruleset = next; c.race = { raceId: '' }; c.background = { backgroundId: '' }; c.classes = []; c.spells.entries = []; c.choices = Object.fromEntries(Object.entries(c.choices).filter(([k]) => k.startsWith('wizard:start-level'))); });
          }}>
            {Object.entries(RULESETS).map(([k, v]) => <option key={k} value={k} disabled={!v.supported}>{v.name}</option>)}
          </select>
        </Field>
        <Field label="Starting level" hint="Higher-level characters get average HP; you can record rolls later.">
          <NumberField className="" value={level} min={1} max={20} onChange={(v) => set((c) => { if (c.classes[0]) c.classes[0].level = v; else c.choices['wizard:start-level'] = [String(v)]; c.identity.xp = Math.max(c.identity.xp, XP_THRESHOLDS[v - 1]); })} />
        </Field>
        <Field label="Advancement"><select value={ch.identity.milestone ? 'milestone' : 'xp'} onChange={(e) => set((c) => { c.identity.milestone = e.target.value === 'milestone'; })}><option value="xp">Experience points</option><option value="milestone">Milestone</option></select></Field>
      </div>
      <div className="stack">
        <span className="section-label">Optional rules</span>
        <label className="check"><input type="checkbox" checked={ch.settings.optional.feats} onChange={(e) => set((c) => { c.settings.optional.feats = e.target.checked; })} />Feats (in place of Ability Score Improvements)</label>
        <label className="check"><input type="checkbox" checked={ch.settings.optional.multiclassing} onChange={(e) => set((c) => { c.settings.optional.multiclassing = e.target.checked; })} />Multiclassing</label>
        <label className="check"><input type="checkbox" checked={!!ch.settings.optional.customOrigin} onChange={(e) => set((c) => { c.settings.optional.customOrigin = e.target.checked; })} />Customizing your origin (TCoE): reassign racial ability increases</label>
      </div>
    </div>
  );
}

function RaceStep({ ch, d, set }: StepProps) {
  const db = useDb();
  const races = [...db.races.values()].sort((a, b) => a.name.localeCompare(b.name));
  const race = db.races.get(ch.race.raceId);
  return (
    <div className="split">
      <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', alignContent: 'start' }}>
        {races.map((r) => (
          <button key={r.id} className={`option ${ch.race.raceId === r.id ? 'selected' : ''}`} onClick={() => set((c) => { if (c.race.raceId !== r.id) { c.race = { raceId: r.id, subraceId: r.subraces?.length === 1 ? r.subraces[0].id : undefined }; } })}>
            <span className="title">{r.name}</span>
            <span className="desc">{ch.ruleset === 'dnd5e-2024' ? `${titleCase(r.size)} · speed ${r.speed.walk}` : Object.entries(r.abilityBonuses).map(([a, v]) => `${a.toUpperCase()} ${signed(v!)}`).join(', ') || 'Flexible'} · {r.source.book}</span>
          </button>
        ))}
      </div>
      <div className="stack">
        {!race ? <Empty>Select a race to see its traits.</Empty> : <>
          <div><h3>{race.name}</h3><p className="ink2">{race.description}</p>
            <div className="row small">{race.sizeOptions?.length ? <select value={ch.identity.size ?? race.size} onChange={(e) => set((c) => { c.identity.size = e.target.value as Character['identity']['size']; })} style={{ width: 'auto' }} aria-label="Size">{race.sizeOptions.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select> : <span className="chip">Size: {titleCase(race.size)}</span>}{ch.ruleset === 'dnd5e-2024' && <span className="chip">Ability increases come from your background</span>}<span className="chip">Speed {race.speed.walk} ft{Object.entries(race.speed).filter(([k]) => k !== 'walk').map(([k, v]) => `, ${k} ${v}`).join('')}</span>{race.source.kind === 'summary' && <span className="chip">Summary — see {race.source.book}</span>}</div>
          </div>
          {race.subraces?.length ? (
            <div className="stack">
              <span className="section-label">{race.subraceRequired ? <span className="req">Subrace</span> : 'Subrace'}</span>
              <div className="option-grid">
                {race.subraces.map((s) => (
                  <button key={s.id} className={`option ${ch.race.subraceId === s.id ? 'selected' : ''}`} onClick={() => set((c) => { c.race.subraceId = s.id; })}>
                    <span className="title">{s.name}</span><span className="desc">{Object.entries(s.abilityBonuses ?? {}).map(([a, v]) => `${a.toUpperCase()} ${signed(v!)}`).join(', ')} {s.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div><span className="section-label">Traits</span>
            {[...race.traits.filter((t) => !(race.subraces?.find((s) => s.id === ch.race.subraceId)?.removesTraits ?? []).includes(t.id)), ...(race.subraces?.find((s) => s.id === ch.race.subraceId)?.traits ?? [])].map((t) => (
              <div className="feature" key={t.id}><div className="feature-head"><h4>{t.name}</h4>{t.level && t.level > 1 && <span className="chip">from level {t.level}</span>}</div><div className="feature-desc">{t.description}</div></div>
            ))}
          </div>
          {choicesFor(d, ['race', 'subrace']).map((cv) => <ChoiceEditor key={cv.key} cv={cv} ch={ch} d={d} onChange={(v) => set((c) => { c.choices[cv.key] = v; })} />)}
        </>}
      </div>
    </div>
  );
}

function ClassStep({ ch, d, set }: StepProps) {
  const db = useDb();
  const cur = ch.classes[0];
  const def = cur ? db.classes.get(cur.classId) : undefined;
  const startLevel = cur?.level ?? Number(ch.choices['wizard:start-level']?.[0] ?? 1);
  void d;
  return (
    <div className="split">
      <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', alignContent: 'start' }}>
        {[...db.classes.values()].map((c) => (
          <button key={c.id} className={`option ${cur?.classId === c.id ? 'selected' : ''}`} onClick={() => set((x) => { if (x.classes[0]?.classId !== c.id) x.classes = [{ classId: c.id, level: startLevel, hpRolls: [] }]; })}>
            <span className="title">{c.name}</span><span className="desc">d{c.hitDie} · {c.primaryAbilities.map((a) => a.toUpperCase()).join('/')}{c.spellcasting ? ' · caster' : ''}</span>
          </button>
        ))}
      </div>
      {!def ? <Empty>Choose a class.</Empty> : (
        <div className="stack">
          <h3>{def.name}</h3>
          <p className="ink2">{def.description}</p>
          <dl className="kv">
            <dt>Hit die</dt><dd>d{def.hitDie} (level 1: {def.hitDie} + CON)</dd>
            <dt>Saving throws</dt><dd>{def.saves.map((a) => ABILITY_NAMES[a]).join(', ')}</dd>
            <dt>Armor</dt><dd>{def.armor.map(titleCase).join(', ') || 'None'}</dd>
            <dt>Weapons</dt><dd>{def.weapons.map(titleCase).join(', ')}</dd>
            <dt>Skills</dt><dd>Choose {def.skillChoices.count}</dd>
            {def.spellcasting && <><dt>Spellcasting</dt><dd>{ABILITY_NAMES[def.spellcasting.ability]}, {def.spellcasting.progression} caster, {def.spellcasting.style}</dd></>}
            <dt>{def.subclassLabel}</dt><dd>at level {def.subclassLevel}</dd>
          </dl>
          <Field label="Class level"><NumberField className="" value={cur.level} min={1} max={20} onChange={(v) => set((x) => { x.classes[0].level = v; })} /></Field>
          <div><span className="section-label">Features up to level {cur.level}</span>
            {def.features.filter((f) => (f.level ?? 1) <= cur.level && !f.hidden).map((f) => <div key={f.id} className="feature"><div className="feature-head"><h4>{f.name}</h4><span className="chip">Lvl {f.level}</span></div><div className="feature-desc clamp">{f.description}</div></div>)}
          </div>
          <p className="small muted">Multiclassing: add more classes later in the Progression tab.</p>
        </div>
      )}
    </div>
  );
}

function SubclassStep({ ch, set }: StepProps) {
  const db = useDb();
  const cur = ch.classes[0];
  const def = cur && db.classes.get(cur.classId);
  const [preview, setPreview] = useState<string | undefined>(cur?.subclassId);
  if (!def) return <Empty>Choose a class first.</Empty>;
  const subs = db.subclassesFor(def.id);
  const shown = db.subclasses.get(preview ?? '') ?? db.subclasses.get(cur.subclassId ?? '');
  const locked = cur.level < def.subclassLevel;
  return (
    <div className="stack">
      {locked && <div className="notice">{def.name}s choose their {def.subclassLabel} at level {def.subclassLevel}. You can pick one now as a plan — its features won’t apply until then — or leave it for later.</div>}
      <div className="split">
        <div className="list panel flush">
          {subs.map((s) => (
            <div key={s.id} className={`list-row clickable ${cur.subclassId === s.id ? 'selected' : ''}`} onClick={() => setPreview(s.id)}>
              <span className="grow"><b>{s.name}</b> <span className="small muted">{s.source.book}</span>{db.isCustom('subclass', s.id) && <span className="badge custom">custom</span>}</span>
              <button className={`small ${cur.subclassId === s.id ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); set((c) => { c.classes[0].subclassId = c.classes[0].subclassId === s.id ? undefined : s.id; }); }}>{cur.subclassId === s.id ? 'Selected' : 'Select'}</button>
            </div>
          ))}
        </div>
        {shown ? (
          <div className="stack">
            <h3>{shown.name}</h3><p className="ink2">{shown.description}</p>
            {shown.source.kind === 'summary' && <div className="notice small">Mechanics summary. Full text: {shown.source.book}.</div>}
            {shown.features.map((f) => <div key={f.id} className="feature"><div className="feature-head"><h4>{f.name}</h4><span className="chip">Lvl {f.level}</span>{(f.level ?? 0) > cur.level && <span className="chip">locked</span>}</div><div className="feature-desc">{f.description}</div></div>)}
            {shown.spells?.length ? <div><span className="section-label">Spells</span>{shown.spells.map((b) => <div key={b.level} className="small">Lvl {b.level}: {b.spells.map((s) => db.spells.get(s)?.name ?? s).join(', ')} <span className="muted">({b.mode === 'expanded-list' ? 'added to your list' : 'always prepared'})</span></div>)}</div> : null}
          </div>
        ) : <Empty>Select a subclass to preview its features.</Empty>}
      </div>
    </div>
  );
}

function BackgroundStep({ ch, d, set }: StepProps) {
  const db = useDb();
  const bgs = [...db.backgrounds.values()].sort((a, b) => a.name.localeCompare(b.name));
  const bg = db.backgrounds.get(ch.background.backgroundId);
  return (
    <div className="split">
      <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', alignContent: 'start' }}>
        {bgs.map((b) => <button key={b.id} className={`option ${ch.background.backgroundId === b.id ? 'selected' : ''}`} onClick={() => set((c) => { c.background.backgroundId = b.id; })}><span className="title">{b.name}</span><span className="desc">{(b.grants.skills ?? []).map(titleCase).join(', ')}</span></button>)}
      </div>
      {!bg ? <Empty>Choose a background.</Empty> : (
        <div className="stack">
          <h3>{bg.name}</h3><p className="ink2">{bg.description}</p>
          <dl className="kv">
            <dt>Skills</dt><dd>{(bg.grants.skills ?? []).map(titleCase).join(', ') || '—'}</dd>
            <dt>Tools</dt><dd>{(bg.grants.tools ?? []).join(', ') || '—'}</dd>
            <dt>Equipment</dt><dd>{bg.equipment.map((e) => e.name ?? db.items.get(e.itemId)?.name ?? e.itemId).join(', ') || '—'}{bg.gold ? `, ${bg.gold} gp` : ''}{bg.goldAlternative ? ` (or ${bg.goldAlternative} gp instead)` : ''}</dd>
            {bg.abilityOptions && <><dt>Ability scores</dt><dd>{bg.abilityOptions.map((a) => a.toUpperCase()).join(', ')}: +2/+1 or +1/+1/+1</dd></>}
            {bg.originFeat && <><dt>Origin feat</dt><dd>{bg.originFeat.note ?? db.feats.get(bg.originFeat.id)?.name ?? bg.originFeat.id}</dd></>}
          </dl>
          {bg.feature.name && <div className="feature"><div className="feature-head"><h4>Feature: {bg.feature.name}</h4></div><div className="feature-desc">{bg.feature.description}</div></div>}
          {bg.originFeat && db.feats.get(bg.originFeat.id) && <div className="feature"><div className="feature-head"><h4>Origin feat: {db.feats.get(bg.originFeat.id)!.name}</h4><span className="small muted">its choices are on the Proficiencies & Choices step</span></div><div className="feature-desc clamp">{db.feats.get(bg.originFeat.id)!.description}</div></div>}
          {choicesFor(d, ['background']).map((cv) => <ChoiceEditor key={cv.key} cv={cv} ch={ch} d={d} onChange={(v) => set((c) => { c.choices[cv.key] = v; })} />)}
        </div>
      )}
    </div>
  );
}

function AbilityStep({ ch, d, set }: StepProps) {
  return (
    <div className="stack lg">
      <AbilityGenerator ch={ch} set={set} />
      <div>
        <span className="section-label">Final scores (base + bonuses)</span>
        <div className="abil-grid">
          {ABILITIES.map((a: Ability) => (
            <div key={a} className="abil" style={{ cursor: 'default' }} title={d.abilities[a].parts.map((p) => `${p.label}: ${signed(p.value)}`).join('\n')}>
              <div className="name">{ABILITY_NAMES[a]}</div>
              <div className="mod">{signed(abilityMod(d.abilities[a].score))}</div>
              <div className="score">{d.abilities[a].score}</div>
              <div className="small muted" style={{ marginTop: 4 }}>base {d.abilities[a].base}{d.abilities[a].score !== d.abilities[a].base ? ` ${signed(d.abilities[a].score - d.abilities[a].base)}` : ''}</div>
            </div>
          ))}
        </div>
        {choicesFor(d, ['race', 'subrace', 'background']).filter((c) => c.def.kind === 'ability' || c.def.kind === 'ability-split').map((cv) => <ChoiceEditor key={cv.key} cv={cv} ch={ch} d={d} onChange={(v) => set((c) => { c.choices[cv.key] = v; })} />)}
      </div>
      {ch.abilities.method === 'manual' && <label className="check"><input type="checkbox" checked={ch.choices['wizard:abilities-done']?.[0] === '1'} onChange={(e) => set((c) => { c.choices['wizard:abilities-done'] = [e.target.checked ? '1' : '0']; })} />These manually entered scores are final</label>}
    </div>
  );
}

function ChoicesStep({ ch, d, set }: StepProps) {
  const groups = new Map<string, ChoiceView[]>();
  for (const cv of d.choices) {
    const label = cv.source.kind === 'race' || cv.source.kind === 'subrace' ? 'Race' : cv.source.kind === 'background' ? 'Background' : `${cv.source.label}`;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(cv);
  }
  return (
    <div className="stack lg">
      <p className="ink2">All choices granted by your race, background, class and features at your current level. Items with a red marker are required.</p>
      {[...groups.entries()].map(([label, cvs]) => (
        <div key={label} className="stack">
          <span className="section-label">{label}</span>
          {cvs.map((cv) => <ChoiceEditor key={cv.key} cv={cv} ch={ch} d={d} onChange={(v) => set((c) => { c.choices[cv.key] = v; })} />)}
        </div>
      ))}
      <div className="panel" style={{ background: 'var(--bg-2)' }}>
        <span className="section-label">Resulting proficiencies</span>
        <dl className="kv">
          <dt>Skills</dt><dd>{Object.values(d.skills).filter((s) => s.prof >= 1).map((s) => `${titleCase(s.id)}${s.prof === 2 ? ' (expertise)' : ''}`).join(', ') || '—'}</dd>
          <dt>Saves</dt><dd>{ABILITIES.filter((a) => d.saves[a].proficient).map((a) => ABILITY_NAMES[a]).join(', ')}</dd>
          <dt>Armor</dt><dd>{d.proficiencies.armor.join(', ') || '—'}</dd>
          <dt>Weapons</dt><dd>{d.proficiencies.weapons.map(titleCase).join(', ') || '—'}</dd>
          <dt>Tools</dt><dd>{d.proficiencies.tools.join(', ') || '—'}</dd>
          <dt>Languages</dt><dd>{d.proficiencies.languages.join(', ') || '—'}</dd>
        </dl>
      </div>
    </div>
  );
}

function SpellsStep({ ch, d, set }: StepProps) {
  const db = useDb();
  const [active, setActive] = useState(0);
  if (!d.casters.length) return <Empty>Your character has no class spellcasting at this level. Racial or feat spells are added automatically.</Empty>;
  const cv = d.casters[Math.min(active, d.casters.length - 1)];
  const mine = ch.spells.entries.filter((e) => e.classId === cv.classId);
  const cantrips = mine.filter((e) => (db.spells.get(e.spellId)?.level ?? 0) === 0).length;
  const leveled = mine.filter((e) => (db.spells.get(e.spellId)?.level ?? 0) > 0).length;
  return (
    <div className="stack">
      {d.casters.length > 1 && <div className="subtabs">{d.casters.map((c, i) => <button key={c.classId} className={i === active ? 'active' : ''} onClick={() => setActive(i)}>{c.name}</button>)}</div>}
      <div className="row">
        {cv.cantripsKnown !== undefined && <span className={`chip ${cantrips === cv.cantripsKnown ? 'green' : cantrips > cv.cantripsKnown ? 'red' : ''}`}>Cantrips {cantrips}/{cv.cantripsKnown}</span>}
        {cv.style === 'known' && cv.spellsKnown !== undefined && <span className={`chip ${leveled === cv.spellsKnown ? 'green' : leveled > cv.spellsKnown ? 'red' : ''}`}>Spells known {leveled}/{cv.spellsKnown}</span>}
        {cv.style === 'spellbook' && <span className={`chip ${leveled >= (cv.spellbookMin ?? 0) ? 'green' : ''}`}>Spellbook {leveled}/{cv.spellbookMin}</span>}
        {cv.style !== 'known' && <span className="chip">Prepare {cv.preparedLimit} per day (set on the Spells tab)</span>}
        <span className="chip">Max spell level {cv.maxSpellLevel}</span>
      </div>
      {cv.style === 'prepared' && <p className="small ink2">{cv.name}s prepare from the whole class list each day — you don’t need to add spells now. Add your usual prepared spells for convenience if you like.</p>}
      <SpellPicker ch={ch} d={d} cv={cv} onAdd={(s) => set((c) => addClassSpell(c, s, cv))} onRemove={(s) => set((c) => { c.spells.entries = c.spells.entries.filter((e) => !(e.spellId === s.id && e.classId === cv.classId)); })} />
    </div>
  );
}

function DetailsStep({ ch, set }: StepProps) {
  const t = (k: keyof Character['personality'], label: string, rows = 3) => <Field label={label}><textarea rows={rows} value={ch.personality[k] ?? ''} onChange={(e) => set((c) => { (c.personality as Record<string, string>)[k] = e.target.value; })} /></Field>;
  const i = (k: keyof Character['identity'], label: string) => <Field label={label}><input value={String(ch.identity[k] ?? '')} onChange={(e) => set((c) => { (c.identity as Record<string, unknown>)[k] = e.target.value; })} /></Field>;
  const db = useDb();
  const bg = db.backgrounds.get(ch.background.backgroundId);
  return (
    <div className="stack lg">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <PortraitInput value={ch.identity.portrait} onChange={(v) => set((c) => { c.identity.portrait = v; })} />
        <div className="grow field-row">{i('age', 'Age')}{i('height', 'Height')}{i('weight', 'Weight')}{i('eyes', 'Eyes')}{i('skin', 'Skin')}{i('hair', 'Hair')}{i('gender', 'Gender / pronouns')}{i('deity', 'Deity / faith')}</div>
      </div>
      <Field label="Appearance"><textarea rows={3} value={ch.identity.appearance} onChange={(e) => set((c) => { c.identity.appearance = e.target.value; })} /></Field>
      <div className="grid cols-2">{t('traits', 'Personality traits')}{t('ideals', 'Ideals')}{t('bonds', 'Bonds')}{t('flaws', 'Flaws')}</div>
      {bg?.suggested?.ideals && <p className="small muted">Suggested ideals for {bg.name}: {bg.suggested.ideals.join(', ')}</p>}
      {t('backstory', 'Backstory', 6)}
      {t('allies', 'Allies & organizations', 3)}
    </div>
  );
}

function ReviewStep({ ch, d, set, goStep }: StepProps) {
  const status = stepStatus(ch, d);
  const missing = STEPS.filter((_, i) => status[i] === 'todo');
  const update = useApp((s) => s.update);
  const finish = () => {
    update(ch.id, (c) => { c.draft = false; c.combat.hpCurrent = d.hp.max; delete c.wizardStep; });
    go('c', ch.id);
  };
  void set;
  return (
    <div className="stack lg">
      <div className="stat-strip">
        <div className="stat"><span className="label">Level</span><span className="value">{d.totalLevel}</span></div>
        <div className="stat"><span className="label">Armor Class</span><span className="value">{d.ac.total}</span><span className="sub">{d.ac.formula}</span></div>
        <div className="stat"><span className="label">Hit Points</span><span className="value">{d.hp.max}</span></div>
        <div className="stat"><span className="label">Initiative</span><span className="value">{signed(d.initiative.total)}</span></div>
        <div className="stat"><span className="label">Speed</span><span className="value">{d.speed.walk.value}</span><span className="sub">ft</span></div>
        <div className="stat"><span className="label">Prof. bonus</span><span className="value">{signed(d.profBonus)}</span></div>
      </div>
      <dl className="kv">
        <dt>Name</dt><dd>{ch.identity.name || <span className="bad">missing</span>}</dd>
        <dt>Class</dt><dd>{d.classLine}</dd>
        <dt>Background</dt><dd>{dbFor(ch.ruleset).backgrounds.get(ch.background.backgroundId)?.name ?? '—'}</dd>
        <dt>Abilities</dt><dd>{ABILITIES.map((a) => `${a.toUpperCase()} ${d.abilities[a].score}`).join(' · ')}</dd>
        <dt>Features</dt><dd>{d.features.length} active features, {d.resources.length} tracked resources</dd>
        <dt>Inventory</dt><dd>{ch.inventory.length} items</dd>
      </dl>
      {missing.length > 0 && <div className="notice error"><b>Still to do:</b> {missing.map((m) => <button key={m} className="small ghost" onClick={() => goStep(STEPS.indexOf(m))}>{m}</button>)}<div className="small">You can still create the character and finish these later.</div></div>}
      {d.warnings.length > 0 && <div className="notice"><b>Notes</b><ul className="warnings">{d.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
      <div className="row"><button className="primary" onClick={finish} disabled={!ch.identity.name.trim() || !ch.classes.length}>Create character</button>{(!ch.identity.name.trim() || !ch.classes.length) && <span className="small bad">A name and a class are required.</span>}</div>
    </div>
  );
}

export { useMemo };
