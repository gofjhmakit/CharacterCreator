import { useDb } from '@/ui/ruleset';
// Generic editor for any content ChoiceDef (skills, languages, tools, ASI/feat, spells, options...).
import { useMemo, useState } from 'react';
import type { Character } from '@/types/character';
import type { ChoiceView, Derived } from '@/engine/derive';
import { ABILITIES, ABILITY_NAMES, ALL_TOOLS, DAMAGE_TYPES, EXOTIC_LANGUAGES, SKILLS, SKILL_IDS, STANDARD_LANGUAGES, type Ability, type SkillId } from '@/types/core';
import { useApp } from '@/state/store';
import { checkPrerequisite } from '@/engine/prereq';
import { titleCase } from './common';
import { fuzzySearch } from '@/search/fuzzy';

interface Props { cv: ChoiceView; ch: Character; d: Derived; onChange: (values: string[]) => void; compact?: boolean }

export function choiceComplete(cv: ChoiceView): boolean {
  if (cv.def.optional) return true;
  if (cv.def.kind === 'asi') return cv.selected.length >= 1 && (cv.selected[0].startsWith('feat:') || cv.selected.length >= 2);
  if (cv.def.kind === 'ability-split') return cv.selected.length >= 3;
  return cv.selected.length >= cv.count;
}

export function ChoiceEditor({ cv, ch, d, onChange, compact }: Props) {
  const { def, count, selected } = cv;
  const status = choiceComplete(cv) ? <span className="chip green">Done</span> : <span className="chip red">{def.kind === 'asi' ? 'Choose' : `Choose ${Math.max(0, count - selected.length)}`}</span>;
  return (
    <div className="stack" style={{ padding: compact ? 0 : '6px 0' }}>
      <div className="row between"><span style={{ fontWeight: 700 }}>{def.label}{count > 1 && def.kind !== 'asi' ? ` (${count})` : ''}</span>{status}</div>
      <ChoiceBody {...{ cv, ch, d, onChange }} />
    </div>
  );
}

function toggle(list: string[], v: string, max: number): string[] {
  if (list.includes(v)) return list.filter((x) => x !== v);
  if (list.length >= max) return max === 1 ? [v] : list;
  return [...list, v];
}

function ChoiceBody({ cv, ch, d, onChange }: Props) {
  const { def, count, selected } = cv;
  const db = useDb();
  switch (def.kind) {
    case 'skill':
    case 'expertise': {
      const from = (def.from?.length ? def.from : SKILL_IDS) as SkillId[];
      const isExp = def.kind === 'expertise';
      return (
        <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
          {from.map((s) => {
            const sk = d.skills[s];
            const otherSource = !selected.includes(s) && (isExp ? sk?.prof === 2 : sk?.prof >= 1);
            const notProf = isExp && !selected.includes(s) && (sk?.prof ?? 0) < 1;
            return (
              <label key={s} className="check option" style={{ flexDirection: 'row', alignItems: 'center', padding: '6px 10px', opacity: otherSource || notProf ? 0.6 : 1 }}>
                <input type="checkbox" checked={selected.includes(s)} onChange={() => onChange(toggle(selected, s, count))} />
                <span className="grow">{SKILLS[s]?.name ?? s}</span>
                {otherSource && <span className="small muted">{isExp ? 'expert' : 'proficient'}</span>}
                {notProf && <span className="small muted">not proficient</span>}
              </label>
            );
          })}
        </div>
      );
    }
    case 'language': {
      const custom = db.allLanguages();
      const known = new Set(d.proficiencies.languages);
      const all = [...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES, ...custom];
      return <MultiSelectFree values={selected} max={count} options={all.map((l) => ({ id: l, name: l, note: known.has(l) && !selected.includes(l) ? 'known' : undefined }))} onChange={onChange} allowFree placeholder="Other language…" />;
    }
    case 'tool': {
      const from = def.from?.length ? def.from : ALL_TOOLS;
      return <MultiSelectFree values={selected} max={count} options={from.map((t) => ({ id: t, name: t, note: d.proficiencies.tools.includes(t) && !selected.includes(t) ? 'proficient' : undefined }))} onChange={onChange} allowFree={!def.from?.length} placeholder="Other tool…" />;
    }
    case 'damage-type': {
      const from = def.from?.length ? def.from : DAMAGE_TYPES;
      return <div className="row">{from.map((t) => <button key={t} className={`small ${selected.includes(t) ? 'on' : ''}`} onClick={() => onChange(toggle(selected, t, count))}>{titleCase(t)}</button>)}</div>;
    }
    case 'ability': {
      const from = (def.from?.length ? def.from : ABILITIES) as Ability[];
      return <div className="row">{from.map((a) => <button key={a} className={`small ${selected.includes(a) ? 'on' : ''}`} onClick={() => onChange(toggle(selected, a, count))}>{ABILITY_NAMES[a]} +{def.amount ?? 1}</button>)}</div>;
    }
    case 'asi': return <AsiPicker cv={cv} ch={ch} d={d} onChange={onChange} />;
    case 'feat': return <FeatPicker selected={selected} max={count} ch={ch} d={d} onChange={onChange} categories={def.featCategories} />;
    case 'ability-split': return <AbilitySplit cv={cv} d={d} onChange={onChange} />;
    case 'spell': return <SpellChoice cv={cv} d={d} onChange={onChange} />;
    case 'options':
    default: {
      const classLevel = cv.ownerClass ? d.classes.find((c) => c.entry.classId === cv.ownerClass)?.level : undefined;
      return (
        <div className="option-grid">
          {cv.options.map((o) => {
            const pr = checkPrerequisite(o.prerequisite, ch, d, { classLevel });
            const sel = selected.includes(o.id);
            return (
              <button key={o.id} className={`option ${sel ? 'selected' : ''}`} onClick={() => onChange(toggle(selected, o.id, count))} style={{ opacity: !pr.ok && !sel ? 0.55 : 1 }}>
                <span className="title">{o.name}{!pr.ok && <span className="badge warn">prereq</span>}</span>
                {o.description && <span className="desc">{o.description.length > 220 ? o.description.slice(0, 220) + '…' : o.description}</span>}
                {!pr.ok && <span className="desc bad">{pr.reasons.join(' ')}</span>}
              </button>
            );
          })}
        </div>
      );
    }
  }
}

function MultiSelectFree({ values, max, options, onChange, allowFree, placeholder }: { values: string[]; max: number; options: { id: string; name: string; note?: string }[]; onChange: (v: string[]) => void; allowFree?: boolean; placeholder?: string }) {
  const [free, setFree] = useState('');
  return (
    <div className="stack">
      <div className="row">
        {values.map((v) => <span key={v} className="chip gold">{v}<button aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>✕</button></span>)}
      </div>
      {values.length < max && (
        <div className="row">
          <select className="grow" value="" onChange={(e) => e.target.value && onChange([...values, e.target.value])} aria-label="Choose">
            <option value="">Choose…</option>
            {options.filter((o) => !values.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.name}{o.note ? ` (${o.note})` : ''}</option>)}
          </select>
          {allowFree && (
            <form className="row tight" onSubmit={(e) => { e.preventDefault(); if (free.trim()) { onChange([...values, free.trim()]); setFree(''); } }}>
              <input placeholder={placeholder} value={free} onChange={(e) => setFree(e.target.value)} style={{ width: 160 }} />
              <button type="submit" className="small">Add</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function AsiPicker({ cv, ch, d, onChange }: { cv: ChoiceView; ch: Character; d: Derived; onChange: (v: string[]) => void }) {
  const sel = cv.selected;
  const featsAllowed = ch.settings.optional.feats;
  const mode: 'plus2' | 'plus1' | 'feat' = sel[0]?.startsWith('feat:') ? 'feat' : sel.length === 2 && sel[0] === sel[1] ? 'plus2' : 'plus1';
  const [m, setM] = useState<typeof mode>(sel.length ? mode : 'plus2');
  const scoreOf = (a: Ability) => d.abilities[a].score;
  return (
    <div className="stack">
      <div className="btn-group">
        <button className={`small ${m === 'plus2' ? 'on' : ''}`} onClick={() => { setM('plus2'); onChange([]); }}>+2 to one</button>
        <button className={`small ${m === 'plus1' ? 'on' : ''}`} onClick={() => { setM('plus1'); onChange([]); }}>+1 to two</button>
        <button className={`small ${m === 'feat' ? 'on' : ''}`} disabled={!featsAllowed} title={featsAllowed ? '' : 'Feats are disabled in character settings'} onClick={() => { setM('feat'); onChange([]); }}>Feat</button>
      </div>
      {m === 'plus2' && <div className="row">{ABILITIES.map((a) => <button key={a} className={`small ${sel[0] === a && sel[1] === a ? 'on' : ''}`} disabled={scoreOf(a) >= d.abilities[a].max && sel[0] !== a} onClick={() => onChange([a, a])}>{a.toUpperCase()} <span className="muted">{scoreOf(a)}</span></button>)}</div>}
      {m === 'plus1' && <div className="row">{ABILITIES.map((a) => <button key={a} className={`small ${sel.includes(a) ? 'on' : ''}`} disabled={scoreOf(a) >= d.abilities[a].max && !sel.includes(a)} onClick={() => onChange(sel.includes(a) ? sel.filter((x) => x !== a) : sel.length >= 2 ? [sel[1], a] : [...sel, a])}>{a.toUpperCase()} <span className="muted">{scoreOf(a)}</span></button>)}</div>}
      {m === 'feat' && <FeatPicker categories={cv.def.featCategories} selected={sel.filter((x) => x.startsWith('feat:')).map((x) => x.slice(5))} max={1} ch={ch} d={d} onChange={(v) => onChange(v.map((x) => `feat:${x}`))} />}
      <span className="small muted">Scores can’t exceed 20 through Ability Score Improvements.</span>
    </div>
  );
}

function AbilitySplit({ cv, d, onChange }: { cv: ChoiceView; d: Derived; onChange: (v: string[]) => void }) {
  const from = (cv.def.from ?? ABILITIES) as Ability[];
  const sel = cv.selected;
  const isPlus2 = sel.length === 3 && new Set(sel).size === 2;
  const [mode, setMode] = useState<'21' | '111'>(sel.length === 3 && new Set(sel).size === 3 ? '111' : '21');
  const two = isPlus2 ? sel.find((a) => sel.filter((x) => x === a).length === 2) : sel[0];
  const one = isPlus2 ? sel.find((a) => a !== two) : sel[2];
  const show = (a: Ability) => `${a.toUpperCase()} ${d.abilities[a].score}`;
  return (
    <div className="stack">
      <div className="btn-group">
        <button className={`small ${mode === '21' ? 'on' : ''}`} onClick={() => { setMode('21'); onChange([]); }}>+2 and +1</button>
        <button className={`small ${mode === '111' ? 'on' : ''}`} onClick={() => { setMode('111'); onChange([...from]); }}>+1 to all three</button>
      </div>
      {mode === '21' ? (
        <div className="row">
          <label className="row tight small">+2 to <select value={two ?? ''} onChange={(e) => { const a = e.target.value; const o = one && one !== a ? one : from.find((x) => x !== a)!; onChange(a ? [a, a, o] : []); }} style={{ width: 'auto' }}><option value="">—</option>{from.map((a) => <option key={a} value={a}>{show(a)}</option>)}</select></label>
          <label className="row tight small">+1 to <select value={one ?? ''} disabled={!two} onChange={(e) => two && onChange([two, two, e.target.value])} style={{ width: 'auto' }}>{from.filter((a) => a !== two).map((a) => <option key={a} value={a}>{show(a)}</option>)}</select></label>
        </div>
      ) : <div className="small">{from.map((a) => `${a.toUpperCase()} +1`).join(', ')}</div>}
      <span className="small muted">2024 rules: no score can go above 20 this way.</span>
    </div>
  );
}

function FeatPicker({ selected, max, ch, d, onChange, categories }: { selected: string[]; max: number; ch: Character; d: Derived; onChange: (v: string[]) => void; categories?: string[] }) {
  const db = useDb();
  const [q, setQ] = useState('');
  const feats = useMemo(() => [...db.feats.values()].filter((f) => !categories?.length || (f.category && categories.includes(f.category)) || (!f.category && db.isCustom('feat', f.id))).sort((a, b) => a.name.localeCompare(b.name)), [db, categories]);
  const shown = q ? fuzzySearch(q, feats, (f) => ({ id: f.id, name: f.name, keywords: [f.description] })).map((h) => h.item) : feats;
  const taken = new Set(d.features.filter((f) => f.source.kind === 'feat').map((f) => f.def.id));
  return (
    <div className="stack">
      <input placeholder="Search feats…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="option-grid" style={{ maxHeight: 360, overflow: 'auto' }}>
        {shown.map((f) => {
          const pr = checkPrerequisite(f.prerequisite, ch, d);
          const sel = selected.includes(f.id);
          const dup = taken.has(f.id) && !sel && !f.repeatable;
          return (
            <button key={f.id} className={`option ${sel ? 'selected' : ''}`} style={{ opacity: (!pr.ok || dup) && !sel ? 0.55 : 1 }} onClick={() => onChange(toggle(selected, f.id, max))}>
              <span className="title">{f.name} {f.category && <span className="badge">{f.category.replace('-', ' ')}</span>} {db.isCustom('feat', f.id) && <span className="badge custom">custom</span>}{f.source.kind === 'summary' && <span className="badge">{f.source.book}</span>}</span>
              <span className="desc">{f.description.length > 200 ? f.description.slice(0, 200) + '…' : f.description}</span>
              {!pr.ok && <span className="desc bad">{pr.reasons.join(' ')}</span>}
              {dup && <span className="desc bad">Already taken.</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpellChoice({ cv, d, onChange }: { cv: ChoiceView; d: Derived; onChange: (v: string[]) => void }) {
  const db = useDb();
  const [q, setQ] = useState('');
  const f = cv.def.spellFilter ?? {};
  const pool = useMemo(() => [...db.spells.values()].filter((s) =>
    (!f.classes?.length || s.classes.some((c) => f.classes!.includes(c))) &&
    (!f.levels?.length || f.levels.includes(s.level)) &&
    (!f.schools?.length || f.schools.includes(s.school)) &&
    (!cv.def.from?.length || cv.def.from.includes(s.id)) &&
    // Magical Secrets etc. (no filter): limit to spell levels the character can cast
    (f.levels?.length || s.level <= Math.max(0, ...d.casters.map((c) => c.maxSpellLevel), d.pact?.level ?? 0)),
  ).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)), [db, cv.def, d]);
  const shown = q ? fuzzySearch(q, pool, (s) => ({ id: s.id, name: s.name, keywords: [s.school, ...s.classes] })).map((h) => h.item) : pool;
  return (
    <div className="stack">
      <div className="row">{cv.selected.map((id) => <span key={id} className="chip gold">{db.spells.get(id)?.name ?? id}<button aria-label="Remove" onClick={() => onChange(cv.selected.filter((x) => x !== id))}>✕</button></span>)}</div>
      {cv.selected.length < cv.count && <>
        <input placeholder={`Search ${pool.length} spells…`} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="list panel flush" style={{ maxHeight: 260, overflow: 'auto' }}>
          {shown.slice(0, 80).map((s) => (
            <div key={s.id} className="list-row clickable" onClick={() => onChange([...cv.selected, s.id])}>
              <span className="grow">{s.name}</span><span className="small muted">{s.level === 0 ? 'Cantrip' : `Level ${s.level}`} · {titleCase(s.school)}</span>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}
