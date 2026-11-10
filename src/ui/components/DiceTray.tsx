import { useState } from 'react';
import { useApp } from '@/state/store';
import { rollD20, rollExpression, VALID_DICE, type AdvMode, type RollResult } from '@/dice/dice';
import { IconD20 } from './icons';
import { describeRoll } from './roll';

function RollEntry({ r }: { r: RollResult }) {
  return (
    <div className="roll-entry">
      <div className="row between">
        <div className="grow">
          <div style={{ fontWeight: 700 }}>{r.label}</div>
          <div className="small muted">{r.expression}{r.mode !== 'normal' ? ` · ${r.mode}` : ''}{r.kind === 'attack' && r.critical ? <span className="crit"> · CRIT</span> : null}{r.natural === 1 && r.kind !== 'damage' ? <span className="fumble"> · nat 1</span> : null}</div>
        </div>
        <div className="total num">{r.total}</div>
      </div>
      <div className="row tight" style={{ marginTop: 4 }}>
        {r.terms.map((t, ti) => t.term.kind === 'dice'
          ? t.rolls.map((v, i) => <span key={`${ti}-${i}`} title={`d${(t.term as { sides: number }).sides}`} className={`die-face ${t.dropped.includes(i) ? 'dropped' : ''} ${v === (t.term as { sides: number }).sides ? 'max' : ''} ${v === 1 ? 'min' : ''}`}>{v}</span>)
          : <span key={ti} className="small muted">{t.term.sign < 0 ? '−' : '+'}{t.term.value}</span>)}
      </div>
      {r.notes?.map((n, i) => <div key={i} className="small muted">{n}</div>)}
    </div>
  );
}

export function DiceTray() {
  const open = useApp((s) => s.diceOpen);
  const setOpen = useApp((s) => s.setDiceOpen);
  const rolls = useApp((s) => s.rolls);
  const addRoll = useApp((s) => s.addRoll);
  const clear = useApp((s) => s.clearRolls);
  const toast = useApp((s) => s.toast);
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);
  const [mode, setMode] = useState<AdvMode>('normal');
  const [expr, setExpr] = useState('');

  const rollDie = (sides: number) => {
    if (sides === 20 && count === 1) addRoll(rollD20(mod, { label: `d20${mode !== 'normal' ? ` (${mode})` : ''}`, mode, kind: 'custom' }));
    else addRoll(rollExpression(`${count}d${sides}${mod ? (mod > 0 ? `+${mod}` : mod) : ''}`, { label: `${count}d${sides}${mod ? (mod > 0 ? ` + ${mod}` : ` − ${-mod}`) : ''}` }));
  };
  const rollExpr = () => {
    try { addRoll(rollExpression(expr, { label: expr })); } catch (e) { toast({ kind: 'error', text: (e as Error).message }); }
  };

  return (
    <>
      <button className="dice-fab" aria-label={open ? 'Close dice roller' : 'Open dice roller'} onClick={() => setOpen(!open)}><IconD20 /></button>
      {open && (
        <div className="dice-tray" role="dialog" aria-label="Dice roller">
          <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }} className="stack">
            <div className="row between"><h3>Dice</h3><button className="ghost small" onClick={() => setOpen(false)}>Close</button></div>
            <div className="dice-grid">{VALID_DICE.map((d) => <button key={d} onClick={() => rollDie(d)}>d{d}</button>)}</div>
            <div className="row">
              <label className="row tight small">Count <input type="number" className="num-sm" min={1} max={50} value={count} onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} /></label>
              <label className="row tight small">Mod <input type="number" className="num-sm" value={mod} onChange={(e) => setMod(Number(e.target.value) || 0)} /></label>
            </div>
            <div className="row">
              <span className="small muted">d20:</span>
              <div className="btn-group">
                <button className={`small toggle-adv ${mode === 'advantage' ? 'on' : ''}`} onClick={() => setMode(mode === 'advantage' ? 'normal' : 'advantage')}>Advantage</button>
                <button className={`small toggle-dis ${mode === 'disadvantage' ? 'on' : ''}`} onClick={() => setMode(mode === 'disadvantage' ? 'normal' : 'disadvantage')}>Disadvantage</button>
              </div>
            </div>
            <form className="row" onSubmit={(e) => { e.preventDefault(); rollExpr(); }}>
              <input className="grow" placeholder="e.g. 2d6+1d4+3" value={expr} onChange={(e) => setExpr(e.target.value)} aria-label="Dice expression" />
              <button className="primary" type="submit" disabled={!expr.trim()}>Roll</button>
            </form>
          </div>
          <div className="row between" style={{ padding: '6px 12px' }}><span className="caps">History</span>{rolls.length > 0 && <button className="ghost small" onClick={clear}>Clear</button>}</div>
          <div style={{ overflow: 'auto' }}>
            {rolls.length === 0 ? <div className="empty small">No rolls yet. Click any bonus on the sheet to roll it.</div> : rolls.map((r) => <RollEntry key={r.id} r={r} />)}
          </div>
        </div>
      )}
    </>
  );
}

export { describeRoll };
