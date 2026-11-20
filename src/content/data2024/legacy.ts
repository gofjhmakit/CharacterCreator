// Explicit compatibility copies: retain book provenance, never mutate 2014 definitions.
import type { ChoiceDef, FeatureDef, Grants, SubclassDef } from '@/types/content';
import { RACES } from '../data/races';
import { ARTIFICER_CLASS } from '../data/artificer';

function compatibleWeapons(grants: Grants | undefined): Grants | undefined {
  if (!grants?.weapons) return grants;
  const ids: Record<string, string> = { 'crossbow-light': 'light-crossbow', 'crossbow-hand': 'hand-crossbow', 'crossbow-heavy': 'heavy-crossbow' };
  return { ...grants, weapons: grants.weapons.map((id) => ids[id] ?? id) };
}

function compatibleSpeciesFeature(feature: FeatureDef): FeatureDef {
  return {
    ...feature, grants: compatibleWeapons(feature.grants),
    choices: feature.choices?.map((choice) => ({
      ...choice, options: choice.options?.map((option) => ({
        ...option, grants: compatibleWeapons(option.grants), features: option.features?.map(compatibleSpeciesFeature),
      })),
    })),
  };
}

export const LEGACY_SPECIES_2024 = RACES.filter((race) => ['half-elf', 'shadar-kai', 'reborn'].includes(race.id)).map((race) => ({
  ...race,
  ruleset: 'dnd5e-2024' as const,
  name: `${race.name} (Legacy)`,
  description: `${race.description} Legacy species adapted for 2024: ability increases and languages come from your background and origin, not this species.`,
  abilityBonuses: {},
  choices: race.choices?.filter((choice) => !['ability', 'ability-split', 'language'].includes(choice.kind)),
  traits: race.traits.filter((trait) => !trait.id.endsWith('-languages')).map(compatibleSpeciesFeature),
}));

export const ARTIFICER_2024 = {
  ...ARTIFICER_CLASS,
  ruleset: 'dnd5e-2024' as const,
  name: 'Artificer (Legacy)',
  description: `${ARTIFICER_CLASS.description} This is the TCoE class adapted for the 2024 engine, not a revised Artificer publication.`,
  startingFixed: ARTIFICER_CLASS.startingFixed.map((item) => ({
    ...item, itemId: ({ 'dungeoneers-pack': 'dungeoneer-pack', 'crossbow-bolt': 'bolts', 'crossbow-light': 'light-crossbow' } as Record<string, string>)[item.itemId] ?? item.itemId,
  })),
};

const REVISED_IDS: Record<string, string> = {
  'totem-warrior': 'wild-heart', 'four-elements': 'elements',
  'aberrant-mind': 'aberrant', 'clockwork-soul': 'clockwork',
  evocation: 'evoker', abjuration: 'abjurer', divination: 'diviner', illusion: 'illusionist',
};

const focusText = (text: string) => text.replace(/\bki\b/gi, 'Focus');
function compatibleChoice(choice: ChoiceDef): ChoiceDef {
  return { ...choice, options: choice.options?.map((option) => ({
    ...option, features: option.features?.map(compatibleFeature),
  })) };
}
function compatibleFeature(feature: FeatureDef): FeatureDef {
  return {
    ...feature,
    level: Math.max(3, feature.level ?? 3),
    description: focusText(feature.description),
    usesResource: feature.usesResource === 'ki' ? 'focus' : feature.usesResource,
    choices: feature.choices?.map(compatibleChoice),
    effects: feature.effects?.map((effect) => ({
      ...effect,
      consumes: effect.consumes ? { ...effect.consumes, resourceId: effect.consumes.resourceId === 'ki' ? 'focus' : effect.consumes.resourceId } : undefined,
    })),
  };
}

export function legacySubclasses2024(legacy: SubclassDef[], revised: SubclassDef[]): SubclassDef[] {
  const revisedIds = new Set(revised.map((subclass) => subclass.id));
  return legacy.filter((subclass) => !revisedIds.has(`${REVISED_IDS[subclass.id] ?? subclass.id}-2024`)).map((subclass) => {
    const spells: NonNullable<SubclassDef['spells']> = [];
    for (const block of subclass.spells ?? []) {
      const level = Math.max(3, block.level);
      const ids = block.spells.map((id) => id === 'branding-smite' ? 'shining-smite' : id);
      const existing = spells.find((entry) => entry.level === level && entry.mode === block.mode);
      if (existing) existing.spells = [...new Set([...existing.spells, ...ids])];
      else spells.push({ ...block, level, spells: ids });
    }
    return {
      ...subclass,
      id: `${subclass.id}-legacy-2024`,
      ruleset: 'dnd5e-2024',
      name: `${subclass.name} (Legacy)`,
      description: `${focusText(subclass.description)} Legacy option adapted for 2024: early subclass features arrive at level 3; ki costs use Focus Points. Cleric Divine Strike and Potent Spellcasting are replaced by the class’s Blessed Strikes. Other mechanics retain their sourcebook summaries.`,
      features: subclass.features.filter((feature) => subclass.classId !== 'cleric' || !['Divine Strike', 'Potent Spellcasting'].includes(feature.name)).map(compatibleFeature),
      spells: subclass.spells ? spells : undefined,
    };
  });
}
