// Local fuzzy search with typo tolerance, word fragments, aliases and property/category matching.
// Ranking: exact name > name prefix > all query terms are word-prefixes of name > fuzzy name > alias > tags/properties.

import type { ItemDefinition } from '@/types/content';
import { ITEM_CATEGORY_LABEL, type ItemCategory } from '@/types/content';
import { RARITY_LABEL } from '@/types/core';

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim();
}

export function tokenize(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean);
}

/** Damerau–Levenshtein (optimal string alignment) distance, capped for speed. */
export function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

const allowedTypos = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : 2);

/** Score how well a single query token matches a single candidate word (0 = no match). */
function tokenScore(q: string, w: string): number {
  if (w === q) return 10;
  if (w.startsWith(q)) return 8 - Math.min(3, (w.length - q.length) * 0.15);
  if (w.includes(q) && q.length >= 3) return 5;
  // fuzzy against the word or its prefix of similar length
  const maxTypos = allowedTypos(q.length);
  if (maxTypos > 0) {
    const dist = Math.min(editDistance(q, w, maxTypos), editDistance(q, w.slice(0, q.length), maxTypos), editDistance(q, w.slice(0, q.length + 1), maxTypos));
    if (dist <= maxTypos) return 6 - dist * 1.5;
  }
  return 0;
}

/** Best match of a query token against a list of words; also tries concatenated adjacent words ("long sw" → "longsword"). */
function bestTokenMatch(q: string, words: string[], joined: string): number {
  let best = 0;
  for (const w of words) best = Math.max(best, tokenScore(q, w));
  if (best < 8 && joined.includes(q) && q.length >= 2) best = Math.max(best, 6);
  return best;
}

export interface SearchDoc {
  id: string;
  name: string;
  aliases?: string[];
  /** Secondary searchable keywords: category, type, properties, rarity, tags */
  keywords?: string[];
}

export interface SearchHit<T> { item: T; score: number; matched: 'name' | 'alias' | 'keyword' }

export function fuzzySearch<T>(query: string, items: T[], toDoc: (t: T) => SearchDoc, limit = 50): SearchHit<T>[] {
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];
  const qJoined = qTokens.join('');
  const qNorm = qTokens.join(' ');
  const hits: SearchHit<T>[] = [];
  for (const it of items) {
    const doc = toDoc(it);
    const nameNorm = normalize(doc.name);
    const nameWords = nameNorm.split(' ');
    const nameJoined = nameWords.join('');
    let score = 0;
    let matched: SearchHit<T>['matched'] = 'name';
    if (nameNorm === qNorm) score = 1000;
    else if (nameNorm.startsWith(qNorm)) score = 800 - nameNorm.length;
    else if (nameJoined.startsWith(qJoined)) score = 750 - nameNorm.length; // "long sw" → "longsword"
    else {
      // every query token must match a name word (or concatenation)
      let total = 0;
      let all = true;
      for (const q of qTokens) {
        const s = bestTokenMatch(q, nameWords, nameJoined);
        if (s === 0) { all = false; break; }
        total += s;
      }
      if (all) score = 300 + total * 20 - nameNorm.length * 0.5;
    }
    // aliases
    if (score < 700) for (const a of doc.aliases ?? []) {
      const an = normalize(a);
      const aw = an.split(' ');
      const aj = aw.join('');
      let s = 0;
      if (an === qNorm) s = 700;
      else if (an.startsWith(qNorm) || aj.startsWith(qJoined)) s = 650 - an.length;
      else {
        let total = 0; let all = true;
        for (const q of qTokens) { const x = bestTokenMatch(q, aw, aj); if (!x) { all = false; break; } total += x; }
        if (all) s = 250 + total * 15;
      }
      if (s > score) { score = s; matched = 'alias'; }
    }
    // keywords: tokens may match a mix of name words and keywords
    if (score === 0) {
      const kw = (doc.keywords ?? []).flatMap((k) => normalize(k).split(' '));
      const pool = [...nameWords, ...kw];
      let total = 0; let all = true; let kwUsed = false;
      for (const q of qTokens) {
        const sName = bestTokenMatch(q, nameWords, nameJoined);
        const sKw = bestTokenMatch(q, kw, kw.join(''));
        const s = Math.max(sName, sKw);
        if (!s) { all = false; break; }
        if (sKw > sName) kwUsed = true;
        total += s;
      }
      if (all && pool.length) { score = 100 + total * 8; matched = kwUsed ? 'keyword' : 'name'; }
    }
    if (score > 0) hits.push({ item: it, score, matched });
  }
  hits.sort((a, b) => b.score - a.score || toDoc(a.item).name.localeCompare(toDoc(b.item).name));
  return hits.slice(0, limit);
}

export function itemSearchDoc(i: ItemDefinition): SearchDoc {
  const kw: string[] = [ITEM_CATEGORY_LABEL[i.category as ItemCategory] ?? i.category, i.category];
  if (i.type) kw.push(i.type);
  if (i.rarity !== 'none') kw.push(RARITY_LABEL[i.rarity], i.rarity);
  kw.push(i.magical ? 'magic magical' : 'mundane nonmagical');
  if (i.weapon) kw.push(...i.weapon.properties, i.weapon.damage.type, i.weapon.category, i.weapon.kind, 'weapon');
  if (i.armor) kw.push(i.armor.category, 'armor');
  if (i.attunement?.required) kw.push('attunement');
  if (i.tags) kw.push(...i.tags);
  return { id: i.id, name: i.name, aliases: i.aliases, keywords: kw };
}

export interface ItemFilter {
  category?: string;
  magical?: 'any' | 'magic' | 'mundane';
  rarity?: string;
  property?: string;
}

export function filterItems(items: ItemDefinition[], f: ItemFilter): ItemDefinition[] {
  return items.filter((i) => {
    if (f.category && f.category !== 'any' && i.category !== f.category) return false;
    if (f.magical === 'magic' && !i.magical) return false;
    if (f.magical === 'mundane' && i.magical) return false;
    if (f.rarity && f.rarity !== 'any' && i.rarity !== f.rarity) return false;
    if (f.property && f.property !== 'any' && !(i.weapon?.properties as string[] | undefined)?.includes(f.property)) return false;
    return true;
  });
}

export function searchItems(query: string, items: ItemDefinition[], filter: ItemFilter = {}, limit = 60): ItemDefinition[] {
  const pool = filterItems(items, filter);
  if (!query.trim()) return pool.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
  return fuzzySearch(query, pool, itemSearchDoc, limit).map((h) => h.item);
}
