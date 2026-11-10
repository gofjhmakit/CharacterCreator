// Schema migrations for character data. Each migration upgrades from version N to N+1.
// Version 0 = pre-release format (no schemaVersion; flat hp fields; notes as single string).

import { CHARACTER_SCHEMA_VERSION } from '@/types/character';

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const MIGRATIONS: Record<number, (c: Raw) => Raw> = {
  0: (c) => {
    const out: Raw = { ...c, schemaVersion: 1 };
    // v0 stored hp as { hp: { current, max, temp } } and deathSaves at root
    if (c.hp && typeof c.hp === 'object') {
      out.combat = { ...(c.combat ?? {}), hpCurrent: c.hp.current ?? 0, hpTemp: c.hp.temp ?? 0 };
      delete out.hp;
    }
    if (c.deathSaves) { out.combat = { ...(out.combat ?? {}), deathSaves: c.deathSaves }; delete out.deathSaves; }
    // v0 notes were a single string
    if (typeof c.notes === 'string') out.notes = { general: c.notes };
    // v0 had a single class: { class: 'fighter', level: 3 }
    if (!Array.isArray(c.classes) && typeof c.class === 'string') {
      out.classes = [{ classId: c.class, level: Number(c.level) || 1, hpRolls: [] }];
      delete out.class; delete out.level;
    }
    return out;
  },
};

export interface MigrationResult { data: Raw; from: number; to: number; applied: number[] }

export function migrateCharacter(raw: Raw): MigrationResult {
  let v = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  const from = v;
  if (v > CHARACTER_SCHEMA_VERSION) {
    throw new Error(`This character was saved by a newer version of the app (schema v${v}; this app supports up to v${CHARACTER_SCHEMA_VERSION}). Please update the app.`);
  }
  let data = raw;
  const applied: number[] = [];
  while (v < CHARACTER_SCHEMA_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`No migration available from schema v${v}.`);
    data = m(data);
    applied.push(v);
    v += 1;
    data.schemaVersion = v;
  }
  return { data, from, to: v, applied };
}
