// Persistence layer. IndexedDB primary store; falls back to localStorage (or memory) if IDB is unavailable.
// Stores: characters (by id), content (custom content records, key = kind:id), meta (misc).

import type { Character } from '@/types/character';
import type { CustomContentRecord } from '@/types/content';

export interface Store {
  kind: 'indexeddb' | 'localstorage' | 'memory';
  listCharacters(): Promise<Character[]>;
  getCharacter(id: string): Promise<Character | undefined>;
  putCharacter(c: Character): Promise<void>;
  deleteCharacter(id: string): Promise<void>;
  listContent(): Promise<CustomContentRecord[]>;
  putContent(r: CustomContentRecord): Promise<void>;
  deleteContent(kind: string, id: string): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  putMeta<T>(key: string, value: T): Promise<void>;
}

const DB_NAME = 'grimoire5e';
const DB_VERSION = 1;

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

export async function openIndexedDB(factory: IDBFactory = globalThis.indexedDB): Promise<Store> {
  if (!factory) throw new Error('IndexedDB not available');
  const db: IDBDatabase = await new Promise((resolve, reject) => {
    const open = factory.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const d = open.result;
      if (!d.objectStoreNames.contains('characters')) d.createObjectStore('characters', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('content')) {
        const s = d.createObjectStore('content', { keyPath: 'key' });
        s.createIndex('kind', 'kind');
      }
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error('Database upgrade blocked by another open tab.'));
  });
  const store = (name: string, mode: IDBTransactionMode = 'readonly') => db.transaction(name, mode).objectStore(name);
  const write = async (name: string, fn: (s: IDBObjectStore) => void) => {
    const tx = db.transaction(name, 'readwrite');
    fn(tx.objectStore(name));
    await txDone(tx);
  };
  return {
    kind: 'indexeddb',
    listCharacters: () => req(store('characters').getAll()) as Promise<Character[]>,
    getCharacter: (id) => req(store('characters').get(id)) as Promise<Character | undefined>,
    putCharacter: (c) => write('characters', (s) => s.put(c)),
    deleteCharacter: (id) => write('characters', (s) => s.delete(id)),
    listContent: async () => ((await req(store('content').getAll())) as (CustomContentRecord & { key: string })[]).map(({ key: _k, ...r }) => r as CustomContentRecord),
    putContent: (r) => write('content', (s) => s.put({ ...r, key: `${r.kind}:${r.id}` })),
    deleteContent: (kind, id) => write('content', (s) => s.delete(`${kind}:${id}`)),
    getMeta: (key) => req(store('meta').get(key)),
    putMeta: (key, value) => write('meta', (s) => s.put(value, key)),
  };
}

/** localStorage-backed store (fallback). Keeps everything in a few JSON keys. */
export function localStorageStore(ls: Storage | undefined = globalThis.localStorage): Store {
  const mem = new Map<string, string>();
  const get = (k: string) => { try { return ls ? ls.getItem(k) : mem.get(k) ?? null; } catch { return mem.get(k) ?? null; } };
  const set = (k: string, v: string) => {
    if (!ls) { mem.set(k, v); return; }
    ls.setItem(k, v); // may throw QuotaExceededError: surfaced to caller → shown as save error
  };
  const read = <T>(k: string, def: T): T => { const v = get(k); if (!v) return def; try { return JSON.parse(v) as T; } catch { return def; } };
  const CH = 'grimoire5e:characters', CT = 'grimoire5e:content', MT = 'grimoire5e:meta';
  return {
    kind: ls ? 'localstorage' : 'memory',
    listCharacters: async () => Object.values(read<Record<string, Character>>(CH, {})),
    getCharacter: async (id) => read<Record<string, Character>>(CH, {})[id],
    putCharacter: async (c) => { const all = read<Record<string, Character>>(CH, {}); all[c.id] = c; set(CH, JSON.stringify(all)); },
    deleteCharacter: async (id) => { const all = read<Record<string, Character>>(CH, {}); delete all[id]; set(CH, JSON.stringify(all)); },
    listContent: async () => Object.values(read<Record<string, CustomContentRecord>>(CT, {})),
    putContent: async (r) => { const all = read<Record<string, CustomContentRecord>>(CT, {}); all[`${r.kind}:${r.id}`] = r; set(CT, JSON.stringify(all)); },
    deleteContent: async (kind, id) => { const all = read<Record<string, CustomContentRecord>>(CT, {}); delete all[`${kind}:${id}`]; set(CT, JSON.stringify(all)); },
    getMeta: async <T>(key: string) => read<Record<string, T>>(MT, {})[key],
    putMeta: async (key, value) => { const all = read<Record<string, unknown>>(MT, {}); all[key] = value; set(MT, JSON.stringify(all)); },
  };
}

export async function openBestStore(): Promise<{ store: Store; warning?: string }> {
  try {
    const store = await openIndexedDB();
    try { await globalThis.navigator?.storage?.persist?.(); } catch { /* best effort */ }
    return { store };
  } catch (e) {
    try {
      globalThis.localStorage?.setItem('grimoire5e:probe', '1');
      globalThis.localStorage?.removeItem('grimoire5e:probe');
      return { store: localStorageStore(), warning: `IndexedDB unavailable (${(e as Error).message}); using localStorage with limited capacity.` };
    } catch {
      return { store: localStorageStore(undefined), warning: 'No persistent browser storage available (private mode?). Changes will be lost when the tab closes — export your characters!' };
    }
  }
}
