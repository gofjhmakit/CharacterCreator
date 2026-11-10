import { useDb } from '@/ui/ruleset';
import { useState } from 'react';
import type { TabProps } from '../CharacterView';
import type { ActiveFeature } from '@/engine/derive';
import { expandTemplate, describeOutcomes } from '@/engine/derive';
import { ChoiceEditor, choiceComplete } from '../../components/ChoiceEditor';
import { Modal, Empty, Pips, Field } from '../../components/common';
import { EffectBuilder } from '../../components/EffectBuilder';
import { useRoller } from '../../components/roll';
import { useApp } from '@/state/store';
import { uid } from '@/engine/factory';
import { RECHARGE_LABEL } from '@/types/core';
import type { Effect } from '@/types/content';

const GROUPS: [string, (f: ActiveFeature) => boolean][] = [
  ['Class features', (f) => f.source.kind === 'class'],
  ['Subclass features', (f) => f.source.kind === 'subclass'],
  ['Chosen options', (f) => f.source.kind === 'option'],
  ['Feats', (f) => f.source.kind === 'feat'],
  ['Racial traits', (f) => f.source.kind === 'race' || f.source.kind === 'subrace'],
  ['Background', (f) => f.source.kind === 'background'],
  ['Custom features', (f) => f.source.kind === 'custom'],
];

export function FeaturesTab({ ch, d, set }: TabProps) {
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const roller = useRoller();
  const pending = d.choices.filter((c) => !choiceComplete(c));
  const match = (f: ActiveFeature) => !q || `${f.def.name} ${f.def.description}`.toLowerCase().includes(q.toLowerCase());

  const useEffect_ = (f: ActiveFeature, e: Effect) => {
    const vars = d.varsFor(f.classId);
    for (const o of [...(e.outcomes ?? []), ...(e.save?.onFailure ?? [])]) if (o.dice && (o.kind === 'heal' || o.kind === 'damage' || o.kind === 'temp-hp')) roller.expr(`${e.name ?? f.def.name}`, expandTemplate(o.dice, vars), o.kind === 'heal' ? 'healing' : 'damage');
    const resId = e.consumes?.resourceId ?? f.def.resource?.id ?? f.def.usesResource;
    const r = resId ? d.resources.find((x) => x.id === resId) : undefined;
    if (r && r.remaining > 0) set((c) => { c.resources[r.id] = { ...(c.resources[r.id] ?? {}), used: r.used + (e.consumes?.amount ?? 1) }; });
  };

  return (
    <div className="stack lg">
      {pending.length > 0 && (
        <div className="panel" style={{ borderColor: 'var(--gold)' }}>
          <div className="panel-title"><h3>Choices to make</h3><span className="chip red">{pending.length}</span></div>
          {pending.map((cv) => <ChoiceEditor key={cv.key} cv={cv} ch={ch} d={d} onChange={(v) => set((c) => { c.choices[cv.key] = v; })} />)}
        </div>
      )}
      <div className="row"><input placeholder="Search features…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} /><span className="spacer" /><button onClick={() => setAdding(true)}>Add custom feature</button><button onClick={() => set((c) => { c.custom.feats = c.custom.feats; })} style={{ display: 'none' }} /></div>
      {GROUPS.map(([label, pred]) => {
        const fs = d.features.filter(pred).filter(match);
        if (!fs.length) return null;
        return (
          <div key={label} className="panel">
            <div className="panel-title"><h3>{label}</h3><span className="chip">{fs.length}</span></div>
            {fs.map((f) => {
              const res = d.resources.find((r) => r.id === f.resourceId);
              const isOpen = open[f.key] ?? false;
              const useable = (f.def.effects ?? []).filter((e) => e.trigger === 'on-use');
              const custom = f.source.kind === 'custom' ? ch.custom.features.find((x) => x.id === f.source.id) : undefined;
              return (
                <div key={f.key} className="feature">
                  <div className="feature-head">
                    <h4 style={{ cursor: 'pointer' }} onClick={() => setOpen({ ...open, [f.key]: !isOpen })}>{isOpen ? '▾' : '▸'} {f.def.name}</h4>
                    {f.level && <span className="chip">Lvl {f.level}</span>}
                    <span className="small muted">{f.source.label}</span>
                    {f.def.activation && f.def.activation !== 'passive' && <span className="chip">{f.def.activation}</span>}
                    {f.def.source?.kind === 'summary' && <span className="badge" title="Paraphrased mechanics; see source book">{f.def.source.book}</span>}
                    {(f.def.manual || f.def.effects?.some((e) => e.manual)) && <span className="badge manual">manual</span>}
                    {(f.def.effects?.some((e) => (e.modifiers?.length ?? 0) > 0 || e.trigger)) && <span className="badge" title="Has automated mechanics">auto</span>}
                    <span className="spacer" />
                    {res && <span className="row tight">{res.max >= 99 ? <span className="small">Unlimited</span> : res.max > 10 || res.pool ? <span className="small num">{res.remaining}/{res.max}</span> : <Pips max={res.max} used={res.used} onSet={(u) => set((c) => { c.resources[res.id] = { ...(c.resources[res.id] ?? {}), used: u }; })} />}<span className="small muted">{RECHARGE_LABEL[res.recharge]}</span></span>}
                    {useable.map((e) => <button key={e.id} className="small" disabled={!!res && res.remaining <= 0} onClick={() => useEffect_(f, e)}>Use{e.outcomes?.[0]?.dice ? ` (${expandTemplate(e.outcomes[0].dice, d.varsFor(f.classId))})` : ''}</button>)}
                    {custom && <button className="small ghost" onClick={() => setEditId(custom.id)}>Edit</button>}
                  </div>
                  <div className={`feature-desc ${isOpen ? '' : 'clamp'}`}>{f.def.description}</div>
                  {isOpen && (f.def.effects ?? []).filter((e) => e.trigger && e.trigger !== 'passive').map((e) => <div key={e.id} className="small ink2" style={{ marginTop: 4 }}>⟶ <b>{e.name}</b>: {expandTemplate(describeOutcomes(e), d.varsFor(f.classId))}</div>)}
                  {f.choices.length > 0 && isOpen && f.choices.map((cv) => <ChoiceEditor key={cv.key} cv={{ ...cv, source: f.source, ownerClass: f.classId }} ch={ch} d={d} onChange={(v) => set((c) => { c.choices[cv.key] = v; })} />)}
                  {f.choices.length > 0 && !isOpen && <div className="small muted">{f.choices.map((c) => `${c.def.label}: ${c.selected.map((s) => c.options.find((o) => o.id === s)?.name ?? s.replace(/^feat:/, '')).join(', ') || '—'}`).join(' · ')}</div>}
                </div>
              );
            })}
          </div>
        );
      })}
      {d.features.length === 0 && <Empty>No features yet.</Empty>}
      {(adding || editId) && <CustomFeatureDialog ch={ch} existingId={editId} onClose={() => { setAdding(false); setEditId(null); }} onSave={(f) => set((c) => { const i = c.custom.features.findIndex((x) => x.id === f.id); if (i >= 0) c.custom.features[i] = f; else c.custom.features.push(f); })} onDelete={(id) => set((c) => { c.custom.features = c.custom.features.filter((x) => x.id !== id); })} />}
    </div>
  );
}

type CF = TabProps['ch']['custom']['features'][number];

function CustomFeatureDialog({ ch, existingId, onClose, onSave, onDelete }: { ch: TabProps['ch']; existingId: string | null; onClose: () => void; onSave: (f: CF) => void; onDelete: (id: string) => void }) {
  const db = useDb();
  const existing = existingId ? ch.custom.features.find((x) => x.id === existingId) : undefined;
  const [f, setF] = useState<CF>(existing ?? { id: uid('cf'), name: '', description: '', effects: [] });
  const [featPick, setFeatPick] = useState('');
  return (
    <Modal title={existing ? `Edit ${existing.name}` : 'Add custom feature or bonus feat'} onClose={onClose} size="wide" footer={<>
      {existing && <button className="danger" onClick={() => { onDelete(existing.id); onClose(); }}>Delete</button>}
      <button onClick={onClose}>Cancel</button><button className="primary" disabled={!f.name.trim()} onClick={() => { onSave(f); onClose(); }}>Save</button>
    </>}>
      <div className="stack">
        {!existing && <div className="notice small">To grant a <b>bonus feat</b> (e.g. DM boon), pick it here:
          <div className="row" style={{ marginTop: 6 }}>
            <select value={featPick} onChange={(e) => setFeatPick(e.target.value)} style={{ maxWidth: 300 }}><option value="">Choose a feat…</option>{[...db.feats.values()].sort((a, b) => a.name.localeCompare(b.name)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <button className="small" disabled={!featPick} onClick={() => { useApp.getState().update(ch.id, (c) => { if (!c.custom.feats.includes(featPick)) c.custom.feats.push(featPick); }); onClose(); }}>Grant feat</button>
          </div>
          {ch.custom.feats.length > 0 && <div className="row" style={{ marginTop: 6 }}>{ch.custom.feats.map((id) => <span key={id} className="chip gold">{db.feats.get(id)?.name ?? id}<button onClick={() => useApp.getState().update(ch.id, (c) => { c.custom.feats = c.custom.feats.filter((x) => x !== id); })}>✕</button></span>)}</div>}
        </div>}
        <div className="field-row"><Field label="Name" required><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div>
        <Field label="Description"><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="field-row">
          <label className="check"><input type="checkbox" checked={!!f.resource} onChange={(e) => setF({ ...f, resource: e.target.checked ? { name: f.name, max: 1, recharge: 'long' } : undefined })} />Has limited uses</label>
          {f.resource && <>
            <Field label="Uses"><input type="number" min={1} value={f.resource.max} onChange={(e) => setF({ ...f, resource: { ...f.resource!, max: Math.max(1, Number(e.target.value) || 1) } })} /></Field>
            <Field label="Recharge"><select value={f.resource.recharge} onChange={(e) => setF({ ...f, resource: { ...f.resource!, recharge: e.target.value as 'long' } })}><option value="short">Short or long rest</option><option value="long">Long rest</option><option value="dawn">Dawn</option><option value="none">Never</option></select></Field>
          </>}
        </div>
        <span className="section-label">Mechanical effects</span>
        <EffectBuilder context="feature" effects={f.effects} onChange={(effects) => setF({ ...f, effects })} />
      </div>
    </Modal>
  );
}
