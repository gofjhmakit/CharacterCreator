// Quick-roll helpers bound to the app store.
import { useApp } from '@/state/store';
import { rollD20, rollExpression, type AdvMode, type RollResult } from '@/dice/dice';
import type { Breakdown } from '@/engine/derive';
import { signed } from '@/types/core';

export function useRoller() {
  const addRoll = useApp((s) => s.addRoll);
  const toast = useApp((s) => s.toast);
  const prefs = useApp((s) => s.prefs);
  const announce = (r: RollResult) => {
    addRoll(r);
    if (prefs.showRollToasts) toast({ kind: 'roll', text: `${r.label}: ${r.total}`, detail: describeRoll(r) }, 3500);
    return r;
  };
  return {
    d20(label: string, b: Breakdown | number, kind: RollResult['kind'] = 'check', opts: { mode?: AdvMode; critRange?: number; halflingLucky?: boolean; minRoll?: number } = {}) {
      const mod = typeof b === 'number' ? b : b.total;
      const mode = opts.mode ?? (typeof b !== 'number' && prefs.autoAdvantage ? b.mode : 'normal');
      const r = rollD20(mod, { label, kind, mode, critRange: opts.critRange, halflingLucky: opts.halflingLucky });
      if (opts.minRoll && r.natural! < opts.minRoll) {
        r.notes = [...(r.notes ?? []), `Natural ${r.natural} treated as ${opts.minRoll} (e.g. Reliable Talent)`];
        r.total += opts.minRoll - r.natural!;
      }
      if (typeof b !== 'number' && b.conditional.length) r.notes = [...(r.notes ?? []), `Situational: ${b.conditional.map((c) => `${c.label} (${c.condition})`).join('; ')}`];
      return announce(r);
    },
    expr(label: string, expression: string, kind: RollResult['kind'] = 'custom', critical = false) {
      try {
        return announce(rollExpression(expression, { label, kind, critical }));
      } catch (e) {
        toast({ kind: 'error', text: (e as Error).message });
        return null;
      }
    },
  };
}

export function describeRoll(r: RollResult): string {
  const parts = r.terms.map((t) => {
    if (t.term.kind === 'const') return `${t.term.sign < 0 ? '−' : '+'} ${t.term.value}`;
    const faces = t.rolls.map((v, i) => (t.dropped.includes(i) ? `~${v}~` : String(v))).join(', ');
    return `${t.term.sign < 0 ? '−' : ''}${r.critical && r.kind !== 'attack' && r.kind !== 'check' ? t.term.count * 2 : t.term.count}d${t.term.sides} [${faces}]`;
  });
  const mode = r.mode !== 'normal' ? ` (${r.mode})` : '';
  const crit = r.kind === 'attack' && r.critical ? ' — CRITICAL HIT' : r.kind === 'attack' && r.fumble ? ' — natural 1' : '';
  return `${parts.join(' ')}${mode}${crit}`;
}

export function RollBtn({ label, b, kind = 'check', className = '', children, opts }: { label: string; b: Breakdown; kind?: RollResult['kind']; className?: string; children?: React.ReactNode; opts?: Parameters<ReturnType<typeof useRoller>['d20']>[3] }) {
  const roller = useRoller();
  return (
    <button className={`small ${className}`} title={`Roll ${label} (${signed(b.total)})${b.mode !== 'normal' ? ` with ${b.mode}` : ''}`} onClick={(e) => { e.stopPropagation(); roller.d20(label, b, kind, opts); }}>
      {children ?? signed(b.total)}
    </button>
  );
}
