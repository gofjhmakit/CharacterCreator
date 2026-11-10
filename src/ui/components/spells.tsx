import { useDb } from '@/ui/ruleset';
import { useMemo, useState } from 'react';
import type { SpellDef } from '@/types/content';
import type { Character } from '@/types/character';
import type { CasterView, Derived } from '@/engine/derive';
import { useApp } from '@/state/store';
import { fuzzySearch } from '@/search/fuzzy';
import { Modal, titleCase } from './common';
import { uid } from '@/engine/factory';

export const SCHOOLS = ['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation'];
export const lvlLabel = (l: number) => (l === 0 ? 'Cantrip' : `${l}${l === 1 ? 'st' : l === 2 ? 'nd' : l === 3 ? 'rd' : 'th'} level`);

export function SpellMeta({ s }: { s: SpellDef }) {
  return (
    <dl className="kv">
      <dt>Level</dt><dd>{lvlLabel(s.level)} {titleCase(s.school)}{s.ritual ? ' (ritual)' : ''}</dd>
      <dt>Casting time</dt><dd>{s.castingTime}</dd>
      <dt>Range</dt><dd>{s.range}</dd>
      <dt>Components</dt><dd>{[s.components.v && 'V', s.components.s && 'S', s.components.m && 'M'].filter(Boolean).join(', ')}{s.components.material ? ` (${s.components.material})` : ''}</dd>
      <dt>Duration</dt><dd>{s.concentration ? 'Concentration, ' : ''}{s.duration}</dd>
      {s.attack && <><dt>Attack</dt><dd>{titleCase(s.attack)} spell attack</dd></>}
      {s.save && <><dt>Save</dt><dd>{s.save.toUpperCase()}</dd></>}
      {s.damageTypes?.length ? <><dt>Damage</dt><dd>{s.damageTypes.map(titleCase).join(', ')}</dd></> : null}
      <dt>Classes</dt><dd>{s.classes.map(titleCase).join(', ')}</dd>
      <dt>Source</dt><dd>{s.source.book}{s.source.kind === 'summary' ? ' (summary)' : ''}</dd>
    </dl>
  );
}

export function SpellDetailModal({ spell, onClose, actions }: { spell: SpellDef; onClose: () => void; actions?: React.ReactNode }) {
  return (
    <Modal title={spell.name} onClose={onClose} footer={actions}>
      <div className="stack">
        <SpellMeta s={spell} />
        <hr />
        <div className="pre">{spell.description}</div>
        {spell.higherLevels && <div><b>At higher levels.</b> {spell.higherLevels}</div>}
        {spell.source.kind === 'summary' && <div className="notice small">This is a brief summary of a non-SRD spell. See {spell.source.book} for the full text.</div>}
      </div>
    </Modal>
  );
}

/** Spells available to a caster: class list + subclass expanded lists (warlock patrons, divine soul), limited to castable levels. */
export function availableSpells(cv: CasterView, d: Derived, all: SpellDef[], ch: Character): SpellDef[] {
  const extraLists = new Set<string>();
  for (const f of d.features) for (const t of f.def.tags ?? []) if (t.startsWith('extra-list:') && f.classId === cv.classId) extraLists.add(t.slice(11));
  const expanded = new Set<string>();
  const entry = d.classes.find((c) => c.entry.classId === cv.classId);
  for (const b of entry?.subclass?.spells ?? []) if (b.mode === 'expanded-list' && b.level <= cv.classLevel) b.spells.forEach((s) => expanded.add(s));
  // option-based expanded lists (Genie kind)
  for (const cvch of d.choices) for (const o of cvch.options) if (cvch.selected.includes(o.id)) for (const g of o.grants?.spells ?? []) if (g.mode === 'expanded-list') expanded.add(g.spellId);
  const restrict = entry?.subclass?.spellcasting?.schoolRestriction;
  void ch;
  return all.filter((s) => (s.classes.includes(cv.list) || [...extraLists].some((l) => s.classes.includes(l)) || expanded.has(s.id)) && s.level <= cv.maxSpellLevel)
    .map((s) => (restrict && s.level > 0 && !restrict.schools.includes(s.school) ? { ...s, tags: [...(s.tags ?? []), 'restricted-school'] } : s));
}

export function SpellPicker({ ch, d, cv, onAdd, onRemove }: { ch: Character; d: Derived; cv: CasterView; onAdd: (s: SpellDef) => void; onRemove: (s: SpellDef) => void }) {
  const db = useDb();
  const [q, setQ] = useState('');
  const [lvl, setLvl] = useState<number | 'all'>('all');
  const [school, setSchool] = useState('all');
  const [conc, setConc] = useState<'any' | 'yes' | 'no'>('any');
  const [ritual, setRitual] = useState(false);
  const [detail, setDetail] = useState<SpellDef | null>(null);
  const [listFilter, setListFilter] = useState<string>('mine');
  const [time, setTime] = useState('any');
  const all = useMemo(() => [...db.spells.values()], [db]);
  const mine = useMemo(() => availableSpells(cv, d, all, ch), [cv, d, all, ch]);
  const mineIds = useMemo(() => new Set(mine.map((x) => x.id)), [mine]);
  const pool = useMemo(() => {
    if (listFilter === 'mine') return mine;
    const base = listFilter === 'all' ? all : all.filter((x) => x.classes.includes(listFilter));
    // Show everything up to your castable level; off-list spells are allowed (homebrew) but labelled.
    return base.filter((x) => x.level <= Math.max(cv.maxSpellLevel, 0)).map((x) => mine.find((m) => m.id === x.id) ?? x);
  }, [listFilter, mine, all, cv.maxSpellLevel]);
  const className = db.classes.get(cv.classId)?.name ?? cv.name;
  const classOptions = useMemo(() => [...new Set(all.flatMap((x) => x.classes))].sort(), [all]);
  const owned = new Set(ch.spells.entries.filter((e) => e.classId === cv.classId).map((e) => e.spellId));
  const granted = new Set(d.spells.filter((s) => s.granted).map((s) => s.spellId));
  let list = pool.filter((s) => (lvl === 'all' || s.level === lvl) && (school === 'all' || s.school === school) && (conc === 'any' || (conc === 'yes') === s.concentration) && (!ritual || s.ritual) && matchesTime(s.castingTime, time));
  list = q ? fuzzySearch(q, list, (s) => ({ id: s.id, name: s.name, keywords: [s.school, s.castingTime, ...(s.damageTypes ?? []), ...(s.tags ?? [])] })).map((h) => h.item) : list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return (
    <div className="stack">
      <div className="row">
        <input className="grow" placeholder="Search spells…" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 160 }} />
        <select value={listFilter} onChange={(e) => setListFilter(e.target.value)} style={{ width: 'auto' }} aria-label="Spell list">
          <option value="mine">{className} list (incl. subclass)</option>
          {classOptions.map((c) => <option key={c} value={c}>{titleCase(c)} spells</option>)}
          <option value="all">All spells</option>
        </select>
        <select value={time} onChange={(e) => setTime(e.target.value)} style={{ width: 'auto' }} aria-label="Casting time">
          <option value="any">Any casting time</option><option value="action">Action</option><option value="bonus">Bonus action</option><option value="reaction">Reaction</option><option value="long">1 minute or longer</option>
        </select>
        <select value={lvl} onChange={(e) => setLvl(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={{ width: 'auto' }} aria-label="Level">
          <option value="all">All levels</option>
          {Array.from({ length: cv.maxSpellLevel + 1 }, (_, i) => <option key={i} value={i}>{lvlLabel(i)}</option>)}
        </select>
        <select value={school} onChange={(e) => setSchool(e.target.value)} style={{ width: 'auto' }} aria-label="School"><option value="all">All schools</option>{SCHOOLS.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>
        <select value={conc} onChange={(e) => setConc(e.target.value as 'any')} style={{ width: 'auto' }} aria-label="Concentration"><option value="any">Concentration: any</option><option value="yes">Concentration</option><option value="no">No concentration</option></select>
        <label className="check small"><input type="checkbox" checked={ritual} onChange={(e) => setRitual(e.target.checked)} />Ritual</label>
      </div>
      <div className="panel flush" style={{ maxHeight: 420, overflow: 'auto' }}>
        <table className="data">
          <thead><tr><th>Spell</th><th>Level</th><th>School</th><th>Time</th><th></th></tr></thead>
          <tbody>
            {list.slice(0, 200).map((s) => (
              <tr key={s.id}>
                <td><button className="ghost small" style={{ padding: 0, minHeight: 0 }} onClick={() => setDetail(s)}>{s.name}</button>{s.concentration && <span className="badge" title="Concentration">C</span>} {s.ritual && <span className="badge" title="Ritual">R</span>} {s.tags?.includes('restricted-school') && <span className="badge warn" title="Outside your subclass schools — only allowed at specific levels">school</span>} {db.isCustom('spell', s.id) && <span className="badge custom">custom</span>} {!mineIds.has(s.id) && <span className="badge warn" title={`Not normally available to a ${className}. You can still add it (homebrew / DM permission).`}>not a {className} spell</span>}</td>
                <td className="nowrap">{s.level === 0 ? 'Cantrip' : s.level}</td>
                <td>{titleCase(s.school)}</td>
                <td className="small">{s.castingTime}</td>
                <td className="num">{granted.has(s.id) && !owned.has(s.id) ? <span className="small muted">granted</span> : owned.has(s.id) ? <button className="small on" onClick={() => onRemove(s)}>Added ✓</button> : <button className="small" onClick={() => onAdd(s)}>Add</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <div className="empty">No matching spells.</div>}
      </div>
      {detail && <SpellDetailModal spell={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/** Casting-time buckets for filtering (handles 2014 "1 action" and 2024 "Action" wording). */
export function matchesTime(castingTime: string, bucket: string): boolean {
  const t = castingTime.toLowerCase();
  switch (bucket) {
    case 'action': return /^(1 )?action/.test(t);
    case 'bonus': return /bonus/.test(t);
    case 'reaction': return /reaction/.test(t);
    case 'long': return /minute|hour/.test(t);
    default: return true;
  }
}

export function addClassSpell(c: Character, s: SpellDef, cv: CasterView) {
  if (c.spells.entries.some((e) => e.spellId === s.id && e.classId === cv.classId)) return;
  const spellbook = cv.style === 'spellbook' && s.level > 0;
  c.spells.entries.push({ id: uid('sp'), spellId: s.id, classId: cv.classId, source: 'class', prepared: cv.style === 'known' || s.level === 0, inSpellbook: spellbook || undefined });
}
