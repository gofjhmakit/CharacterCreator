// The rules engine. Pure function: (Character, ContentDB) → Derived.
// Base values (character data), derived values (this output) and temporary modifiers are kept distinct.
// Every computed number carries a breakdown so the UI can explain "why".

import {
  ABILITIES, ABILITY_NAMES, SKILLS, SKILL_IDS, abilityMod, proficiencyBonus,
  type Ability, type ConditionId, type DamageType, type MovementMode, type ProficiencyLevel, type SkillId,
} from '@/types/core';
import type {
  AcFormula, AttackScope, ChoiceDef, ChoiceOption, ClassDef, Effect, FeatDef, FeatureDef, Grants,
  ItemDefinition, Modifier, Outcome, Requirement, ResourceDef, SpellcastingDef, SpellDef, SubclassDef,
} from '@/types/content';
import type { Character, CharacterSpell, ClassEntry, InventoryItem } from '@/types/character';
import type { ContentDB } from '@/content/registry';
import { safeFormula, type FormulaVars } from './formula';
import { CONDITION_MODIFIERS, IMPLIED_CONDITIONS, exhaustionModifiers } from './conditions';
import { computeSpellSlots, maxSpellLevelForClass, pactMagic } from './spellSlots';
import { averageOfDie } from '@/dice/dice';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface SourceRef {
  kind: 'race' | 'subrace' | 'background' | 'class' | 'subclass' | 'feat' | 'option' | 'item' | 'custom' | 'temp' | 'condition' | 'rule';
  id: string;
  label: string;
}

export interface Part { label: string; value: number; source?: SourceRef }
export interface CondPart { label: string; value?: number; op?: string; condition: string; source?: SourceRef }
export interface AdvSource { label: string; source?: SourceRef }

export interface Breakdown {
  total: number;
  parts: Part[];
  conditional: CondPart[];
  advantage: AdvSource[];
  disadvantage: AdvSource[];
  /** Auto-resolved roll mode from unconditional sources */
  mode: 'normal' | 'advantage' | 'disadvantage';
  override?: number;
}

export interface AbilityView { base: number; score: number; mod: number; parts: Part[]; max: number; setBy?: Part }
export interface SkillView extends Breakdown { id: SkillId; ability: Ability; prof: ProficiencyLevel; profSources: string[] }
export interface SaveView extends Breakdown { ability: Ability; proficient: boolean; profSources: string[] }

export interface ActiveFeature {
  key: string;
  def: FeatureDef;
  source: SourceRef;
  level?: number;
  classId?: string;
  resourceId?: string;
  choices: { def: ChoiceDef; key: string; selected: string[]; count: number; options: ChoiceOption[] }[];
}

export interface ChoiceView {
  key: string;
  def: ChoiceDef;
  count: number;
  selected: string[];
  options: ChoiceOption[];
  source: SourceRef;
  ownerClass?: string;
  /** Level at which this choice was unlocked (class level or character level). */
  level?: number;
}

export interface ResourceView {
  id: string;
  name: string;
  max: number;
  used: number;
  remaining: number;
  recharge: ResourceDef['recharge'];
  die?: string;
  pool: boolean;
  source: SourceRef;
  overridden: boolean;
}

export interface CasterView {
  classId: string;
  name: string;
  ability: Ability;
  style: SpellcastingDef['style'];
  dc: Breakdown;
  attack: Breakdown;
  cantripsKnown?: number;
  spellsKnown?: number;
  preparedLimit?: number;
  maxSpellLevel: number;
  list: string;
  progression: SpellcastingDef['progression'];
  classLevel: number;
  ritual: boolean;
  spellbookMin?: number;
}

export interface SpellView {
  key: string;
  entry?: CharacterSpell;
  spell: SpellDef | undefined;
  spellId: string;
  classId?: string;
  kind: 'known' | 'prepared' | 'always-prepared' | 'spellbook' | 'innate' | 'granted' | 'cantrip';
  prepared: boolean;
  alwaysPrepared: boolean;
  inSpellbook: boolean;
  granted: boolean;
  sourceLabel: string;
  favorite: boolean;
  dc?: number;
  attack?: number;
  uses?: { max: number; used: number; recharge: string; resourceId: string };
  countsAgainstLimit: boolean;
}

export interface Rider {
  label: string;
  trigger: Effect['trigger'];
  text: string;
  dc?: number;
  saveAbility?: Ability;
  outcomes?: Outcome[];
  onSuccess?: Outcome[];
  oncePerTurn?: boolean;
  source?: SourceRef;
  usesResource?: string;
}

export interface AttackView {
  id: string;
  name: string;
  itemInstanceId?: string;
  kind: 'weapon' | 'unarmed' | 'spell' | 'offhand';
  ability: Ability;
  proficient: boolean;
  attack: Breakdown;
  damageDice: string;
  damageBonus: Breakdown;
  damageType: DamageType | string;
  versatileDice?: string;
  extraDamage: { dice: string; type: string; label: string; condition?: string }[];
  range: string;
  properties: string[];
  critRange: number;
  riders: Rider[];
  notes: string[];
}

export interface ArmorClassView {
  total: number;
  formula: string;
  parts: Part[];
  candidates: { label: string; value: number; active: boolean; valid: boolean; reason?: string }[];
  conditional: CondPart[];
  override?: number;
}

export interface Derived {
  totalLevel: number;
  profBonus: number;
  classes: { entry: ClassEntry; def?: ClassDef; subclass?: SubclassDef; level: number }[];
  classLine: string;
  abilities: Record<Ability, AbilityView>;
  saves: Record<Ability, SaveView>;
  skills: Record<SkillId, SkillView>;
  checks: Record<Ability, Breakdown>;
  passives: Record<'perception' | 'investigation' | 'insight', Breakdown>;
  initiative: Breakdown;
  ac: ArmorClassView;
  speed: Record<MovementMode, { value: number; parts: Part[] }>;
  hp: { max: number; parts: Part[]; current: number; temp: number; override?: number };
  hitDice: { die: number; total: number; used: number; classes: string[] }[];
  senses: { name: string; range: number; source: string }[];
  resistances: { type: string; source: string; conditional?: string }[];
  immunities: { type: string; source: string }[];
  vulnerabilities: { type: string; source: string }[];
  conditionImmunities: { type: string; source: string }[];
  damageReduction: Part[];
  proficiencies: { armor: string[]; weapons: string[]; tools: string[]; languages: string[]; sources: Record<string, string[]> };
  features: ActiveFeature[];
  /** Every choice currently available to the character (race, background, class, features, feats). */
  choices: ChoiceView[];
  resources: ResourceView[];
  casters: CasterView[];
  slots: { level: number; max: number; used: number }[];
  pact?: { slots: number; level: number; used: number };
  casterLevel: number;
  spells: SpellView[];
  attacks: AttackView[];
  carrying: {
    weight: number; capacity: number; pushDragLift: number; coinWeight: number;
    status: 'normal' | 'encumbered' | 'heavily-encumbered' | 'over-capacity';
    encumberedAt: number; heavilyAt: number;
  };
  attunement: { count: number; limit: number };
  toggles: { key: string; name: string; description?: string; on: boolean; source: SourceRef; itemInstanceId?: string }[];
  manual: { name: string; description: string; source: SourceRef }[];
  activeConditions: ConditionId[];
  warnings: string[];
  size: string;
  armorWorn?: InventoryItem;
  shieldWorn?: InventoryItem;
  flags: Set<string>;
  formulaVars: FormulaVars;
  /** Formula variables with `cl` bound to the given class's level. */
  varsFor: (classId?: string) => FormulaVars;
}

// ---------------------------------------------------------------------------
// Collected modifier
// ---------------------------------------------------------------------------

interface CMod { mod: Modifier; source: SourceRef; effectId: string; effectName: string; item?: InventoryItem; vars: FormulaVars }

const emptyBreakdown = (): Breakdown => ({ total: 0, parts: [], conditional: [], advantage: [], disadvantage: [], mode: 'normal' });

function finalizeBreakdown(b: Breakdown): Breakdown {
  b.total = b.parts.reduce((s, p) => s + p.value, 0);
  if (b.override !== undefined) b.total = b.override;
  const a = b.advantage.length, d = b.disadvantage.length;
  b.mode = a > 0 && d > 0 ? 'normal' : a > 0 ? 'advantage' : d > 0 ? 'disadvantage' : 'normal';
  return b;
}

const ARMOR_PROF_LABEL: Record<string, string> = { light: 'Light armor', medium: 'Medium armor', heavy: 'Heavy armor', shields: 'Shields' };

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function derive(ch: Character, db: ContentDB): Derived {
  const warnings: string[] = [];
  const flags = new Set<string>();
  const race = db.races.get(ch.race.raceId);
  const subrace = race?.subraces?.find((s) => s.id === ch.race.subraceId);
  const background = db.backgrounds.get(ch.background.backgroundId);
  if (ch.race.raceId && !race) warnings.push(`Race "${ch.race.raceId}" not found in content (missing custom content?).`);
  if (ch.background.backgroundId && !background) warnings.push(`Background "${ch.background.backgroundId}" not found.`);

  const classes = ch.classes.map((entry) => {
    const def = db.classes.get(entry.classId);
    const subclass = entry.subclassId ? db.subclasses.get(entry.subclassId) : undefined;
    if (!def) warnings.push(`Class "${entry.classId}" not found in content.`);
    if (entry.subclassId && !subclass) warnings.push(`Subclass "${entry.subclassId}" not found in content.`);
    return { entry, def, subclass, level: Math.max(0, Math.min(20, entry.level | 0)) };
  });
  const totalLevel = Math.max(1, Math.min(20, classes.reduce((s, c) => s + c.level, 0) || 1));
  const pbRaw = proficiencyBonus(totalLevel);
  const profBonus = ch.settings.overrides.profBonus ?? pbRaw;
  const classLevel = (id: string) => classes.find((c) => c.entry.classId === id)?.level ?? 0;

  // ------------------------------------------------------------------ collection pass
  const features: ActiveFeature[] = [];
  const grantsList: { g: Grants; source: SourceRef; ownerClass?: string; minLevelCtx: number }[] = [];
  const effectsList: { e: Effect; source: SourceRef; item?: InventoryItem; ownerClass?: string; toggleKey: string }[] = [];
  const resourceDefs: { def: ResourceDef; source: SourceRef; ownerClass?: string }[] = [];
  const abilityBonusParts: Record<Ability, Part[]> = { str: [], dex: [], con: [], int: [], wis: [], cha: [] };
  const featsTaken: { feat: FeatDef; key: string; source: SourceRef }[] = [];

  const choiceSel = (key: string) => ch.choices[key] ?? [];
  const allChoices: ChoiceView[] = [];

  // Pre-vars for evaluating choice counts (abilities not yet known → base-based approximation)
  const preVars = (ownerClass?: string): FormulaVars => {
    const v: FormulaVars = { lvl: totalLevel, cl: ownerClass ? classLevel(ownerClass) : totalLevel, prof: profBonus };
    for (const a of ABILITIES) { v[a] = abilityMod(ch.abilities.base[a]); v[`score_${a}`] = ch.abilities.base[a]; }
    return v;
  };

  function optionsFor(c: ChoiceDef): ChoiceOption[] {
    if (c.options) return c.options;
    if (c.pool) return db.pools.get(c.pool)?.options ?? [];
    if (c.kind === 'feat') return [...db.feats.values()].map((f) => ({ id: f.id, name: f.name, description: f.description }));
    return [];
  }

  function addChoices(choices: ChoiceDef[] | undefined, prefix: string, source: SourceRef, ownerClass: string | undefined, active: ActiveFeature | null) {
    if (!choices) return;
    for (const c of choices) {
      const key = `${prefix}:${c.id}`;
      const sel = choiceSel(key);
      const count = Math.max(0, Math.floor(safeFormula(c.count, preVars(ownerClass), 1)));
      const opts = optionsFor(c);
      if (active) active.choices.push({ def: c, key, selected: sel, count, options: opts });
      allChoices.push({ key, def: c, count, selected: sel, options: opts, source, ownerClass, level: active?.level });
      const picked = sel.slice(0, c.allowRepeat ? Math.max(count, sel.length) : undefined);
      switch (c.kind) {
        case 'skill': grantsList.push({ g: { skills: picked as SkillId[] }, source, ownerClass, minLevelCtx: 0 }); break;
        case 'expertise': grantsList.push({ g: { expertise: picked as SkillId[] }, source, ownerClass, minLevelCtx: 0 }); break;
        case 'language': grantsList.push({ g: { languages: picked }, source, ownerClass, minLevelCtx: 0 }); break;
        case 'tool': grantsList.push({ g: { tools: picked }, source, ownerClass, minLevelCtx: 0 }); break;
        case 'damage-type': grantsList.push({ g: { resistances: picked as DamageType[] }, source, ownerClass, minLevelCtx: 0 }); break;
        case 'ability':
          for (const a of picked) if ((ABILITIES as readonly string[]).includes(a)) abilityBonusParts[a as Ability].push({ label: source.label, value: c.amount ?? 1, source });
          break;
        case 'spell':
          grantsList.push({ g: { spells: picked.map((spellId) => ({ spellId, mode: c.spellMode ?? 'known' })) }, source, ownerClass, minLevelCtx: 0 });
          break;
        case 'asi': {
          // values: ability ids (each +1) or "feat:<id>"
          const featPick = picked.find((p) => p.startsWith('feat:'));
          if (featPick) {
            const feat = db.feats.get(featPick.slice(5));
            if (feat) addFeat(feat, `${key}:feat`, source);
            else warnings.push(`Feat "${featPick.slice(5)}" not found.`);
          } else {
            for (const a of picked.slice(0, 2)) if ((ABILITIES as readonly string[]).includes(a)) abilityBonusParts[a as Ability].push({ label: `${source.label} (ASI)`, value: 1, source });
          }
          break;
        }
        case 'feat':
          for (const fid of picked) {
            const feat = db.feats.get(fid);
            if (feat) addFeat(feat, `${key}:${fid}`, source); else warnings.push(`Feat "${fid}" not found.`);
          }
          break;
        case 'options':
        default:
          for (const oid of picked) {
            const opt = opts.find((o) => o.id === oid);
            if (!opt) continue;
            const osrc: SourceRef = { kind: 'option', id: oid, label: opt.name };
            if (opt.grants) grantsList.push({ g: opt.grants, source: osrc, ownerClass, minLevelCtx: 0 });
            for (const e of opt.effects ?? []) effectsList.push({ e, source: osrc, ownerClass, toggleKey: e.toggleKey ?? e.id });
            if (opt.resource) resourceDefs.push({ def: opt.resource, source: osrc, ownerClass });
            for (const f of opt.features ?? []) addFeature(f, `${key}:${oid}`, osrc, ownerClass);
            if (active && (opt.description || opt.effects?.length)) {
              // Represent chosen option as its own feature entry for visibility
              features.push({ key: `${key}:${oid}`, def: { id: oid, name: opt.name, description: opt.description ?? '', effects: opt.effects, resource: opt.resource }, source: { ...osrc, label: `${active.def.name}: ${opt.name}` }, classId: ownerClass, resourceId: opt.resource?.id, choices: [] });
            }
          }
      }
    }
  }

  function addFeature(f: FeatureDef, prefix: string, source: SourceRef, ownerClass?: string, level?: number) {
    const key = `${prefix}:${f.id}`;
    const af: ActiveFeature = { key, def: f, source, level, classId: ownerClass, resourceId: f.resource?.id ?? f.usesResource, choices: [] };
    if (!f.hidden) features.push(af);
    if (f.grants) grantsList.push({ g: f.grants, source: { ...source, label: f.name }, ownerClass, minLevelCtx: 0 });
    for (const e of f.effects ?? []) effectsList.push({ e: { ...e, name: e.name ?? f.name }, source: { ...source, label: f.name }, ownerClass, toggleKey: e.toggleKey ?? e.id });
    if (f.resource) resourceDefs.push({ def: f.resource, source: { ...source, label: f.name }, ownerClass });
    addChoices(f.choices, key, { ...source, label: f.name }, ownerClass, af);
  }

  function addFeat(feat: FeatDef, key: string, via: SourceRef) {
    const source: SourceRef = { kind: 'feat', id: feat.id, label: feat.name };
    featsTaken.push({ feat, key, source });
    const def: FeatureDef = {
      id: feat.id, name: feat.name, description: feat.description, source: feat.source, grants: feat.grants,
      effects: feat.effects, resource: feat.resource, prerequisite: feat.prerequisite,
      choices: [
        ...(feat.abilityIncrease ? [{ id: 'ability', label: 'Ability increase', kind: 'ability' as const, count: 1, amount: feat.abilityIncrease.amount, from: feat.abilityIncrease.from }] : []),
        ...(feat.choices ?? []),
      ],
      tags: ['feat', `via:${via.label}`],
    };
    addFeature(def, key, source);
  }

  // Race
  if (race) {
    const src: SourceRef = { kind: 'race', id: race.id, label: race.name };
    const removed = new Set(subrace?.removesTraits ?? []);
    const customOrigin = !!ch.settings.optional.customOrigin;
    const fixed: { label: string; value: number; ability: Ability; source: SourceRef }[] = [];
    if (!(subrace?.replacesAbilityBonuses)) {
      for (const [a, v] of Object.entries(race.abilityBonuses)) fixed.push({ label: race.name, value: v!, ability: a as Ability, source: src });
    }
    if (subrace) for (const [a, v] of Object.entries(subrace.abilityBonuses ?? {})) fixed.push({ label: subrace.name, value: v!, ability: a as Ability, source: { kind: 'subrace', id: subrace.id, label: subrace.name } });
    if (customOrigin && fixed.some((x) => x.value > 0) && fixed.length < 6) {
      // TCoE "Customizing Your Origin": each positive racial increase can be moved to another ability.
      fixed.filter((x) => x.value > 0).sort((a, b) => b.value - a.value).forEach((x, i) => {
        addChoices([{ id: `asi-${i}`, label: `Origin: ${x.label} +${x.value} (default ${x.ability.toUpperCase()})`, kind: 'ability', count: 1, amount: x.value }], 'origin', src, undefined, null);
        if (!(ch.choices[`origin:asi-${i}`]?.length)) abilityBonusParts[x.ability].push({ label: x.label, value: x.value, source: x.source });
      });
      for (const x of fixed.filter((y) => y.value < 0)) abilityBonusParts[x.ability].push({ label: x.label, value: x.value, source: x.source });
    } else {
      for (const x of fixed) abilityBonusParts[x.ability].push({ label: x.label, value: x.value, source: x.source });
    }
    for (const t of race.traits) if (!removed.has(t.id) && (t.level ?? 1) <= totalLevel) addFeature(t, 'race', src, undefined, t.level);
    addChoices(race.choices, 'race', src, undefined, null);
    if (subrace) {
      const ssrc: SourceRef = { kind: 'subrace', id: subrace.id, label: subrace.name };
      for (const t of subrace.traits) if ((t.level ?? 1) <= totalLevel) addFeature(t, 'subrace', ssrc, undefined, t.level);
      addChoices(subrace.choices, 'subrace', ssrc, undefined, null);
    } else if (race.subraceRequired) warnings.push(`${race.name}: choose a subrace.`);
  }

  // Background
  if (background) {
    const src: SourceRef = { kind: 'background', id: background.id, label: background.name };
    grantsList.push({ g: background.grants, source: src, minLevelCtx: 0 });
    addChoices(background.choices, 'background', src, undefined, null);
    addFeature(background.feature, 'background', src);
  }

  // Classes
  classes.forEach(({ entry, def, subclass, level }, idx) => {
    if (!def) return;
    const src: SourceRef = { kind: 'class', id: def.id, label: def.name };
    if (idx === 0) {
      grantsList.push({ g: { saves: def.saves, armor: def.armor, weapons: def.weapons, tools: def.tools }, source: src, ownerClass: def.id, minLevelCtx: 0 });
      addChoices([{ id: 'skills', label: `${def.name} skills`, kind: 'skill', count: def.skillChoices.count, from: def.skillChoices.from }], `class:${def.id}`, src, def.id, null);
      if (def.toolChoices) addChoices([{ id: 'tools', label: `${def.name} tools`, kind: 'tool', count: def.toolChoices.count, from: def.toolChoices.from }], `class:${def.id}`, src, def.id, null);
    } else {
      grantsList.push({ g: def.multiclass.grants, source: { ...src, label: `${def.name} (multiclass)` }, ownerClass: def.id, minLevelCtx: 0 });
      if (def.multiclass.skillCount) addChoices([{ id: 'mc-skills', label: `${def.name} multiclass skill`, kind: 'skill', count: def.multiclass.skillCount, from: def.multiclass.skillFrom ?? def.skillChoices.from }], `class:${def.id}`, src, def.id, null);
    }
    for (const r of def.resources ?? []) if ((r.minLevel ?? 1) <= level) resourceDefs.push({ def: r, source: src, ownerClass: def.id });
    const shown = collapseReplaced(def.features.filter((f) => (f.level ?? 1) <= level));
    for (const f of shown) addFeature(f, `class:${def.id}`, src, def.id, f.level);
    for (const asiLvl of def.asiLevels) {
      if (asiLvl > level) continue;
      if (!ch.settings.optional.feats) {
        // feats disabled → ASI only; still uses the same choice key
      }
      addChoices([{ id: `asi-${asiLvl}`, label: `Ability Score Improvement (${def.name} ${asiLvl})`, kind: 'asi', count: 2 }], `class:${def.id}`, { ...src, label: `${def.name} ${asiLvl}` }, def.id,
        (() => { const af: ActiveFeature = { key: `class:${def.id}:asi-${asiLvl}`, def: { id: `asi-${asiLvl}`, name: `Ability Score Improvement`, description: 'Increase one ability score by 2, or two ability scores by 1 (max 20), or take a feat if your table allows feats.', level: asiLvl, tags: ['asi'] }, source: src, level: asiLvl, classId: def.id, choices: [] }; features.push(af); return af; })());
    }
    if (subclass && level >= def.subclassLevel) {
      const ssrc: SourceRef = { kind: 'subclass', id: subclass.id, label: subclass.name };
      for (const f of collapseReplaced(subclass.features.filter((f) => (f.level ?? def.subclassLevel) <= level))) addFeature(f, `subclass:${subclass.id}`, ssrc, def.id, f.level);
      for (const block of subclass.spells ?? []) {
        if (block.level <= level) grantsList.push({ g: { spells: block.spells.map((spellId) => ({ spellId, mode: block.mode })) }, source: { ...ssrc, label: `${subclass.name} spells` }, ownerClass: def.id, minLevelCtx: 0 });
      }
    } else if (subclass && level < def.subclassLevel) {
      warnings.push(`${subclass.name} is selected but ${def.name} level ${def.subclassLevel} is required; its features are not applied.`);
    } else if (!subclass && level >= def.subclassLevel) {
      warnings.push(`${def.name} ${level}: choose a ${def.subclassLabel}.`);
    }
  });

  // Custom feats & features
  for (const fid of ch.custom.feats) {
    const feat = db.feats.get(fid);
    if (feat) addFeat(feat, `custom:feat:${fid}`, { kind: 'custom', id: fid, label: 'Bonus feat' });
    else warnings.push(`Bonus feat "${fid}" not found.`);
  }
  for (const cf of ch.custom.features) {
    const src: SourceRef = { kind: 'custom', id: cf.id, label: cf.name };
    const def: FeatureDef = {
      id: cf.id, name: cf.name, description: cf.description, effects: cf.effects,
      resource: cf.resource ? { id: `custom-${cf.id}`, name: cf.resource.name || cf.name, max: cf.resource.max, recharge: cf.resource.recharge } : undefined,
      tags: ['custom'],
    };
    addFeature(def, 'custom', src);
  }
  for (const [a, v] of Object.entries(ch.custom.abilityBonuses)) if (v) abilityBonusParts[a as Ability].push({ label: 'Manual adjustment', value: v, source: { kind: 'custom', id: 'manual', label: 'Manual' } });

  // Items
  const inv = ch.inventory;
  const attunedCount = inv.filter((i) => i.attuned).length;
  for (const it of inv) {
    const src: SourceRef = { kind: 'item', id: it.id, label: it.item.name };
    for (const e of it.item.effects ?? []) {
      if (!itemEffectActive(e, it)) continue;
      effectsList.push({ e, source: src, item: it, toggleKey: `${it.id}:${e.id}` });
    }
  }

  // Temp effects
  for (const t of ch.effects) {
    effectsList.push({ e: { ...t.effect, activation: 'always' }, source: { kind: 'temp', id: t.id, label: t.name }, toggleKey: t.id });
  }

  // Conditions & exhaustion
  const activeConditions = new Set<ConditionId>(ch.combat.conditions);
  for (const c of ch.combat.conditions) for (const imp of IMPLIED_CONDITIONS[c] ?? []) activeConditions.add(imp);

  // ------------------------------------------------------------------ grants → proficiencies etc.
  const profSkills: Record<string, { level: ProficiencyLevel; sources: string[] }> = {};
  const addSkillProf = (s: string, level: ProficiencyLevel, label: string) => {
    const cur = profSkills[s] ?? { level: 0, sources: [] };
    cur.level = Math.max(cur.level, level) as ProficiencyLevel;
    cur.sources.push(label);
    profSkills[s] = cur;
  };
  const saveProfs: Record<string, string[]> = {};
  const profSets = { armor: new Map<string, string[]>(), weapons: new Map<string, string[]>(), tools: new Map<string, string[]>(), languages: new Map<string, string[]>() };
  const addTo = (m: Map<string, string[]>, v: string, label: string) => { const k = v.trim(); if (!k) return; m.set(k, [...(m.get(k) ?? []), label]); };
  const resist: Derived['resistances'] = [];
  const immune: Derived['immunities'] = [];
  const vuln: Derived['vulnerabilities'] = [];
  const condImm: Derived['conditionImmunities'] = [];
  const senses: Record<string, { range: number; source: string }> = {};
  const speedGrants: { mode: MovementMode; value: number | 'walk'; source: string }[] = [];
  const grantedSpells: { spellId: string; mode: string; source: SourceRef; ownerClass?: string; uses?: { max: number; recharge: string }; ability?: Ability; minLevel?: number }[] = [];

  const addSense = (name: string, range: number, source: string) => {
    const cur = senses[name];
    if (!cur || range > cur.range) senses[name] = { range, source };
  };

  for (const { g, source, ownerClass } of grantsList) {
    const label = source.label;
    for (const s of g.skills ?? []) addSkillProf(s, 1, label);
    for (const s of g.expertise ?? []) addSkillProf(s, 2, `${label} (expertise)`);
    for (const a of g.saves ?? []) saveProfs[a] = [...(saveProfs[a] ?? []), label];
    for (const a of g.armor ?? []) addTo(profSets.armor, a, label);
    for (const w of g.weapons ?? []) addTo(profSets.weapons, w, label);
    for (const t of g.tools ?? []) addTo(profSets.tools, t, label);
    for (const l of g.languages ?? []) addTo(profSets.languages, l, label);
    for (const r of g.resistances ?? []) resist.push({ type: r, source: label });
    for (const r of g.immunities ?? []) immune.push({ type: r, source: label });
    for (const r of g.conditionImmunities ?? []) condImm.push({ type: r, source: label });
    for (const [k, v] of Object.entries(g.senses ?? {})) addSense(k, v, label);
    for (const [k, v] of Object.entries(g.speeds ?? {})) speedGrants.push({ mode: k as MovementMode, value: v!, source: label });
    for (const sp of g.spells ?? []) {
      const ownerLevel = ownerClass ? classLevel(ownerClass) : totalLevel;
      if (sp.minLevel && ownerLevel < sp.minLevel) continue;
      grantedSpells.push({ spellId: sp.spellId, mode: sp.mode, source, ownerClass, ability: sp.ability, minLevel: sp.minLevel, uses: sp.uses ? { max: Math.max(0, Math.floor(safeFormula(sp.uses.max, preVars(ownerClass), 1))), recharge: sp.uses.recharge } : undefined });
    }
  }
  // Custom (manual) proficiencies
  const manual = 'Manual';
  for (const [s, lvl] of Object.entries(ch.custom.skills)) if (lvl) addSkillProf(s, lvl as ProficiencyLevel, manual);
  for (const a of ch.custom.saves) saveProfs[a] = [...(saveProfs[a] ?? []), manual];
  ch.custom.armor.forEach((v) => addTo(profSets.armor, v, manual));
  ch.custom.weapons.forEach((v) => addTo(profSets.weapons, v, manual));
  ch.custom.tools.forEach((v) => addTo(profSets.tools, v, manual));
  ch.custom.languages.forEach((v) => addTo(profSets.languages, v, manual));
  ch.custom.resistances.forEach((v) => resist.push({ type: v, source: manual }));
  ch.custom.immunities.forEach((v) => immune.push({ type: v, source: manual }));
  ch.custom.vulnerabilities.forEach((v) => vuln.push({ type: v, source: manual }));
  ch.custom.conditionImmunities.forEach((v) => condImm.push({ type: v, source: manual }));
  for (const [k, v] of Object.entries(ch.custom.senses)) addSense(k, v, manual);

  // ------------------------------------------------------------------ equipment state
  const equippedArmor = inv.filter((i) => i.equipped && i.item.armor && i.item.armor.category !== 'shield');
  const equippedShields = inv.filter((i) => i.equipped && i.item.armor?.category === 'shield');
  const armorWorn = equippedArmor.sort((a, b) => armorBase(b) - armorBase(a))[0];
  const shieldWorn = equippedShields.sort((a, b) => (b.item.armor!.baseAc + (b.item.armor!.bonus ?? 0)) - (a.item.armor!.baseAc + (a.item.armor!.bonus ?? 0)))[0];
  if (equippedArmor.length > 1) warnings.push('More than one suit of armor is equipped; only the best one counts.');
  if (equippedShields.length > 1) warnings.push('More than one shield is equipped; only one counts.');
  const equippedWeapons = inv.filter((i) => i.equipped && i.item.weapon);

  const reqCtx = { armorWorn, shieldWorn, equippedWeapons };
  const meets = (reqs: Requirement[] | undefined, attackCtx?: { weapon?: InventoryItem; ability?: Ability }): boolean => {
    if (!reqs) return true;
    return reqs.every((r) => checkRequirement(r, reqCtx, attackCtx));
  };

  // ------------------------------------------------------------------ effect resolution
  const toggleOn = (key: string, e: Effect, item?: InventoryItem): boolean => {
    if (item) return item.toggles?.[e.id] ?? e.defaultOn ?? false;
    return ch.combat.toggles[key] ?? e.defaultOn ?? false;
  };
  const toggles: Derived['toggles'] = [];
  const manualList: Derived['manual'] = [];
  const activeEffects: typeof effectsList = [];
  const seenEffectIds = new Map<string, number>();
  for (const x of effectsList) {
    const act = x.e.activation ?? 'always';
    if (act === 'toggle') {
      const on = toggleOn(x.toggleKey, x.e, x.item);
      if (!toggles.some((t) => t.key === x.toggleKey)) toggles.push({ key: x.toggleKey, name: x.e.name ?? x.source.label, description: x.e.description, on, source: x.source, itemInstanceId: x.item?.id });
      if (!on) continue;
    }
    if (x.e.manual && x.e.description) manualList.push({ name: x.e.name ?? x.source.label, description: x.e.description, source: x.source });
    // Same-named effects don't stack (DMG "Combining Game Effects"): keep first (they're identical defs).
    const dedupeKey = x.e.id;
    if (seenEffectIds.has(dedupeKey) && !(x.e.modifiers ?? []).every((m) => m.scope === 'this-item')) continue;
    seenEffectIds.set(dedupeKey, 1);
    activeEffects.push(x);
  }

  const mods: CMod[] = [];
  for (const x of activeEffects) {
    for (const m of x.e.modifiers ?? []) mods.push({ mod: m, source: x.source, effectId: x.e.id, effectName: x.e.name ?? x.source.label, item: x.item, vars: {} });
  }
  const condSource = (c: string): SourceRef => ({ kind: 'condition', id: c, label: c[0].toUpperCase() + c.slice(1) });
  for (const c of activeConditions) for (const m of CONDITION_MODIFIERS[c] ?? []) mods.push({ mod: m, source: condSource(c), effectId: `cond-${c}`, effectName: c, vars: {} });
  for (const m of exhaustionModifiers(ch.combat.exhaustion)) mods.push({ mod: m, source: { kind: 'condition', id: 'exhaustion', label: `Exhaustion ${ch.combat.exhaustion}` }, effectId: 'exhaustion', effectName: 'Exhaustion', vars: {} });

  // Armor proficiency penalties
  const armorProf = (cat: string) => profSets.armor.has(cat) || (cat === 'shield' && profSets.armor.has('shields'));
  if (armorWorn && !armorProf(armorWorn.item.armor!.category)) {
    warnings.push(`Not proficient with ${armorWorn.item.name}: disadvantage on STR/DEX checks, saves and attacks; can't cast spells.`);
    const src: SourceRef = { kind: 'rule', id: 'armor-nonprof', label: 'Armor not proficient' };
    for (const t of ['check:str', 'check:dex', 'save:str', 'save:dex', 'attack'] as const) mods.push({ mod: { target: t, op: 'disadvantage' }, source: src, effectId: 'armor-nonprof', effectName: 'Armor', vars: {} });
  }
  if (shieldWorn && !armorProf('shields')) {
    warnings.push(`Not proficient with shields: disadvantage on STR/DEX checks, saves and attacks; can't cast spells.`);
    const src: SourceRef = { kind: 'rule', id: 'shield-nonprof', label: 'Shield not proficient' };
    for (const t of ['check:str', 'check:dex', 'save:str', 'save:dex', 'attack'] as const) mods.push({ mod: { target: t, op: 'disadvantage' }, source: src, effectId: 'shield-nonprof', effectName: 'Shield', vars: {} });
  }

  for (const m of mods) if (m.mod.target.startsWith('flag:') && !m.mod.condition && meets(m.mod.requires)) flags.add(m.mod.target.slice(5));

  // ------------------------------------------------------------------ ability scores
  const varsFor = (ownerClass?: string, scores?: Record<Ability, number>): FormulaVars => {
    const v: FormulaVars = { lvl: totalLevel, cl: ownerClass ? classLevel(ownerClass) : totalLevel, prof: profBonus };
    for (const a of ABILITIES) {
      const s = scores ? scores[a] : ch.abilities.base[a];
      v[a] = abilityMod(s);
      v[`score_${a}`] = s;
    }
    return v;
  };
  const modValue = (m: CMod, vars: FormulaVars, walk = 0): number => {
    if (m.mod.formula !== undefined) return safeFormula(m.mod.formula, vars, 0);
    if (m.mod.value === 'walk') return walk;
    if (typeof m.mod.value === 'number') return m.mod.value;
    if (typeof m.mod.value === 'string') return safeFormula(m.mod.value, vars, 0);
    return 0;
  };
  const ownerOf = (m: CMod) => effectsOwner.get(m.effectId);
  const effectsOwner = new Map<string, string | undefined>();
  for (const x of activeEffects) effectsOwner.set(x.e.id, x.ownerClass);

  const abilities = {} as Record<Ability, AbilityView>;
  const baseVars = varsFor();
  for (const a of ABILITIES) {
    const base = ch.abilities.base[a];
    let max = 20;
    for (const m of mods) if (m.mod.target === `ability-max:${a}` && !m.mod.condition) max = Math.max(max, modValue(m, baseVars) || max);
    const parts: Part[] = [{ label: 'Base score', value: base }, ...abilityBonusParts[a]];
    for (const m of mods) {
      if (m.mod.target === `ability:${a}` && (m.mod.op ?? 'add') === 'add' && !m.mod.condition && meets(m.mod.requires)) parts.push({ label: m.effectName, value: modValue(m, baseVars), source: m.source });
    }
    let score = Math.min(max, parts.reduce((s, p) => s + p.value, 0));
    if (score < parts.reduce((s, p) => s + p.value, 0)) parts.push({ label: `Capped at ${max}`, value: score - parts.reduce((s, p) => s + p.value, 0) });
    let setBy: Part | undefined;
    for (const m of mods) {
      if (m.mod.target === `ability-set:${a}` && !m.mod.condition) {
        const v = modValue(m, baseVars);
        if (v > score) { setBy = { label: `${m.effectName} sets score to ${v}`, value: v - score, source: m.source }; score = v; }
      }
    }
    if (setBy) parts.push(setBy);
    abilities[a] = { base, score, mod: abilityMod(score), parts, max, setBy };
  }
  const scores = Object.fromEntries(ABILITIES.map((a) => [a, abilities[a].score])) as Record<Ability, number>;
  const vars = (ownerClass?: string) => varsFor(ownerClass, scores);
  const V = vars();

  // ------------------------------------------------------------------ helper: build d20 breakdown
  const targetMatches = (t: string, wanted: string[]) => wanted.includes(t);
  const applyMods = (b: Breakdown, wanted: string[], attackCtx?: { weapon?: InventoryItem; ability?: Ability; scopeTags?: AttackScope[] }) => {
    for (const m of mods) {
      if (!targetMatches(m.mod.target, wanted)) continue;
      if (attackCtx && m.mod.scope && !scopeMatches(m.mod.scope, attackCtx.scopeTags ?? [], m.item, attackCtx.weapon)) continue;
      if (!attackCtx && m.mod.scope === 'this-item') continue;
      if (!meets(m.mod.requires, attackCtx)) continue;
      const op = m.mod.op ?? 'add';
      const label = m.effectName;
      if (m.mod.condition) {
        b.conditional.push({ label, value: op === 'add' ? modValue(m, vars(ownerOf(m))) : undefined, op, condition: m.mod.condition, source: m.source });
        continue;
      }
      if (op === 'advantage') b.advantage.push({ label, source: m.source });
      else if (op === 'disadvantage') b.disadvantage.push({ label, source: m.source });
      else if (op === 'add') { const v = modValue(m, vars(ownerOf(m))); if (v) b.parts.push({ label, value: v, source: m.source }); }
    }
  };

  // ------------------------------------------------------------------ saves
  const saves = {} as Record<Ability, SaveView>;
  for (const a of ABILITIES) {
    const b = emptyBreakdown();
    b.parts.push({ label: `${ABILITY_NAMES[a]} modifier`, value: abilities[a].mod });
    const proficient = !!saveProfs[a]?.length || flags.has('prof-all-saves');
    if (proficient) b.parts.push({ label: 'Proficiency', value: profBonus });
    applyMods(b, ['save:all', `save:${a}`]);
    saves[a] = { ...finalizeBreakdown(b), ability: a, proficient, profSources: saveProfs[a] ?? [] };
  }

  // ------------------------------------------------------------------ skills & checks
  const joat = mods.some((m) => m.mod.target === 'prof:half-unproficient-checks' && !m.mod.condition);
  const remarkable = mods.some((m) => m.mod.target === 'prof:half-unproficient-initiative' && !m.mod.condition);
  for (const m of mods) {
    const t = m.mod.target;
    if (t.startsWith('prof:skill:')) addSkillProf(t.slice(11), 1, m.effectName);
    if (t.startsWith('expertise:skill:')) addSkillProf(t.slice(16), 2, `${m.effectName} (expertise)`);
    if (t.startsWith('prof:save:') && !saves[t.slice(10) as Ability].proficient) {
      const a = t.slice(10) as Ability;
      saves[a].proficient = true; saves[a].profSources.push(m.effectName);
      saves[a].parts.push({ label: 'Proficiency', value: profBonus }); finalizeBreakdown(saves[a]);
    }
  }
  const checks = {} as Record<Ability, Breakdown>;
  for (const a of ABILITIES) {
    const b = emptyBreakdown();
    b.parts.push({ label: `${ABILITY_NAMES[a]} modifier`, value: abilities[a].mod });
    if (joat) b.parts.push({ label: 'Jack of All Trades (half proficiency)', value: Math.floor(profBonus / 2) });
    else if (remarkable && (a === 'str' || a === 'dex' || a === 'con')) b.parts.push({ label: 'Remarkable Athlete', value: Math.ceil(profBonus / 2) });
    applyMods(b, ['check:all', `check:${a}`]);
    checks[a] = finalizeBreakdown(b);
  }
  const skills = {} as Record<SkillId, SkillView>;
  for (const s of SKILL_IDS) {
    const ability = SKILLS[s].ability;
    const b = emptyBreakdown();
    b.parts.push({ label: `${ABILITY_NAMES[ability]} modifier`, value: abilities[ability].mod });
    let prof: ProficiencyLevel = profSkills[s]?.level ?? 0;
    if (prof === 2 && !(profSkills[s].sources.some((x) => !x.endsWith('(expertise)')))) {
      warnings.push(`Expertise in ${SKILLS[s].name} requires proficiency in it.`);
    }
    if (prof === 0 && joat) prof = 0.5;
    if (prof === 0 && remarkable && (ability === 'str' || ability === 'dex')) {
      b.parts.push({ label: 'Remarkable Athlete', value: Math.ceil(profBonus / 2) });
    }
    if (prof === 0.5) b.parts.push({ label: 'Jack of All Trades', value: Math.floor(profBonus / 2) });
    if (prof === 1) b.parts.push({ label: 'Proficiency', value: profBonus });
    if (prof === 2) b.parts.push({ label: 'Expertise (2 × proficiency)', value: profBonus * 2 });
    applyMods(b, ['check:all', `check:${ability}`, `skill:${s}`]);
    skills[s] = { ...finalizeBreakdown(b), id: s, ability, prof, profSources: profSkills[s]?.sources ?? [] };
  }
  const passive = (s: SkillId): Breakdown => {
    const b = emptyBreakdown();
    b.parts.push({ label: 'Base', value: 10 });
    for (const p of skills[s].parts) b.parts.push(p);
    // advantage: +5, disadvantage: -5 (PHB p.175)
    const mode = skills[s].mode;
    if (mode === 'advantage') b.parts.push({ label: 'Advantage (+5)', value: 5 });
    if (mode === 'disadvantage') b.parts.push({ label: 'Disadvantage (−5)', value: -5 });
    b.conditional.push(...skills[s].conditional);
    applyMods(b, [`passive:${s}`]);
    return finalizeBreakdown(b);
  };
  const passives = { perception: passive('perception'), investigation: passive('investigation'), insight: passive('insight') };
  if (ch.settings.overrides.passivePerception !== undefined) { passives.perception.override = ch.settings.overrides.passivePerception; finalizeBreakdown(passives.perception); }

  // ------------------------------------------------------------------ initiative
  const initiative = emptyBreakdown();
  initiative.parts.push({ label: 'Dexterity modifier', value: abilities.dex.mod });
  if (joat) initiative.parts.push({ label: 'Jack of All Trades', value: Math.floor(profBonus / 2) });
  else if (remarkable) initiative.parts.push({ label: 'Remarkable Athlete', value: Math.ceil(profBonus / 2) });
  applyMods(initiative, ['initiative', 'check:all', 'check:dex']);
  if (ch.settings.overrides.initiative !== undefined) initiative.override = ch.settings.overrides.initiative;
  finalizeBreakdown(initiative);

  // ------------------------------------------------------------------ armor class
  const ac = computeAC(abilities, armorWorn, shieldWorn, mods, meets, (m) => modValue(m, vars(ownerOf(m))), flags);
  if (ch.settings.overrides.ac !== undefined) { ac.override = ch.settings.overrides.ac; ac.total = ac.override; }
  if (armorWorn?.item.armor?.strRequirement && scores.str < armorWorn.item.armor.strRequirement && !flags.has('heavy-armor-speed-ok')) {
    warnings.push(`${armorWorn.item.name} requires STR ${armorWorn.item.armor.strRequirement}: speed reduced by 10 ft.`);
  }
  if (armorWorn?.item.armor?.stealthDisadvantage && !(armorWorn.item.armor.category === 'medium' && flags.has('medium-armor-stealth-ok'))) {
    skills.stealth.disadvantage.push({ label: `${armorWorn.item.name} (stealth disadvantage)` });
    finalizeBreakdown(skills.stealth);
  }

  // ------------------------------------------------------------------ speed
  const baseSpeed: Partial<Record<MovementMode, number>> = { ...(race?.speed ?? { walk: 30 }), ...(subrace?.speed ?? {}) };
  const speed = {} as Derived['speed'];
  const walkParts: Part[] = [{ label: race ? `${subrace?.speed?.walk ? subrace.name : race.name} base speed` : 'Base speed', value: baseSpeed.walk ?? 30 }];
  const speedMods = (mode: MovementMode) => mods.filter((m) => (m.mod.target === `speed:${mode}` || (m.mod.target === 'speed:all' && mode === 'walk')) && !m.mod.condition && meets(m.mod.requires));
  // walk
  let walk = baseSpeed.walk ?? 30;
  for (const m of speedMods('walk')) {
    const op = m.mod.op ?? 'add';
    if (op === 'add') { const v = modValue(m, vars(ownerOf(m)), walk); walk += v; walkParts.push({ label: m.effectName, value: v, source: m.source }); }
  }
  for (const m of speedMods('walk')) {
    if (m.mod.op === 'max') { const v = modValue(m, vars(ownerOf(m)), walk); if (v > walk) { walkParts.push({ label: `${m.effectName} (minimum ${v})`, value: v - walk, source: m.source }); walk = v; } }
  }
  if (armorWorn?.item.armor?.strRequirement && scores.str < armorWorn.item.armor.strRequirement && !flags.has('heavy-armor-speed-ok')) { walk -= 10; walkParts.push({ label: 'Armor too heavy (STR requirement)', value: -10 }); }
  const carryingPre = computeCarrying(ch, scores.str, race?.size ?? 'medium', flags, mods);
  if (ch.settings.encumbrance === 'variant') {
    if (carryingPre.status === 'encumbered') { walk -= 10; walkParts.push({ label: 'Encumbered', value: -10 }); }
    if (carryingPre.status === 'heavily-encumbered' || carryingPre.status === 'over-capacity') { walk -= 20; walkParts.push({ label: 'Heavily encumbered', value: -20 }); }
  } else if (ch.settings.encumbrance === 'standard' && carryingPre.status === 'over-capacity') {
    walkParts.push({ label: 'Over carrying capacity (max 5 ft unless pushing/dragging)', value: 5 - walk }); walk = 5;
  }
  if (ch.combat.exhaustion >= 2) { const h = Math.floor(walk / 2); walkParts.push({ label: 'Exhaustion (speed halved)', value: h - walk }); walk = h; }
  const zeroSet = mods.find((m) => m.mod.target === 'speed:all' && m.mod.op === 'set' && !m.mod.condition);
  speed.walk = { value: Math.max(0, walk), parts: walkParts };
  for (const mode of ['fly', 'swim', 'climb', 'burrow'] as MovementMode[]) {
    const parts: Part[] = [];
    let v = baseSpeed[mode] ?? 0;
    if (v) parts.push({ label: `${race?.name ?? 'Base'}`, value: v });
    for (const g of speedGrants.filter((g) => g.mode === mode)) {
      const gv = g.value === 'walk' ? speed.walk.value : g.value;
      if (gv > v) { parts.push({ label: g.source, value: gv - v }); v = gv; }
    }
    for (const m of speedMods(mode)) {
      const op = m.mod.op ?? 'add';
      const mv = modValue(m, vars(ownerOf(m)), speed.walk.value);
      if (op === 'add' && v > 0) { v += mv; parts.push({ label: m.effectName, value: mv, source: m.source }); }
      if (op === 'max' && mv > v) { parts.push({ label: m.effectName, value: mv - v, source: m.source }); v = mv; }
      if (op === 'set') { parts.push({ label: m.effectName, value: mv - v, source: m.source }); v = mv; }
    }
    if (ch.combat.exhaustion >= 2 && v > 0) { const h = Math.floor(v / 2); parts.push({ label: 'Exhaustion', value: h - v }); v = h; }
    speed[mode] = { value: Math.max(0, v), parts };
  }
  if (zeroSet) for (const mode of Object.keys(speed) as MovementMode[]) if (speed[mode].value > 0) { speed[mode].parts.push({ label: zeroSet.effectName, value: -speed[mode].value, source: zeroSet.source }); speed[mode].value = 0; }
  if (ch.settings.overrides.speed !== undefined) speed.walk = { value: ch.settings.overrides.speed, parts: [...speed.walk.parts, { label: 'Manual override', value: 0 }] };

  // ------------------------------------------------------------------ hit points
  const conMod = abilities.con.mod;
  const hpParts: Part[] = [];
  let hpMax = 0;
  classes.forEach(({ entry, def, level }, idx) => {
    if (!def || level <= 0) return;
    const die = def.hitDie;
    let sum = 0;
    for (let l = 0; l < level; l++) {
      const isFirst = idx === 0 && l === 0;
      const rollIdx = idx === 0 ? l - 1 : l;
      const rolled = isFirst ? die : (entry.hpRolls[rollIdx] ?? averageOfDie(die));
      sum += Math.max(1, rolled + conMod);
    }
    hpMax += sum;
    hpParts.push({ label: `${def.name} ${level} (d${die}${idx === 0 ? ', max at 1st level' : ''}) incl. CON`, value: sum });
  });
  for (const m of mods) {
    if (m.mod.condition || !meets(m.mod.requires)) continue;
    if (m.mod.target === 'hp-per-level') { const v = modValue(m, vars(ownerOf(m))); const lv = ownerOf(m) ? classLevel(ownerOf(m)!) : totalLevel; hpParts.push({ label: `${m.effectName} (${v} × ${lv} levels)`, value: v * lv, source: m.source }); hpMax += v * lv; }
    if (m.mod.target === 'hp-max') { const v = modValue(m, vars(ownerOf(m))); hpParts.push({ label: m.effectName, value: v, source: m.source }); hpMax += v; }
  }
  if (ch.combat.exhaustion >= 4) { const h = Math.floor(hpMax / 2); hpParts.push({ label: 'Exhaustion 4+ (halved)', value: h - hpMax }); hpMax = h; }
  if (ch.combat.hpMaxReduction) { hpParts.push({ label: 'Maximum HP reduction', value: -ch.combat.hpMaxReduction }); hpMax -= ch.combat.hpMaxReduction; }
  hpMax = Math.max(1, hpMax);
  const hpOverride = ch.settings.overrides.maxHp;
  if (hpOverride !== undefined) hpMax = hpOverride;

  const diceMap = new Map<number, { die: number; total: number; used: number; classes: string[] }>();
  for (const { def, level } of classes) {
    if (!def) continue;
    const d = diceMap.get(def.hitDie) ?? { die: def.hitDie, total: 0, used: 0, classes: [] };
    d.total += level; d.classes.push(def.name);
    diceMap.set(def.hitDie, d);
  }
  for (const d of diceMap.values()) d.used = Math.min(d.total, ch.combat.hitDiceUsed[String(d.die)] ?? 0);

  // ------------------------------------------------------------------ defenses from mods
  for (const m of mods) {
    const t = m.mod.target;
    if (!meets(m.mod.requires)) continue;
    if (t.startsWith('resistance:')) resist.push({ type: t.slice(11) === 'all-nonmagical-bps' ? 'nonmagical bludgeoning/piercing/slashing' : t.slice(11), source: m.effectName, conditional: m.mod.condition });
    else if (m.mod.condition) continue;
    else if (t.startsWith('immunity:')) immune.push({ type: t.slice(9), source: m.effectName });
    else if (t.startsWith('vulnerability:')) vuln.push({ type: t.slice(14), source: m.effectName });
    else if (t.startsWith('condition-immunity:')) condImm.push({ type: t.slice(19), source: m.effectName });
    else if (t.startsWith('sense:')) addSense(t.slice(6), modValue(m, V), m.effectName);
  }
  if (activeConditions.has('petrified')) resist.push({ type: 'all damage', source: 'Petrified' });
  const damageReduction: Part[] = mods.filter((m) => m.mod.target === 'damage-reduction' && !m.mod.condition && meets(m.mod.requires)).map((m) => ({ label: m.effectName, value: modValue(m, vars(ownerOf(m))), source: m.source }));

  // ------------------------------------------------------------------ resources
  const resources: ResourceView[] = [];
  // Later definitions with the same id override earlier ones (e.g. Font of Inspiration changes recharge).
  const resById = new Map<string, (typeof resourceDefs)[number]>();
  for (const r of resourceDefs) {
    if (r.def.minLevel && r.ownerClass && classLevel(r.ownerClass) < r.def.minLevel) continue;
    resById.set(r.def.id, r);
  }
  for (const { def, source, ownerClass } of resById.values()) {
    const rv = vars(ownerClass);
    let max = Math.max(0, Math.floor(safeFormula(def.max, rv, 0)));
    for (const m of mods) if (m.mod.target === `resource-max:${def.id}` && !m.mod.condition) max += modValue(m, rv);
    const st = ch.resources[def.id];
    const overridden = st?.maxOverride !== undefined;
    if (overridden) max = st!.maxOverride!;
    const used = Math.min(max, Math.max(0, st?.used ?? 0));
    const die = def.die === undefined ? undefined : typeof def.die === 'number' ? `d${def.die}` : /^[a-z_(]/i.test(def.die) && !/^d\d/.test(def.die) ? `d${safeFormula(def.die, rv, 0)}` : def.die;
    resources.push({ id: def.id, name: def.name, max, used, remaining: max - used, recharge: def.recharge, die, pool: !!def.pool, source, overridden });
  }

  // ------------------------------------------------------------------ spellcasting
  const casters: CasterView[] = [];
  const casterEntries: { progression: SpellcastingDef['progression']; level: number }[] = [];
  let warlockLevel = 0;
  const spellDcMods = mods.filter((m) => m.mod.target === 'spell-dc');
  const spellAtkMods = mods.filter((m) => m.mod.target === 'spell-attack');
  for (const { def, subclass, level } of classes) {
    if (!def) continue;
    const sc = def.spellcasting ?? (subclass && level >= def.subclassLevel ? subclass.spellcasting : undefined);
    if (!sc) continue;
    if (level < (sc.startLevel ?? 1)) continue;
    if (sc.progression === 'pact') warlockLevel += level;
    else casterEntries.push({ progression: sc.progression, level });
    const mod = abilities[sc.ability].mod;
    const dc = emptyBreakdown();
    dc.parts.push({ label: 'Base', value: 8 }, { label: 'Proficiency', value: profBonus }, { label: `${ABILITY_NAMES[sc.ability]} modifier`, value: mod });
    for (const m of spellDcMods) if (!m.mod.condition) dc.parts.push({ label: m.effectName, value: modValue(m, V), source: m.source }); else dc.conditional.push({ label: m.effectName, condition: m.mod.condition });
    if (ch.settings.overrides.spellDc !== undefined) dc.override = ch.settings.overrides.spellDc;
    const atk = emptyBreakdown();
    atk.parts.push({ label: 'Proficiency', value: profBonus }, { label: `${ABILITY_NAMES[sc.ability]} modifier`, value: mod });
    for (const m of spellAtkMods) if (!m.mod.condition) atk.parts.push({ label: m.effectName, value: modValue(m, V), source: m.source }); else atk.conditional.push({ label: m.effectName, condition: m.mod.condition });
    applyMods(atk, ['attack'], { scopeTags: ['spell', 'all'] });
    if (ch.settings.overrides.spellAttack !== undefined) atk.override = ch.settings.overrides.spellAttack;
    const idx = Math.max(0, level - 1);
    const cv = vars(def.id);
    casters.push({
      classId: def.id,
      name: subclass?.spellcasting && !def.spellcasting ? `${def.name} (${subclass.name})` : def.name,
      ability: sc.ability,
      style: sc.style,
      dc: finalizeBreakdown(dc),
      attack: finalizeBreakdown(atk),
      cantripsKnown: sc.cantrips ? sc.cantrips[idx] : undefined,
      spellsKnown: sc.known ? sc.known[idx] : undefined,
      preparedLimit: sc.prepared !== undefined ? Math.max(1, Math.floor(safeFormula(sc.prepared, cv, 1))) : undefined,
      maxSpellLevel: maxSpellLevelForClass(sc.progression, level),
      list: sc.list,
      progression: sc.progression,
      classLevel: level,
      ritual: !!sc.ritual,
      spellbookMin: sc.style === 'spellbook' ? (sc.spellbookStart ?? 6) + (level - 1) * (sc.spellbookPerLevel ?? 2) : undefined,
    });
  }
  const { casterLevel, slots: slotMax } = computeSpellSlots(casterEntries);
  const bonus = ch.spells.bonusSlots ?? [];
  const slots = slotMax.map((max, i) => ({ level: i + 1, max: max + (bonus[i + 1] ?? 0), used: Math.min(max + (bonus[i + 1] ?? 0), ch.spells.slotsUsed[i + 1] ?? 0) })).filter((s) => s.max > 0);
  const pm = warlockLevel > 0 ? pactMagic(warlockLevel) : undefined;
  const pact = pm ? { slots: pm.slots, level: pm.slotLevel, used: Math.min(pm.slots, ch.spells.pactSlotsUsed) } : undefined;

  // spells view
  const spellViews: SpellView[] = [];
  const casterFor = (cid?: string) => casters.find((c) => c.classId === cid) ?? casters[0];
  for (const e of ch.spells.entries) {
    const spell = db.spells.get(e.spellId);
    const cv = casterFor(e.classId);
    const isCantrip = (spell?.level ?? 0) === 0;
    const style = cv?.style;
    const kind: SpellView['kind'] = isCantrip ? 'cantrip' : e.source !== 'class' ? (e.uses ? 'innate' : 'granted') : style === 'spellbook' ? (e.prepared ? 'prepared' : 'spellbook') : style === 'prepared' ? (e.prepared ? 'prepared' : 'known') : 'known';
    const ability = e.ability ?? cv?.ability;
    spellViews.push({
      key: e.id, entry: e, spell, spellId: e.spellId, classId: e.classId, kind,
      prepared: isCantrip || e.prepared || (e.source === 'class' && style === 'known'),
      alwaysPrepared: false, inSpellbook: !!e.inSpellbook, granted: e.source !== 'class', sourceLabel: e.sourceLabel ?? (db.classes.get(e.classId ?? '')?.name ?? e.source),
      favorite: !!e.favorite,
      dc: ability ? 8 + profBonus + abilities[ability].mod + spellDcMods.filter((m) => !m.mod.condition).reduce((s, m) => s + modValue(m, V), 0) : undefined,
      attack: ability ? profBonus + abilities[ability].mod + spellAtkMods.filter((m) => !m.mod.condition).reduce((s, m) => s + modValue(m, V), 0) : undefined,
      uses: e.uses ? { max: e.uses.max, used: e.uses.used, recharge: e.uses.recharge, resourceId: '' } : undefined,
      countsAgainstLimit: e.source === 'class' && !isCantrip,
    });
    if (!spell) warnings.push(`Spell "${e.spellId}" not found in content.`);
  }
  for (const g of grantedSpells) {
    const spell = db.spells.get(g.spellId);
    const key = `grant:${g.source.kind}:${g.source.id}:${g.spellId}`;
    const existing = spellViews.find((v) => v.spellId === g.spellId && (v.classId === g.ownerClass || !g.ownerClass));
    if (g.mode === 'expanded-list') continue; // only expands choices; shown in spell browser
    if (existing && g.mode === 'always-prepared') { existing.alwaysPrepared = true; existing.prepared = true; existing.countsAgainstLimit = false; existing.kind = 'always-prepared'; existing.sourceLabel = g.source.label; continue; }
    if (existing) continue;
    const ability = g.ability ?? casterFor(g.ownerClass)?.ability ?? 'cha';
    const resId = g.uses ? `spell-use:${g.source.id}:${g.spellId}` : '';
    const usedRes = resId ? Math.min(g.uses!.max, ch.resources[resId]?.used ?? 0) : 0;
    spellViews.push({
      key, spell, spellId: g.spellId, classId: g.ownerClass,
      kind: g.mode === 'always-prepared' ? 'always-prepared' : g.mode === 'innate' ? 'innate' : (spell?.level ?? 0) === 0 ? 'cantrip' : 'granted',
      prepared: true, alwaysPrepared: g.mode === 'always-prepared', inSpellbook: false, granted: true, sourceLabel: g.source.label,
      favorite: !!ch.choices[`fav:${key}`]?.length,
      dc: 8 + profBonus + abilities[ability].mod, attack: profBonus + abilities[ability].mod,
      uses: g.uses ? { max: g.uses.max, used: usedRes, recharge: g.uses.recharge, resourceId: resId } : undefined,
      countsAgainstLimit: false,
    });
    if (g.uses && g.uses.max > 0) resources.push({ id: resId, name: `${spell?.name ?? g.spellId} (${g.source.label})`, max: g.uses.max, used: usedRes, remaining: g.uses.max - usedRes, recharge: g.uses.recharge as ResourceDef['recharge'], pool: false, source: g.source, overridden: false });
  }
  // Limits
  for (const cv of casters) {
    const mine = spellViews.filter((v) => v.classId === cv.classId && v.entry?.source === 'class');
    const cantrips = mine.filter((v) => (v.spell?.level ?? 0) === 0).length;
    if (cv.cantripsKnown !== undefined && cantrips > cv.cantripsKnown) warnings.push(`${cv.name}: ${cantrips} cantrips known, limit ${cv.cantripsKnown}.`);
    const leveled = mine.filter((v) => (v.spell?.level ?? 0) > 0 && v.countsAgainstLimit);
    if (cv.style === 'known' && cv.spellsKnown !== undefined && leveled.length > cv.spellsKnown) warnings.push(`${cv.name}: ${leveled.length} spells known, limit ${cv.spellsKnown}.`);
    if (cv.style !== 'known' && cv.preparedLimit !== undefined) {
      const prepared = leveled.filter((v) => v.prepared).length;
      if (prepared > cv.preparedLimit) warnings.push(`${cv.name}: ${prepared} spells prepared, limit ${cv.preparedLimit}.`);
    }
    for (const v of leveled) if ((v.spell?.level ?? 0) > cv.maxSpellLevel) warnings.push(`${cv.name}: ${v.spell?.name} is level ${v.spell?.level}, above your maximum (${cv.maxSpellLevel}).`);
  }

  // ------------------------------------------------------------------ attacks
  const attacks = computeAttacks({ ch, abilities, profBonus, profSets, mods, meets, modValue: (m) => modValue(m, vars(ownerOf(m))), flags, effects: activeEffects, casters, equippedWeapons, V, classLevel, toggleOn, db, varsFor: vars });

  // ------------------------------------------------------------------ attunement & warnings
  let attLimit = ch.settings.attunementLimit ?? 3;
  for (const m of mods) if (m.mod.target === 'attunement-slots' && !m.mod.condition) attLimit += modValue(m, V);
  if (attunedCount > attLimit) warnings.push(`Attuned to ${attunedCount} items; limit is ${attLimit}.`);
  for (const it of inv) {
    if (it.attuned && !it.item.attunement?.required) warnings.push(`${it.item.name} does not require attunement.`);
    const r = it.item.attunement?.restriction;
    if (it.attuned && r && !attunementRestrictionMet(r, classes.map((c) => c.def?.name ?? ''), race?.name, subrace?.name, casters.length > 0, ch.identity.alignment)) warnings.push(`${it.item.name} requires attunement by ${r}.`);
  }
  if (ch.combat.exhaustion >= 6) warnings.push('Exhaustion level 6: the character is dead.');
  if (ch.combat.deathSaves.failures >= 3) warnings.push('Three death save failures: the character is dead.');
  for (const [k, ids] of Object.entries(ch.choices)) {
    if (!Array.isArray(ids)) warnings.push(`Choice ${k} has invalid data.`);
  }

  // Languages
  const languages = [...profSets.languages.keys()];
  const sources: Record<string, string[]> = {};
  for (const [k, m] of Object.entries(profSets)) for (const [v, s] of m) sources[`${k}:${v}`] = s;

  // Class line
  const classLine = classes.map(({ def, subclass, level }) => `${def?.name ?? '?'}${subclass && def && level >= def.subclassLevel ? ` (${subclass.name})` : ''} ${level}`).join(' / ') || 'No class';

  const carrying = carryingPre;
  const sizeStr = ch.identity.size ?? race?.size ?? 'medium';

  return {
    totalLevel, profBonus, classes, classLine, abilities, saves, skills, checks, passives, initiative, ac, speed,
    hp: { max: hpMax, parts: hpParts, current: Math.min(ch.combat.hpCurrent, hpMax), temp: ch.combat.hpTemp, override: hpOverride },
    hitDice: [...diceMap.values()].sort((a, b) => b.die - a.die),
    senses: Object.entries(senses).map(([name, s]) => ({ name, range: s.range, source: s.source })),
    resistances: dedupeBy(resist, (r) => r.type + (r.conditional ?? '')),
    immunities: dedupeBy(immune, (r) => r.type),
    vulnerabilities: dedupeBy(vuln, (r) => r.type),
    conditionImmunities: dedupeBy(condImm, (r) => r.type),
    damageReduction,
    proficiencies: {
      armor: [...profSets.armor.keys()].map((a) => ARMOR_PROF_LABEL[a] ?? a),
      weapons: [...profSets.weapons.keys()],
      tools: [...profSets.tools.keys()],
      languages,
      sources,
    },
    features, choices: allChoices, resources, casters, slots, pact, casterLevel,
    spells: spellViews,
    attacks,
    carrying,
    attunement: { count: attunedCount, limit: attLimit },
    toggles, manual: manualList,
    activeConditions: [...activeConditions],
    warnings: [...new Set(warnings)],
    size: sizeStr,
    armorWorn, shieldWorn, flags,
    formulaVars: V,
    varsFor: vars,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dedupeBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
}

/** If feature B has `replaces: A`, only show B when both are unlocked. */
function collapseReplaced(fs: FeatureDef[]): FeatureDef[] {
  const replaced = new Set(fs.map((f) => f.replaces).filter(Boolean) as string[]);
  return fs.filter((f) => !replaced.has(f.id));
}

function armorBase(i: InventoryItem): number { return (i.item.armor?.baseAc ?? 0) + (i.item.armor?.bonus ?? 0); }

export function itemEffectActive(e: Effect, it: InventoryItem): boolean {
  const act = e.activation ?? 'equipped';
  const requiresAttune = !!it.item.attunement?.required;
  const wearable = it.item.category !== 'potion' && it.item.category !== 'scroll' && it.item.category !== 'consumable';
  switch (act) {
    case 'carried': return true;
    case 'equipped': return it.equipped && (!requiresAttune || it.attuned);
    case 'attuned': return it.attuned && (!wearable || it.equipped);
    case 'toggle': return (!requiresAttune || it.attuned) && (it.equipped || !wearable);
    case 'always': return !requiresAttune || it.attuned;
    default: return false;
  }
}

function checkRequirement(r: Requirement, ctx: { armorWorn?: InventoryItem; shieldWorn?: InventoryItem; equippedWeapons: InventoryItem[] }, attack?: { weapon?: InventoryItem; ability?: Ability }): boolean {
  const cat = ctx.armorWorn?.item.armor?.category;
  switch (r) {
    case 'armored': return !!ctx.armorWorn;
    case 'unarmored': return !ctx.armorWorn;
    case 'no-shield': return !ctx.shieldWorn;
    case 'shield': return !!ctx.shieldWorn;
    case 'no-heavy-armor': case 'not-heavy-armor-equipped': return cat !== 'heavy';
    case 'light-or-no-armor': return !cat || cat === 'light';
    case 'no-medium-heavy-armor': return !cat || cat === 'light';
    case 'wielding-melee': return ctx.equippedWeapons.some((w) => w.item.weapon?.kind === 'melee');
    case 'one-handed-melee-only': {
      const w = attack?.weapon?.item.weapon;
      if (!w) return false;
      const others = ctx.equippedWeapons.filter((x) => x.id !== attack!.weapon!.id);
      return w.kind === 'melee' && !w.properties.includes('two-handed') && others.length === 0;
    }
    default:
      if ((r as string) === 'str-attack') return attack?.ability === 'str';
      return true;
  }
}

function scopeMatches(scope: AttackScope, tags: AttackScope[], modItem: InventoryItem | undefined, weapon?: InventoryItem): boolean {
  if (scope === 'all') return true;
  if (scope === 'this-item') return !!modItem && !!weapon && modItem.id === weapon.id;
  return tags.includes(scope);
}

function computeAC(
  abilities: Record<Ability, AbilityView>, armor: InventoryItem | undefined, shield: InventoryItem | undefined,
  mods: CMod[], meets: (r?: Requirement[]) => boolean, val: (m: CMod) => number, flags: Set<string>,
): ArmorClassView {
  const dex = abilities.dex.mod;
  const candidates: ArmorClassView['candidates'] = [];
  const formulas: { label: string; value: number; parts: Part[]; allowsShield: boolean; valid: boolean; reason?: string }[] = [];
  if (armor?.item.armor) {
    const a = armor.item.armor;
    const medMaster = a.category === 'medium' && flags.has('medium-armor-master');
    const cap = a.dexCap === null ? 0 : a.dexCap === undefined ? (a.category === 'medium' ? (medMaster ? 3 : 2) : a.category === 'heavy' ? 0 : Infinity) : (medMaster && a.category === 'medium' ? Math.max(a.dexCap, 3) : a.dexCap);
    const dexPart = a.category === 'heavy' || a.dexCap === null ? 0 : Math.min(dex, cap);
    const parts: Part[] = [{ label: `${armor.item.name} base`, value: a.baseAc }];
    if (a.category !== 'heavy' && a.dexCap !== null) parts.push({ label: `Dexterity${cap !== Infinity ? ` (max ${cap})` : ''}`, value: dexPart });
    if (a.bonus) parts.push({ label: 'Magic bonus', value: a.bonus });
    formulas.push({ label: armor.item.name, value: parts.reduce((s, p) => s + p.value, 0), parts, allowsShield: true, valid: true });
  } else {
    formulas.push({ label: 'Unarmored (10 + DEX)', value: 10 + dex, parts: [{ label: 'Base', value: 10 }, { label: 'Dexterity', value: dex }], allowsShield: true, valid: true });
  }
  for (const m of mods) {
    if (m.mod.target !== 'ac-formula' || !m.mod.acFormula) continue;
    const f: AcFormula = m.mod.acFormula;
    let valid = meets(m.mod.requires);
    let reason: string | undefined;
    if (!f.allowsArmor && armor) { valid = false; reason = 'wearing armor'; }
    if (!f.allowsShield && shield) { valid = false; reason = 'using a shield'; }
    if (m.mod.condition) { valid = false; reason = m.mod.condition; }
    const parts: Part[] = [{ label: `${f.label} base`, value: f.base, source: m.source }];
    for (const ab of f.abilities) {
      const v = ab === 'dex' && f.maxDex !== undefined ? Math.min(abilities.dex.mod, f.maxDex) : abilities[ab].mod;
      parts.push({ label: ABILITY_NAMES[ab], value: v });
    }
    formulas.push({ label: f.label, value: parts.reduce((s, p) => s + p.value, 0), parts, allowsShield: f.allowsShield, valid, reason });
  }
  const valid = formulas.filter((f) => f.valid);
  const best = valid.reduce((a, b) => (b.value > a.value ? b : a), valid[0]);
  for (const f of formulas) candidates.push({ label: f.label, value: f.value, active: f === best, valid: f.valid, reason: f.reason });
  const parts = [...best.parts];
  if (shield?.item.armor && best.allowsShield) {
    parts.push({ label: shield.item.name, value: shield.item.armor.baseAc });
    if (shield.item.armor.bonus) parts.push({ label: `${shield.item.name} magic bonus`, value: shield.item.armor.bonus });
  }
  const conditional: CondPart[] = [];
  for (const m of mods) {
    if (m.mod.target !== 'ac' || (m.mod.op && m.mod.op !== 'add')) continue;
    if (m.mod.condition) { conditional.push({ label: m.effectName, value: val(m), condition: m.mod.condition, source: m.source }); continue; }
    if (!meets(m.mod.requires)) continue;
    parts.push({ label: m.effectName, value: val(m), source: m.source });
  }
  return { total: parts.reduce((s, p) => s + p.value, 0), formula: best.label, parts, candidates, conditional };
}

function computeCarrying(ch: Character, str: number, size: string, flags: Set<string>, mods: CMod[]): Derived['carrying'] {
  const sizeMult = size === 'tiny' ? 0.5 : size === 'large' ? 2 : size === 'huge' ? 4 : size === 'gargantuan' ? 8 : 1;
  let mult = sizeMult;
  if (flags.has('powerful-build')) mult *= 2;
  for (const m of mods) if (m.mod.target === 'carry-multiplier' && typeof m.mod.value === 'number' && !m.mod.condition) mult *= m.mod.value;
  const capacity = str * 15 * mult;
  const coins = ch.currency.cp + ch.currency.sp + ch.currency.ep + ch.currency.gp + ch.currency.pp;
  const coinWeight = coins / 50;
  const containerIds = new Set(ch.inventory.filter((i) => /bag of holding|handy haversack|portable hole/i.test(i.item.name)).map((i) => i.id));
  let weight = 0;
  for (const it of ch.inventory) {
    if (it.excludeWeight) continue;
    if (it.containerId && containerIds.has(it.containerId)) continue; // extradimensional storage
    weight += (it.item.weight || 0) * it.quantity;
  }
  weight += coinWeight;
  weight = Math.round(weight * 100) / 100;
  const encumberedAt = str * 5 * mult;
  const heavilyAt = str * 10 * mult;
  let status: Derived['carrying']['status'] = 'normal';
  if (weight > capacity) status = 'over-capacity';
  else if (ch.settings.encumbrance === 'variant') status = weight > heavilyAt ? 'heavily-encumbered' : weight > encumberedAt ? 'encumbered' : 'normal';
  return { weight, capacity, pushDragLift: capacity * 2, coinWeight, status, encumberedAt, heavilyAt };
}

function attunementRestrictionMet(r: string, classNames: string[], race?: string, subrace?: string, spellcaster?: boolean, alignment?: string): boolean {
  const s = r.toLowerCase();
  if (/spellcaster/.test(s)) return !!spellcaster;
  const words = [...classNames, race ?? '', subrace ?? ''].map((x) => x.toLowerCase()).filter(Boolean);
  if (words.some((w) => s.includes(w.replace(/s$/, '')))) return true;
  if (alignment && /good|evil|lawful|chaotic|neutral/.test(s)) return s.split(/\s+or\s+|,\s*/).some((part) => alignment.toLowerCase().includes(part.replace(/a creature of |alignment/g, '').trim()));
  // Unknown restriction text: can't verify → don't block
  return !/bard|cleric|druid|paladin|ranger|sorcerer|warlock|wizard|monk|fighter|rogue|barbarian|dwarf|elf|halfling|gnome|human/.test(s);
}

// ---------------------------------------------------------------------------
// Attacks
// ---------------------------------------------------------------------------

interface AttackCtx {
  ch: Character;
  abilities: Record<Ability, AbilityView>;
  profBonus: number;
  profSets: { weapons: Map<string, string[]> };
  mods: CMod[];
  meets: (r: Requirement[] | undefined, a?: { weapon?: InventoryItem; ability?: Ability }) => boolean;
  modValue: (m: CMod) => number;
  flags: Set<string>;
  effects: { e: Effect; source: SourceRef; item?: InventoryItem; ownerClass?: string }[];
  casters: CasterView[];
  equippedWeapons: InventoryItem[];
  V: FormulaVars;
  classLevel: (id: string) => number;
  toggleOn: (key: string, e: Effect, item?: InventoryItem) => boolean;
  db: ContentDB;
  varsFor: (ownerClass?: string) => FormulaVars;
}

/** Expand "{formula}" templates inside dice strings/text, e.g. "{ceil(cl/2)}d6" → "3d6". */
export function expandTemplate(str: string, vars: FormulaVars): string {
  return str.replace(/\{([^}]*)\}/g, (_, f) => String(Math.floor(safeFormula(f, vars, 0))));
}
const expandOutcomes = (os: Outcome[] | undefined, vars: FormulaVars): Outcome[] | undefined =>
  os?.map((o) => ({ ...o, ...(o.dice ? { dice: expandTemplate(o.dice, vars) } : {}), ...(o.text ? { text: expandTemplate(o.text, vars) } : {}) }));

export function weaponProficient(w: ItemDefinition, profs: Map<string, string[]>): boolean {
  if (!w.weapon) return false;
  if (profs.has(w.weapon.category)) return true;
  const base = w.weapon.baseWeapon ?? w.id;
  const names = [base, w.name.toLowerCase(), base.replace(/-/g, ' ')];
  for (const p of profs.keys()) {
    const k = p.toLowerCase().replace(/s$/, '');
    if (names.some((n) => n === p || n.replace(/s$/, '') === k || n.replace(/-/g, ' ') === k.replace(/-/g, ' '))) return true;
  }
  return false;
}

function computeAttacks(c: AttackCtx): AttackView[] {
  const out: AttackView[] = [];
  const { abilities, profBonus } = c;
  const monkLevel = c.classLevel('monk');
  const martialArtsDie = monkLevel ? (monkLevel >= 17 ? 10 : monkLevel >= 11 ? 8 : monkLevel >= 5 ? 6 : 4) : 0;
  const critRangeMods = c.mods.filter((m) => m.mod.target === 'crit-range' && !m.mod.condition);
  const globalCrit = critRangeMods.reduce((lo, m) => Math.min(lo, c.modValue(m) || 20), 20);
  const weapons = c.equippedWeapons;
  const ridersFromEffects = (scopeTags: AttackScope[], weapon?: InventoryItem): Rider[] => {
    const rs: Rider[] = [];
    for (const x of c.effects) {
      const e = x.e;
      if (!e.trigger || e.trigger === 'passive') continue;
      if (!['on-hit', 'on-crit', 'on-attack'].includes(e.trigger)) continue;
      if (x.item && weapon && x.item.id !== weapon.id && x.item.item.weapon) continue; // other weapon's rider
      if (x.item && !weapon) continue;
      if (e.scope && !scopeMatches(e.scope, scopeTags, x.item, weapon)) continue;
      let dc: number | undefined;
      if (e.save) {
        if (e.save.dc.kind === 'fixed') dc = e.save.dc.value;
        else if (e.save.dc.kind === 'spell') dc = (c.casters.find((cv) => cv.classId === (e.save!.dc as { classId?: string }).classId) ?? c.casters[0])?.dc.total;
        else dc = Math.floor(safeFormula(e.save.dc.formula, c.varsFor(x.ownerClass), 10));
      }
      const vv = c.varsFor(x.ownerClass);
      const expanded: Effect = { ...e, outcomes: expandOutcomes(e.outcomes, vv), save: e.save ? { ...e.save, onFailure: expandOutcomes(e.save.onFailure, vv)!, onSuccess: expandOutcomes(e.save.onSuccess, vv) } : undefined };
      rs.push({
        label: e.name ?? x.source.label, trigger: e.trigger, text: e.description ? expandTemplate(e.description, vv) : describeOutcomes(expanded, dc), dc, saveAbility: e.save?.ability,
        outcomes: expanded.save ? expanded.save.onFailure : expanded.outcomes, onSuccess: expanded.save?.onSuccess, oncePerTurn: e.oncePerTurn, source: x.source, usesResource: e.consumes?.resourceId ?? e.uses?.resourceId,
      });
    }
    return rs;
  };

  const build = (it: InventoryItem | undefined, offhand: boolean): AttackView | null => {
    const def = it?.item;
    const w = def?.weapon;
    const isUnarmed = !it;
    const kind = w?.kind ?? 'melee';
    const props = w?.properties ?? [];
    const thrown = props.includes('thrown');
    const monkWeapon = monkLevel > 0 && (isUnarmed || (w && ((w.category === 'simple' && kind === 'melee' && !props.includes('two-handed') && !props.includes('heavy')) || w.baseWeapon === 'shortsword')));
    let ability: Ability;
    if (w?.ability && w.ability !== 'auto') ability = w.ability;
    else if (kind === 'ranged') ability = 'dex';
    else if (props.includes('finesse') || monkWeapon) ability = abilities.dex.mod > abilities.str.mod ? 'dex' : 'str';
    else ability = 'str';
    // Hex Warrior / similar: flag 'attack-ability-cha' applies to weapons the user marks via ability override; general flag here:
    const scopeTags: AttackScope[] = ['all', kind === 'melee' ? 'melee' : 'ranged', ...(isUnarmed ? ['unarmed' as AttackScope, 'melee' as AttackScope] : ['weapon' as AttackScope, kind === 'melee' ? 'melee-weapon' as AttackScope : 'ranged-weapon' as AttackScope]), ...(thrown ? ['thrown' as AttackScope] : [])];
    const proficient = isUnarmed || (def ? weaponProficient(def, c.profSets.weapons) : false);
    const atk = emptyBreakdown();
    atk.parts.push({ label: `${ABILITY_NAMES[ability]} modifier`, value: abilities[ability].mod });
    if (proficient) atk.parts.push({ label: 'Proficiency', value: profBonus });
    if (w?.attackBonus) atk.parts.push({ label: 'Weapon bonus', value: w.attackBonus });
    const actx = { weapon: it, ability, scopeTags };
    for (const m of c.mods) {
      if (m.mod.target !== 'attack') continue;
      if (m.mod.scope && !scopeMatches(m.mod.scope, scopeTags, m.item, it)) continue;
      if (!m.mod.scope && m.item && m.item.item.weapon && m.item.id !== it?.id) continue;
      if (!c.meets(m.mod.requires, actx)) continue;
      const op = m.mod.op ?? 'add';
      if (m.mod.condition) { atk.conditional.push({ label: m.effectName, value: op === 'add' ? c.modValue(m) : undefined, op, condition: m.mod.condition, source: m.source }); continue; }
      if (op === 'advantage') atk.advantage.push({ label: m.effectName, source: m.source });
      else if (op === 'disadvantage') atk.disadvantage.push({ label: m.effectName, source: m.source });
      else if (op === 'add') atk.parts.push({ label: m.effectName, value: c.modValue(m), source: m.source });
    }
    finalizeBreakdown(atk);
    const dmg = emptyBreakdown();
    const abilityDmg = abilities[ability].mod;
    const twf = c.flags.has('two-weapon-fighting');
    if (!offhand || abilityDmg < 0 || twf) dmg.parts.push({ label: `${ABILITY_NAMES[ability]} modifier${offhand && twf ? ' (Two-Weapon Fighting)' : ''}`, value: abilityDmg });
    if (w?.damageBonus) dmg.parts.push({ label: 'Weapon bonus', value: w.damageBonus });
    const extra: AttackView['extraDamage'] = [];
    for (const x of w?.extraDamage ?? []) extra.push({ dice: x.dice, type: x.type, label: def!.name, condition: x.condition });
    for (const m of c.mods) {
      if (m.mod.target !== 'damage' && m.mod.target !== 'extra-damage') continue;
      if (m.mod.scope && !scopeMatches(m.mod.scope, scopeTags, m.item, it)) continue;
      if (!m.mod.scope && m.item && m.item.item.weapon && m.item.id !== it?.id) continue;
      if (!c.meets(m.mod.requires, actx)) continue;
      if (m.mod.target === 'extra-damage') { extra.push({ dice: String(m.mod.value ?? ''), type: m.mod.damageType ?? '', label: m.effectName, condition: m.mod.condition }); continue; }
      if (m.mod.condition) { dmg.conditional.push({ label: m.effectName, value: c.modValue(m), condition: m.mod.condition, source: m.source }); continue; }
      dmg.parts.push({ label: m.effectName, value: c.modValue(m), source: m.source });
    }
    finalizeBreakdown(dmg);
    let dice = isUnarmed ? '1' : (w?.damage.dice ?? '1');
    if (monkWeapon && martialArtsDie) {
      const cur = dieSize(dice);
      if (martialArtsDie > cur) dice = `1d${martialArtsDie}`;
    }
    const range = w?.range ? `${w.range.normal}${w.range.long ? `/${w.range.long}` : ''} ft` : props.includes('reach') ? '10 ft' : '5 ft';
    const notes: string[] = [];
    if (!proficient) notes.push('Not proficient: no proficiency bonus to attack.');
    if (props.includes('loading')) notes.push('Loading: one shot per action regardless of attacks.');
    if (props.includes('heavy') && /small|tiny/.test(c.ch.identity.size ?? '')) notes.push('Heavy: Small creatures have disadvantage.');
    if (offhand) notes.push('Off-hand attack (bonus action, Two-Weapon Fighting rules).');
    const crit = Math.min(globalCrit, w?.critRange ?? 20);
    return {
      id: it ? `${it.id}${offhand ? ':off' : ''}` : 'unarmed',
      name: isUnarmed ? (monkLevel ? 'Unarmed Strike (Martial Arts)' : 'Unarmed Strike') : `${def!.name}${offhand ? ' (off-hand)' : ''}`,
      itemInstanceId: it?.id,
      kind: isUnarmed ? 'unarmed' : offhand ? 'offhand' : 'weapon',
      ability, proficient, attack: atk, damageDice: dice, damageBonus: dmg,
      damageType: isUnarmed ? 'bludgeoning' : w!.damage.type,
      versatileDice: w?.versatile,
      extraDamage: extra,
      range,
      properties: props,
      critRange: crit,
      riders: ridersFromEffects(scopeTags, it),
      notes,
    };
  };
  for (const it of weapons) {
    const a = build(it, false);
    if (a) out.push(a);
    if (it.offHand) { const o = build(it, true); if (o) out.push(o); }
  }
  const un = build(undefined, false);
  if (un) out.push(un);
  return out;
}

export function dieSize(dice: string): number {
  const m = dice.match(/d(\d+)/);
  return m ? Number(m[1]) : 0;
}

export function describeOutcomes(e: Effect, dcValue?: number): string {
  const parts: string[] = [];
  const fmt = (o: Outcome) => {
    switch (o.kind) {
      case 'damage': return `${o.dice ?? ''} ${o.damageType ?? ''} damage`.trim();
      case 'heal': return `heal ${o.dice ?? o.amount ?? ''}`;
      case 'temp-hp': return `${o.dice ?? o.amount ?? ''} temporary HP`;
      case 'condition': return `${o.condition}${o.duration ? ` (${o.duration})` : ''}`;
      case 'prone': return 'knocked prone';
      case 'push': return `pushed ${o.amount ?? 10} ft`;
      case 'bonus': return `+${o.amount ?? o.dice ?? ''} ${o.text ?? ''}`.trim();
      case 'penalty': return `−${o.amount ?? o.dice ?? ''} ${o.text ?? ''}`.trim();
      case 'resource-restore': return `restore ${o.amount ?? 1} ${o.resourceId ?? ''}`;
      case 'resource-consume': return `spend ${o.amount ?? 1} ${o.resourceId ?? ''}`;
      default: return o.text ?? '';
    }
  };
  if (e.save) {
    const dc = dcValue !== undefined ? `DC ${dcValue}` : e.save.dc.kind === 'fixed' ? `DC ${e.save.dc.value}` : 'DC (spell save)';
    parts.push(`${dc} ${e.save.ability.toUpperCase()} save; on failure: ${e.save.onFailure.map(fmt).join(', ')}`);
    if (e.save.onSuccess?.length) parts.push(`on success: ${e.save.onSuccess.map(fmt).join(', ')}`);
  }
  if (e.outcomes?.length) parts.push(e.outcomes.map(fmt).join(', '));
  if (e.oncePerTurn) parts.push('once per turn');
  return parts.join('; ');
}
