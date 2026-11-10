// Structural validation + normalization of character data (after migration).
// Strategy: fill missing fields from defaults, reject wrong types for critical fields,
// and keep unknown top-level fields in `extra` (never silently discard data).

import type { Character } from '@/types/character';
import { newCharacter } from '@/engine/factory';
import { ABILITIES, CONDITION_IDS } from '@/types/core';
import { validateItem } from '@/content/validate';

export interface ValidationResult { ok: boolean; errors: string[]; warnings: string[]; character?: Character }

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const isObj = (x: unknown): x is Raw => !!x && typeof x === 'object' && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

const KNOWN_KEYS = new Set(Object.keys(newCharacter()));

/** Deep-merge defaults into raw for plain objects; arrays and primitives from raw win if type matches. */
function mergeDefaults(def: unknown, raw: unknown, path: string, warnings: string[]): unknown {
  if (raw === undefined || raw === null) return def;
  if (Array.isArray(def)) {
    if (!Array.isArray(raw)) { warnings.push(`${path}: expected a list; reset to default.`); return def; }
    return raw;
  }
  if (isObj(def)) {
    if (!isObj(raw)) { warnings.push(`${path}: expected an object; reset to default.`); return def; }
    const out: Raw = { ...raw };
    for (const [k, v] of Object.entries(def)) out[k] = mergeDefaults(v, raw[k], `${path}.${k}`, warnings);
    return out;
  }
  if (typeof def !== typeof raw && def !== undefined) { warnings.push(`${path}: wrong type; reset to default.`); return def; }
  return raw;
}

export function validateCharacter(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ['Character data is not an object.'], warnings };
  if (!isStr(raw.id) || !raw.id) errors.push('Missing character id.');
  if (!isObj(raw.identity)) errors.push('Missing identity section.');
  if (raw.classes !== undefined && !Array.isArray(raw.classes)) errors.push('classes must be a list.');
  if (raw.abilities !== undefined) {
    if (!isObj(raw.abilities) || !isObj(raw.abilities.base)) errors.push('abilities.base is missing or invalid.');
    else for (const a of ABILITIES) if (raw.abilities.base[a] !== undefined && !isNum(raw.abilities.base[a])) errors.push(`Ability ${a} must be a number (got ${JSON.stringify(raw.abilities.base[a])}).`);
  }
  if (errors.length) return { ok: false, errors, warnings };

  const defaults = newCharacter({ id: raw.id });
  const merged = mergeDefaults(defaults, raw, 'character', warnings) as Raw;

  // Classes
  merged.classes = (merged.classes as unknown[]).filter((c, i) => {
    const ok = isObj(c) && isStr(c.classId) && isNum(c.level) && c.level >= 1 && c.level <= 20;
    if (!ok) warnings.push(`classes[${i}] is invalid and was removed.`);
    return ok;
  }).map((c) => ({ ...(c as Raw), hpRolls: Array.isArray((c as Raw).hpRolls) ? (c as Raw).hpRolls.map((x: unknown) => (isNum(x) ? x : null)) : [] }));
  const total = (merged.classes as Raw[]).reduce((s, c) => s + c.level, 0);
  if (total > 20) errors.push(`Total character level ${total} exceeds 20.`);

  // Abilities
  for (const a of ABILITIES) {
    const v = merged.abilities.base[a];
    if (!isNum(v) || v < 1 || v > 30) { errors.push(`Ability ${a} must be a number between 1 and 30.`); }
  }
  // Conditions
  merged.combat.conditions = (merged.combat.conditions as unknown[]).filter((c) => {
    const ok = (CONDITION_IDS as readonly string[]).includes(c as string);
    if (!ok) warnings.push(`Unknown condition "${String(c)}" removed.`);
    return ok;
  });
  if (!isNum(merged.combat.exhaustion) || merged.combat.exhaustion < 0 || merged.combat.exhaustion > 6) { warnings.push('Exhaustion out of range; reset to 0.'); merged.combat.exhaustion = 0; }
  // Choices: values must be string arrays
  for (const [k, v] of Object.entries(merged.choices as Raw)) {
    if (!Array.isArray(v) || !v.every(isStr)) { warnings.push(`Choice "${k}" invalid and removed.`); delete (merged.choices as Raw)[k]; }
  }
  // Inventory
  merged.inventory = (merged.inventory as unknown[]).filter((it, i) => {
    if (!isObj(it) || !isStr(it.id) || !isObj(it.item)) { warnings.push(`inventory[${i}] is invalid and was removed.`); return false; }
    const issues = validateItem({ effects: [], ...(it.item as Raw) } as never).filter((x) => x.level === 'error');
    if (issues.length) { warnings.push(`inventory item "${(it.item as Raw).name ?? i}": ${issues.map((x) => x.message).join('; ')}`); }
    if (!isNum(it.quantity) || it.quantity < 0) (it as Raw).quantity = 1;
    (it as Raw).item = { effects: [], tags: [], aliases: [], ...(it.item as Raw) };
    if (!isObj(it.origin)) (it as Raw).origin = { kind: 'manual' };
    return true;
  });
  // Spells
  merged.spells.entries = (merged.spells.entries as unknown[]).filter((e, i) => {
    const ok = isObj(e) && isStr(e.id) && isStr(e.spellId);
    if (!ok) warnings.push(`spells.entries[${i}] invalid and removed.`);
    return ok;
  });
  while (merged.spells.slotsUsed.length < 10) merged.spells.slotsUsed.push(0);
  // Notes: ensure categories exist
  for (const [k, v] of Object.entries(defaults.notes)) if (merged.notes[k] === undefined) merged.notes[k] = v;
  // Portrait size guard (data URL)
  if (merged.identity.portrait && (!isStr(merged.identity.portrait) || !merged.identity.portrait.startsWith('data:image/') || merged.identity.portrait.length > 1_500_000)) {
    warnings.push('Portrait image invalid or too large; removed.'); delete merged.identity.portrait;
  }
  // Preserve unknown top-level fields
  const extra: Raw = { ...(isObj(raw.extra) ? raw.extra : {}) };
  for (const k of Object.keys(merged)) if (!KNOWN_KEYS.has(k) && k !== 'extra' && k !== 'draft' && k !== 'wizardStep') { extra[k] = merged[k]; delete merged[k]; }
  if (Object.keys(extra).length) { merged.extra = extra; warnings.push(`Preserved ${Object.keys(extra).length} unknown field(s): ${Object.keys(extra).join(', ')}.`); }

  if (errors.length) return { ok: false, errors, warnings };
  return { ok: true, errors, warnings, character: merged as Character };
}
