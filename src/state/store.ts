// Global application state (zustand). Autosaves characters (debounced) and surfaces save errors.
import { create } from 'zustand';
import type { Character } from '@/types/character';
import type { CustomContentRecord, ContentKind } from '@/types/content';
import { ContentDB } from '@/content/registry';
import { bundledContent } from '@/content';
import { openBestStore, type Store } from '@/persistence/db';
import { newCharacter, uid } from '@/engine/factory';
import { migrateCharacter } from '@/io/migrations';
import { validateCharacter } from '@/io/schema';
import type { RollResult } from '@/dice/dice';

export type SaveState = { status: 'saved' | 'pending' | 'saving' | 'error'; error?: string; at?: number };

export interface Toast { id: string; kind: 'info' | 'success' | 'error' | 'roll'; text: string; detail?: string }

export interface AppPrefs {
  theme: 'dark' | 'light' | 'system';
  units: 'imperial' | 'metric';
  autoAdvantage: boolean;     // use computed advantage/disadvantage for quick rolls
  confirmRolls: boolean;
  showRollToasts: boolean;
}

const PREFS_KEY = 'grimoire5e:prefs';
const defaultPrefs: AppPrefs = { theme: 'system', units: 'imperial', autoAdvantage: true, confirmRolls: false, showRollToasts: true };
function loadPrefs(): AppPrefs {
  try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return defaultPrefs; }
}

interface AppState {
  ready: boolean;
  store?: Store;
  storageWarning?: string;
  loadErrors: string[];
  characters: Record<string, Character>;
  saves: Record<string, SaveState>;
  custom: CustomContentRecord[];
  db: ContentDB;
  rolls: RollResult[];
  toasts: Toast[];
  prefs: AppPrefs;
  diceOpen: boolean;

  init(): Promise<void>;
  createCharacter(partial?: Partial<Character>): string;
  update(id: string, recipe: (draft: Character) => void): void;
  replace(c: Character): void;
  remove(id: string): Promise<void>;
  duplicate(id: string): string | undefined;
  flush(id?: string): Promise<void>;
  saveCustom(rec: Omit<CustomContentRecord, 'createdAt' | 'updatedAt'> & Partial<CustomContentRecord>): Promise<void>;
  deleteCustom(kind: ContentKind, id: string): Promise<void>;
  addRoll(r: RollResult): void;
  clearRolls(): void;
  toast(t: Omit<Toast, 'id'>, ms?: number): void;
  dismiss(id: string): void;
  setPrefs(p: Partial<AppPrefs>): void;
  setDiceOpen(v: boolean): void;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const SAVE_DELAY = 350;

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  loadErrors: [],
  characters: {},
  saves: {},
  custom: [],
  db: new ContentDB(bundledContent()),
  rolls: [],
  toasts: [],
  prefs: loadPrefs(),
  diceOpen: false,

  async init() {
    const { store, warning } = await openBestStore();
    const loadErrors: string[] = [];
    let chars: Character[] = [];
    let custom: CustomContentRecord[] = [];
    try { chars = await store.listCharacters(); } catch (e) { loadErrors.push(`Could not load characters: ${(e as Error).message}`); }
    try { custom = await store.listContent(); } catch (e) { loadErrors.push(`Could not load custom content: ${(e as Error).message}`); }
    const characters: Record<string, Character> = {};
    for (const raw of chars) {
      try {
        const m = migrateCharacter(raw as never);
        const v = validateCharacter(m.data);
        if (v.ok && v.character) {
          characters[v.character.id] = v.character;
          if (m.applied.length) await store.putCharacter(v.character);
        } else loadErrors.push(`Character ${(raw as Character).identity?.name || raw.id}: ${v.errors.join('; ')}`);
      } catch (e) { loadErrors.push(`Character ${(raw as Character).id}: ${(e as Error).message}`); }
    }
    const db = new ContentDB(bundledContent(), custom);
    loadErrors.push(...db.problems);
    set({ ready: true, store, storageWarning: warning, characters, custom, db, loadErrors });
    // Flush pending saves before unload
    window.addEventListener('beforeunload', (e) => {
      const pending = Object.values(get().saves).some((s) => s.status === 'pending' || s.status === 'saving');
      if (pending) { void get().flush(); e.preventDefault(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void get().flush(); });
  },

  createCharacter(partial) {
    const c = newCharacter(partial);
    set((s) => ({ characters: { ...s.characters, [c.id]: c } }));
    schedule(c.id);
    return c.id;
  },

  update(id, recipe) {
    const cur = get().characters[id];
    if (!cur) return;
    const draft = structuredClone(cur);
    recipe(draft);
    draft.updatedAt = new Date().toISOString();
    set((s) => ({ characters: { ...s.characters, [id]: draft } }));
    schedule(id);
  },

  replace(c) {
    const next = { ...c, updatedAt: new Date().toISOString() };
    set((s) => ({ characters: { ...s.characters, [c.id]: next } }));
    schedule(c.id);
  },

  async remove(id) {
    const st = get().store;
    timers.get(id) && clearTimeout(timers.get(id)!);
    try {
      await st?.deleteCharacter(id);
      set((s) => { const c = { ...s.characters }; delete c[id]; const sv = { ...s.saves }; delete sv[id]; return { characters: c, saves: sv }; });
    } catch (e) {
      get().toast({ kind: 'error', text: `Delete failed: ${(e as Error).message}` });
    }
  },

  duplicate(id) {
    const cur = get().characters[id];
    if (!cur) return;
    const now = new Date().toISOString();
    const copy: Character = { ...structuredClone(cur), id: uid('char'), createdAt: now, updatedAt: now, identity: { ...cur.identity, name: `${cur.identity.name || 'Unnamed'} (copy)` } };
    copy.inventory = copy.inventory.map((i) => ({ ...i, id: uid('inv') }));
    set((s) => ({ characters: { ...s.characters, [copy.id]: copy } }));
    schedule(copy.id);
    return copy.id;
  },

  async flush(id) {
    const ids = id ? [id] : [...timers.keys()];
    await Promise.all(ids.map(async (cid) => { const t = timers.get(cid); if (t) { clearTimeout(t); timers.delete(cid); } await persist(cid); }));
  },

  async saveCustom(rec) {
    const now = new Date().toISOString();
    const existing = get().custom.find((r) => r.kind === rec.kind && r.id === rec.id);
    const full = { createdAt: existing?.createdAt ?? now, ...rec, updatedAt: now } as CustomContentRecord;
    await get().store!.putContent(full);
    const custom = [...get().custom.filter((r) => !(r.kind === rec.kind && r.id === rec.id)), full];
    set({ custom, db: new ContentDB(bundledContent(), custom) });
  },

  async deleteCustom(kind, id) {
    await get().store!.deleteContent(kind, id);
    const custom = get().custom.filter((r) => !(r.kind === kind && r.id === id));
    set({ custom, db: new ContentDB(bundledContent(), custom) });
  },

  addRoll(r) {
    set((s) => ({ rolls: [r, ...s.rolls].slice(0, 100) }));
  },
  clearRolls() { set({ rolls: [] }); },

  toast(t, ms = 4000) {
    const id = uid('t');
    set((s) => ({ toasts: [...s.toasts.slice(-4), { ...t, id }] }));
    if (ms > 0) setTimeout(() => get().dismiss(id), ms);
  },
  dismiss(id) { set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })); },

  setPrefs(p) {
    const prefs = { ...get().prefs, ...p };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    set({ prefs });
  },
  setDiceOpen(v) { set({ diceOpen: v }); },
}));

function schedule(id: string) {
  const st = useApp.getState();
  useApp.setState({ saves: { ...st.saves, [id]: { status: 'pending' } } });
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.set(id, setTimeout(() => { timers.delete(id); void persist(id); }, SAVE_DELAY));
}

async function persist(id: string) {
  const st = useApp.getState();
  const c = st.characters[id];
  if (!c || !st.store) return;
  useApp.setState({ saves: { ...useApp.getState().saves, [id]: { status: 'saving' } } });
  try {
    await st.store.putCharacter(c);
    useApp.setState({ saves: { ...useApp.getState().saves, [id]: { status: 'saved', at: Date.now() } } });
  } catch (e) {
    const msg = (e as Error).name === 'QuotaExceededError' ? 'Browser storage is full. Export a backup and remove portraits or old characters.' : (e as Error).message;
    useApp.setState({ saves: { ...useApp.getState().saves, [id]: { status: 'error', error: msg } } });
    // retry later
    timers.set(id, setTimeout(() => { timers.delete(id); void persist(id); }, 5000));
  }
}

/** Convenience hook: current character + derived bound to id. */
export function useCharacter(id: string | undefined) {
  return useApp((s) => (id ? s.characters[id] : undefined));
}
