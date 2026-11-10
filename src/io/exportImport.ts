// Import/export envelopes. All imports are fully validated *before* any stored data is modified.

import type { Character } from '@/types/character';
import { CHARACTER_SCHEMA_VERSION } from '@/types/character';
import type { ContentKind, CustomContentRecord } from '@/types/content';
import type { ContentDB } from '@/content/registry';
import { migrateCharacter } from './migrations';
import { validateCharacter } from './schema';
import { validateItem, validateSpell } from '@/content/validate';
import { uid } from '@/engine/factory';

export const FORMAT_ID = 'grimoire5e';
export const APP_VERSION = '1.0.0';
export const CONTENT_SCHEMA_VERSION = 1;

export interface Envelope {
  format: typeof FORMAT_ID;
  kind: 'character' | 'content' | 'backup';
  schemaVersion: number;
  contentSchemaVersion: number;
  appVersion: string;
  exportedAt: string;
  character?: Character;
  characters?: Character[];
  customContent?: CustomContentRecord[];
}

const CONTENT_KINDS: ContentKind[] = ['item', 'spell', 'feat', 'race', 'class', 'subclass', 'background', 'feature', 'language', 'proficiency'];

/** Collect custom content referenced by a character so the export is self-contained. */
export function characterDependencies(ch: Character, db: ContentDB): CustomContentRecord[] {
  const out = new Map<string, CustomContentRecord>();
  const add = (kind: ContentKind, id: string | undefined) => {
    if (!id || !db.isCustom(kind, id)) return;
    const data = db.mapFor(kind).get(id);
    if (data) out.set(`${kind}:${id}`, { kind, id, data, createdAt: '', updatedAt: '' } as CustomContentRecord);
  };
  add('race', ch.race.raceId);
  add('background', ch.background.backgroundId);
  for (const c of ch.classes) { add('class', c.classId); add('subclass', c.subclassId); }
  for (const f of ch.custom.feats) add('feat', f);
  for (const vals of Object.values(ch.choices)) for (const v of vals) { add('feat', v.startsWith('feat:') ? v.slice(5) : v); add('spell', v); }
  for (const s of ch.spells.entries) add('spell', s.spellId);
  for (const i of ch.inventory) if (i.origin.kind === 'custom') add('item', i.origin.id);
  return [...out.values()];
}

export function exportCharacter(ch: Character, db: ContentDB): Envelope {
  return {
    format: FORMAT_ID, kind: 'character', schemaVersion: CHARACTER_SCHEMA_VERSION, contentSchemaVersion: CONTENT_SCHEMA_VERSION,
    appVersion: APP_VERSION, exportedAt: new Date().toISOString(), character: ch, customContent: characterDependencies(ch, db),
  };
}

export function exportContent(records: CustomContentRecord[]): Envelope {
  return { format: FORMAT_ID, kind: 'content', schemaVersion: CHARACTER_SCHEMA_VERSION, contentSchemaVersion: CONTENT_SCHEMA_VERSION, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), customContent: records };
}

export function exportBackup(characters: Character[], records: CustomContentRecord[]): Envelope {
  return { format: FORMAT_ID, kind: 'backup', schemaVersion: CHARACTER_SCHEMA_VERSION, contentSchemaVersion: CONTENT_SCHEMA_VERSION, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), characters, customContent: records };
}

export interface ParsedImport {
  kind: Envelope['kind'];
  characters: Character[];
  content: CustomContentRecord[];
  warnings: string[];
  errors: string[];
}

export function validateContentRecord(r: unknown, i: number): { record?: CustomContentRecord; errors: string[] } {
  const errors: string[] = [];
  if (!r || typeof r !== 'object') return { errors: [`content[${i}] is not an object`] };
  const rec = r as Record<string, unknown>;
  if (!CONTENT_KINDS.includes(rec.kind as ContentKind)) return { errors: [`content[${i}]: unsupported kind "${String(rec.kind)}"`] };
  if (typeof rec.id !== 'string' || !rec.id) return { errors: [`content[${i}]: missing id`] };
  const data = rec.data as Record<string, unknown>;
  if (!data || typeof data !== 'object' || data.id !== rec.id) return { errors: [`content[${i}] (${rec.id}): data missing or id mismatch`] };
  if (typeof data.name !== 'string' || !data.name) errors.push(`content[${i}] (${rec.id}): missing name`);
  if (rec.kind === 'item') errors.push(...validateItem({ effects: [], ...(data as object) } as never).filter((x) => x.level === 'error').map((x) => `${x.where}: ${x.message}`));
  if (rec.kind === 'spell') errors.push(...validateSpell(data as never).filter((x) => x.level === 'error').map((x) => `${x.where}: ${x.message}`));
  if (errors.length) return { errors };
  const now = new Date().toISOString();
  return { record: { kind: rec.kind as ContentKind, id: rec.id, data: data as never, createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : now, updatedAt: now }, errors };
}

/** Parse & validate a JSON string. Never touches storage. */
export function parseImport(text: string): ParsedImport {
  const res: ParsedImport = { kind: 'character', characters: [], content: [], warnings: [], errors: [] };
  let json: unknown;
  try { json = JSON.parse(text); } catch (e) { res.errors.push(`The file is not valid JSON (${(e as Error).message}).`); return res; }
  if (!json || typeof json !== 'object') { res.errors.push('The file does not contain a JSON object.'); return res; }
  let env = json as Partial<Envelope> & Record<string, unknown>;
  // Accept a bare character object too (e.g. older exports or hand-edited data)
  if (env.format !== FORMAT_ID) {
    if ('identity' in env && 'id' in env) env = { format: FORMAT_ID, kind: 'character', schemaVersion: (env as { schemaVersion?: number }).schemaVersion ?? 0, character: env as unknown as Character } as never;
    else { res.errors.push('Unrecognized file format: this does not look like a character or content export from this app.'); return res; }
  }
  if (!['character', 'content', 'backup'].includes(env.kind as string)) { res.errors.push(`Unsupported export kind "${String(env.kind)}".`); return res; }
  res.kind = env.kind as Envelope['kind'];
  if ((env.contentSchemaVersion ?? 1) > CONTENT_SCHEMA_VERSION) res.warnings.push('Custom content was exported by a newer app version; some fields may not be understood (they are preserved).');
  const rawChars: unknown[] = env.kind === 'character' ? [env.character] : env.kind === 'backup' ? (Array.isArray(env.characters) ? env.characters : []) : [];
  if (env.kind === 'character' && !env.character) { res.errors.push('The export does not contain a character.'); return res; }
  rawChars.forEach((rc, i) => {
    try {
      const mig = migrateCharacter(rc as Record<string, unknown>);
      if (mig.applied.length) res.warnings.push(`Character ${i + 1}: migrated from schema v${mig.from} to v${mig.to}.`);
      const v = validateCharacter(mig.data);
      res.warnings.push(...v.warnings.map((w) => `Character ${i + 1}: ${w}`));
      if (!v.ok) res.errors.push(...v.errors.map((e) => `Character ${i + 1}: ${e}`));
      else res.characters.push(v.character!);
    } catch (e) {
      res.errors.push(`Character ${i + 1}: ${(e as Error).message}`);
    }
  });
  const rawContent = Array.isArray(env.customContent) ? env.customContent : [];
  rawContent.forEach((r, i) => {
    const v = validateContentRecord(r, i);
    if (v.record) res.content.push(v.record); else res.errors.push(...v.errors);
  });
  return res;
}

export type ConflictPolicy = 'keep-existing' | 'overwrite' | 'copy';

/** Assign a fresh id (and name suffix) for "import as copy". */
export function asCopy(ch: Character): Character {
  return { ...structuredClone(ch), id: uid('char'), identity: { ...ch.identity, name: `${ch.identity.name || 'Unnamed'} (imported)` }, updatedAt: new Date().toISOString() };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const safeFilename = (s: string) => (s || 'character').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 60);
