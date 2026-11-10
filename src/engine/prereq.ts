// Prerequisite checks for feats, invocations, multiclassing.
import type { Prerequisite, ClassDef } from '@/types/content';
import type { Character } from '@/types/character';
import type { Derived } from './derive';
import { ABILITIES, ABILITY_NAMES, type Ability } from '@/types/core';

export interface PrereqResult { ok: boolean; reasons: string[]; unverifiable: string[] }

export function checkPrerequisite(p: Prerequisite | undefined, ch: Character, d: Derived, opts: { classLevel?: number } = {}): PrereqResult {
  const reasons: string[] = [];
  const unverifiable: string[] = [];
  if (!p) return { ok: true, reasons, unverifiable };
  if (p.level !== undefined) {
    const lvl = opts.classLevel ?? d.totalLevel;
    if (lvl < p.level) reasons.push(`Requires level ${p.level}.`);
  }
  for (const [a, min] of Object.entries(p.abilities ?? {})) {
    if (d.abilities[a as Ability].score < (min ?? 0)) reasons.push(`Requires ${ABILITY_NAMES[a as Ability]} ${min}.`);
  }
  if (p.abilitiesAny) {
    const ok = Object.entries(p.abilitiesAny).some(([a, min]) => d.abilities[a as Ability].score >= (min ?? 0));
    if (!ok) reasons.push(`Requires ${Object.entries(p.abilitiesAny).map(([a, m]) => `${ABILITY_NAMES[a as Ability]} ${m}`).join(' or ')}.`);
  }
  if (p.spellcasting && d.casters.length === 0 && !d.spells.length) reasons.push('Requires the ability to cast at least one spell.');
  if (p.proficiency) {
    const prof = p.proficiency.toLowerCase();
    const has = d.proficiencies.armor.some((x) => x.toLowerCase().startsWith(prof)) || d.proficiencies.weapons.includes(prof);
    if (!has) reasons.push(`Requires proficiency with ${p.proficiency}${['light', 'medium', 'heavy'].includes(prof) ? ' armor' : ''}.`);
  }
  if (p.pact) {
    const has = Object.values(ch.choices).some((v) => v.includes(p.pact!));
    if (!has) reasons.push(`Requires ${p.pact.replace('pact-', 'Pact of the ').replace(/^\w/, (c) => c.toUpperCase())}.`);
  }
  if (p.spell) {
    if (!d.spells.some((s) => s.spellId === p.spell)) reasons.push(`Requires knowing the ${p.spell.replace(/-/g, ' ')} spell.`);
  }
  if (p.race?.length && !p.race.includes(ch.race.raceId)) reasons.push(`Requires race: ${p.race.join(' or ')}.`);
  if (p.text) unverifiable.push(p.text);
  return { ok: reasons.length === 0, reasons, unverifiable };
}

/** PHB multiclass prerequisites: must meet both the new class and all current classes' prerequisites. */
export function multiclassCheck(ch: Character, d: Derived, target: ClassDef, all: Map<string, ClassDef>): PrereqResult {
  const reasons: string[] = [];
  const check = (cls: ClassDef) => {
    const p = cls.multiclass.prerequisite;
    for (const [a, min] of Object.entries(p.all ?? {})) if (d.abilities[a as Ability].score < (min ?? 0)) reasons.push(`${cls.name}: requires ${ABILITY_NAMES[a as Ability]} ${min} (you have ${d.abilities[a as Ability].score}).`);
    if (p.any && !Object.entries(p.any).some(([a, min]) => d.abilities[a as Ability].score >= (min ?? 0))) reasons.push(`${cls.name}: requires ${Object.entries(p.any).map(([a, m]) => `${ABILITY_NAMES[a as Ability]} ${m}`).join(' or ')}.`);
  };
  const existing = ch.classes.some((c) => c.classId === target.id);
  if (!existing) {
    check(target);
    for (const c of ch.classes) { const def = all.get(c.classId); if (def) check(def); }
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)], unverifiable: [] };
}

export const abilityList = ABILITIES;
