// Quick-roll helpers bound to the app store.
import { useApp } from '@/state/store';
import { rollD20, rollExpression, type AdvMode, type RollResult } from '@/dice/dice';
import type { Breakdown } from '@/engine/derive';
import { signed } from '@/types/core';
import { useCharacterId } from '@/ui/ruleset';

/** "+5", "+5 +1d4", "+3 −1d4" — includes situational dice that are rolled automatically. */
export function fmtBonus(b: Breakdown | { total: number; parts?: { dice?: string }[] }): string {
  const dice = (b.parts ?? []).filter((p) => p.dice).map((p) => (p.dice!.startsWith('-') ? ` −${p.dice!.slice(1)}` : ` +${p.dice}`)).join('');
  return `${signed(b.total)}${dice}`;
}

export function useRoller() {
  const addRoll = useApp((s) => s.addRoll);
  const toast = useApp((s) => s.toast);
  const prefs = useApp((s) => s.prefs);
  const charId = useCharacterId();
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
      if (typeof b !== 'number') {
        // Situational dice from active effects (Bless +1d4, Bane −1d4, Bardic Inspiration…), rolled with the test.
        const used: string[] = [];
        for (const p of b.parts.filter((x) => x.dice)) {
          const neg = p.dice!.startsWith('-');
          const extra = rollExpression(neg ? p.dice!.slice(1) : p.dice!, { label: p.label });
          for (const t of extra.terms) { t.term.sign = neg ? -1 : 1; t.subtotal = neg ? -Math.abs(t.subtotal) : t.subtotal; t.term.label = p.label; r.terms.push(t); }
          r.total += neg ? -extra.total : extra.total;
          r.notes = [...(r.notes ?? []), `${p.label}: ${neg ? '−' : '+'}${extra.total} (${p.dice})`];
          if (p.source?.kind === 'temp') used.push(p.source.id);
        }
        if (used.length && charId) {
          const ch = useApp.getState().characters[charId];
          const spent = ch?.effects.filter((e) => e.oneShot && used.includes(e.id)) ?? [];
          if (spent.length) {
            useApp.getState().update(charId, (c) => { c.effects = c.effects.filter((e) => !spent.some((x) => x.id === e.id)); });
            r.notes = [...(r.notes ?? []), `Used up: ${spent.map((e) => e.name).join(', ')}`];
          }
        }
        if (b.conditional.length) r.notes = [...(r.notes ?? []), `Situational: ${b.conditional.map((c) => `${c.label} (${c.condition})`).join('; ')}`];
      }
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
    <button className={`small ${className}`} title={`Roll ${label} (${fmtBonus(b)})${b.mode !== 'normal' ? ` with ${b.mode}` : ''}`} onClick={(e) => { e.stopPropagation(); roller.d20(label, b, kind, opts); }}>
      {children ?? fmtBonus(b)}
    </button>
  );
}
