// Dice notation parsing and rolling. RNG is injectable for deterministic tests.

export type Rng = () => number; // returns [0, 1)

export const cryptoRng: Rng = () => {
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const a = new Uint32Array(1);
    c.getRandomValues(a);
    return a[0] / 4294967296;
  }
  return Math.random();
};

export const rollDie = (sides: number, rng: Rng = cryptoRng): number => 1 + Math.floor(rng() * sides);

export interface DiceTerm { kind: 'dice'; count: number; sides: number; sign: 1 | -1; label?: string }
export interface ConstTerm { kind: 'const'; value: number; sign: 1 | -1; label?: string }
export type Term = DiceTerm | ConstTerm;

export const VALID_DICE = [4, 6, 8, 10, 12, 20, 100];

/** Parse "2d6 + 1d4 - 1 + 3". Supports d% for d100. Throws on malformed input. */
export function parseDice(expr: string): Term[] {
  const s = expr.replace(/\s+/g, '').toLowerCase().replace(/d%/g, 'd100');
  if (!s) return [];
  const terms: Term[] = [];
  const re = /([+-]?)(\d*d\d+|\d+)/gy;
  let m: RegExpExecArray | null;
  let consumed = 0;
  while ((m = re.exec(s))) {
    if (m[0] === '') break;
    if (consumed > 0 && !m[1]) throw new Error(`Invalid dice expression: ${expr}`);
    consumed = re.lastIndex;
    const sign: 1 | -1 = m[1] === '-' ? -1 : 1;
    const body = m[2];
    if (body.includes('d')) {
      const [c, sd] = body.split('d');
      const count = c === '' ? 1 : Number(c);
      const sides = Number(sd);
      if (count < 1 || count > 200 || sides < 1 || sides > 1000) throw new Error(`Dice out of range: ${body}`);
      terms.push({ kind: 'dice', count, sides, sign });
    } else {
      terms.push({ kind: 'const', value: Number(body), sign });
    }
  }
  if (consumed !== s.length) throw new Error(`Invalid dice expression: ${expr}`);
  return terms;
}

export function isValidDice(expr: string): boolean {
  try { return parseDice(expr).length > 0; } catch { return false; }
}

export interface RolledTerm {
  term: Term;
  rolls: number[];
  /** Indices of dice not counted (advantage/disadvantage, drop lowest). */
  dropped: number[];
  subtotal: number;
}

export interface RollResult {
  id: string;
  label: string;
  expression: string;
  kind: 'check' | 'save' | 'attack' | 'damage' | 'custom' | 'initiative' | 'death-save' | 'hit-die' | 'healing';
  mode: 'normal' | 'advantage' | 'disadvantage';
  terms: RolledTerm[];
  total: number;
  /** For d20 rolls */
  natural?: number;
  critical?: boolean;
  fumble?: boolean;
  notes?: string[];
  time: number;
}

export type AdvMode = 'normal' | 'advantage' | 'disadvantage';

/**
 * Resolve advantage/disadvantage per PHB: any number of advantage sources and any number of
 * disadvantage sources cancel out completely if both are present; they never stack.
 */
export function resolveAdvantage(advSources: number, disSources: number): AdvMode {
  if (advSources > 0 && disSources > 0) return 'normal';
  if (advSources > 0) return 'advantage';
  if (disSources > 0) return 'disadvantage';
  return 'normal';
}

let rollCounter = 0;
const rid = () => `r${Date.now().toString(36)}${(rollCounter++).toString(36)}`;

/** Roll an arbitrary expression. `critical` doubles the number of dice rolled (5e crit rule). */
export function rollExpression(
  expr: string,
  opts: { label?: string; kind?: RollResult['kind']; critical?: boolean; rng?: Rng } = {},
): RollResult {
  const rng = opts.rng ?? cryptoRng;
  const terms = parseDice(expr);
  const rolled: RolledTerm[] = terms.map((t) => {
    if (t.kind === 'const') return { term: t, rolls: [], dropped: [], subtotal: t.sign * t.value };
    const n = opts.critical ? t.count * 2 : t.count;
    const rolls = Array.from({ length: n }, () => rollDie(t.sides, rng));
    return { term: t, rolls, dropped: [], subtotal: t.sign * rolls.reduce((a, b) => a + b, 0) };
  });
  return {
    id: rid(),
    label: opts.label ?? expr,
    expression: expr,
    kind: opts.kind ?? 'custom',
    mode: 'normal',
    terms: rolled,
    total: rolled.reduce((a, r) => a + r.subtotal, 0),
    critical: opts.critical,
    time: Date.now(),
  };
}

/** Roll a d20 test (check, save, attack) with modifier and advantage mode. */
export function rollD20(
  modifier: number,
  opts: { label?: string; kind?: RollResult['kind']; mode?: AdvMode; critRange?: number; rng?: Rng; halflingLucky?: boolean } = {},
): RollResult {
  const rng = opts.rng ?? cryptoRng;
  const mode = opts.mode ?? 'normal';
  const rerollOnes = (v: number) => (opts.halflingLucky && v === 1 ? rollDie(20, rng) : v);
  const a = rerollOnes(rollDie(20, rng));
  const rolls = [a];
  let keepIdx = 0;
  if (mode !== 'normal') {
    const b = rerollOnes(rollDie(20, rng));
    rolls.push(b);
    if (mode === 'advantage') keepIdx = b > a ? 1 : 0;
    else keepIdx = b < a ? 1 : 0;
  }
  const natural = rolls[keepIdx];
  const dTerm: DiceTerm = { kind: 'dice', count: 1, sides: 20, sign: 1 };
  const terms: RolledTerm[] = [
    { term: dTerm, rolls, dropped: rolls.length > 1 ? [1 - keepIdx] : [], subtotal: natural },
  ];
  if (modifier !== 0) terms.push({ term: { kind: 'const', value: Math.abs(modifier), sign: modifier < 0 ? -1 : 1 }, rolls: [], dropped: [], subtotal: modifier });
  const critRange = opts.critRange ?? 20;
  const isAttack = (opts.kind ?? 'check') === 'attack';
  return {
    id: rid(),
    label: opts.label ?? 'd20',
    expression: `1d20${modifier >= 0 ? '+' : ''}${modifier}`,
    kind: opts.kind ?? 'check',
    mode,
    terms,
    total: natural + modifier,
    natural,
    critical: isAttack ? natural >= critRange : natural === 20,
    fumble: natural === 1,
    time: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Ability score generation
// ---------------------------------------------------------------------------

export interface GeneratedScore { dice: number[]; dropped?: number; total: number }

export function roll3d6(rng: Rng = cryptoRng): GeneratedScore {
  const dice = [rollDie(6, rng), rollDie(6, rng), rollDie(6, rng)];
  return { dice, total: dice[0] + dice[1] + dice[2] };
}

export function roll4d6DropLowest(rng: Rng = cryptoRng): GeneratedScore {
  const dice = [rollDie(6, rng), rollDie(6, rng), rollDie(6, rng), rollDie(6, rng)];
  let low = 0;
  for (let i = 1; i < 4; i++) if (dice[i] < dice[low]) low = i;
  const total = dice.reduce((a, b, i) => (i === low ? a : a + b), 0);
  return { dice, dropped: low, total };
}

export function averageOfDie(sides: number): number {
  // 5e fixed HP value = (die/2)+1
  return Math.floor(sides / 2) + 1;
}

/** Deterministic seeded RNG (mulberry32) — used in tests and for reproducible demos. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds a deterministic RNG that returns the given die faces for a given die size sequence. */
export function scriptedRng(values: number[], sides: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i];
    const s = sides[Math.min(i, sides.length - 1)];
    i++;
    return (v - 1 + 0.5) / s;
  };
}
