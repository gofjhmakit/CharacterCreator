// Bundled content assembly, one database per ruleset (rules are never mixed).
import type { BundledContent } from './registry';
import type { ItemDefinition, SpellDef } from '@/types/content';
import type { RulesetId } from '@/types/core';
import srdSpells from './srd/spells.json';
import srdItems from './srd/items.json';
import srdConditions from './srd/conditions.json';
import srd24Spells from './srd2024/spells.json';
import srd24Items from './srd2024/items.json';
import { CLASSES } from './data/classes';
import { SUBCLASSES_1 } from './data/subclasses1';
import { SUBCLASSES_2 } from './data/subclasses2';
import { SUBCLASSES_3 } from './data/subclasses3';
import { RACES } from './data/races';
import { BACKGROUNDS } from './data/backgrounds';
import { FEATS } from './data/feats';
import { POOLS } from './data/pools';
import { EXTRA_SPELLS } from './data/extraSpells';
import { CLASSES_2024 } from './data2024/classes';
import { SUBCLASSES_2024 } from './data2024/subclasses';
import { SPECIES_2024 } from './data2024/species';
import { BACKGROUNDS_2024 } from './data2024/backgrounds';
import { FEATS_2024 } from './data2024/feats';
import { POOLS_2024 } from './data2024/pools';
import { EXTRA_SPELLS_2024 } from './data2024/extraSpells';

export const CONTENT_VERSION = '2026.11.2';

const cache: Partial<Record<RulesetId, BundledContent>> = {};

export function bundledContent(ruleset: RulesetId = 'dnd5e-2014'): BundledContent {
  if (cache[ruleset]) return cache[ruleset]!;
  const conditions = srdConditions as { id: string; name: string; description: string }[];
  if (ruleset === 'dnd5e-2024') {
    const base = srd24Spells as unknown as SpellDef[];
    const have = new Set(base.map((s) => s.id));
    const extras = [...EXTRA_SPELLS, ...EXTRA_SPELLS_2024].filter((s) => !have.has(s.id) && (have.add(s.id), true));
    cache[ruleset] = {
      races: SPECIES_2024, classes: CLASSES_2024, subclasses: SUBCLASSES_2024, backgrounds: BACKGROUNDS_2024, feats: FEATS_2024,
      spells: [...base, ...extras], items: srd24Items as unknown as ItemDefinition[], pools: POOLS_2024, conditions,
    };
  } else {
    cache[ruleset] = {
      races: RACES, classes: CLASSES, subclasses: [...SUBCLASSES_1, ...SUBCLASSES_2, ...SUBCLASSES_3], backgrounds: BACKGROUNDS, feats: FEATS,
      spells: [...(srdSpells as unknown as SpellDef[]), ...EXTRA_SPELLS], items: srdItems as unknown as ItemDefinition[], pools: POOLS, conditions,
    };
  }
  return cache[ruleset]!;
}

export const CONTENT_COVERAGE = {
  srd: 'System Reference Document 5.1 and 5.2 © Wizards of the Coast LLC, licensed under CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/). Data conversion based on the 5e-bits/5e-database project (MIT).',
  summary: 'Non-SRD options (PHB 2014/2024, XGtE, TCoE, VGtM, MotM, ERLW, EEPC, SCAG, FTD, MOoT, VRGtR) are represented by structured mechanics and brief original summaries, not the published rules text. Refer to your own copy of the sourcebook for full wording.',
};
