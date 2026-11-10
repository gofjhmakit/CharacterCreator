// Reusable play panels: HP & damage, death saves, conditions, resources, spell slots, attacks, toggles, rests.
import { useState } from 'react';
import type { Character } from '@/types/character';
import type { AttackView, Derived } from '@/engine/derive';
import { CONDITION_IDS, DAMAGE_TYPES, RECHARGE_LABEL, signed, ABILITIES, ABILITY_NAMES } from '@/types/core';
import { CONDITION_SUMMARY, EXHAUSTION_LEVELS, EXHAUSTION_2024 } from '@/engine/conditions';
import { applyDamage, applyHealing, setTempHp, rollDeathSave, shortRest, longRest, spendHitDie } from '@/engine/actions';
import { useApp } from '@/state/store';
import { useRoller } from '../components/roll';
import { Modal, BreakdownView, Pips, Stepper, titleCase } from '../components/common';
import { rollExpression } from '@/dice/dice';
import { QUICK_EFFECTS } from '@/content/data/quickEffects';
import { uid } from '@/engine/factory';

type P = { ch: Character; d: Derived; set: (r: (c: Character) => void) => void; replace: (c: Character) => void };

export function HpPanel({ ch, d, set, replace }: P) {
  const [amt, setAmt] = useState('');
  const [type, setType] = useState('');
  const [crit, setCrit] = useState(false);
  const toast = useApp((s) => s.toast);
  const roller = useRoller();
  const cur = Math.min(ch.combat.hpCurrent, d.hp.max);
  const pct = d.hp.max ? Math.max(0, cur / d.hp.max) : 0;
  const tempPct = d.hp.max ? Math.min(1 - pct, ch.combat.hpTemp / d.hp.max) : 0;
  const parseAmt = (): number | null => {
    const t = amt.trim(); if (!t) return null;
    if (/^\d+$/.test(t)) return Number(t);
    try { const r = rollExpression(t, { label: 'Amount' }); useApp.getState().addRoll(r); return r.total; } catch { toast({ kind: 'error', text: 'Enter a number or dice expression (e.g. 2d6+3).' }); return null; }
  };
  const damage = () => {
    const n = parseAmt(); if (n === null) return;
    const r = applyDamage(ch, d, n, type || undefined, { critical: crit });
    replace(r.character);
    toast({ kind: r.droppedToZero || r.instantDeath ? 'error' : 'info', text: `Took ${r.taken}${type ? ` ${type}` : ''} damage${r.absorbedByTemp ? ` (${r.absorbedByTemp} absorbed by temp HP)` : ''}.`, detail: [...r.notes, r.instantDeath ? 'Instant death!' : r.droppedToZero ? 'Dropped to 0 HP — unconscious.' : ''].filter(Boolean).join(' ') });
    setAmt('');
  };
  const heal = () => { const n = parseAmt(); if (n === null) return; replace(applyHealing(ch, d, n)); setAmt(''); };
  const temp = () => { const n = parseAmt(); if (n === null) return; replace(setTempHp(ch, n)); setAmt(''); };
  const dying = cur <= 0;
  return (
    <div className="panel stack">
      <div className="panel-title"><h3>Hit Points</h3><span className="spacer" /><HpMaxInfo d={d} /></div>
      <div className="hp-box">
        <div className="hp-nums">{cur}<span className="max"> / {d.hp.max}</span>{ch.combat.hpTemp > 0 && <span className="magic" style={{ fontSize: '1.1rem' }}> +{ch.combat.hpTemp} temp</span>}</div>
        <Stepper value={cur} min={0} max={d.hp.max} onChange={(v) => set((c) => { c.combat.hpCurrent = v; })} label="Current HP" />
      </div>
      <div className="hp-bar" aria-hidden><div className={`fill ${pct <= 0.25 ? 'crit' : pct <= 0.5 ? 'low' : ''}`} style={{ width: `${pct * 100}%` }} /><div className="temp" style={{ width: `${tempPct * 100}%` }} /></div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); damage(); }}>
        <input inputMode="numeric" placeholder="Amount or dice" value={amt} onChange={(e) => setAmt(e.target.value)} style={{ width: 130 }} aria-label="Amount" />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 'auto' }} aria-label="Damage type"><option value="">Untyped</option>{DAMAGE_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}</select>
        {dying && <label className="check small"><input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} />Crit</label>}
      </form>
      <div className="row">
        <button className="danger" onClick={damage} disabled={!amt.trim()}>Damage</button>
        <button onClick={heal} disabled={!amt.trim()} style={{ borderColor: 'var(--green)' }}>Heal</button>
        <button onClick={temp} disabled={!amt.trim()}>Set temp HP</button>
        {ch.combat.hpTemp > 0 && <button className="ghost small" onClick={() => set((c) => { c.combat.hpTemp = 0; })}>Clear temp</button>}
      </div>
      {dying && <DeathSaves ch={ch} set={set} replace={replace} />}
      <div className="row between">
        <HitDice ch={ch} d={d} replace={replace} />
        <button className="small" onClick={() => roller.d20('Initiative', d.initiative, 'initiative', { halflingLucky: d.flags.has('halfling-lucky') })}>Roll initiative {signed(d.initiative.total)}</button>
      </div>
    </div>
  );
}

function HpMaxInfo({ d }: { d: Derived }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="ghost small" onClick={() => setOpen(true)}>Max HP breakdown</button>
    {open && <Modal title="Hit point maximum" onClose={() => setOpen(false)} size="narrow"><BreakdownView b={{ total: d.hp.max, parts: d.hp.parts }} unit=" " /></Modal>}
  </>;
}

function DeathSaves({ ch, set, replace }: Omit<P, 'd'>) {
  const toast = useApp((s) => s.toast);
  const addRoll = useApp((s) => s.addRoll);
  const ds = ch.combat.deathSaves;
  const roll = () => {
    const r = rollDeathSave(ch);
    addRoll(r.roll);
    replace(r.character);
    toast({ kind: r.result.includes('fail') || r.result === 'failure' ? 'error' : 'success', text: `Death save: ${r.roll.natural} — ${r.result.replace('-', ' ')}`, detail: r.status === 'dead' ? 'Three failures: the character dies.' : r.status === 'stable' ? 'Three successes: stable.' : r.status === 'revived' ? 'Natural 20: regain 1 HP!' : undefined });
  };
  return (
    <div className="notice" style={{ borderLeftColor: 'var(--red)' }}>
      <div className="row between"><b>Death saving throws</b>{ch.combat.stable && <span className="chip green">Stable</span>}{ds.failures >= 3 && <span className="chip red">Dead</span>}</div>
      <div className="row" style={{ marginTop: 6 }}>
        <span className="small">Successes</span><Pips kind="succ" max={3} used={3 - ds.successes} onSet={(u) => set((c) => { c.combat.deathSaves.successes = 3 - u; })} />
        <span className="small">Failures</span><Pips kind="fail" max={3} used={3 - ds.failures} onSet={(u) => set((c) => { c.combat.deathSaves.failures = 3 - u; })} />
        <button className="small primary" onClick={roll} disabled={ds.failures >= 3 || ds.successes >= 3}>Roll death save</button>
        <button className="small ghost" onClick={() => set((c) => { c.combat.deathSaves = { successes: 0, failures: 0 }; c.combat.stable = true; })}>Stabilize</button>
      </div>
    </div>
  );
}

function HitDice({ ch, d, replace }: Omit<P, 'set'>) {
  const toast = useApp((s) => s.toast);
  const addRoll = useApp((s) => s.addRoll);
  return (
    <div className="row">
      <span className="caps">Hit dice</span>
      {d.hitDice.map((h) => (
        <button key={h.die} className="small" disabled={h.used >= h.total} title={`Spend a d${h.die} (${h.classes.join(', ')})`} onClick={() => {
          const r = spendHitDie(ch, d, h.die);
          if (r.roll) addRoll(r.roll);
          replace(r.character);
          toast({ kind: 'success', text: `Hit Die d${h.die}: healed ${r.healed}.` });
        }}>d{h.die}: {h.total - h.used}/{h.total}</button>
      ))}
    </div>
  );
}

export function ConditionsPanel({ ch, d, set }: Omit<P, 'replace'>) {
  const [open, setOpen] = useState(false);
  const active = ch.combat.conditions;
  const immune = new Set(d.conditionImmunities.map((x) => x.type));
  return (
    <div className="panel stack">
      <div className="panel-title"><h3>Conditions</h3><span className="spacer" /><button className="small" onClick={() => setOpen(true)}>Manage</button></div>
      <div className="row">
        {active.length === 0 && ch.combat.exhaustion === 0 && <span className="muted small">None</span>}
        {active.map((c) => <span key={c} className="chip red" title={CONDITION_SUMMARY[c]}>{titleCase(c)}<button aria-label={`Remove ${c}`} onClick={() => set((x) => { x.combat.conditions = x.combat.conditions.filter((y) => y !== c); })}>✕</button></span>)}
        {d.activeConditions.filter((c) => !active.includes(c)).map((c) => <span key={c} className="chip" title="Implied by another condition">{titleCase(c)}</span>)}
        {ch.combat.exhaustion > 0 && <span className="chip red" title={d.rules.exhaustion === '2024' ? EXHAUSTION_2024(ch.combat.exhaustion) : EXHAUSTION_LEVELS.slice(1, ch.combat.exhaustion + 1).join('; ')}>Exhaustion {ch.combat.exhaustion}</span>}
      </div>
      <div className="row"><span className="caps">Exhaustion</span><Stepper value={ch.combat.exhaustion} min={0} max={6} onChange={(v) => set((c) => { c.combat.exhaustion = v; })} /><span className="small muted">{d.rules.exhaustion === '2024' ? EXHAUSTION_2024(ch.combat.exhaustion) : EXHAUSTION_LEVELS[ch.combat.exhaustion]}</span></div>
      {open && (
        <Modal title="Conditions" onClose={() => setOpen(false)}>
          <div className="stack">
            {CONDITION_IDS.map((c) => (
              <label key={c} className="check" style={{ alignItems: 'flex-start' }}>
                <input type="checkbox" checked={active.includes(c)} onChange={(e) => set((x) => { x.combat.conditions = e.target.checked ? [...x.combat.conditions, c] : x.combat.conditions.filter((y) => y !== c); })} />
                <span><b>{titleCase(c)}</b>{immune.has(c) && <span className="badge" style={{ marginLeft: 6 }}>immune</span>}<br /><span className="small ink2">{CONDITION_SUMMARY[c]}</span></span>
              </label>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ResourcesPanel({ ch, d, set }: Omit<P, 'replace'>) {
  const [edit, setEdit] = useState<string | null>(null);
  if (!d.resources.length) return null;
  return (
    <div className="panel">
      <div className="panel-title"><h3>Resources</h3></div>
      <div className="list">
        {d.resources.map((r) => (
          <div key={r.id} className="list-row" style={{ flexWrap: 'wrap' }}>
            <span className="grow"><b>{r.name}</b>{r.die && <span className="chip gold" style={{ marginLeft: 6 }}>{r.die}</span>}<br /><span className="small muted">{RECHARGE_LABEL[r.recharge]}{r.shortRecover ? ` (regain ${r.shortRecover} on a short rest)` : ''}{r.overridden ? ' · max overridden' : ''}</span></span>
            {r.max >= 99 ? <span className="small">Unlimited</span> : r.pool || r.max > 8
              ? <span className="row tight"><Stepper value={r.remaining} min={0} max={r.max} onChange={(v) => set((c) => { c.resources[r.id] = { ...(c.resources[r.id] ?? {}), used: r.max - v }; })} /><span className="small muted">/ {r.max}</span></span>
              : <Pips max={r.max} used={r.used} onSet={(u) => set((c) => { c.resources[r.id] = { ...(c.resources[r.id] ?? {}), used: u }; })} />}
            <button className="ghost small" onClick={() => setEdit(r.id)} aria-label={`Adjust ${r.name}`}>⋯</button>
          </div>
        ))}
      </div>
      {edit && (() => {
        const r = d.resources.find((x) => x.id === edit)!;
        return (
          <Modal title={`Adjust: ${r.name}`} onClose={() => setEdit(null)} size="narrow" footer={<button onClick={() => setEdit(null)}>Done</button>}>
            <div className="stack">
              <label className="field">Maximum (house rule override)<input type="number" placeholder={`Rules: computed`} value={ch.resources[r.id]?.maxOverride ?? ''} onChange={(e) => set((c) => { const v = e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)); c.resources[r.id] = { ...(c.resources[r.id] ?? { used: 0 }), maxOverride: v }; })} /></label>
              <span className="small muted">Leave empty to use the rules value. Source: {r.source.label}.</span>
              <button onClick={() => set((c) => { c.resources[r.id] = { ...(c.resources[r.id] ?? {}), used: 0 }; })}>Restore all uses</button>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

export function TogglesPanel({ ch, d, set }: Omit<P, 'replace'>) {
  if (!d.toggles.length) return null;
  return (
    <div className="panel">
      <div className="panel-title"><h3>Active states</h3></div>
      <div className="row">
        {d.toggles.map((t) => (
          <button key={t.key} className={`small ${t.on ? 'on' : ''}`} title={t.description} onClick={() => set((c) => {
            if (t.itemInstanceId) { const it = c.inventory.find((i) => i.id === t.itemInstanceId); if (it) it.toggles = { ...(it.toggles ?? {}), [t.key.split(':').slice(1).join(':')]: !t.on }; }
            else c.combat.toggles[t.key] = !t.on;
          })}>{t.on ? '● ' : '○ '}{t.name}{t.itemInstanceId ? ` (${t.source.label})` : ''}</button>
        ))}
      </div>
      {d.toggles.some((t) => t.on && t.description) && <div className="small ink2" style={{ marginTop: 8 }}>{d.toggles.filter((t) => t.on && t.description).map((t) => <div key={t.key}><b>{t.name}:</b> {t.description}</div>)}</div>}
      {void ch}
    </div>
  );
}

export function SlotsPanel({ ch, d, set }: Omit<P, 'replace'>) {
  if (!d.slots.length && !d.pact) return null;
  return (
    <div className="panel">
      <div className="panel-title"><h3>Spell slots</h3></div>
      <div className="stack">
        {d.slots.map((s) => (
          <div key={s.level} className="row"><span className="caps" style={{ width: 54 }}>Level {s.level}</span><Pips square max={s.max} used={s.used} onSet={(u) => set((c) => { c.spells.slotsUsed[s.level] = u; })} /><span className="small muted">{s.max - s.used}/{s.max}</span></div>
        ))}
        {d.pact && <div className="row"><span className="caps" style={{ width: 54 }}>Pact</span><Pips square kind="" max={d.pact.slots} used={d.pact.used} onSet={(u) => set((c) => { c.spells.pactSlotsUsed = u; })} /><span className="small muted">level {d.pact.level} · short rest</span></div>}
      </div>
      {void ch}
    </div>
  );
}

export function AttacksPanel({ ch, d, compact }: { ch: Character; d: Derived; compact?: boolean }) {
  const roller = useRoller();
  const [info, setInfo] = useState<AttackView | null>(null);
  const [twoHanded, setTwoHanded] = useState<Record<string, boolean>>({});
  const rollDamage = (a: AttackView, crit: boolean) => {
    const dice = twoHanded[a.id] && a.versatileDice ? a.versatileDice : a.damageDice;
    const parts = [dice === '0' ? '' : dice, ...a.extraDamage.filter((x) => !x.condition).map((x) => x.dice)].filter(Boolean);
    const bonus = a.damageBonus.total;
    const expr = parts.join('+') + (bonus ? (bonus > 0 ? `+${bonus}` : `${bonus}`) : '');
    roller.expr(`${a.name} damage${crit ? ' (critical)' : ''}`, expr || '0', 'damage', crit);
  };
  const casters = d.casters;
  return (
    <div className="panel">
      <div className="panel-title"><h3>Attacks</h3></div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Name</th><th className="num">Hit</th><th>Damage</th>{!compact && <th>Range</th>}<th></th></tr></thead>
          <tbody>
            {d.attacks.map((a) => {
              const dice = twoHanded[a.id] && a.versatileDice ? a.versatileDice : a.damageDice;
              return (
                <tr key={a.id} className="attack-row">
                  <td>
                    <button className="ghost small" style={{ padding: 0, minHeight: 0, fontWeight: 700 }} onClick={() => setInfo(a)}>{a.name}</button>
                    {a.riders.length > 0 && <div className="rider">{a.riders.map((r) => `${r.trigger === 'on-crit' ? 'Crit' : 'Hit'}: ${r.label}`).join(' · ')}</div>}
                    {a.mastery && <div className="rider" title={a.mastery.description}><span className="chip gold">Mastery: {a.mastery.name}</span></div>}
                    {a.extraDamage.length > 0 && <div className="rider">{a.extraDamage.map((x) => `+${x.dice} ${x.type}${x.condition ? ` (${x.condition})` : ''}`).join(', ')}</div>}
                  </td>
                  <td className="num"><button className={`small ${a.attack.mode === 'advantage' ? 'adv-dot' : a.attack.mode === 'disadvantage' ? 'dis-dot' : ''}`} style={{ position: 'relative' }} onClick={() => roller.d20(`${a.name} attack`, a.attack, 'attack', { critRange: a.critRange, halflingLucky: d.flags.has('halfling-lucky') })}>{signed(a.attack.total)}</button></td>
                  <td className="nowrap">
                    <button className="small" onClick={() => rollDamage(a, false)}>{dice === '0' ? '' : dice}{a.damageBonus.total ? ` ${a.damageBonus.total > 0 ? '+' : '−'} ${Math.abs(a.damageBonus.total)}` : ''}</button>
                    <button className="small ghost" title="Roll critical damage (double dice)" onClick={() => rollDamage(a, true)}>Crit</button>
                    <span className="small muted"> {titleCase(String(a.damageType))}</span>
                    {a.versatileDice && <label className="check small" style={{ marginLeft: 6 }}><input type="checkbox" checked={!!twoHanded[a.id]} onChange={(e) => setTwoHanded({ ...twoHanded, [a.id]: e.target.checked })} />2H</label>}
                  </td>
                  {!compact && <td className="small nowrap">{a.range}</td>}
                  <td className="small">{a.critRange < 20 && <span className="chip">crit {a.critRange}–20</span>}</td>
                </tr>
              );
            })}
            {casters.map((cv) => (
              <tr key={`sp-${cv.classId}`}>
                <td><b>Spell attack</b><div className="rider">{cv.name} · save DC {cv.dc.total}</div></td>
                <td className="num"><button className="small" onClick={() => roller.d20(`${cv.name} spell attack`, cv.attack, 'attack')}>{signed(cv.attack.total)}</button></td>
                <td className="small muted">by spell</td>{!compact && <td></td>}<td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {info && (
        <Modal title={info.name} onClose={() => setInfo(null)}>
          <div className="grid cols-2">
            <BreakdownView b={info.attack} title="Attack bonus" />
            <BreakdownView b={info.damageBonus} title={`Damage: ${info.damageDice} + bonus`} />
          </div>
          <hr />
          <dl className="kv">
            <dt>Ability</dt><dd>{ABILITY_NAMES[info.ability]}</dd>
            <dt>Proficient</dt><dd>{info.proficient ? 'Yes' : 'No'}</dd>
            <dt>Properties</dt><dd>{info.properties.map(titleCase).join(', ') || '—'}</dd>
            <dt>Range</dt><dd>{info.range}</dd>
            <dt>Critical</dt><dd>{info.critRange}–20 (dice doubled)</dd>
          </dl>
          {info.mastery && <div className="notice" style={{ marginTop: 8 }}><b>Weapon Mastery: {info.mastery.name}</b><div className="small">{info.mastery.description}</div></div>}
          {info.riders.map((r, i) => <div key={i} className="notice" style={{ marginTop: 8 }}><b>{r.trigger === 'on-crit' ? 'On critical hit' : r.trigger === 'on-attack' ? 'On attack' : 'On hit'}: {r.label}</b>{r.oncePerTurn ? ' (once per turn)' : ''}<div className="small">{r.text}</div>
            {r.outcomes?.filter((o) => o.kind === 'damage' && o.dice).map((o, j) => <button key={j} className="small" style={{ marginTop: 4 }} onClick={() => roller.expr(`${r.label}`, o.dice!, 'damage')}>Roll {o.dice} {o.damageType ?? ''}</button>)}
          </div>)}
          {info.notes.map((n, i) => <p key={i} className="small muted">{n}</p>)}
          {void ch}
        </Modal>
      )}
    </div>
  );
}

export function RestButtons({ ch, d, replace }: Omit<P, 'set'>) {
  const [mode, setMode] = useState<null | 'short' | 'long'>(null);
  const [dawn, setDawn] = useState(true);
  const toast = useApp((s) => s.toast);
  const doRest = () => {
    const r = mode === 'short' ? shortRest(ch, d) : longRest(ch, d, { dawn });
    replace(r.character);
    toast({ kind: 'success', text: `${mode === 'short' ? 'Short' : 'Long'} rest complete.`, detail: r.summary.restored.length ? `Restored: ${r.summary.restored.join(', ')}` : 'Nothing to restore.' }, 6000);
    setMode(null);
  };
  const shortRes = d.resources.filter((r) => r.recharge === 'short');
  const longRes = d.resources.filter((r) => r.recharge === 'long' || r.recharge === 'dawn');
  return (
    <>
      <div className="row"><button onClick={() => setMode('short')}>Short rest</button><button onClick={() => setMode('long')}>Long rest</button></div>
      {mode && (
        <Modal title={mode === 'short' ? 'Short rest' : 'Long rest'} onClose={() => setMode(null)} footer={<><button onClick={() => setMode(null)}>Cancel</button><button className="primary" onClick={doRest}>Rest</button></>}>
          <div className="stack">
            {mode === 'short' ? <>
              <p>Restores resources that recharge on a short rest{d.pact ? ' and Pact Magic slots' : ''}. Spend Hit Dice to heal (below, or from the HP panel).</p>
              <div className="small">Will restore: {[...shortRes.map((r) => r.name), ...(d.pact ? ['Pact Magic slots'] : [])].join(', ') || 'nothing'}</div>
              <HitDice ch={ch} d={d} replace={replace} />
              {d.features.some((f) => f.def.tags?.includes('arcane-recovery')) && <p className="small muted">Arcane Recovery: use it from the Spells tab after resting.</p>}
            </> : <>
              <p>Regain all HP, up to half your Hit Dice (min 1), all spell slots, and short/long-rest resources. Exhaustion is reduced by 1.</p>
              <div className="small">Will restore: {[...shortRes, ...longRes].map((r) => r.name).join(', ') || '—'}</div>
              <label className="check"><input type="checkbox" checked={dawn} onChange={(e) => setDawn(e.target.checked)} />Dawn passed (recharge “at dawn” features and item charges)</label>
            </>}
          </div>
        </Modal>
      )}
    </>
  );
}

export function QuickEffectsPanel({ ch, set }: { ch: Character; set: P['set'] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel">
      <div className="panel-title"><h3>Temporary effects</h3><span className="spacer" /><button className="small" onClick={() => setOpen(true)}>Add</button></div>
      {ch.effects.length === 0 ? <span className="muted small">None active.</span> : (
        <div className="row">{ch.effects.map((e) => <span key={e.id} className="chip blue" title={e.effect.description}>{e.name}{e.concentration ? ' (C)' : ''}<button aria-label={`End ${e.name}`} onClick={() => set((c) => { c.effects = c.effects.filter((x) => x.id !== e.id); if (e.concentration && c.combat.concentration === e.name) c.combat.concentration = undefined; })}>✕</button></span>)}</div>
      )}
      {ch.combat.concentration && <div className="row small" style={{ marginTop: 8 }}><span className="chip gold">Concentrating: {ch.combat.concentration}</span><button className="small ghost" onClick={() => set((c) => { c.combat.concentration = undefined; c.effects = c.effects.filter((x) => !x.concentration); })}>End</button></div>}
      {open && (
        <Modal title="Apply a temporary effect" onClose={() => setOpen(false)}>
          <div className="list">
            {QUICK_EFFECTS.map((q) => (
              <div key={q.id} className="list-row">
                <span className="grow"><b>{q.name}</b>{q.concentration && <span className="badge" style={{ marginLeft: 6 }}>conc.</span>}<br /><span className="small ink2">{q.description}</span></span>
                <button className="small" onClick={() => { set((c) => { if (q.concentration) { c.effects = c.effects.filter((x) => !x.concentration); c.combat.concentration = q.name; } c.effects.push({ id: uid('fx'), name: q.name, effect: structuredClone(q.effect), concentration: q.concentration, createdAt: new Date().toISOString() }); }); setOpen(false); }}>Apply</button>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>Applying a concentration effect ends your previous concentration effect.</p>
        </Modal>
      )}
    </div>
  );
}

export function DefensesPanel({ d }: { d: Derived }) {
  const any = d.resistances.length + d.immunities.length + d.vulnerabilities.length + d.conditionImmunities.length + d.senses.length + d.damageReduction.length;
  return (
    <div className="panel">
      <div className="panel-title"><h3>Defenses & senses</h3></div>
      {!any && <span className="muted small">None</span>}
      <dl className="kv">
        {d.resistances.length > 0 && <><dt>Resistant</dt><dd>{d.resistances.map((r) => <span key={r.type + r.source} className="chip" title={r.source} style={{ marginRight: 4 }}>{titleCase(r.type)}{r.conditional ? '*' : ''}</span>)}</dd></>}
        {d.immunities.length > 0 && <><dt>Immune</dt><dd>{d.immunities.map((r) => <span key={r.type} className="chip" title={r.source} style={{ marginRight: 4 }}>{titleCase(r.type)}</span>)}</dd></>}
        {d.vulnerabilities.length > 0 && <><dt>Vulnerable</dt><dd>{d.vulnerabilities.map((r) => <span key={r.type} className="chip red" title={r.source} style={{ marginRight: 4 }}>{titleCase(r.type)}</span>)}</dd></>}
        {d.conditionImmunities.length > 0 && <><dt>Cond. immune</dt><dd>{d.conditionImmunities.map((r) => <span key={r.type} className="chip" title={r.source} style={{ marginRight: 4 }}>{titleCase(r.type)}</span>)}</dd></>}
        {d.damageReduction.length > 0 && <><dt>Reduction</dt><dd>{d.damageReduction.map((p) => `${p.label} ${p.value}`).join(', ')}</dd></>}
        {d.senses.length > 0 && <><dt>Senses</dt><dd>{d.senses.map((s) => `${titleCase(s.name)} ${s.range} ft`).join(', ')}</dd></>}
      </dl>
      {d.resistances.some((r) => r.conditional) && <div className="small muted">* {d.resistances.filter((r) => r.conditional).map((r) => `${r.type}: ${r.conditional}`).join('; ')}</div>}
    </div>
  );
}

export function SavesMini({ d }: { d: Derived }) {
  const roller = useRoller();
  return (
    <div className="panel">
      <div className="panel-title"><h3>Saving throws</h3></div>
      <div className="grid cols-3" style={{ gap: 6 }}>
        {ABILITIES.map((a) => (
          <button key={a} className={`small ${d.saves[a].proficient ? 'on' : ''} ${d.saves[a].mode === 'advantage' ? 'adv-dot' : d.saves[a].mode === 'disadvantage' ? 'dis-dot' : ''}`} style={{ position: 'relative', justifyContent: 'space-between' }} onClick={() => roller.d20(`${ABILITY_NAMES[a]} save`, d.saves[a], 'save', { halflingLucky: d.flags.has('halfling-lucky') })}>
            <span>{a.toUpperCase()}</span><span className="num">{signed(d.saves[a].total)}</span>
          </button>
        ))}
      </div>
      {ABILITIES.some((a) => d.saves[a].conditional.length) && <div className="small muted" style={{ marginTop: 6 }}>{[...new Set(ABILITIES.flatMap((a) => d.saves[a].conditional.map((c) => `${c.label}: ${c.op === 'advantage' ? 'advantage ' : ''}${c.condition}`)))].join(' · ')}</div>}
    </div>
  );
}
