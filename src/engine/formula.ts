// Safe arithmetic formula evaluator. NO eval / Function. Used by content data and custom effects.
// Grammar: expr := term (('+'|'-') term)* ; term := factor (('*'|'/') factor)* ;
// factor := number | ident | ident '(' args ')' | '(' expr ')' | '-' factor

import type { Formula } from '@/types/content';

export type FormulaVars = Record<string, number>;

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const n = Number(src.slice(i, j));
      if (Number.isNaN(n)) throw new FormulaError(`Bad number "${src.slice(i, j)}"`);
      out.push({ t: 'num', v: n });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z_0-9]/.test(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    if ('+-*/(),'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new FormulaError(`Unexpected character "${c}"`);
  }
  return out;
}

export class FormulaError extends Error {}

const FUNCS: Record<string, (args: number[]) => number> = {
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  floor: (a) => Math.floor(a[0]),
  ceil: (a) => Math.ceil(a[0]),
  round: (a) => Math.round(a[0]),
  abs: (a) => Math.abs(a[0]),
  // steps(x, l1, v1, l2, v2, ...) → value of the highest threshold li <= x (0 if none)
  steps: (a) => {
    const [x, ...rest] = a;
    let v = 0;
    for (let i = 0; i + 1 < rest.length; i += 2) if (x >= rest[i]) v = rest[i + 1];
    return v;
  },
};

export function evalFormula(f: Formula | undefined, vars: FormulaVars): number {
  if (f === undefined || f === null) return 0;
  if (typeof f === 'number') return f;
  const toks = tokenize(f);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const expect = (v: string) => {
    const t = next();
    if (!t || t.t !== 'op' || t.v !== v) throw new FormulaError(`Expected "${v}" in "${f}"`);
  };
  function expr(): number {
    let v = term();
    for (;;) {
      const t = peek();
      if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) { next(); const r = term(); v = t.v === '+' ? v + r : v - r; } else return v;
    }
  }
  function term(): number {
    let v = factor();
    for (;;) {
      const t = peek();
      if (t && t.t === 'op' && (t.v === '*' || t.v === '/')) {
        next();
        const r = factor();
        v = t.v === '*' ? v * r : r === 0 ? 0 : v / r;
      } else return v;
    }
  }
  function factor(): number {
    const t = next();
    if (!t) throw new FormulaError(`Unexpected end of "${f}"`);
    if (t.t === 'num') return t.v;
    if (t.t === 'op' && t.v === '-') return -factor();
    if (t.t === 'op' && t.v === '(') { const v = expr(); expect(')'); return v; }
    if (t.t === 'id') {
      const nx = peek();
      if (nx && nx.t === 'op' && nx.v === '(') {
        next();
        const fn = Object.prototype.hasOwnProperty.call(FUNCS, t.v) ? FUNCS[t.v] : undefined;
        if (!fn) throw new FormulaError(`Unknown function "${t.v}"`);
        const args: number[] = [];
        if (!(peek()?.t === 'op' && peek()!.v === ')')) {
          args.push(expr());
          while (peek()?.t === 'op' && peek()!.v === ',') { next(); args.push(expr()); }
        }
        expect(')');
        return fn(args);
      }
      if (!Object.prototype.hasOwnProperty.call(vars, t.v)) throw new FormulaError(`Unknown variable "${t.v}"`);
      return vars[t.v];
    }
    throw new FormulaError(`Unexpected token in "${f}"`);
  }
  const v = expr();
  if (p !== toks.length) throw new FormulaError(`Trailing input in "${f}"`);
  return v;
}

/** Evaluate, returning fallback (and not throwing) on malformed formulas. */
export function safeFormula(f: Formula | undefined, vars: FormulaVars, fallback = 0): number {
  try {
    const v = evalFormula(f, vars);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function validateFormula(f: Formula, knownVars: string[]): string | null {
  if (typeof f === 'number') return null;
  try {
    const vars: FormulaVars = {};
    for (const k of knownVars) vars[k] = 1;
    evalFormula(f, vars);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

export const FORMULA_VARS = ['lvl', 'cl', 'prof', 'str', 'dex', 'con', 'int', 'wis', 'cha',
  'score_str', 'score_dex', 'score_con', 'score_int', 'score_wis', 'score_cha'];
