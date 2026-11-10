// Content registry: merges bundled content with user-created custom content.
// Custom content is stored separately (IndexedDB) and never overwritten by bundled updates.
// Custom entries with an id that collides with bundled content are namespaced on save (see persistence).

import type {
  BackgroundDef, ClassDef, ContentKind, CustomContentRecord, CustomLanguage, CustomProficiency, FeatDef,
  FeatureDef, ItemDefinition, OptionPool, RaceDef, SpellDef, SubclassDef,
} from '@/types/content';
import type { RulesetId } from '@/types/core';

export interface ConditionDef { id: string; name: string; description: string }

export interface BundledContent {
  races: RaceDef[];
  classes: ClassDef[];
  subclasses: SubclassDef[];
  backgrounds: BackgroundDef[];
  feats: FeatDef[];
  spells: SpellDef[];
  items: ItemDefinition[];
  pools: OptionPool[];
  conditions: ConditionDef[];
}

export class ContentDB {
  races = new Map<string, RaceDef>();
  classes = new Map<string, ClassDef>();
  subclasses = new Map<string, SubclassDef>();
  backgrounds = new Map<string, BackgroundDef>();
  feats = new Map<string, FeatDef>();
  spells = new Map<string, SpellDef>();
  items = new Map<string, ItemDefinition>();
  pools = new Map<string, OptionPool>();
  conditions = new Map<string, ConditionDef>();
  features = new Map<string, FeatureDef>();
  languages = new Map<string, CustomLanguage>();
  proficiencies = new Map<string, CustomProficiency>();
  /** ids of custom content per kind */
  customIds: Record<ContentKind, Set<string>> = {
    item: new Set(), spell: new Set(), feat: new Set(), race: new Set(), class: new Set(), subclass: new Set(),
    background: new Set(), feature: new Set(), language: new Set(), proficiency: new Set(),
  };
  /** Problems found while loading (invalid custom content etc.). */
  problems: string[] = [];

  readonly ruleset: RulesetId;

  constructor(bundled: BundledContent, custom: CustomContentRecord[] = [], ruleset: RulesetId = 'dnd5e-2014') {
    this.ruleset = ruleset;
    for (const r of bundled.races) this.races.set(r.id, r);
    for (const c of bundled.classes) this.classes.set(c.id, c);
    for (const s of bundled.subclasses) this.subclasses.set(s.id, s);
    for (const b of bundled.backgrounds) this.backgrounds.set(b.id, b);
    for (const f of bundled.feats) this.feats.set(f.id, f);
    for (const s of bundled.spells) this.spells.set(s.id, s);
    for (const i of bundled.items) this.items.set(i.id, i);
    for (const p of bundled.pools) this.pools.set(p.id, p);
    for (const c of bundled.conditions) this.conditions.set(c.id, c);
    for (const rec of custom) this.addCustom(rec);
  }

  addCustom(rec: CustomContentRecord) {
    // Custom content is usable in a ruleset when it's untagged, tagged 'any', or tagged with this ruleset.
    const tag = (rec.data as { ruleset?: string } | undefined)?.ruleset;
    if (tag && tag !== 'any' && tag !== this.ruleset) return;
    const map = this.mapFor(rec.kind) as Map<string, unknown>;
    if (!rec.data || typeof (rec.data as { id?: unknown }).id !== 'string') {
      this.problems.push(`Custom ${rec.kind} "${rec.id}" is malformed and was skipped.`);
      return;
    }
    map.set(rec.id, rec.data);
    this.customIds[rec.kind].add(rec.id);
  }

  mapFor(kind: ContentKind): Map<string, unknown> {
    switch (kind) {
      case 'item': return this.items;
      case 'spell': return this.spells;
      case 'feat': return this.feats;
      case 'race': return this.races;
      case 'class': return this.classes;
      case 'subclass': return this.subclasses;
      case 'background': return this.backgrounds;
      case 'feature': return this.features;
      case 'language': return this.languages;
      case 'proficiency': return this.proficiencies;
    }
  }

  isCustom(kind: ContentKind, id: string) { return this.customIds[kind].has(id); }

  subclassesFor(classId: string): SubclassDef[] {
    return [...this.subclasses.values()].filter((s) => s.classId === classId).sort((a, b) => a.name.localeCompare(b.name));
  }

  spellsForClass(listId: string): SpellDef[] {
    return [...this.spells.values()].filter((s) => s.classes.includes(listId));
  }

  allLanguages(): string[] {
    return [...this.languages.values()].map((l) => l.name);
  }
}
