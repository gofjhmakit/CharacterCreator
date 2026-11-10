import { useMemo, useState } from 'react';
import type { TabProps } from '../CharacterView';
import type { SpellView, CasterView } from '@/engine/derive';
import type { SpellDef } from '@/types/content';
import { ABILITY_NAMES, signed } from '@/types/core';
import { useApp } from '@/state/store';
import { useRoller } from '../../components/roll';
import { Modal, BreakdownView, Empty, Pips, titleCase, Field } from '../../components/common';
import { SpellPicker, SpellDetailModal, SpellMeta, addClassSpell, lvlLabel } from '../../components/spells';
import { SORCERY_POINT_SLOT_COST } from '@/engine/spellSlots';
import { arcaneRecovery } from '@/engine/actions';
import { uid } from '@/engine/factory';
import { fuzzySearch } from '@/search/fuzzy';

export function SpellsTab({ ch, d, set, replace }: TabProps) {
  const db = useApp((s) => s.db);
  const toast = useApp((s) => s.toast);
  const roller = useRoller();
  const [filter, setFilter] = useState<'all' | 'prepared' | 'favorites' | 'ritual' | 'concentration'>('all');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState<CasterView | null>(null);
  const [addOther, setAddOther] = useState(false);
  const [cast, setCast] = useState<SpellView | null>(null);
  const [detail, setDetail] = useState<SpellDef | null>(null);
  const [dcInfo, setDcInfo] = useState<CasterView | null>(null);

  const spells = d.spells.filter((s) => {
    if (q && !(s.spell?.name ?? s.spellId).toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'prepared') return s.prepared || s.alwaysPrepared || s.kind === 'cantrip';
    if (filter === 'favorites') return s.favorite;
    if (filter === 'ritual') return !!s.spell?.ritual;
    if (filter === 'concentration') return !!s.spell?.concentration;
    return true;
  });
  const byLevel = new Map<number, SpellView[]>();
  for (const s of spells) { const l = s.spell?.level ?? 0; if (!byLevel.has(l)) byLevel.set(l, []); byLevel.get(l)!.push(s); }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const sorcery = d.resources.find((r) => r.id === 'sorcery-points');
  const arcaneRes = d.resources.find((r) => r.id === 'arcane-recovery');
  const wizLvl = d.classes.find((c) => c.entry.classId === 'wizard')?.level ?? 0;

  const toggleEntry = (s: SpellView, patch: Partial<NonNullable<SpellView['entry']>>) => set((c) => { const e = c.spells.entries.find((x) => x.id === s.entry?.id); if (e) Object.assign(e, patch); });
  const favorite = (s: SpellView) => {
    if (s.entry) toggleEntry(s, { favorite: !s.favorite });
    else set((c) => { const k = `fav:${s.key}`; if (c.choices[k]?.length) delete c.choices[k]; else c.choices[k] = ['1']; });
  };

  if (!d.casters.length && !d.spells.length) return (
    <div className="panel"><Empty>No spellcasting yet. Spells from your race, feats, subclass, or items will appear here automatically.
      <div style={{ marginTop: 10 }}><button onClick={() => setAddOther(true)}>Add a spell manually</button></div></Empty>
      {addOther && <AddOtherSpell onClose={() => setAddOther(false)} onAdd={(spellId, label, uses) => set((c) => { c.spells.entries.push({ id: uid('sp'), spellId, source: 'custom', sourceLabel: label, prepared: true, uses: uses ? { max: uses, used: 0, recharge: 'long' } : undefined, ability: 'cha' }); })} />}
    </div>
  );

  return (
    <div className="stack lg">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}>
        {d.casters.map((cv) => {
          const mine = ch.spells.entries.filter((e) => e.classId === cv.classId && e.source === 'class');
          const cantrips = mine.filter((e) => (db.spells.get(e.spellId)?.level ?? 0) === 0).length;
          const leveled = d.spells.filter((v) => v.classId === cv.classId && v.countsAgainstLimit);
          const prepared = leveled.filter((v) => v.prepared).length;
          return (
            <div key={cv.classId} className="panel">
              <div className="panel-title"><h3>{cv.name}</h3><span className="spacer" /><span className="chip">{ABILITY_NAMES[cv.ability]}</span></div>
              <div className="row">
                <button onClick={() => setDcInfo(cv)} title="Breakdown"><span className="caps">Save DC</span> <b className="num" style={{ fontSize: '1.3rem' }}>{cv.dc.total}</b></button>
                <button onClick={() => roller.d20(`${cv.name} spell attack`, cv.attack, 'attack')}><span className="caps">Attack</span> <b className="num" style={{ fontSize: '1.3rem' }}>{signed(cv.attack.total)}</b></button>
              </div>
              <div className="row small" style={{ marginTop: 8 }}>
                {cv.cantripsKnown !== undefined && <span className={`chip ${cantrips > cv.cantripsKnown ? 'red' : ''}`}>Cantrips {cantrips}/{cv.cantripsKnown}</span>}
                {cv.style === 'known' && cv.spellsKnown !== undefined && <span className={`chip ${leveled.length > cv.spellsKnown ? 'red' : ''}`}>Known {leveled.length}/{cv.spellsKnown}</span>}
                {cv.style !== 'known' && cv.preparedLimit !== undefined && <span className={`chip ${prepared > cv.preparedLimit ? 'red' : prepared === cv.preparedLimit ? 'green' : ''}`}>Prepared {prepared}/{cv.preparedLimit}</span>}
                {cv.style === 'spellbook' && <span className="chip">Spellbook {leveled.filter((v) => v.inSpellbook).length}</span>}
                <span className="chip">Max level {cv.maxSpellLevel}</span>
                {cv.ritual && <span className="chip">Ritual casting</span>}
              </div>
              <button className="small" style={{ marginTop: 8 }} onClick={() => setAdding(cv)}>{cv.style === 'spellbook' ? 'Add to spellbook' : cv.style === 'prepared' ? 'Add / prepare spells' : 'Learn spells'}</button>
            </div>
          );
        })}
        {(d.slots.length > 0 || d.pact) && (
          <div className="panel">
            <div className="panel-title"><h3>Slots</h3><span className="spacer" /><span className="small muted">caster level {d.casterLevel}</span></div>
            {d.slots.map((s) => <div key={s.level} className="row"><span className="caps" style={{ width: 54 }}>{lvlLabel(s.level).replace(' level', '')}</span><Pips square max={s.max} used={s.used} onSet={(u) => set((c) => { c.spells.slotsUsed[s.level] = u; })} /></div>)}
            {d.pact && <div className="row"><span className="caps" style={{ width: 54 }}>Pact</span><Pips square max={d.pact.slots} used={d.pact.used} onSet={(u) => set((c) => { c.spells.pactSlotsUsed = u; })} /><span className="small muted">lvl {d.pact.level}</span></div>}
            {sorcery && <FlexibleCasting ch={ch} d={d} set={set} />}
            {arcaneRes && wizLvl > 0 && <ArcaneRecovery ch={ch} wizLvl={wizLvl} available={arcaneRes.remaining > 0} onApply={(levels) => {
              const next = arcaneRecovery(ch, wizLvl, levels);
              if (!next) { toast({ kind: 'error', text: `Invalid selection (max combined level ${Math.ceil(wizLvl / 2)}, no 6th+).` }); return; }
              next.resources['arcane-recovery'] = { ...(next.resources['arcane-recovery'] ?? {}), used: 1 };
              replace(next); toast({ kind: 'success', text: 'Arcane Recovery used.' });
            }} />}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title" style={{ flexWrap: 'wrap' }}>
          <h3>Spells</h3><span className="spacer" />
          <input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 160 }} />
          <div className="btn-group">{(['all', 'prepared', 'favorites', 'ritual', 'concentration'] as const).map((f) => <button key={f} className={`small ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{titleCase(f)}</button>)}</div>
          <button className="small" onClick={() => setAddOther(true)}>Add other spell</button>
        </div>
        {levels.length === 0 && <Empty>No spells match.</Empty>}
        {levels.map((l) => (
          <div key={l}>
            <div className="spell-level-head"><h4>{l === 0 ? 'Cantrips' : lvlLabel(l)}</h4>{l > 0 && d.slots.find((s) => s.level === l) && <span className="small muted">{(() => { const s = d.slots.find((x) => x.level === l)!; return `${s.max - s.used}/${s.max} slots`; })()}</span>}</div>
            <div className="table-wrap">
              <table className="data">
                <tbody>
                  {byLevel.get(l)!.sort((a, b) => (a.spell?.name ?? '').localeCompare(b.spell?.name ?? '')).map((s) => {
                    const cv = d.casters.find((c) => c.classId === s.classId);
                    const canPrep = s.entry?.source === 'class' && cv && cv.style !== 'known' && l > 0;
                    return (
                      <tr key={s.key}>
                        <td style={{ width: 28 }}><button className="ghost small icon" aria-label="Favorite" onClick={() => favorite(s)}>{s.favorite ? '★' : '☆'}</button></td>
                        <td>
                          <button className="ghost small" style={{ padding: 0, minHeight: 0, fontWeight: 700 }} onClick={() => s.spell && setDetail(s.spell)}>{s.spell?.name ?? s.spellId}</button>
                          {!s.spell && <span className="badge warn">missing</span>}
                          {s.spell?.concentration && <span className="badge" title="Concentration">C</span>} {s.spell?.ritual && <span className="badge" title="Ritual">R</span>}
                          <div className="small muted">{s.spell ? `${s.spell.castingTime} · ${s.spell.range}${s.spell.save ? ` · ${s.spell.save.toUpperCase()} save` : ''}${s.spell.attack ? ' · attack' : ''}` : ''}</div>
                        </td>
                        <td className="small">
                          <span className={`chip ${s.alwaysPrepared ? 'green' : s.granted ? 'blue' : ''}`}>{s.alwaysPrepared ? 'Always prepared' : s.kind === 'innate' ? 'Innate' : s.granted ? 'Granted' : s.kind === 'spellbook' ? 'Spellbook' : s.kind === 'prepared' ? 'Prepared' : s.kind === 'cantrip' ? 'Cantrip' : 'Known'}</span>
                          <div className="muted">{s.sourceLabel}</div>
                        </td>
                        <td className="nowrap">
                          {canPrep && !s.alwaysPrepared && <label className="check small"><input type="checkbox" checked={s.prepared} onChange={(e) => toggleEntry(s, { prepared: e.target.checked })} />Prepared</label>}
                          {cv?.style === 'spellbook' && s.entry && l > 0 && <label className="check small" style={{ marginLeft: 8 }}><input type="checkbox" checked={!!s.entry.inSpellbook} onChange={(e) => toggleEntry(s, { inSpellbook: e.target.checked })} />In book</label>}
                          {s.uses && <span className="small"> {s.uses.max - s.uses.used}/{s.uses.max} uses</span>}
                        </td>
                        <td className="num nowrap">
                          {s.spell && <button className="small" onClick={() => setCast(s)}>Cast</button>}
                          {s.entry && <button className="small ghost" aria-label="Remove spell" onClick={() => set((c) => { c.spells.entries = c.spells.entries.filter((e) => e.id !== s.entry!.id); })}>✕</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {adding && <Modal title={`${adding.name}: add spells`} onClose={() => setAdding(null)} size="wide" footer={<button className="primary" onClick={() => setAdding(null)}>Done</button>}>
        <SpellPicker ch={ch} d={d} cv={adding} onAdd={(s) => set((c) => addClassSpell(c, s, adding))} onRemove={(s) => set((c) => { c.spells.entries = c.spells.entries.filter((e) => !(e.spellId === s.id && e.classId === adding.classId)); })} />
      </Modal>}
      {addOther && <AddOtherSpell onClose={() => setAddOther(false)} onAdd={(spellId, label, uses, ability) => set((c) => { c.spells.entries.push({ id: uid('sp'), spellId, source: 'custom', sourceLabel: label, prepared: true, uses: uses ? { max: uses, used: 0, recharge: 'long' } : undefined, ability }); })} />}
      {cast && <CastDialog s={cast} ch={ch} d={d} set={set} onClose={() => setCast(null)} />}
      {detail && <SpellDetailModal spell={detail} onClose={() => setDetail(null)} />}
      {dcInfo && <Modal title={`${dcInfo.name} spellcasting`} onClose={() => setDcInfo(null)} size="narrow"><BreakdownView b={dcInfo.dc} title="Spell save DC" unit=" " /><hr /><BreakdownView b={dcInfo.attack} title="Spell attack" /></Modal>}
    </div>
  );
}

function FlexibleCasting({ ch, d, set }: Pick<TabProps, 'ch' | 'd' | 'set'>) {
  const sp = d.resources.find((r) => r.id === 'sorcery-points')!;
  const toast = useApp((s) => s.toast);
  return (
    <div className="stack" style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <div className="row between"><b>Sorcery points</b><span className="num">{sp.remaining}/{sp.max}</span></div>
      <div className="row small"><span className="muted">Slot → points:</span>{d.slots.filter((s) => s.max - s.used > 0).map((s) => <button key={s.level} className="small" disabled={sp.remaining + s.level > sp.max} onClick={() => set((c) => { c.spells.slotsUsed[s.level] += 1; c.resources['sorcery-points'] = { ...(c.resources['sorcery-points'] ?? {}), used: Math.max(0, sp.used - s.level) }; })}>L{s.level} → {s.level}</button>)}</div>
      <div className="row small"><span className="muted">Points → slot:</span>{Object.entries(SORCERY_POINT_SLOT_COST).map(([lvl, cost]) => {
        const l = Number(lvl); const slot = d.slots.find((s) => s.level === l);
        return <button key={l} className="small" disabled={sp.remaining < cost || !slot || slot.used === 0} title={!slot ? 'You have no slots of this level' : slot.used === 0 ? 'Slots are full (created slots above max are not tracked)' : ''} onClick={() => { set((c) => { c.spells.slotsUsed[l] -= 1; c.resources['sorcery-points'] = { ...(c.resources['sorcery-points'] ?? {}), used: sp.used + cost }; }); toast({ kind: 'success', text: `Created a level ${l} slot for ${cost} sorcery points.` }); }}>L{l} ({cost})</button>;
      })}</div>
      {void ch}
    </div>
  );
}

function ArcaneRecovery({ ch, wizLvl, available, onApply }: { ch: TabProps['ch']; wizLvl: number; available: boolean; onApply: (levels: number[]) => void }) {
  const [pick, setPick] = useState<number[]>([]);
  const budget = Math.ceil(wizLvl / 2);
  const sum = pick.reduce((a, b) => a + b, 0);
  return (
    <div className="stack" style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <div className="row between"><b>Arcane Recovery</b><span className="small muted">{available ? `up to ${budget} levels` : 'used today'}</span></div>
      {available && <>
        <div className="row small">{[1, 2, 3, 4, 5].filter((l) => (ch.spells.slotsUsed[l] ?? 0) > pick.filter((x) => x === l).length).map((l) => <button key={l} className="small" disabled={sum + l > budget} onClick={() => setPick([...pick, l])}>+L{l}</button>)}</div>
        <div className="row small">{pick.map((l, i) => <span key={i} className="chip">L{l}<button onClick={() => setPick(pick.filter((_, j) => j !== i))}>✕</button></span>)}<button className="small primary" disabled={!pick.length} onClick={() => { onApply(pick); setPick([]); }}>Recover {sum}/{budget}</button></div>
      </>}
    </div>
  );
}

function AddOtherSpell({ onClose, onAdd }: { onClose: () => void; onAdd: (spellId: string, label: string, uses: number | undefined, ability: 'int' | 'wis' | 'cha') => void }) {
  const db = useApp((s) => s.db);
  const [q, setQ] = useState('');
  const [label, setLabel] = useState('Feat / item / DM');
  const [uses, setUses] = useState('');
  const [ability, setAbility] = useState<'int' | 'wis' | 'cha'>('cha');
  const all = useMemo(() => [...db.spells.values()], [db]);
  const list = q ? fuzzySearch(q, all, (s) => ({ id: s.id, name: s.name, keywords: [s.school, ...s.classes] })).map((h) => h.item) : all.slice(0, 50);
  return (
    <Modal title="Add a spell from another source" onClose={onClose} size="wide">
      <div className="stack">
        <div className="field-row">
          <Field label="Source label"><input value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
          <Field label="Uses per long rest" hint="Leave empty for at-will / uses your slots"><input type="number" value={uses} onChange={(e) => setUses(e.target.value)} /></Field>
          <Field label="Spellcasting ability"><select value={ability} onChange={(e) => setAbility(e.target.value as 'cha')}><option value="int">Intelligence</option><option value="wis">Wisdom</option><option value="cha">Charisma</option></select></Field>
        </div>
        <input placeholder="Search all spells…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="list panel flush" style={{ maxHeight: 360, overflow: 'auto' }}>
          {list.slice(0, 80).map((s) => <div key={s.id} className="list-row clickable" onClick={() => { onAdd(s.id, label, uses ? Number(uses) : undefined, ability); onClose(); }}><span className="grow">{s.name}</span><span className="small muted">{lvlLabel(s.level)} · {titleCase(s.school)}</span></div>)}
        </div>
      </div>
    </Modal>
  );
}

function CastDialog({ s, ch, d, set, onClose }: { s: SpellView; ch: TabProps['ch']; d: TabProps['d']; set: TabProps['set']; onClose: () => void }) {
  const roller = useRoller();
  const toast = useApp((st) => st.toast);
  const sp = s.spell!;
  const isWarlock = s.classId === 'warlock';
  const slotOptions = sp.level === 0 ? [] : [
    ...d.slots.filter((x) => x.level >= sp.level).map((x) => ({ key: `s${x.level}`, label: `Level ${x.level} slot (${x.max - x.used} left)`, level: x.level, ok: x.max - x.used > 0, pact: false })),
    ...(d.pact && d.pact.level >= sp.level ? [{ key: 'pact', label: `Pact slot, level ${d.pact.level} (${d.pact.slots - d.pact.used} left)`, level: d.pact.level, ok: d.pact.slots - d.pact.used > 0, pact: true }] : []),
  ];
  const [choice, setChoice] = useState(() => (isWarlock && slotOptions.find((o) => o.pact && o.ok)?.key) || slotOptions.find((o) => o.ok)?.key || (s.uses ? 'use' : 'free'));
  const castLevel = slotOptions.find((o) => o.key === choice)?.level ?? sp.level;
  const dmg = sp.damage?.bySlot?.[String(castLevel)] ?? (sp.damage?.byCharLevel ? Object.entries(sp.damage.byCharLevel).filter(([k]) => Number(k) <= d.totalLevel).pop()?.[1] : undefined);
  const heal = sp.heal?.[String(castLevel)];
  const healExpr = heal?.replace(/\s*\+\s*MOD/i, s.dc !== undefined ? `+${Math.max(0, (s.dc ?? 8) - 8 - d.profBonus)}` : '');
  const doCast = () => {
    set((c) => {
      const o = slotOptions.find((x) => x.key === choice);
      if (o?.pact) c.spells.pactSlotsUsed += 1;
      else if (o) c.spells.slotsUsed[o.level] = (c.spells.slotsUsed[o.level] ?? 0) + 1;
      else if (choice === 'use' && s.uses) {
        if (s.entry?.uses) { const e = c.spells.entries.find((x) => x.id === s.entry!.id); if (e?.uses) e.uses.used += 1; }
        else if (s.uses.resourceId) c.resources[s.uses.resourceId] = { ...(c.resources[s.uses.resourceId] ?? {}), used: (c.resources[s.uses.resourceId]?.used ?? 0) + 1 };
      }
      if (sp.concentration) { c.combat.concentration = sp.name; }
    });
    toast({ kind: 'success', text: `Cast ${sp.name}${sp.level > 0 ? ` at level ${castLevel}` : ''}.`, detail: sp.concentration ? `Concentrating on ${sp.name}${ch.combat.concentration && ch.combat.concentration !== sp.name ? ` (ended ${ch.combat.concentration})` : ''}.` : undefined });
    onClose();
  };
  return (
    <Modal title={`Cast ${sp.name}`} onClose={onClose} footer={<><button onClick={onClose}>Cancel</button><button className="primary" onClick={doCast} disabled={slotOptions.length > 0 && choice !== 'free' && choice !== 'use' && !slotOptions.find((o) => o.key === choice)?.ok}>Cast</button></>}>
      <div className="stack">
        <SpellMeta s={sp} />
        {sp.level > 0 && (
          <Field label="Spend">
            <select value={choice} onChange={(e) => setChoice(e.target.value)}>
              {slotOptions.map((o) => <option key={o.key} value={o.key} disabled={!o.ok}>{o.label}</option>)}
              {s.uses && <option value="use">Innate use ({s.uses.max - s.uses.used}/{s.uses.max})</option>}
              <option value="free">No slot (ritual, item, free cast)</option>
            </select>
          </Field>
        )}
        <div className="row">
          {sp.attack && s.attack !== undefined && <button onClick={() => roller.d20(`${sp.name} attack`, s.attack!, 'attack')}>Spell attack {signed(s.attack)}</button>}
          {sp.save && <span className="chip gold">{sp.save.toUpperCase()} save DC {s.dc}</span>}
          {dmg && <button onClick={() => roller.expr(`${sp.name} damage`, dmg, 'damage')}>Damage {dmg}</button>}
          {dmg && sp.attack && <button className="ghost" onClick={() => roller.expr(`${sp.name} damage (critical)`, dmg, 'damage', true)}>Crit</button>}
          {healExpr && <button onClick={() => roller.expr(`${sp.name} healing`, healExpr, 'healing')}>Healing {healExpr}</button>}
        </div>
        {sp.concentration && ch.combat.concentration && ch.combat.concentration !== sp.name && <div className="notice small">Casting this ends your concentration on {ch.combat.concentration}.</div>}
        <details><summary className="small">Description</summary><div className="pre small" style={{ marginTop: 6 }}>{sp.description}</div>{sp.higherLevels && <p className="small"><b>At higher levels.</b> {sp.higherLevels}</p>}</details>
      </div>
    </Modal>
  );
}
