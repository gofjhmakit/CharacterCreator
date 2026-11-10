// Ability score generation UI: point buy, standard array, 3d6, 4d6 drop lowest, manual.
import type { Character, AbilityMethod, RolledScore } from '@/types/character';
import { ABILITIES, ABILITY_NAMES, type Ability } from '@/types/core';
import { POINT_BUY_BUDGET, POINT_BUY_COST, STANDARD_ARRAY, assignStandardArray, canDecreasePointBuy, canIncreasePointBuy, validatePointBuy, standardArrayScores } from '@/engine/abilityGen';
import { roll3d6, roll4d6DropLowest } from '@/dice/dice';
import { uid } from '@/engine/factory';
import { NumberField } from '../components/common';

const METHODS: { id: AbilityMethod; label: string }[] = [
  { id: 'point-buy', label: 'Point Buy (27)' },
  { id: 'standard-array', label: 'Standard Array' },
  { id: 'roll-4d6', label: 'Roll 4d6 drop lowest' },
  { id: 'roll-3d6', label: 'Roll 3d6' },
  { id: 'manual', label: 'Manual entry' },
];

export function AbilityGenerator({ ch, set }: { ch: Character; set: (r: (c: Character) => void) => void }) {
  const m = ch.abilities.method;
  const setMethod = (method: AbilityMethod) => set((c) => {
    c.abilities.method = method;
    if (method === 'point-buy') c.abilities.base = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
    if (method === 'standard-array') { c.abilities.arrayAssignment = {}; c.abilities.base = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }; }
    if (method === 'roll-3d6' || method === 'roll-4d6') { c.abilities.rolls = []; c.abilities.assignment = {}; }
  });
  return (
    <div className="stack">
      <div className="subtabs" role="tablist">{METHODS.map((x) => <button key={x.id} className={m === x.id ? 'active' : ''} onClick={() => setMethod(x.id)}>{x.label}</button>)}</div>
      {m === 'point-buy' && <PointBuy ch={ch} set={set} />}
      {m === 'standard-array' && <StandardArray ch={ch} set={set} />}
      {(m === 'roll-3d6' || m === 'roll-4d6') && <Rolling ch={ch} set={set} method={m} />}
      {m === 'manual' && (
        <div className="abil-grid">{ABILITIES.map((a) => (
          <label key={a} className="field" style={{ alignItems: 'center' }}>{ABILITY_NAMES[a]}<NumberField value={ch.abilities.base[a]} min={1} max={30} onChange={(v) => set((c) => { c.abilities.base[a] = v; })} /></label>
        ))}</div>
      )}
    </div>
  );
}

function PointBuy({ ch, set }: { ch: Character; set: (r: (c: Character) => void) => void }) {
  const s = ch.abilities.base;
  const v = validatePointBuy(s);
  return (
    <div className="stack">
      <div className="row"><span className={`chip ${v.remaining === 0 ? 'green' : v.remaining < 0 || !v.valid ? 'red' : 'gold'}`}>Points remaining: {Number.isNaN(v.remaining) ? '—' : v.remaining} / {POINT_BUY_BUDGET}</span>
        <button className="small ghost" onClick={() => set((c) => { c.abilities.base = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }; })}>Reset</button>
        <span className="small muted">Scores 8–15. Costs: {Object.entries(POINT_BUY_COST).map(([k, c]) => `${k}=${c}`).join(', ')}</span>
      </div>
      {!v.valid && <ul className="warnings">{v.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="abil-grid">
        {ABILITIES.map((a) => (
          <div key={a} className="abil" style={{ cursor: 'default' }}>
            <div className="name">{ABILITY_NAMES[a]}</div>
            <div className="mod">{s[a]}</div>
            <div className="small muted">cost {POINT_BUY_COST[s[a]] ?? '—'}</div>
            <div className="row tight" style={{ justifyContent: 'center', marginTop: 4 }}>
              <button className="small icon" aria-label={`Decrease ${a}`} disabled={!canDecreasePointBuy(s, a)} onClick={() => set((c) => { c.abilities.base[a] -= 1; })}>−</button>
              <button className="small icon" aria-label={`Increase ${a}`} disabled={!canIncreasePointBuy(s, a)} onClick={() => set((c) => { c.abilities.base[a] += 1; })}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StandardArray({ ch, set }: { ch: Character; set: (r: (c: Character) => void) => void }) {
  const asg = ch.abilities.arrayAssignment ?? {};
  const used = new Map(Object.entries(asg).map(([a, i]) => [i, a]));
  const assign = (a: Ability, idx: number | undefined) => set((c) => {
    const next = assignStandardArray(c.abilities.arrayAssignment ?? {}, a, idx);
    c.abilities.arrayAssignment = next;
    const sc = standardArrayScores(next);
    for (const ab of ABILITIES) c.abilities.base[ab] = sc[ab] ?? 10;
  });
  return (
    <div className="stack">
      <div className="row small"><span className="muted">Values:</span>{STANDARD_ARRAY.map((v, i) => <span key={i} className={`chip ${used.has(i) ? '' : 'gold'}`}>{v}{used.has(i) ? ` → ${String(used.get(i)).toUpperCase()}` : ''}</span>)}</div>
      <div className="abil-grid">
        {ABILITIES.map((a) => (
          <label key={a} className="field abil" style={{ cursor: 'default' }}>
            <span className="name">{ABILITY_NAMES[a]}</span>
            <select value={asg[a] ?? ''} onChange={(e) => assign(a, e.target.value === '' ? undefined : Number(e.target.value))}>
              <option value="">—</option>
              {STANDARD_ARRAY.map((v, i) => <option key={i} value={i}>{v}{used.has(i) && used.get(i) !== a ? ` (swap with ${String(used.get(i)).toUpperCase()})` : ''}</option>)}
            </select>
          </label>
        ))}
      </div>
      <span className="small muted">Each value can be used once; picking a used value swaps the two abilities.</span>
    </div>
  );
}

function Rolling({ ch, set, method }: { ch: Character; set: (r: (c: Character) => void) => void; method: 'roll-3d6' | 'roll-4d6' }) {
  const rolls = ch.abilities.rolls ?? [];
  const asg = ch.abilities.assignment ?? {};
  const gen = (): RolledScore => { const g = method === 'roll-4d6' ? roll4d6DropLowest() : roll3d6(); return { id: uid('roll'), dice: g.dice, dropped: g.dropped, total: g.total, locked: false }; };
  const applyAssign = (c: Character) => {
    for (const a of ABILITIES) { const r = (c.abilities.rolls ?? []).find((x) => x.id === c.abilities.assignment?.[a]); c.abilities.base[a] = r ? r.total : 10; }
  };
  const rollAll = () => set((c) => {
    const cur = c.abilities.rolls ?? [];
    const next = Array.from({ length: 6 }, (_, i) => (cur[i]?.locked ? cur[i] : gen()));
    const keep = new Set(next.map((r) => r.id));
    c.abilities.rolls = next;
    c.abilities.assignment = Object.fromEntries(Object.entries(c.abilities.assignment ?? {}).filter(([, id]) => keep.has(id!)));
    applyAssign(c);
  });
  const reroll = (i: number) => set((c) => {
    const r = c.abilities.rolls!; const old = r[i]; const n = gen(); r[i] = n;
    for (const a of ABILITIES) if (c.abilities.assignment?.[a] === old.id) c.abilities.assignment[a] = n.id;
    applyAssign(c);
  });
  const assign = (a: Ability, rid: string) => set((c) => {
    const as = { ...(c.abilities.assignment ?? {}) };
    const holder = ABILITIES.find((x) => x !== a && as[x] === rid);
    const prev = as[a];
    if (rid) as[a] = rid; else delete as[a];
    if (holder) { if (prev) as[holder] = prev; else delete as[holder]; }
    c.abilities.assignment = as;
    applyAssign(c);
  });
  const total = rolls.reduce((s, r) => s + r.total, 0);
  return (
    <div className="stack">
      <div className="row">
        <button className="primary" onClick={rollAll}>{rolls.length ? 'Reroll unlocked' : 'Roll six scores'}</button>
        {rolls.length > 0 && <span className="small muted">Total {total} · Lock scores to keep them. Reroll as often as your table allows.</span>}
      </div>
      {rolls.length > 0 && (
        <div className="option-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {rolls.map((r, i) => {
            const usedBy = ABILITIES.find((a) => asg[a] === r.id);
            return (
              <div key={r.id} className={`option ${r.locked ? 'selected' : ''}`} style={{ cursor: 'default' }}>
                <div className="row between" style={{ width: '100%' }}><span className="num" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{r.total}</span><span className="small muted">{usedBy ? `→ ${usedBy.toUpperCase()}` : 'unassigned'}</span></div>
                <div>{r.dice.map((v, di) => <span key={di} className={`die-face ${di === r.dropped ? 'dropped' : ''}`}>{v}</span>)}</div>
                <div className="row tight">
                  <button className={`small ${r.locked ? 'on' : ''}`} onClick={() => set((c) => { c.abilities.rolls![i].locked = !c.abilities.rolls![i].locked; })}>{r.locked ? 'Locked' : 'Lock'}</button>
                  <button className="small" disabled={r.locked} onClick={() => reroll(i)}>Reroll</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {rolls.length > 0 && (
        <div className="abil-grid">
          {ABILITIES.map((a) => (
            <label key={a} className="field abil" style={{ cursor: 'default' }}>
              <span className="name">{ABILITY_NAMES[a]}</span>
              <select value={asg[a] ?? ''} onChange={(e) => assign(a, e.target.value)}>
                <option value="">—</option>
                {rolls.map((r, i) => <option key={r.id} value={r.id}>{r.total} (#{i + 1})</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
      <span className="small muted">These are base scores; racial and other bonuses are added separately below.</span>
    </div>
  );
}
