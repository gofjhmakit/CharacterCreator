// Inventory instance semantics.
//
// COPY SEMANTICS: adding an item to a character stores a deep *snapshot* of the item definition in the
// inventory entry. Later edits to the reusable template (custom item definition) never change existing
// instances. Users can explicitly "re-sync from template", which replaces the snapshot but keeps
// instance state (quantity, equipped, attuned, charges, notes).
// Editing an instance edits only that instance's snapshot.

import type { ItemDefinition } from '@/types/content';
import type { Character, InventoryItem } from '@/types/character';
import { uid } from './factory';
import type { ContentDB } from '@/content/registry';

/** Key-order-independent deep equality for plain JSON data. */
export function sameData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a === null || b === null) return a === b || (isEmpty(a) && isEmpty(b));
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => sameData(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object).filter((k) => !isEmpty((a as Record<string, unknown>)[k]));
    const kb = Object.keys(b as object).filter((k) => !isEmpty((b as Record<string, unknown>)[k]));
    if (ka.length !== kb.length) return false;
    return ka.every((k) => sameData((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}
const isEmpty = (x: unknown) => x === undefined || x === null || (Array.isArray(x) && x.length === 0);

export function instantiateItem(def: ItemDefinition, opts: { quantity?: number; origin?: InventoryItem['origin']['kind'] } = {}): InventoryItem {
  const snapshot = structuredClone(def);
  return {
    id: uid('inv'),
    item: snapshot,
    origin: { kind: opts.origin ?? (def.source.kind === 'custom' ? 'custom' : 'srd'), id: def.id, syncedAt: new Date().toISOString() },
    quantity: Math.max(1, opts.quantity ?? 1),
    equipped: false,
    attuned: false,
    ...(def.charges ? { charges: def.charges.max } : {}),
  };
}

export function addItem(ch: Character, def: ItemDefinition, quantity = 1, db?: ContentDB, expandPacks = true): Character {
  const c = structuredClone(ch);
  if (expandPacks && def.contents?.length && db) {
    for (const part of def.contents) {
      const p = db.items.get(part.itemId);
      if (p) c.inventory.push(instantiateItem(p, { quantity: part.quantity * quantity }));
    }
    return c;
  }
  // Stack identical unmodified stackables (ammo, consumables) from the same origin
  const stackable = ['ammunition', 'consumable', 'potion', 'food', 'gear', 'poison', 'scroll'].includes(def.category) && !def.charges;
  if (stackable) {
    const existing = c.inventory.find((i) => i.origin.id === def.id && sameData(i.item, def) && !i.equipped);
    if (existing) { existing.quantity += quantity; return c; }
  }
  c.inventory.push(instantiateItem(def, { quantity }));
  return c;
}

export function updateInstance(ch: Character, id: string, patch: Partial<InventoryItem>): Character {
  const c = structuredClone(ch);
  const i = c.inventory.findIndex((x) => x.id === id);
  if (i >= 0) c.inventory[i] = { ...c.inventory[i], ...patch };
  return c;
}

export function removeInstance(ch: Character, id: string): Character {
  const c = structuredClone(ch);
  c.inventory = c.inventory.filter((x) => x.id !== id && x.containerId !== id);
  return c;
}

/** Explicit re-sync: replace the snapshot with the current template definition, preserving instance state. */
export function resyncFromTemplate(inst: InventoryItem, template: ItemDefinition): InventoryItem {
  const next: InventoryItem = { ...inst, item: structuredClone(template), origin: { ...inst.origin, id: template.id, syncedAt: new Date().toISOString() } };
  if (template.charges) next.charges = Math.min(inst.charges ?? template.charges.max, template.charges.max);
  else delete next.charges;
  if (!template.attunement?.required) next.attuned = false;
  return next;
}

/** True if instance snapshot differs from its template (shows "modified" badge / sync option). */
export function instanceDiffersFromTemplate(inst: InventoryItem, template: ItemDefinition | undefined): boolean {
  if (!template) return false;
  return !sameData(inst.item, template);
}

/** Equip toggling with attunement guard. Returns warning text if attunement limit exceeded. */
export function setAttuned(ch: Character, id: string, attuned: boolean, limit: number): { character: Character; warning?: string } {
  const c = structuredClone(ch);
  const it = c.inventory.find((x) => x.id === id);
  if (!it) return { character: c };
  if (attuned) {
    if (!it.item.attunement?.required) return { character: c, warning: `${it.item.name} does not require attunement.` };
    const count = c.inventory.filter((x) => x.attuned).length;
    if (count >= limit) return { character: c, warning: `Attunement limit reached (${limit}). Unattune another item first.` };
  }
  it.attuned = attuned;
  return { character: c };
}

// ---------------------------------------------------------------------------
// Equipment slots
// ---------------------------------------------------------------------------

/** Hands an item occupies when equipped (0 = not hand-held). */
export function handsFor(it: InventoryItem): number {
  if (it.item.armor?.category === 'shield') return 1;
  if (it.item.weapon) return it.item.weapon.properties.includes('two-handed') ? 2 : 1;
  return 0;
}

export type EquipSlot = 'body' | 'hands' | 'ring' | null;
export function slotFor(it: InventoryItem): EquipSlot {
  if (it.item.armor && it.item.armor.category !== 'shield') return 'body';
  if (handsFor(it) > 0) return 'hands';
  if (it.item.category === 'ring') return 'ring';
  return null;
}

export const RING_SLOTS = 2;
export const HANDS = 2;

/**
 * Equip or unequip an item, enforcing slots: one suit of body armor, two hands for weapons and
 * shields (Two-Handed weapons need both), and two rings. Conflicting items that were equipped
 * longest ago are unequipped. Returns the names of items that were unequipped.
 */
export function setEquipped(ch: Character, id: string, on: boolean): { character: Character; unequipped: string[] } {
  const c = structuredClone(ch);
  const it = c.inventory.find((x) => x.id === id);
  if (!it) return { character: c, unequipped: [] };
  if (!on) { it.equipped = false; it.offHand = false; return { character: c, unequipped: [] }; }
  const unequipped: string[] = [];
  const drop = (x: InventoryItem) => { x.equipped = false; x.offHand = false; unequipped.push(x.item.name); };
  const slot = slotFor(it);
  const others = c.inventory.filter((x) => x.id !== id && x.equipped);
  if (slot === 'body') others.filter((x) => slotFor(x) === 'body').forEach(drop);
  if (slot === 'ring') {
    const rings = others.filter((x) => slotFor(x) === 'ring');
    while (rings.length >= RING_SLOTS) drop(rings.shift()!);
  }
  if (slot === 'hands') {
    const need = handsFor(it);
    // A second shield is never useful: replace the current one.
    if (it.item.armor?.category === 'shield') others.filter((x) => x.item.armor?.category === 'shield').forEach(drop);
    const held = others.filter((x) => x.equipped && slotFor(x) === 'hands');
    let used = held.reduce((s, x) => s + handsFor(x), 0);
    // Drop weapons first (keep the shield if possible), oldest first.
    const order = [...held.filter((x) => !x.item.armor), ...held.filter((x) => x.item.armor)];
    while (used + need > HANDS && order.length) { const x = order.shift()!; used -= handsFor(x); drop(x); }
  }
  it.equipped = true;
  return { character: c, unequipped };
}
