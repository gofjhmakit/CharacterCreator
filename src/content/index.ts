// Bundled content assembly. Everything here works offline (bundled into the app).
import type { BundledContent } from './registry';
import type { ItemDefinition, SpellDef } from '@/types/content';
import srdSpells from './srd/spells.json';
import srdItems from './srd/items.json';
import srdConditions from './srd/conditions.json';
import { CLASSES } from './data/classes';
import { SUBCLASSES_1 } from './data/subclasses1';
import { SUBCLASSES_2 } from './data/subclasses2';
import { SUBCLASSES_3 } from './data/subclasses3';
import { RACES } from './data/races';
import { BACKGROUNDS } from './data/backgrounds';
import { FEATS } from './data/feats';
import { POOLS } from './data/pools';
import { EXTRA_SPELLS } from './data/extraSpells';

export const CONTENT_VERSION = '2026.11.1';

let cached: BundledContent | null = null;

export function bundledContent(): BundledContent {
  if (cached) return cached;
  const spells = [...(srdSpells as unknown as SpellDef[]), ...EXTRA_SPELLS];
  cached = {
    races: RACES,
    classes: CLASSES,
    subclasses: [...SUBCLASSES_1, ...SUBCLASSES_2, ...SUBCLASSES_3],
    backgrounds: BACKGROUNDS,
    feats: FEATS,
    spells,
    items: srdItems as unknown as ItemDefinition[],
    pools: POOLS,
    conditions: srdConditions as { id: string; name: string; description: string }[],
  };
  return cached;
}

export const CONTENT_COVERAGE = {
  srd: 'System Reference Document 5.1 © Wizards of the Coast LLC, licensed under CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/). Data conversion based on the 5e-bits/5e-database project (MIT).',
  summary: 'Non-SRD options (PHB, XGtE, TCoE, VGtM, MotM, ERLW, EEPC, SCAG, FTD, MOoT, VRGtR) are represented by structured mechanics and brief original summaries, not the published rules text. Refer to your own copy of the sourcebook for full wording.',
};
