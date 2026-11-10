import { CHARACTER_SCHEMA_VERSION, type Character, NOTE_CATEGORIES, type NoteCategory } from '@/types/character';

export const uid = (prefix = 'id'): string => {
  const c = globalThis.crypto;
  if (c?.randomUUID) return `${prefix}_${c.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
};

export function emptyNotes(): Character['notes'] {
  const n = { general: '' } as Character['notes'];
  for (const k of Object.keys(NOTE_CATEGORIES) as NoteCategory[]) n[k] = [];
  return n;
}

export function newCharacter(partial: Partial<Character> = {}): Character {
  const now = new Date().toISOString();
  return {
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    id: uid('char'),
    ruleset: 'dnd5e-2014',
    createdAt: now,
    updatedAt: now,
    draft: true,
    wizardStep: 0,
    identity: {
      name: '', playerName: '', alignment: '', xp: 0, milestone: false, age: '', height: '', weight: '',
      eyes: '', skin: '', hair: '', appearance: '', deity: '',
    },
    personality: { traits: '', ideals: '', bonds: '', flaws: '', backstory: '', allies: '' },
    race: { raceId: '' },
    background: { backgroundId: '' },
    classes: [],
    abilities: { method: 'point-buy', base: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 } },
    choices: {},
    custom: {
      skills: {}, saves: [], armor: [], weapons: [], tools: [], languages: [], features: [], feats: [],
      abilityBonuses: {}, resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [], senses: {},
    },
    combat: {
      hpCurrent: 0, hpTemp: 0, hpMaxReduction: 0, deathSaves: { successes: 0, failures: 0 }, hitDiceUsed: {},
      inspiration: false, conditions: [], exhaustion: 0, toggles: {}, stable: false,
    },
    resources: {},
    spells: { entries: [], slotsUsed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], pactSlotsUsed: 0 },
    inventory: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    effects: [],
    companions: [],
    notes: emptyNotes(),
    settings: {
      encumbrance: 'standard',
      hpMethod: 'average',
      overrides: {},
      optional: { feats: true, multiclassing: true, multiclassPrereqs: true, customOrigin: false },
      attunementLimit: 3,
    },
    ...partial,
  };
}
