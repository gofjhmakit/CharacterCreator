import { useState } from 'react';
import type { TabProps } from '../CharacterView';
import { ABILITIES, ABILITY_NAMES, SKILLS, SKILL_IDS, signed, ALL_TOOLS, STANDARD_LANGUAGES, EXOTIC_LANGUAGES, type SkillId, type Ability } from '@/types/core';
import { useRoller } from '../../components/roll';
import { Modal, BreakdownView, titleCase } from '../../components/common';
import { AbilityBoxes, StatStrip } from './OverviewTab';
import type { Breakdown } from '@/engine/derive';

const profClass = (p: number) => (p === 2 ? 'p2' : p === 1 ? 'p1' : p === 0.5 ? 'p05' : '');

export function AbilitiesTab({ ch, d, set }: TabProps) {
  const roller = useRoller();
  const [info, setInfo] = useState<{ title: string; b: Breakdown; sources?: string[] } | null>(null);
  const reliable = d.features.some((f) => f.def.tags?.includes('reliable-talent'));
  const lucky = d.flags.has('halfling-lucky');
  return (
    <div className="stack lg">
      <StatStrip d={d} ch={ch} />
      <AbilityBoxes d={d} />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-title"><h3>Saving throws</h3></div>
          {ABILITIES.map((a) => (
            <div key={a} className="skill-row" onClick={() => setInfo({ title: `${ABILITY_NAMES[a]} saving throw`, b: d.saves[a], sources: d.saves[a].profSources })}>
              <span className={`prof-mark ${d.saves[a].proficient ? 'p1' : ''}`} />
              <span>{ABILITY_NAMES[a]}{d.saves[a].mode !== 'normal' && <span className={d.saves[a].mode === 'advantage' ? 'good' : 'bad'}> ({d.saves[a].mode.slice(0, 3)}.)</span>}{d.saves[a].conditional.length > 0 && <span className="muted"> *</span>}</span>
              <span className="bonus">{signed(d.saves[a].total)}</span>
              <button className="small" onClick={(e) => { e.stopPropagation(); roller.d20(`${ABILITY_NAMES[a]} save`, d.saves[a], 'save', { halflingLucky: lucky }); }}>Roll</button>
            </div>
          ))}
          <p className="small muted" style={{ marginTop: 8 }}>Click a row to see how it’s calculated. * = situational bonuses.</p>
        </div>
        <div className="panel">
          <div className="panel-title"><h3>Skills</h3><span className="spacer" /><span className="small muted">○ none · ◐ half · ● proficient · ◉ expertise</span></div>
          {SKILL_IDS.map((s) => {
            const sk = d.skills[s];
            return (
              <div key={s} className="skill-row" onClick={() => setInfo({ title: `${SKILLS[s].name} (${SKILLS[s].ability.toUpperCase()})`, b: sk, sources: sk.profSources })}>
                <span className={`prof-mark ${profClass(sk.prof)}`} />
                <span>{SKILLS[s].name} <span className="muted small">{SKILLS[s].ability.toUpperCase()}</span>{sk.mode !== 'normal' && <span className={sk.mode === 'advantage' ? 'good' : 'bad'}> ({sk.mode.slice(0, 3)}.)</span>}{sk.conditional.length > 0 && <span className="muted"> *</span>}</span>
                <span className="bonus">{signed(sk.total)}</span>
                <button className="small" onClick={(e) => { e.stopPropagation(); roller.d20(`${SKILLS[s].name} check`, sk, 'check', { halflingLucky: lucky, minRoll: reliable && sk.prof >= 1 ? 10 : undefined }); }}>Roll</button>
              </div>
            );
          })}
        </div>
        <div className="stack lg">
          <div className="panel">
            <div className="panel-title"><h3>Passive scores</h3></div>
            <dl className="kv"><dt>Perception</dt><dd className="num">{d.passives.perception.total}</dd><dt>Investigation</dt><dd className="num">{d.passives.investigation.total}</dd><dt>Insight</dt><dd className="num">{d.passives.insight.total}</dd></dl>
          </div>
          <ProficiencyEditor ch={ch} d={d} set={set} />
        </div>
      </div>
      {info && (
        <Modal title={info.title} onClose={() => setInfo(null)} size="narrow">
          <BreakdownView b={info.b} />
          {info.sources && info.sources.length > 0 && <p className="small muted" style={{ marginTop: 8 }}>Proficiency from: {info.sources.join(', ')}</p>}
        </Modal>
      )}
    </div>
  );
}

function ProficiencyEditor({ ch, d, set }: Pick<TabProps, 'ch' | 'd' | 'set'>) {
  const [edit, setEdit] = useState(false);
  const list = (label: string, items: string[]) => <><dt>{label}</dt><dd>{items.length ? items.map(titleCase).join(', ') : '—'}</dd></>;
  return (
    <div className="panel">
      <div className="panel-title"><h3>Proficiencies & languages</h3><span className="spacer" /><button className="small" onClick={() => setEdit(true)}>Edit custom</button></div>
      <dl className="kv">
        {list('Armor', d.proficiencies.armor)}
        {list('Weapons', d.proficiencies.weapons)}
        {list('Tools', d.proficiencies.tools)}
        {list('Languages', d.proficiencies.languages)}
      </dl>
      {edit && (
        <Modal title="Custom proficiencies" onClose={() => setEdit(false)} footer={<button className="primary" onClick={() => setEdit(false)}>Done</button>}>
          <div className="stack lg">
            <p className="small ink2">Add proficiencies granted by your DM or not covered by content. These stack with automatic ones (the highest level applies).</p>
            <div>
              <span className="section-label">Skills (manual)</span>
              <div className="grid cols-3" style={{ gap: 6 }}>
                {SKILL_IDS.map((s: SkillId) => (
                  <label key={s} className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <span className="grow small">{SKILLS[s].name}</span>
                    <select value={String(ch.custom.skills[s] ?? 0)} onChange={(e) => set((c) => { const v = Number(e.target.value) as 0 | 0.5 | 1 | 2; if (v) c.custom.skills[s] = v; else delete c.custom.skills[s]; })} style={{ width: 'auto' }}>
                      <option value="0">—</option><option value="0.5">Half</option><option value="1">Prof.</option><option value="2">Expert</option>
                    </select>
                  </label>
                ))}
              </div>
            </div>
            <div><span className="section-label">Saving throws (manual)</span>
              <div className="row">{ABILITIES.map((a: Ability) => <label key={a} className="check"><input type="checkbox" checked={ch.custom.saves.includes(a)} onChange={(e) => set((c) => { c.custom.saves = e.target.checked ? [...c.custom.saves, a] : c.custom.saves.filter((x) => x !== a); })} />{a.toUpperCase()}</label>)}</div>
            </div>
            <TagList label="Armor" values={ch.custom.armor} suggestions={['light', 'medium', 'heavy', 'shields']} onChange={(v) => set((c) => { c.custom.armor = v; })} />
            <TagList label="Weapons" values={ch.custom.weapons} suggestions={['simple', 'martial', 'longsword', 'rapier', 'shortsword', 'crossbow-hand', 'longbow', 'firearms']} onChange={(v) => set((c) => { c.custom.weapons = v; })} />
            <TagList label="Tools" values={ch.custom.tools} suggestions={ALL_TOOLS} onChange={(v) => set((c) => { c.custom.tools = v; })} />
            <TagList label="Languages" values={ch.custom.languages} suggestions={[...STANDARD_LANGUAGES, ...EXOTIC_LANGUAGES]} onChange={(v) => set((c) => { c.custom.languages = v; })} />
          </div>
        </Modal>
      )}
    </div>
  );
}

export function TagList({ label, values, suggestions, onChange }: { label: string; values: string[]; suggestions: string[]; onChange: (v: string[]) => void }) {
  const [txt, setTxt] = useState('');
  const id = `dl-${label.replace(/\W/g, '')}`;
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="section-label">{label}</span>
      <div className="row">{values.map((v) => <span key={v} className="chip gold">{v}<button aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>✕</button></span>)}</div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); const t = txt.trim(); if (t && !values.includes(t)) onChange([...values, t]); setTxt(''); }}>
        <input list={id} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={`Add ${label.toLowerCase()}…`} style={{ maxWidth: 280 }} />
        <datalist id={id}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
        <button className="small" type="submit">Add</button>
      </form>
    </div>
  );
}
