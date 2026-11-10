// Content validation: checks structural integrity and cross-references of content definitions.
// Used by tests (bundled content) and on import of custom content / content packs.
import type { ContentDB } from './registry';
import type { ChoiceDef, Effect, FeatureDef, Grants, ItemDefinition, ModifierTarget, SpellDef } from '@/types/content';
import { validateFormula, FORMULA_VARS } from '@/engine/formula';
import { isValidDice } from '@/dice/dice';

export interface ContentIssue { level: 'error' | 'warning'; where: string; message: string }

const MOD_TARGET_RE = /^(ac|ac-formula|attack|damage|extra-damage|initiative|hp-max|hp-per-level|spell-attack|spell-dc|crit-range|damage-reduction|carry-multiplier|attunement-slots|check:all|save:all|speed:all|resistance:all-nonmagical-bps|prof:half-unproficient-checks|prof:half-unproficient-initiative|(ability|ability-set|ability-max|save|check):(str|dex|con|int|wis|cha)|(skill|passive|prof:skill|expertise:skill):[a-z-]+|prof:save:(str|dex|con|int|wis|cha)|speed:(walk|fly|swim|climb|burrow)|(resistance|immunity|vulnerability):[a-z]+|condition-immunity:[a-z]+|sense:.+|resource-max:.+|flag:.+)$/;

export function isValidModifierTarget(t: string): t is ModifierTarget {
  return MOD_TARGET_RE.test(t);
}

const DICE_TEMPLATE_RE = /\{[^}]*\}/g;

export function validateEffect(e: Effect, where: string, out: ContentIssue[]) {
  if (!e.id) out.push({ level: 'error', where, message: 'Effect without id' });
  for (const m of e.modifiers ?? []) {
    if (!isValidModifierTarget(m.target)) out.push({ level: 'error', where: `${where}/${e.id}`, message: `Unknown modifier target "${m.target}"` });
    if (m.formula !== undefined) {
      const err = validateFormula(m.formula, FORMULA_VARS);
      if (err) out.push({ level: 'error', where: `${where}/${e.id}`, message: `Bad formula "${m.formula}": ${err}` });
    }
    if (m.target === 'extra-damage' && typeof m.value === 'string' && !isValidDice(m.value)) out.push({ level: 'error', where: `${where}/${e.id}`, message: `Bad dice "${m.value}"` });
    if (m.dice !== undefined && !isValidDice(String(m.dice).replace(/^-/, ''))) out.push({ level: 'error', where: `${where}/${e.id}`, message: `Bad modifier dice "${m.dice}"` });
    if (m.target === 'ac-formula' && !m.acFormula) out.push({ level: 'error', where: `${where}/${e.id}`, message: 'ac-formula modifier without acFormula' });
  }
  for (const o of [...(e.outcomes ?? []), ...(e.save?.onFailure ?? []), ...(e.save?.onSuccess ?? [])]) {
    if (o.dice) {
      const plain = o.dice.replace(DICE_TEMPLATE_RE, '1');
      if (!isValidDice(plain)) out.push({ level: 'error', where: `${where}/${e.id}`, message: `Bad outcome dice "${o.dice}"` });
      for (const m of o.dice.match(DICE_TEMPLATE_RE) ?? []) {
        const err = validateFormula(m.slice(1, -1), FORMULA_VARS);
        if (err) out.push({ level: 'error', where: `${where}/${e.id}`, message: `Bad dice formula ${m}: ${err}` });
      }
    }
  }
}

function validateGrants(g: Grants | undefined, where: string, db: ContentDB, out: ContentIssue[]) {
  for (const s of g?.spells ?? []) if (!db.spells.has(s.spellId)) out.push({ level: 'warning', where, message: `Spell "${s.spellId}" not found` });
}

function validateChoices(cs: ChoiceDef[] | undefined, where: string, db: ContentDB, out: ContentIssue[]) {
  for (const c of cs ?? []) {
    const err = validateFormula(c.count, FORMULA_VARS);
    if (err) out.push({ level: 'error', where: `${where}:${c.id}`, message: `Bad count formula: ${err}` });
    if (c.pool && !db.pools.has(c.pool)) out.push({ level: 'error', where: `${where}:${c.id}`, message: `Pool "${c.pool}" not found` });
    if (c.kind === 'options' && !c.pool && !c.options?.length) out.push({ level: 'error', where: `${where}:${c.id}`, message: 'Options choice without options' });
    for (const o of c.options ?? []) {
      validateGrants(o.grants, `${where}:${c.id}:${o.id}`, db, out);
      for (const e of o.effects ?? []) validateEffect(e, `${where}:${c.id}:${o.id}`, out);
      for (const f of o.features ?? []) validateFeature(f, `${where}:${c.id}:${o.id}`, db, out);
    }
  }
}

export function validateFeature(f: FeatureDef, where: string, db: ContentDB, out: ContentIssue[]) {
  const w = `${where}/${f.id}`;
  if (!f.name) out.push({ level: 'error', where: w, message: 'Feature without name' });
  if (f.resource) {
    const err = validateFormula(f.resource.max, FORMULA_VARS);
    if (err) out.push({ level: 'error', where: w, message: `Bad resource max formula: ${err}` });
  }
  validateGrants(f.grants, w, db, out);
  for (const e of f.effects ?? []) validateEffect(e, w, out);
  validateChoices(f.choices, w, db, out);
}

export function validateItem(i: ItemDefinition, where = `item:${i.id}`): ContentIssue[] {
  const out: ContentIssue[] = [];
  if (!i.id || typeof i.id !== 'string') out.push({ level: 'error', where, message: 'Item without id' });
  if (!i.name) out.push({ level: 'error', where, message: 'Item without name' });
  if (typeof i.weight !== 'number' || i.weight < 0) out.push({ level: 'error', where, message: 'Invalid weight' });
  if (i.weapon && i.weapon.damage.dice !== '0' && !isValidDice(i.weapon.damage.dice)) out.push({ level: 'error', where, message: `Bad damage dice "${i.weapon.damage.dice}"` });
  if (i.weapon?.versatile && !isValidDice(i.weapon.versatile)) out.push({ level: 'error', where, message: `Bad versatile dice "${i.weapon.versatile}"` });
  for (const x of i.weapon?.extraDamage ?? []) if (!isValidDice(x.dice)) out.push({ level: 'error', where, message: `Bad extra damage dice "${x.dice}"` });
  if (i.armor && (typeof i.armor.baseAc !== 'number' || i.armor.baseAc < 0)) out.push({ level: 'error', where, message: 'Invalid base AC' });
  for (const e of i.effects ?? []) validateEffect(e, where, out);
  if (i.spells !== undefined && (!Array.isArray(i.spells) || i.spells.some((s) => !s || typeof s.spellId !== 'string' || !s.spellId))) out.push({ level: 'error', where, message: 'Invalid castable spell entry' });
  return out;
}

export function validateSpell(s: SpellDef): ContentIssue[] {
  const out: ContentIssue[] = [];
  const where = `spell:${s.id}`;
  if (!s.id || !s.name) out.push({ level: 'error', where, message: 'Spell without id/name' });
  if (!Number.isInteger(s.level) || s.level < 0 || s.level > 9) out.push({ level: 'error', where, message: 'Invalid spell level' });
  if (!Array.isArray(s.classes)) out.push({ level: 'error', where, message: 'classes must be an array' });
  return out;
}

export function validateContentDB(db: ContentDB): ContentIssue[] {
  const out: ContentIssue[] = [];
  for (const c of db.classes.values()) {
    for (const f of c.features) validateFeature(f, `class:${c.id}`, db, out);
    for (const r of c.resources ?? []) { const err = validateFormula(r.max, FORMULA_VARS); if (err) out.push({ level: 'error', where: `class:${c.id}/${r.id}`, message: err }); }
    for (const grp of c.startingEquipment) for (const o of grp.options) for (const it of o.items) if (!it.itemId.startsWith('@') && !db.items.has(it.itemId)) out.push({ level: 'warning', where: `class:${c.id}`, message: `Starting item "${it.itemId}" not found` });
    for (const it of c.startingFixed) if (!it.itemId.startsWith('@') && !db.items.has(it.itemId)) out.push({ level: 'warning', where: `class:${c.id}`, message: `Starting item "${it.itemId}" not found` });
    if (c.spellcasting?.prepared !== undefined) { const err = validateFormula(c.spellcasting.prepared, FORMULA_VARS); if (err) out.push({ level: 'error', where: `class:${c.id}`, message: err }); }
  }
  for (const s of db.subclasses.values()) {
    if (!db.classes.has(s.classId)) out.push({ level: 'error', where: `subclass:${s.id}`, message: `Class "${s.classId}" not found` });
    for (const f of s.features) validateFeature(f, `subclass:${s.id}`, db, out);
    for (const b of s.spells ?? []) for (const sp of b.spells) if (!db.spells.has(sp)) out.push({ level: 'warning', where: `subclass:${s.id}`, message: `Spell "${sp}" not found` });
  }
  for (const r of db.races.values()) {
    for (const t of r.traits) validateFeature(t, `race:${r.id}`, db, out);
    validateChoices(r.choices, `race:${r.id}`, db, out);
    for (const sr of r.subraces ?? []) { for (const t of sr.traits) validateFeature(t, `subrace:${sr.id}`, db, out); validateChoices(sr.choices, `subrace:${sr.id}`, db, out); }
  }
  for (const b of db.backgrounds.values()) {
    validateGrants(b.grants, `background:${b.id}`, db, out);
    validateChoices(b.choices, `background:${b.id}`, db, out);
    for (const it of b.equipment) if (!it.itemId.startsWith('@') && !db.items.has(it.itemId)) out.push({ level: 'warning', where: `background:${b.id}`, message: `Item "${it.itemId}" not found` });
  }
  for (const f of db.feats.values()) {
    validateGrants(f.grants, `feat:${f.id}`, db, out);
    for (const e of f.effects ?? []) validateEffect(e, `feat:${f.id}`, out);
    validateChoices(f.choices, `feat:${f.id}`, db, out);
  }
  for (const p of db.pools.values()) validateChoices([{ id: p.id, label: p.name, kind: 'options', count: 1, options: p.options }], `pool:${p.id}`, db, out);
  const ids = new Set<string>();
  for (const i of db.items.values()) { out.push(...validateItem(i)); if (ids.has(i.id)) out.push({ level: 'error', where: `item:${i.id}`, message: 'Duplicate id' }); ids.add(i.id); }
  for (const s of db.spells.values()) out.push(...validateSpell(s));
  return out;
}
