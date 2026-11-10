import { useDb } from '@/ui/ruleset';
import { useState } from 'react';
import type { TabProps } from '../CharacterView';
import { useApp } from '@/state/store';
import { XP_THRESHOLDS, levelForXp, proficiencyBonus, signed } from '@/types/core';
import { multiclassCheck } from '@/engine/prereq';
import { averageOfDie, rollExpression } from '@/dice/dice';
import { derive } from '@/engine/derive';
import { Modal, NumberField, useConfirm, Field } from '../../components/common';
import { ChoiceEditor, choiceComplete } from '../../components/ChoiceEditor';
import type { Character } from '@/types/character';

export function ProgressionTab({ ch, d, set, replace }: TabProps) {
  const db = useDb();
  const toast = useApp((s) => s.toast);
  const { ask, node } = useConfirm();
  const [levelUp, setLevelUp] = useState(false);
  const [xpAdd, setXpAdd] = useState('');
  const xpLevel = levelForXp(ch.identity.xp);
  const next = XP_THRESHOLDS[d.totalLevel] ?? null;
  const ready = !ch.identity.milestone && xpLevel > d.totalLevel;

  const levelDown = async (classId: string) => {
    const cls = ch.classes.find((c) => c.classId === classId)!;
    const def = db.classes.get(classId);
    const ok = await ask({ title: 'Remove a level?', message: <>Remove one level of <b>{def?.name}</b> (to {cls.level - 1}). Features gained at that level stop applying; your choices are kept in case you level up again. HP rolled for that level is discarded.</>, confirmLabel: 'Remove level', danger: true });
    if (!ok) return;
    set((c) => {
      const e = c.classes.find((x) => x.classId === classId)!;
      e.level -= 1;
      e.hpRolls = e.hpRolls.slice(0, Math.max(0, c.classes[0] === e ? e.level - 1 : e.level));
      if (e.level <= 0) c.classes = c.classes.filter((x) => x !== e);
    }, `Removed a ${def?.name ?? ''} level`);
    toast({ kind: 'info', text: `Removed a ${def?.name} level.` });
  };

  return (
    <div className="stack lg">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', alignItems: 'start' }}>
        <div className="panel stack">
          <div className="panel-title"><h3>Experience</h3><span className="spacer" /><label className="check small"><input type="checkbox" checked={ch.identity.milestone} onChange={(e) => set((c) => { c.identity.milestone = e.target.checked; })} />Milestone leveling</label></div>
          {!ch.identity.milestone ? <>
            <div className="row"><span className="num" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{ch.identity.xp.toLocaleString()} XP</span>{next !== null && <span className="small muted">next level at {next.toLocaleString()}</span>}</div>
            <div className="hp-bar"><div className="fill" style={{ width: `${next ? Math.min(100, ((ch.identity.xp - XP_THRESHOLDS[d.totalLevel - 1]) / (next - XP_THRESHOLDS[d.totalLevel - 1])) * 100) : 100}%` }} /></div>
            <form className="row" onSubmit={(e) => { e.preventDefault(); const n = Number(xpAdd); if (Number.isFinite(n) && n !== 0) set((c) => { c.identity.xp = Math.max(0, c.identity.xp + n); }); setXpAdd(''); }}>
              <input type="number" placeholder="Add XP (negative to subtract)" value={xpAdd} onChange={(e) => setXpAdd(e.target.value)} style={{ maxWidth: 220 }} />
              <button type="submit">Add</button>
              <label className="row tight small">Set total <NumberField value={ch.identity.xp} min={0} onChange={(v) => set((c) => { c.identity.xp = v; })} className="" /></label>
            </form>
            {ready && <div className="notice ok">Enough XP for level {xpLevel}! Use “Level up”.</div>}
          </> : <p className="small muted">XP is not tracked. Level up when your DM says so.</p>}
        </div>
        <div className="panel stack">
          <div className="panel-title"><h3>Levels</h3><span className="spacer" /><span className="chip">Total {d.totalLevel}</span><span className="chip">PB {signed(d.profBonus)}</span></div>
          <div className="table-wrap"><table className="data">
            <thead><tr><th>Class</th><th>Subclass</th><th className="num">Level</th><th className="num">Hit die</th><th></th></tr></thead>
            <tbody>
              {ch.classes.map((c, i) => {
                const def = db.classes.get(c.classId);
                const subs = db.subclassesFor(c.classId);
                return (
                  <tr key={c.classId}>
                    <td><b>{def?.name ?? c.classId}</b>{i === 0 && <div className="small muted">starting class</div>}</td>
                    <td>
                      <select value={c.subclassId ?? ''} onChange={(e) => set((x) => { x.classes[i].subclassId = e.target.value || undefined; })} style={{ minWidth: 140 }}>
                        <option value="">{def && c.level >= def.subclassLevel ? 'Choose…' : `(at level ${def?.subclassLevel})`}</option>
                        {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="num">{c.level}</td>
                    <td className="num">d{def?.hitDie}</td>
                    <td className="num"><button className="small ghost danger" onClick={() => levelDown(c.classId)} disabled={d.totalLevel <= 1 && c.level <= 1}>−1</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          <button className="primary" disabled={d.totalLevel >= 20} onClick={() => setLevelUp(true)}>Level up</button>
        </div>
      </div>
      <HpHistory ch={ch} set={set} />
      <div className="panel">
        <div className="panel-title"><h3>Progression guide</h3></div>
        {ch.classes.map((c) => {
          const def = db.classes.get(c.classId); if (!def) return null;
          const sub = c.subclassId ? db.subclasses.get(c.subclassId) : undefined;
          const upcoming = [...def.features.filter((f) => !f.hidden), ...(sub?.features ?? [])].filter((f) => (f.level ?? 1) > c.level && (f.level ?? 1) <= c.level + 3).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
          const asi = def.asiLevels.filter((l) => l > c.level && l <= c.level + 3);
          return <div key={c.classId} className="small" style={{ marginBottom: 8 }}><b>{def.name}</b>: next — {[...upcoming.map((f) => `L${f.level} ${f.name}`), ...asi.map((l) => `L${l} ASI/feat`), ...(c.level < def.subclassLevel ? [`L${def.subclassLevel} ${def.subclassLabel}`] : [])].join(' · ') || 'no new features in the next 3 levels'}</div>;
        })}
      </div>
      {levelUp && <LevelUpDialog ch={ch} d={d} onClose={() => setLevelUp(false)} onApply={(c) => { replace(c, 'Level up'); setLevelUp(false); toast({ kind: 'success', text: 'Level up!', detail: 'New features and choices are on the Features tab.' }); }} />}
      {node}
    </div>
  );
}

function HpHistory({ ch, set }: Pick<TabProps, 'ch' | 'set'>) {
  const db = useDb();
  return (
    <details className="panel">
      <summary><b>Hit point history</b> <span className="small muted">(edit rolled HP per level; empty = average)</span></summary>
      <div className="stack" style={{ marginTop: 8 }}>
        {ch.classes.map((c, ci) => {
          const def = db.classes.get(c.classId); if (!def) return null;
          const count = ci === 0 ? c.level - 1 : c.level;
          return (
            <div key={c.classId} className="row">
              <b style={{ width: 90 }}>{def.name}</b>
              {ci === 0 && <span className="chip">L1: {def.hitDie} (max)</span>}
              {Array.from({ length: count }, (_, i) => (
                <label key={i} className="row tight small">L{ci === 0 ? i + 2 : i + 1}
                  <input type="number" className="num-sm" min={1} max={def.hitDie} placeholder={String(averageOfDie(def.hitDie))} value={c.hpRolls[i] ?? ''} onChange={(e) => set((x) => { const arr = [...x.classes[ci].hpRolls]; while (arr.length < count) arr.push(null); arr[i] = e.target.value === '' ? null : Math.max(1, Math.min(def.hitDie, Number(e.target.value))); x.classes[ci].hpRolls = arr; })} />
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </details>
  );
}

function LevelUpDialog({ ch, d, onClose, onApply }: { ch: Character; d: TabProps['d']; onClose: () => void; onApply: (c: Character) => void }) {
  const db = useDb();
  const [classId, setClassId] = useState(ch.classes[0]?.classId ?? '');
  const [hpMode, setHpMode] = useState<'average' | 'roll' | 'manual'>(ch.settings.hpMethod === 'roll' ? 'roll' : 'average');
  const [hpValue, setHpValue] = useState<number | null>(null);
  const [stage, setStage] = useState<'pick' | 'choices'>('pick');
  const [draft, setDraft] = useState<Character | null>(null);
  const def = db.classes.get(classId);
  const existing = ch.classes.find((c) => c.classId === classId);
  const mc = def ? multiclassCheck(ch, d, def, db.classes) : { ok: true, reasons: [] };
  const enforce = ch.settings.optional.multiclassPrereqs;
  const multiclassBlocked = !existing && (!ch.settings.optional.multiclassing || (enforce && !mc.ok));
  const newLevel = (existing?.level ?? 0) + 1;

  const build = (): Character | null => {
    if (!def) return null;
    const c = structuredClone(ch);
    let e = c.classes.find((x) => x.classId === classId);
    if (!e) { e = { classId, level: 0, hpRolls: [] }; c.classes.push(e); }
    e.level += 1;
    const isFirstOfStart = c.classes[0] === e && e.level === 1;
    if (!isFirstOfStart) {
      const idx = c.classes[0] === e ? e.level - 2 : e.level - 1;
      const arr = [...e.hpRolls]; while (arr.length < idx) arr.push(null);
      arr[idx] = hpMode === 'average' ? null : hpValue ?? averageOfDie(def.hitDie);
      e.hpRolls = arr;
    }
    if (!c.identity.milestone) c.identity.xp = Math.max(c.identity.xp, XP_THRESHOLDS[Math.min(19, d.totalLevel)]);
    return c;
  };

  if (stage === 'choices' && draft) {
    const nd = derive(draft, db);
    const before = new Set(d.features.map((f) => f.key));
    const gained = nd.features.filter((f) => !before.has(f.key));
    const hpGain = nd.hp.max - d.hp.max;
    const pending = nd.choices.filter((c) => !choiceComplete(c));
    const dsub = draft.classes.find((x) => x.classId === classId)!;
    const needSub = def && dsub.level >= def.subclassLevel && !dsub.subclassId;
    return (
      <Modal title={`${def?.name} ${dsub.level}`} onClose={onClose} size="wide" footer={<><button onClick={() => setStage('pick')}>← Back</button><button className="primary" onClick={() => onApply(draft)}>Apply level up</button></>}>
        <div className="stack lg">
          <div className="row"><span className="chip green">+{hpGain} max HP</span><span className="chip">Proficiency {signed(proficiencyBonus(nd.totalLevel))}</span>{nd.slots.length > 0 && <span className="chip">Slots {nd.slots.map((s) => s.max).join('/')}</span>}{nd.pact && <span className="chip">Pact {nd.pact.slots}×L{nd.pact.level}</span>}</div>
          {needSub && <div className="stack"><span className="section-label req">Choose your {def!.subclassLabel}</span>
            <select value={dsub.subclassId ?? ''} onChange={(e) => setDraft((x) => { const y = structuredClone(x!); y.classes.find((c) => c.classId === classId)!.subclassId = e.target.value || undefined; return y; })}><option value="">Choose…</option>{db.subclassesFor(classId).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.source.book})</option>)}</select></div>}
          <div><span className="section-label">New features</span>{gained.length ? gained.map((f) => <div key={f.key} className="feature"><div className="feature-head"><h4>{f.def.name}</h4><span className="small muted">{f.source.label}</span></div><div className="feature-desc clamp">{f.def.description}</div></div>) : <span className="muted small">No new features at this level.</span>}</div>
          {pending.length > 0 && <div className="stack"><span className="section-label">Choices</span>{pending.map((cv) => <ChoiceEditor key={cv.key} cv={cv} ch={draft} d={nd} onChange={(v) => setDraft((x) => { const y = structuredClone(x!); y.choices[cv.key] = v; return y; })} />)}<span className="small muted">You can also make these later on the Features tab.</span></div>}
          {nd.casters.some((c) => c.style === 'known' || c.style === 'spellbook') && <p className="small ink2">Learn new spells on the Spellbook tab after applying.</p>}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Level up" onClose={onClose} footer={<><button onClick={onClose}>Cancel</button><button className="primary" disabled={!def || multiclassBlocked || (hpMode !== 'average' && hpValue === null && !(ch.classes[0]?.classId === classId && newLevel === 1))} onClick={() => { const c = build(); if (c) { setDraft(c); setStage('choices'); } }}>Continue</button></>}>
      <div className="stack lg">
        <Field label="Class">
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setHpValue(null); }}>
            {ch.classes.map((c) => <option key={c.classId} value={c.classId}>{db.classes.get(c.classId)?.name} {c.level} → {c.level + 1}</option>)}
            {ch.settings.optional.multiclassing && <optgroup label="Multiclass into">{[...db.classes.values()].filter((c) => !ch.classes.some((x) => x.classId === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name} 1</option>)}</optgroup>}
          </select>
        </Field>
        {!existing && def && (
          <div className={`notice ${mc.ok ? 'ok' : 'error'}`}>
            <b>Multiclass prerequisites</b> {mc.ok ? 'met.' : ''}
            {!mc.ok && <ul className="warnings">{mc.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
            {!mc.ok && !enforce && <div className="small">Prerequisites are not enforced (Character Settings).</div>}
            <div className="small" style={{ marginTop: 4 }}>You gain only the multiclass proficiencies: {[...(def.multiclass.grants.armor ?? []), ...(def.multiclass.grants.weapons ?? []), ...(def.multiclass.grants.tools ?? [])].join(', ') || 'none'}{def.multiclass.skillCount ? `, ${def.multiclass.skillCount} skill` : ''}.</div>
          </div>
        )}
        {def && (
          <div className="stack">
            <span className="section-label">Hit points for this level (d{def.hitDie} + CON {signed(d.abilities.con.mod)})</span>
            <div className="btn-group">
              <button className={hpMode === 'average' ? 'on' : ''} onClick={() => { setHpMode('average'); setHpValue(null); }}>Average ({averageOfDie(def.hitDie)})</button>
              <button className={hpMode === 'roll' ? 'on' : ''} onClick={() => { setHpMode('roll'); setHpValue(rollExpression(`1d${def.hitDie}`).total); }}>Roll</button>
              <button className={hpMode === 'manual' ? 'on' : ''} onClick={() => setHpMode('manual')}>Enter manually</button>
            </div>
            {hpMode === 'roll' && hpValue !== null && <div className="row"><span className="die-face" style={{ fontSize: '1.1rem', minWidth: 32, height: 32 }}>{hpValue}</span><button className="small" onClick={() => setHpValue(rollExpression(`1d${def.hitDie}`).total)}>Reroll</button><span className="small muted">Your table may not allow rerolls.</span></div>}
            {hpMode === 'manual' && <input type="number" min={1} max={def.hitDie} value={hpValue ?? ''} onChange={(e) => setHpValue(e.target.value ? Math.max(1, Math.min(def.hitDie, Number(e.target.value))) : null)} style={{ maxWidth: 120 }} />}
            <span className="small muted">Gain: {Math.max(1, (hpMode === 'average' ? averageOfDie(def.hitDie) : hpValue ?? 0) + d.abilities.con.mod)} HP (minimum 1){d.features.some((f) => f.def.id === 'dwarven-toughness' || f.def.id === 'tough') ? ' plus per-level bonuses' : ''}.</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
