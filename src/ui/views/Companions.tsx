// Companion cards: familiars, beast companions, Wild Shape forms, summons, mounts.
import { useMemo, useState } from 'react';
import type { Character, Companion, CompanionAttack } from '@/types/character';
import type { Derived } from '@/engine/derive';
import { ABILITIES, CONDITION_IDS, abilityMod, signed } from '@/types/core';
import creatures from '@/content/srd/creatures.json';
import { uid } from '@/engine/factory';
import { fuzzySearch } from '@/search/fuzzy';
import { useRoller } from '../components/roll';
import { Modal, Field, NumberField, Stepper, titleCase, Empty, useConfirm } from '../components/common';
import { useApp } from '@/state/store';
import { CONDITION_SUMMARY } from '@/engine/conditions';

type Template = (typeof creatures)[number];
type SetFn = (r: (c: Character) => void, undoLabel?: string) => void;

const KIND_LABEL: Record<Companion['kind'], string> = { familiar: 'Familiar', companion: 'Companion', 'wild-shape': 'Wild Shape form', summon: 'Summon', mount: 'Mount', other: 'Other' };
const crNum = (cr: string) => (cr.includes('/') ? Number(cr.split('/')[0]) / Number(cr.split('/')[1]) : Number(cr));

function fromTemplate(t: Template, kind: Companion['kind'], d: Derived): Companion {
  const druid = d.classes.find((c) => c.entry.classId === 'druid')?.level ?? 0;
  const tempHp = kind === 'wild-shape' && d.rules.id === 'dnd5e-2024' ? druid : 0;
  return {
    id: uid('pet'), name: t.name, kind, templateId: t.id, size: t.size, creatureType: t.type, cr: t.cr, ac: t.ac,
    hpMax: t.hp, hpCurrent: t.hp, hpTemp: tempHp, speed: t.speed, abilities: t.abilities, saves: t.saves, skills: t.skills, senses: t.senses,
    attacks: t.attacks.map((a) => ({ name: a.name, bonus: a.bonus, damage: a.damage, damageType: a.damageType, notes: a.notes })),
    traits: [t.multiattack ? `Multiattack. ${t.multiattack}` : '', t.traits].filter(Boolean).join('\n'), conditions: [], active: kind !== 'wild-shape',
  };
}

const blank = (): Companion => ({ id: uid('pet'), name: '', kind: 'familiar', ac: 12, hpMax: 5, hpCurrent: 5, hpTemp: 0, speed: '30 ft.', abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, attacks: [], conditions: [], active: true });

/** Max Wild Shape CR (2014 base rules / 2024 table); Circle of the Moon raises it. */
function wildShapeLimit(d: Derived): { cr: number; note: string } | null {
  const lvl = d.classes.find((c) => c.entry.classId === 'druid')?.level ?? 0;
  if (lvl < 2) return null;
  const moon = d.classes.some((c) => c.entry.subclassId?.startsWith('moon'));
  if (moon) return { cr: Math.max(1, Math.floor(lvl / 3)), note: 'Circle of the Moon' };
  if (d.rules.id === 'dnd5e-2024') return { cr: lvl >= 8 ? 1 : lvl >= 4 ? 0.5 : 0.25, note: lvl >= 8 ? 'fly speed allowed' : 'no fly speed' };
  return { cr: lvl >= 8 ? 1 : lvl >= 4 ? 0.5 : 0.25, note: lvl >= 8 ? 'any' : lvl >= 4 ? 'no flying speed' : 'no flying or swimming speed' };
}

export function CompanionsPanel({ ch, d, set }: { ch: Character; d: Derived; set: SetFn }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Companion | null>(null);
  const list = ch.companions ?? [];
  return (
    <div className="panel stack">
      <div className="panel-title"><h3>Companions & forms</h3><span className="spacer" /><button className="small" onClick={() => setAdding(true)}>Add</button></div>
      {list.length === 0 && <span className="small muted">Familiars, beast companions, Wild Shape forms, summons and mounts can be tracked here.</span>}
      {list.map((p) => <CompanionCard key={p.id} p={p} ch={ch} set={set} onEdit={() => setEditing(structuredClone(p))} />)}
      {adding && <AddCompanion d={d} onClose={() => setAdding(false)} onAdd={(p) => { set((c) => { c.companions = [...(c.companions ?? []), p]; }, `Added ${p.name}`); setAdding(false); if (p.kind !== 'wild-shape') setEditing(null); }} onBlank={() => { setAdding(false); setEditing(blank()); }} />}
      {editing && <EditCompanion p={editing} onClose={() => setEditing(null)} onSave={(p) => { set((c) => { const i = (c.companions ?? []).findIndex((x) => x.id === p.id); if (i >= 0) c.companions[i] = p; else c.companions = [...(c.companions ?? []), p]; }, `Edited ${p.name}`); setEditing(null); }} />}
    </div>
  );
}

function CompanionCard({ p, ch, set, onEdit }: { p: Companion; ch: Character; set: SetFn; onEdit: () => void }) {
  const roller = useRoller();
  const { ask, node } = useConfirm();
  const [amt, setAmt] = useState('');
  const [open, setOpen] = useState(false);
  const upd = (fn: (x: Companion) => void, label?: string) => set((c) => { const x = c.companions.find((y) => y.id === p.id); if (x) fn(x); }, label);
  const pct = p.hpMax ? Math.max(0, p.hpCurrent / p.hpMax) : 0;
  const damage = () => {
    const n = Math.max(0, Number(amt) || 0); if (!n) return;
    upd((x) => { const t = Math.min(x.hpTemp, n); x.hpTemp -= t; x.hpCurrent = Math.max(0, x.hpCurrent - (n - t)); }, `${p.name} took ${n} damage`);
    const left = p.hpCurrent + p.hpTemp - n;
    if (left <= 0) useApp.getState().toast({ kind: 'error', text: `${p.name} drops to 0 HP.`, detail: p.kind === 'wild-shape' ? 'You return to your normal form; excess damage may carry over (2014) — apply it on your HP panel.' : undefined });
    setAmt('');
  };
  const heal = () => { const n = Math.max(0, Number(amt) || 0); if (!n) return; upd((x) => { x.hpCurrent = Math.min(x.hpMax, x.hpCurrent + n); }, `${p.name} healed ${n}`); setAmt(''); };
  return (
    <div className="panel" style={{ background: 'var(--bg-2)', opacity: p.active || p.kind !== 'wild-shape' ? 1 : 0.8 }}>
      <div className="row">
        <b style={{ fontSize: '1.05rem' }}>{p.name || 'Unnamed'}</b>
        <span className="chip">{KIND_LABEL[p.kind]}</span>
        {p.cr && <span className="small muted">CR {p.cr} {p.size?.toLowerCase()} {p.creatureType}</span>}
        <span className="spacer" />
        {p.kind === 'wild-shape' && <button className={`small ${p.active ? 'on' : ''}`} onClick={() => upd((x) => { x.active = !x.active; if (!x.active) { x.hpCurrent = x.hpMax; } }, p.active ? `Left ${p.name} form` : `Wild Shape: ${p.name}`)}>{p.active ? 'Transformed' : 'Transform'}</button>}
        <button className="small ghost" onClick={onEdit}>Edit</button>
        <button className="small ghost danger" aria-label={`Remove ${p.name}`} onClick={async () => { if (await ask({ title: `Remove ${p.name}?`, message: 'This removes the companion card.', confirmLabel: 'Remove', danger: true })) set((c) => { c.companions = c.companions.filter((x) => x.id !== p.id); }, `Removed ${p.name}`); }}>✕</button>
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <span className="chip">AC {p.ac}</span><span className="chip">Speed {p.speed}</span>
        <span className="num" style={{ fontWeight: 700 }}>{p.hpCurrent}/{p.hpMax} HP{p.hpTemp ? <span className="magic"> +{p.hpTemp}</span> : null}</span>
        <div className="hp-bar grow" style={{ minWidth: 80 }}><div className={`fill ${pct <= 0.25 ? 'crit' : pct <= 0.5 ? 'low' : ''}`} style={{ width: `${pct * 100}%` }} /></div>
      </div>
      <form className="row" style={{ marginTop: 6 }} onSubmit={(e) => { e.preventDefault(); damage(); }}>
        <input inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Amount" style={{ width: 90 }} aria-label={`Amount for ${p.name}`} />
        <button className="small danger" type="submit" disabled={!amt}>Damage</button>
        <button className="small" type="button" onClick={heal} disabled={!amt}>Heal</button>
        <button className="small" type="button" onClick={() => { const n = Math.max(0, Number(amt) || 0); if (n) { upd((x) => { x.hpTemp = Math.max(x.hpTemp, n); }, `${p.name} temp HP`); setAmt(''); } }} disabled={!amt}>Temp HP</button>
      </form>
      <div className="row tight" style={{ marginTop: 6 }}>
        {ABILITIES.map((a) => <button key={a} className="small" title={`${a.toUpperCase()} check`} onClick={() => roller.d20(`${p.name}: ${a.toUpperCase()} check`, abilityMod(p.abilities[a]), 'check')}>{a.toUpperCase()} {signed(abilityMod(p.abilities[a]))}</button>)}
      </div>
      {p.attacks.length > 0 && (
        <table className="data" style={{ marginTop: 6 }}><tbody>
          {p.attacks.map((a, i) => (
            <tr key={i}>
              <td><b>{a.name}</b>{a.notes && <div className="rider">{a.notes}</div>}</td>
              <td className="num"><button className="small" onClick={() => roller.d20(`${p.name}: ${a.name}`, a.bonus, 'attack')}>{signed(a.bonus)}</button></td>
              <td className="nowrap"><button className="small" onClick={() => roller.expr(`${p.name}: ${a.name} damage`, a.damage || '0', 'damage')}>{a.damage}</button><button className="small ghost" onClick={() => roller.expr(`${p.name}: ${a.name} damage (crit)`, a.damage || '0', 'damage', true)}>Crit</button> <span className="small muted">{a.damageType}</span></td>
            </tr>
          ))}
        </tbody></table>
      )}
      <div className="row tight" style={{ marginTop: 6 }}>
        {p.conditions.map((c) => <span key={c} className="chip red" title={CONDITION_SUMMARY[c as keyof typeof CONDITION_SUMMARY]}>{titleCase(c)}<button onClick={() => upd((x) => { x.conditions = x.conditions.filter((y) => y !== c); })}>✕</button></span>)}
        <select value="" onChange={(e) => e.target.value && upd((x) => { if (!x.conditions.includes(e.target.value)) x.conditions.push(e.target.value); }, `${p.name}: ${e.target.value}`)} style={{ width: 'auto' }} aria-label="Add condition"><option value="">+ condition</option>{CONDITION_IDS.filter((c) => !p.conditions.includes(c)).map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}</select>
        {(p.traits || p.senses || p.skills || p.notes) && <button className="small ghost" onClick={() => setOpen(!open)}>{open ? 'Hide details' : 'Details'}</button>}
      </div>
      {open && <div className="small ink2 pre" style={{ marginTop: 6 }}>{[p.senses && `Senses: ${p.senses}`, p.skills && `Skills: ${p.skills}`, p.saves && `Saves: ${p.saves}`, p.traits, p.notes].filter(Boolean).join('\n')}</div>}
      {node}
      {void ch}
    </div>
  );
}

function AddCompanion({ d, onClose, onAdd, onBlank }: { d: Derived; onClose: () => void; onAdd: (p: Companion) => void; onBlank: () => void }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Companion['kind']>('familiar');
  const [type, setType] = useState('any');
  const [maxCr, setMaxCr] = useState('any');
  const ws = wildShapeLimit(d);
  const effMax = kind === 'wild-shape' && ws ? ws.cr : maxCr === 'any' ? Infinity : Number(maxCr);
  const pool = useMemo(() => (creatures as Template[]).filter((t) => (type === 'any' || (type === 'beast' ? t.type === 'beast' : t.type !== 'beast')) && crNum(t.cr) <= effMax), [type, effMax]);
  const list = q ? fuzzySearch(q, pool, (t) => ({ id: t.id, name: t.name, keywords: [t.type, t.size] })).map((h) => h.item) : [...pool].sort((a, b) => crNum(a.cr) - crNum(b.cr) || a.name.localeCompare(b.name));
  return (
    <Modal title="Add companion or form" onClose={onClose} size="wide" footer={<><button onClick={onBlank}>Create from scratch</button><button onClick={onClose}>Cancel</button></>}>
      <div className="stack">
        <div className="row">
          <select value={kind} onChange={(e) => setKind(e.target.value as Companion['kind'])} style={{ width: 'auto' }} aria-label="Kind">{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input className="grow" placeholder={`Search ${pool.length} creatures (SRD beasts and common familiars/summons)…`} value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 'auto' }} aria-label="Type"><option value="any">Any type</option><option value="beast">Beasts</option><option value="other">Other</option></select>
          {kind !== 'wild-shape' && <select value={maxCr} onChange={(e) => setMaxCr(e.target.value)} style={{ width: 'auto' }} aria-label="Max CR"><option value="any">Any CR</option>{['0', '0.125', '0.25', '0.5', '1', '2', '3', '5'].map((c) => <option key={c} value={c}>CR ≤ {c === '0.125' ? '1/8' : c === '0.25' ? '1/4' : c === '0.5' ? '1/2' : c}</option>)}</select>}
        </div>
        {kind === 'wild-shape' && (ws ? <div className="notice small">Wild Shape: beasts up to CR {ws.cr === 0.25 ? '1/4' : ws.cr === 0.5 ? '1/2' : ws.cr} ({ws.note}). {d.rules.id === 'dnd5e-2024' ? 'In 2024 rules you keep your own HP and gain temporary HP equal to your druid level; the card tracks the form’s stats.' : 'In 2014 rules you use the beast’s HP; excess damage carries over to you.'}</div> : <div className="notice small">You don’t have Wild Shape; any form can still be tracked.</div>)}
        <div className="list panel flush" style={{ maxHeight: '50vh', overflow: 'auto' }}>
          {list.slice(0, 120).map((t) => (
            <div key={t.id} className="list-row clickable" onClick={() => onAdd(fromTemplate(t, kind, d))}>
              <span className="grow"><b>{t.name}</b> <span className="small muted">{t.size} {t.type} · CR {t.cr} · AC {t.ac} · {t.hp} HP · {t.speed}</span></span>
              <button className="small">Add</button>
            </div>
          ))}
          {list.length === 0 && <Empty>No creatures match.</Empty>}
        </div>
        <p className="small muted">Creature stat blocks are from the SRD 5.1. Anything else (homebrew or other books) can be created from scratch.</p>
      </div>
    </Modal>
  );
}

function EditCompanion({ p: initial, onClose, onSave }: { p: Companion; onClose: () => void; onSave: (p: Companion) => void }) {
  const [p, setP] = useState(initial);
  const up = (x: Partial<Companion>) => setP({ ...p, ...x });
  const upA = (i: number, x: Partial<CompanionAttack>) => up({ attacks: p.attacks.map((a, j) => (j === i ? { ...a, ...x } : a)) });
  return (
    <Modal title={initial.name ? `Edit ${initial.name}` : 'New companion'} onClose={onClose} size="wide" footer={<><button onClick={onClose}>Cancel</button><button className="primary" disabled={!p.name.trim()} onClick={() => onSave(p)}>Save</button></>}>
      <div className="stack">
        <div className="field-row">
          <Field label="Name" required><input value={p.name} onChange={(e) => up({ name: e.target.value })} /></Field>
          <Field label="Kind"><select value={p.kind} onChange={(e) => up({ kind: e.target.value as Companion['kind'] })}>{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="AC"><NumberField className="" value={p.ac} min={0} max={40} onChange={(v) => up({ ac: v })} /></Field>
          <Field label="Max HP"><NumberField className="" value={p.hpMax} min={1} max={9999} onChange={(v) => up({ hpMax: v, hpCurrent: Math.min(p.hpCurrent, v) })} /></Field>
          <Field label="Current HP"><NumberField className="" value={p.hpCurrent} min={0} max={p.hpMax} onChange={(v) => up({ hpCurrent: v })} /></Field>
          <Field label="Speed"><input value={p.speed} onChange={(e) => up({ speed: e.target.value })} /></Field>
        </div>
        <div className="row">{ABILITIES.map((a) => <label key={a} className="row tight small">{a.toUpperCase()}<Stepper value={p.abilities[a]} min={1} max={30} onChange={(v) => up({ abilities: { ...p.abilities, [a]: v } })} /></label>)}</div>
        <div className="field-row">
          <Field label="Senses"><input value={p.senses ?? ''} onChange={(e) => up({ senses: e.target.value })} /></Field>
          <Field label="Skills"><input value={p.skills ?? ''} onChange={(e) => up({ skills: e.target.value })} /></Field>
          <Field label="Saves"><input value={p.saves ?? ''} onChange={(e) => up({ saves: e.target.value })} /></Field>
        </div>
        <span className="section-label">Attacks</span>
        {p.attacks.map((a, i) => (
          <div key={i} className="row">
            <input value={a.name} placeholder="Name" onChange={(e) => upA(i, { name: e.target.value })} style={{ width: 160 }} />
            <label className="row tight small">Hit<input type="number" className="num-sm" value={a.bonus} onChange={(e) => upA(i, { bonus: Number(e.target.value) || 0 })} /></label>
            <input value={a.damage} placeholder="Damage (e.g. 2d4+2)" onChange={(e) => upA(i, { damage: e.target.value })} style={{ width: 130 }} />
            <input value={a.damageType ?? ''} placeholder="Type" onChange={(e) => upA(i, { damageType: e.target.value })} style={{ width: 110 }} />
            <input className="grow" value={a.notes ?? ''} placeholder="Notes" onChange={(e) => upA(i, { notes: e.target.value })} />
            <button className="small ghost danger" onClick={() => up({ attacks: p.attacks.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
        <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => up({ attacks: [...p.attacks, { name: 'Attack', bonus: 2, damage: '1d4' }] })}>+ Attack</button>
        <Field label="Traits & actions"><textarea rows={4} value={p.traits ?? ''} onChange={(e) => up({ traits: e.target.value })} /></Field>
        <Field label="Notes"><textarea rows={2} value={p.notes ?? ''} onChange={(e) => up({ notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
