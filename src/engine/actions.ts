// State transitions for play: damage, healing, rests, resources, death saves, slots.
// All functions are pure: they return a new Character (structuredClone) and never mutate input.

import type { Character, InventoryItem } from '@/types/character';
import type { Derived } from './derive';
import { rollExpression, rollD20, type Rng, cryptoRng, type RollResult } from '@/dice/dice';
import type { Recharge } from '@/types/core';

const clone = <T>(x: T): T => structuredClone(x);

export interface DamageResult { character: Character; absorbedByTemp: number; taken: number; droppedToZero: boolean; instantDeath: boolean; notes: string[] }

/**
 * Apply damage: resistances/vulnerabilities/immunities optionally applied by type,
 * temp HP absorbs first, then current HP. At 0 HP: unconscious; massive damage → instant death.
 */
export function applyDamage(ch: Character, d: Derived, amount: number, type?: string, opts: { critical?: boolean } = {}): DamageResult {
  const c = clone(ch);
  const notes: string[] = [];
  let dmg = Math.max(0, Math.floor(amount));
  if (type) {
    const t = type.toLowerCase();
    if (d.immunities.some((i) => i.type === t)) { notes.push(`Immune to ${t}.`); dmg = 0; }
    else {
      const resisted = d.resistances.some((r) => !r.conditional && (r.type === t || r.type === 'all damage'));
      const vulnerable = d.vulnerabilities.some((v) => v.type === t);
      const dr = d.damageReduction.reduce((s, p) => s + p.value, 0);
      if (dr > 0) { dmg = Math.max(0, dmg - dr); notes.push(`Reduced by ${dr}.`); }
      if (resisted) { dmg = Math.floor(dmg / 2); notes.push(`Resistant to ${t} (halved).`); }
      if (vulnerable) { dmg = dmg * 2; notes.push(`Vulnerable to ${t} (doubled).`); }
    }
  }
  let absorbed = 0;
  if (c.combat.hpTemp > 0) {
    absorbed = Math.min(c.combat.hpTemp, dmg);
    c.combat.hpTemp -= absorbed;
    dmg -= absorbed;
  }
  const before = Math.min(c.combat.hpCurrent, d.hp.max);
  let instantDeath = false;
  let droppedToZero = false;
  if (before <= 0 && dmg > 0) {
    // Damage at 0 HP → death save failure (2 if critical); massive damage → death
    if (dmg >= d.hp.max) { instantDeath = true; c.combat.deathSaves.failures = 3; }
    else c.combat.deathSaves.failures = Math.min(3, c.combat.deathSaves.failures + (opts.critical ? 2 : 1));
    c.combat.stable = false;
    notes.push('Damage while at 0 HP causes a death save failure.');
  } else {
    const after = before - dmg;
    if (after <= 0) {
      droppedToZero = true;
      if (-after >= d.hp.max) { instantDeath = true; notes.push('Massive damage: remaining damage ≥ HP maximum → instant death.'); c.combat.deathSaves.failures = 3; }
      c.combat.hpCurrent = 0;
      if (!c.combat.conditions.includes('unconscious')) c.combat.conditions.push('unconscious');
      c.combat.stable = false;
    } else c.combat.hpCurrent = after;
  }
  // Concentration reminder
  if (dmg + absorbed > 0 && c.combat.concentration) notes.push(`Concentration check: DC ${Math.max(10, Math.floor((dmg + absorbed) / 2))} CON save.`);
  return { character: c, absorbedByTemp: absorbed, taken: dmg, droppedToZero, instantDeath, notes };
}

export function applyHealing(ch: Character, d: Derived, amount: number): Character {
  const c = clone(ch);
  const n = Math.max(0, Math.floor(amount));
  if (n <= 0) return c;
  const wasZero = c.combat.hpCurrent <= 0;
  c.combat.hpCurrent = Math.min(d.hp.max, Math.max(0, c.combat.hpCurrent) + n);
  if (wasZero && c.combat.hpCurrent > 0) {
    c.combat.deathSaves = { successes: 0, failures: 0 };
    c.combat.stable = false;
    c.combat.conditions = c.combat.conditions.filter((x) => x !== 'unconscious');
  }
  return c;
}

/** Temp HP doesn't stack: keep the higher value (PHB p.198). */
export function setTempHp(ch: Character, amount: number, replace = false): Character {
  const c = clone(ch);
  const n = Math.max(0, Math.floor(amount));
  c.combat.hpTemp = replace ? n : Math.max(c.combat.hpTemp, n);
  return c;
}

export interface DeathSaveOutcome { character: Character; roll: RollResult; result: 'success' | 'failure' | 'crit-success' | 'crit-fail'; status: 'stable' | 'dead' | 'revived' | 'dying' }

export function rollDeathSave(ch: Character, rng: Rng = cryptoRng, modifier = 0): DeathSaveOutcome {
  const c = clone(ch);
  const roll = rollD20(modifier, { label: 'Death saving throw', kind: 'death-save', rng });
  const nat = roll.natural!;
  let result: DeathSaveOutcome['result'];
  let status: DeathSaveOutcome['status'] = 'dying';
  if (nat === 20) {
    result = 'crit-success';
    c.combat.hpCurrent = 1;
    c.combat.deathSaves = { successes: 0, failures: 0 };
    c.combat.conditions = c.combat.conditions.filter((x) => x !== 'unconscious');
    status = 'revived';
  } else if (nat === 1) {
    result = 'crit-fail';
    c.combat.deathSaves.failures = Math.min(3, c.combat.deathSaves.failures + 2);
  } else if (roll.total >= 10) {
    result = 'success';
    c.combat.deathSaves.successes = Math.min(3, c.combat.deathSaves.successes + 1);
  } else {
    result = 'failure';
    c.combat.deathSaves.failures = Math.min(3, c.combat.deathSaves.failures + 1);
  }
  if (status !== 'revived') {
    if (c.combat.deathSaves.failures >= 3) status = 'dead';
    else if (c.combat.deathSaves.successes >= 3) { status = 'stable'; c.combat.stable = true; }
  }
  return { character: c, roll, result, status };
}

export function spendHitDie(ch: Character, d: Derived, die: number, rng: Rng = cryptoRng, rollValue?: number): { character: Character; roll?: RollResult; healed: number } {
  const entry = d.hitDice.find((h) => h.die === die);
  if (!entry || entry.used >= entry.total) return { character: ch, healed: 0 };
  let c = clone(ch);
  c.combat.hitDiceUsed[String(die)] = (c.combat.hitDiceUsed[String(die)] ?? 0) + 1;
  const con = d.abilities.con.mod;
  let roll: RollResult | undefined;
  let value: number;
  if (rollValue !== undefined) value = rollValue;
  else { roll = rollExpression(`1d${die}`, { label: `Hit Die (d${die})`, kind: 'hit-die', rng }); value = roll.total; }
  const healed = Math.max(0, value + con);
  c = applyHealing(c, d, healed);
  return { character: c, roll, healed };
}

function resetResources(c: Character, d: Derived, recharges: Recharge[]) {
  for (const r of d.resources) {
    if (recharges.includes(r.recharge)) {
      if (c.resources[r.id]) c.resources[r.id].used = 0;
    }
  }
}

export interface RestSummary { restored: string[] }

/** Short rest: resources with short-rest recovery, Pact Magic slots. HP via hit dice separately. */
export function shortRest(ch: Character, d: Derived): { character: Character; summary: RestSummary } {
  const c = clone(ch);
  const restored: string[] = [];
  for (const r of d.resources) if (r.recharge === 'short' && r.used > 0) restored.push(r.name);
  resetResources(c, d, ['short']);
  if (c.spells.pactSlotsUsed > 0) { restored.push('Pact Magic slots'); c.spells.pactSlotsUsed = 0; }
  // Innate per-short-rest spells stored on entries
  for (const e of c.spells.entries) if (e.uses && e.uses.recharge === 'short' && e.uses.used > 0) { e.uses.used = 0; restored.push(e.spellId); }
  for (const it of c.inventory) rechargeItem(it, 'short', restored);
  return { character: c, summary: { restored } };
}

/**
 * Long rest (PHB p.186): regain all HP, regain spent Hit Dice up to half total (min 1),
 * all short/long-rest resources and spell slots, reduce exhaustion by 1, reset death saves.
 * `dawn` additionally recharges "at dawn" features and items (enabled by default).
 */
export function longRest(ch: Character, d: Derived, opts: { dawn?: boolean; rng?: Rng } = {}): { character: Character; summary: RestSummary } {
  const c = clone(ch);
  const restored: string[] = [];
  const dawn = opts.dawn ?? true;
  if (c.combat.hpCurrent < d.hp.max) restored.push('Hit points');
  c.combat.hpCurrent = d.hp.max;
  c.combat.hpTemp = 0;
  c.combat.deathSaves = { successes: 0, failures: 0 };
  c.combat.stable = false;
  c.combat.conditions = c.combat.conditions.filter((x) => x !== 'unconscious');
  const totalDice = d.hitDice.reduce((s, h) => s + h.total, 0);
  let regain = Math.max(1, Math.floor(totalDice / 2));
  // Restore larger dice first (player-favourable, common table practice)
  for (const h of [...d.hitDice].sort((a, b) => b.die - a.die)) {
    const used = c.combat.hitDiceUsed[String(h.die)] ?? 0;
    const back = Math.min(used, regain);
    if (back > 0) { c.combat.hitDiceUsed[String(h.die)] = used - back; regain -= back; restored.push(`${back} × d${h.die} Hit Dice`); }
  }
  if (c.combat.exhaustion > 0) { c.combat.exhaustion -= 1; restored.push('1 level of exhaustion'); }
  for (const r of d.resources) if ((r.recharge === 'short' || r.recharge === 'long' || (dawn && r.recharge === 'dawn')) && r.used > 0) restored.push(r.name);
  resetResources(c, d, dawn ? ['short', 'long', 'dawn'] : ['short', 'long']);
  if (c.spells.slotsUsed.some((x) => x > 0)) restored.push('Spell slots');
  c.spells.slotsUsed = c.spells.slotsUsed.map(() => 0);
  c.spells.pactSlotsUsed = 0;
  for (const e of c.spells.entries) if (e.uses && e.uses.used > 0 && (e.uses.recharge !== 'dawn' || dawn)) { e.uses.used = 0; }
  for (const it of c.inventory) { rechargeItem(it, 'long', restored, opts.rng); if (dawn) rechargeItem(it, 'dawn', restored, opts.rng); }
  // Ending toggles that end on rest (rage etc. last 1 minute anyway)
  c.combat.toggles = Object.fromEntries(Object.entries(c.combat.toggles).filter(([, v]) => v === true).map(([k]) => [k, false]));
  return { character: c, summary: { restored } };
}

/** Recharge item charges. For dawn items with `rechargeAmount` (e.g. "1d6+1"), rolls the amount. */
export function rechargeItem(it: InventoryItem, when: Recharge, restored: string[] = [], rng: Rng = cryptoRng) {
  const ch = it.item.charges;
  if (!ch || ch.recharge !== when) return;
  const cur = it.charges ?? ch.max;
  if (cur >= ch.max) return;
  let gain = ch.max - cur;
  if (ch.rechargeAmount) {
    try { gain = rollExpression(ch.rechargeAmount, { rng }).total; } catch { gain = ch.max - cur; }
  }
  it.charges = Math.min(ch.max, cur + gain);
  restored.push(`${it.item.name} (+${it.charges - cur} charges)`);
}

export function useResource(ch: Character, id: string, amount = 1, max?: number): Character {
  const c = clone(ch);
  const st = c.resources[id] ?? { used: 0 };
  st.used = Math.max(0, st.used + amount);
  if (max !== undefined) st.used = Math.min(max, st.used);
  c.resources[id] = st;
  return c;
}

export function setSlotUsed(ch: Character, level: number, used: number, pact = false): Character {
  const c = clone(ch);
  if (pact) c.spells.pactSlotsUsed = Math.max(0, used);
  else { const arr = [...c.spells.slotsUsed]; while (arr.length < 10) arr.push(0); arr[level] = Math.max(0, used); c.spells.slotsUsed = arr; }
  return c;
}

/**
 * Arcane Recovery (Wizard): once per day on a short rest, recover slots with combined level ≤ ceil(wizardLevel/2), none 6th+.
 * Returns null if the selection is invalid.
 */
export function arcaneRecovery(ch: Character, wizardLevel: number, levels: number[]): Character | null {
  const budget = Math.ceil(wizardLevel / 2);
  const sum = levels.reduce((a, b) => a + b, 0);
  if (sum > budget || levels.some((l) => l >= 6 || l < 1)) return null;
  const c = clone(ch);
  for (const l of levels) {
    if ((c.spells.slotsUsed[l] ?? 0) <= 0) return null;
    c.spells.slotsUsed[l] -= 1;
  }
  return c;
}

/** Font of Magic: convert a slot into sorcery points (= slot level) or points into a slot. */
export const FLEX_CAST_COST: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };

export function useConsumable(ch: Character, instanceId: string): Character {
  const c = clone(ch);
  const it = c.inventory.find((i) => i.id === instanceId);
  if (!it) return c;
  if (it.item.charges && (it.charges ?? it.item.charges.max) > 0 && !it.item.consumable?.destroyOnUse) {
    it.charges = (it.charges ?? it.item.charges.max) - 1;
    return c;
  }
  it.quantity -= 1;
  if (it.quantity <= 0) c.inventory = c.inventory.filter((i) => i.id !== instanceId);
  return c;
}
