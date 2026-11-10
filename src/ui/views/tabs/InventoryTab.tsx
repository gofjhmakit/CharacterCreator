import { useUnits } from '@/ui/units';
import { useDb } from '@/ui/ruleset';
import { useMemo, useState } from 'react';
import type { TabProps } from '../CharacterView';
import type { InventoryItem } from '@/types/character';
import type { ItemDefinition } from '@/types/content';
import { ITEM_CATEGORY_LABEL } from '@/types/content';
import { RARITY_LABEL, RARITIES } from '@/types/core';
import { useApp } from '@/state/store';
import { addItem, resyncFromTemplate, instanceDiffersFromTemplate, setAttuned, setEquipped } from '@/engine/inventory';
import { applyHealing, useConsumable as consume } from '@/engine/actions';
import { searchItems } from '@/search/fuzzy';
import { Modal, Stepper, Empty, NumberField, useConfirm, titleCase } from '../../components/common';
import { ItemEditor, ItemRow, blankItem, fromTemplate, itemErrors, itemSummary, TemplatePicker } from '../../components/ItemEditor';
import { useRoller } from '../../components/roll';
import { rollExpression } from '@/dice/dice';
import { describeOutcomes } from '@/engine/derive';

export function InventoryTab({ ch, d, set, replace }: TabProps) {
  const db = useDb();
  const toast = useApp((s) => s.toast);
  const saveCustom = useApp((s) => s.saveCustom);
  const roller = useRoller();
  const { ask, node } = useConfirm();
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState<ItemDefinition | null>(null);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [detail, setDetail] = useState<InventoryItem | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState<'name' | 'weight' | 'category' | 'equipped'>('equipped');

  const c = d.carrying;
  const un = useUnits();
  const pct = Math.min(1, c.weight / Math.max(1, c.capacity));
  let items = ch.inventory.filter((i) => (cat === 'all' || i.item.category === cat) && (!q || `${i.item.name} ${i.item.type ?? ''} ${(i.item.tags ?? []).join(' ')}`.toLowerCase().includes(q.toLowerCase())));
  items = [...items].sort((a, b) => sort === 'name' ? a.item.name.localeCompare(b.item.name) : sort === 'weight' ? b.item.weight * b.quantity - a.item.weight * a.quantity : sort === 'category' ? a.item.category.localeCompare(b.item.category) || a.item.name.localeCompare(b.item.name) : Number(b.equipped) - Number(a.equipped) || Number(b.attuned) - Number(a.attuned) || a.item.name.localeCompare(b.item.name));
  const cats = [...new Set(ch.inventory.map((i) => i.item.category))];

  const attune = (it: InventoryItem, v: boolean) => {
    const r = setAttuned(ch, it.id, v, d.attunement.limit);
    if (r.warning) toast({ kind: 'error', text: r.warning });
    else replace(r.character);
  };
  const use = (it: InventoryItem) => {
    let next = consume(ch, it.id);
    const heal = it.item.consumable?.onUse?.find((o) => o.kind === 'heal' && o.dice);
    if (heal) {
      const r = rollExpression(heal.dice!, { label: `${it.item.name} (healing)`, kind: 'healing' });
      useApp.getState().addRoll(r);
      next = applyHealing(next, d, r.total);
      toast({ kind: 'success', text: `${it.item.name}: healed ${r.total}.` });
    } else toast({ kind: 'info', text: `Used ${it.item.name}.`, detail: it.item.consumable?.onUse?.map((o) => o.text).filter(Boolean).join(' ') });
    replace(next, `Used ${it.item.name}`);
  };
  const remove = async (it: InventoryItem) => {
    if (await ask({ title: 'Remove item?', message: <>Remove <b>{it.item.name}</b>{it.quantity > 1 ? ` (×${it.quantity})` : ''} from the inventory?</>, confirmLabel: 'Remove', danger: true })) set((x) => { x.inventory = x.inventory.filter((y) => y.id !== it.id && y.containerId !== it.id); }, `Removed ${it.item.name}`);
  };
  const containers = ch.inventory.filter((i) => i.item.category === 'container' || /bag|pack|haversack|hole|chest|pouch/i.test(i.item.name));

  return (
    <div className="stack lg">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
        <div className="panel">
          <div className="panel-title"><h3>Currency</h3></div>
          <div className="row">
            {(['pp', 'gp', 'ep', 'sp', 'cp'] as const).map((k) => <label key={k} className="field" style={{ width: 82 }}><span className="caps">{k}</span><NumberField className="" value={ch.currency[k]} min={0} onChange={(v) => set((x) => { x.currency[k] = v; })} /></label>)}
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>Total ≈ {(ch.currency.pp * 10 + ch.currency.gp + ch.currency.ep * 0.5 + ch.currency.sp * 0.1 + ch.currency.cp * 0.01).toFixed(2)} gp · coins weigh {un.wt(c.coinWeight)}</div>
        </div>
        <div className="panel">
          <div className="panel-title"><h3>Carrying</h3><span className="spacer" /><span className={`chip ${c.status === 'normal' ? '' : 'red'}`}>{titleCase(c.status)}</span></div>
          <div className="row between"><span className="num" style={{ fontSize: '1.4rem', fontWeight: 700 }}>{un.wt(c.weight)} <span className="muted small">/ {un.wt(c.capacity)}</span></span><span className="small muted">Push/drag/lift {un.wt(c.pushDragLift)}</span></div>
          <div className="hp-bar" style={{ marginTop: 6 }}><div className={`fill ${pct > 0.9 ? 'crit' : pct > 0.66 ? 'low' : ''}`} style={{ width: `${pct * 100}%` }} /></div>
          <div className="small muted" style={{ marginTop: 6 }}>{ch.settings.encumbrance === 'variant' ? `Variant encumbrance: encumbered over ${un.wt(c.encumberedAt)}, heavily over ${un.wt(c.heavilyAt)}.` : ch.settings.encumbrance === 'off' ? 'Encumbrance tracking is off.' : 'Standard rule: carrying capacity = STR × 15.'}</div>
        </div>
        <div className="panel">
          <div className="panel-title"><h3>Attunement</h3><span className="spacer" /><span className={`chip ${d.attunement.count > d.attunement.limit ? 'red' : ''}`}>{d.attunement.count}/{d.attunement.limit}</span></div>
          {ch.inventory.filter((i) => i.attuned).map((i) => <div key={i.id} className="small">● {i.item.name}</div>)}
          {!d.attunement.count && <span className="small muted">No attuned items.</span>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-title" style={{ flexWrap: 'wrap' }}>
          <h3>Inventory</h3><span className="spacer" />
          <input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 150 }} />
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ width: 'auto' }} aria-label="Category"><option value="all">All categories</option>{cats.map((k) => <option key={k} value={k}>{ITEM_CATEGORY_LABEL[k] ?? k}</option>)}</select>
          <select value={sort} onChange={(e) => setSort(e.target.value as 'name')} style={{ width: 'auto' }} aria-label="Sort"><option value="equipped">Equipped first</option><option value="name">Name</option><option value="category">Category</option><option value="weight">Weight</option></select>
          <button className="primary" onClick={() => setAdding(true)}>Add item</button>
          <button onClick={() => setCreating(blankItem())}>Add New Item…</button>
        </div>
        {items.length === 0 ? <Empty>No items{q || cat !== 'all' ? ' match the filter' : ''}.</Empty> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Weight</th><th>Equip</th><th>Attune</th><th>Charges</th><th></th></tr></thead>
              <tbody>
                {items.map((it) => {
                  const tpl = it.origin.id ? db.items.get(it.origin.id) : undefined;
                  const modified = instanceDiffersFromTemplate(it, tpl);
                  const equippable = !!(it.item.weapon || it.item.armor || it.item.effects.length || ['ring', 'amulet', 'wondrous', 'clothing', 'staff', 'wand', 'rod', 'focus'].includes(it.item.category));
                  return (
                    <tr key={it.id}>
                      <td>
                        <button className="ghost small" style={{ padding: 0, minHeight: 0, fontWeight: 700, textAlign: 'left' }} onClick={() => setDetail(it)}>{it.item.name}</button>
                        {it.item.magical && <span className="badge magic" style={{ marginLeft: 4 }}>{RARITY_LABEL[it.item.rarity]}</span>}
                        {it.item.cursed && <span className="badge warn" style={{ marginLeft: 4 }}>cursed</span>}
                        {it.origin.kind === 'custom' && <span className="badge custom" style={{ marginLeft: 4 }}>custom</span>}
                        {modified && <span className="badge" style={{ marginLeft: 4 }} title="This copy differs from its template">modified</span>}
                        {it.containerId && <span className="small muted"> in {ch.inventory.find((x) => x.id === it.containerId)?.item.name}</span>}
                        <div className="small muted">{ITEM_CATEGORY_LABEL[it.item.category] ?? it.item.category}{itemSummary(it.item) ? ` · ${un.text(itemSummary(it.item))}` : ''}</div>
                        {it.notes && <div className="small ink2">{it.notes}</div>}
                      </td>
                      <td className="num"><Stepper value={it.quantity} min={1} max={9999} onChange={(v) => set((x) => { const y = x.inventory.find((z) => z.id === it.id); if (y) y.quantity = v; })} /></td>
                      <td className="num small">{it.excludeWeight ? '—' : un.wt(it.item.weight * it.quantity)}</td>
                      <td>{equippable && <input type="checkbox" aria-label={`Equip ${it.item.name}`} checked={it.equipped} onChange={(e) => { const r = setEquipped(ch, it.id, e.target.checked); replace(r.character, `${e.target.checked ? 'Equipped' : 'Unequipped'} ${it.item.name}`); if (r.unequipped.length) toast({ kind: 'info', text: `Equipped ${it.item.name}`, detail: `Unequipped ${r.unequipped.join(', ')} (slot full: one armor, two hands, two rings).` }); }} />}
                        {it.equipped && it.item.weapon?.kind === 'melee' && it.item.weapon.properties.includes('light') && <label className="check small" title="Off-hand (two-weapon fighting)"><input type="checkbox" checked={!!it.offHand} onChange={(e) => set((x) => { const y = x.inventory.find((z) => z.id === it.id); if (y) y.offHand = e.target.checked; })} />off</label>}
                      </td>
                      <td>{it.item.attunement?.required && <input type="checkbox" aria-label={`Attune ${it.item.name}`} checked={it.attuned} onChange={(e) => attune(it, e.target.checked)} title={it.item.attunement.restriction ? `Requires attunement by ${it.item.attunement.restriction}` : ''} />}</td>
                      <td>{it.item.charges && <Stepper value={it.charges ?? it.item.charges.max} min={0} max={it.item.charges.max} onChange={(v) => set((x) => { const y = x.inventory.find((z) => z.id === it.id); if (y) y.charges = v; })} />}</td>
                      <td className="num nowrap">
                        {it.item.consumable && <button className="small" onClick={() => use(it)}>Use</button>}
                        <button className="small ghost" onClick={() => setEditing(structuredClone(it))}>Edit</button>
                        <button className="small ghost danger" onClick={() => remove(it)} aria-label="Remove">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && <AddItemDialog onClose={() => setAdding(false)} onAdd={(def, qty) => { replace(addItem(ch, def, qty, db, true)); toast({ kind: 'success', text: `Added ${qty > 1 ? `${qty}× ` : ''}${def.name}${def.contents?.length ? ' (contents unpacked)' : ''}.` }); }} onCreate={(base) => { setAdding(false); setCreating(base ? fromTemplate(base) : blankItem()); }} />}
      {creating && <CreateItemDialog initial={creating} onClose={() => setCreating(null)} onSave={async (def, addToInv, saveTemplate) => {
        if (saveTemplate) await saveCustom({ kind: 'item', id: def.id, data: def });
        if (addToInv) replace(addItem(ch, def, 1, db, false));
        toast({ kind: 'success', text: `${saveTemplate ? 'Saved template' : 'Created'} “${def.name}”${addToInv ? ' and added it to the inventory' : ''}.` });
        setCreating(null);
      }} />}
      {editing && (
        <Modal title={`Edit: ${editing.item.name}`} onClose={() => setEditing(null)} size="wide" footer={<>
          {editing.origin.id && db.items.get(editing.origin.id) && instanceDiffersFromTemplate(editing, db.items.get(editing.origin.id)) && <button onClick={() => setEditing(resyncFromTemplate(editing, db.items.get(editing.origin.id!)!))} title="Replace this copy with the current template, keeping quantity/equipped/charges">Re-sync from template</button>}
          <button onClick={() => setEditing(null)}>Cancel</button>
          <button className="primary" disabled={itemErrors(editing.item).length > 0} onClick={() => { set((x) => { const i = x.inventory.findIndex((y) => y.id === editing.id); if (i >= 0) x.inventory[i] = editing; }); setEditing(null); }}>Save this copy</button>
        </>}>
          <div className="stack">
            <div className="field-row">
              <label className="field">Instance notes<input value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value || undefined })} placeholder="e.g. engraved with a raven" /></label>
              <label className="field">Stored in<select value={editing.containerId ?? ''} onChange={(e) => setEditing({ ...editing, containerId: e.target.value || undefined })}><option value="">(carried)</option>{containers.filter((x) => x.id !== editing.id).map((x) => <option key={x.id} value={x.id}>{x.item.name}</option>)}</select></label>
              <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" checked={!!editing.excludeWeight} onChange={(e) => setEditing({ ...editing, excludeWeight: e.target.checked || undefined })} />Don’t count weight (stored elsewhere)</label>
            </div>
            <ItemEditor mode="instance" value={editing.item} onChange={(item) => setEditing({ ...editing, item })} />
          </div>
        </Modal>
      )}
      {detail && <ItemDetail it={detail} onClose={() => setDetail(null)} onRoll={(dice, label) => roller.expr(label, dice, 'damage')} />}
      {node}
    </div>
  );
}

function ItemDetail({ it, onClose, onRoll }: { it: InventoryItem; onClose: () => void; onRoll: (dice: string, label: string) => void }) {
  const i = it.item;
  return (
    <Modal title={i.name} onClose={onClose}>
      <div className="stack">
        <div className="row">{i.magical && <span className="chip blue">{RARITY_LABEL[i.rarity]}</span>}<span className="chip">{ITEM_CATEGORY_LABEL[i.category]}</span>{i.type && <span className="chip">{i.type}</span>}{i.attunement?.required && <span className="chip">Requires attunement{i.attunement.restriction ? ` by ${i.attunement.restriction}` : ''}</span>}<span className="chip">{i.source.book}</span></div>
        {itemSummary(i) && <div className="small ink2">{itemSummary(i)}</div>}
        {i.image && <img src={i.image} alt="" style={{ width: 96, borderRadius: 4 }} />}
        <div className="pre">{i.description || <span className="muted">No description.</span>}</div>
        {i.notes && <div className="notice small">{i.notes}</div>}
        {i.curse && <div className="notice error small"><b>Curse.</b> {i.curse}</div>}
        {i.charges && <div className="small">Charges: {it.charges ?? i.charges.max}/{i.charges.max}, recharge {i.charges.recharge}{i.charges.rechargeAmount ? ` (${i.charges.rechargeAmount})` : ''}</div>}
        {i.effects.length > 0 && <div><span className="section-label">Mechanical effects</span>{i.effects.map((e) => <div key={e.id} className="small" style={{ marginBottom: 4 }}><b>{e.name ?? 'Effect'}</b> <span className="muted">({e.activation ?? 'equipped'}{e.trigger ? `, ${e.trigger}` : ''})</span>{e.manual && <span className="badge manual" style={{ marginLeft: 4 }}>manual</span>}<div className="ink2">{e.description || describeOutcomes(e) || (e.modifiers ?? []).map((m) => `${m.target} ${m.op ?? ''} ${m.value ?? m.formula ?? ''}${m.condition ? ` (${m.condition})` : ''}`).join(', ')}</div></div>)}</div>}
        {i.weapon && <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => onRoll(i.weapon!.damage.dice, `${i.name} damage dice`)}>Roll {i.weapon.damage.dice}</button>}
      </div>
    </Modal>
  );
}

export function AddItemDialog({ onClose, onAdd, onCreate }: { onClose: () => void; onAdd: (def: ItemDefinition, qty: number) => void; onCreate: (base?: ItemDefinition) => void }) {
  const db = useDb();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('any');
  const [magic, setMagic] = useState<'any' | 'magic' | 'mundane'>('any');
  const [rarity, setRarity] = useState('any');
  const [qty, setQty] = useState(1);
  const [onlyCustom, setOnlyCustom] = useState(false);
  const all = useMemo(() => [...db.items.values()], [db]);
  const pool = onlyCustom ? all.filter((i) => db.isCustom('item', i.id)) : all;
  const results = searchItems(q, pool, { category: cat, magical: magic, rarity }, 80);
  return (
    <Modal title="Add item" onClose={onClose} size="wide" footer={<><span className="small muted grow">Tip: try “long sw”, “healing pot”, “plate”, “finesse”, “legendary ring”.</span><button onClick={() => onCreate()}>Create from scratch</button><button onClick={onClose}>Done</button></>}>
      <div className="stack">
        <div className="row">
          <input autoFocus className="grow" placeholder={`Search ${pool.length} items…`} value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 200 }} />
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ width: 'auto' }} aria-label="Category"><option value="any">Any category</option>{Object.entries(ITEM_CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select value={magic} onChange={(e) => setMagic(e.target.value as 'any')} style={{ width: 'auto' }} aria-label="Magic"><option value="any">Magic & mundane</option><option value="magic">Magic only</option><option value="mundane">Mundane only</option></select>
          <select value={rarity} onChange={(e) => setRarity(e.target.value)} style={{ width: 'auto' }} aria-label="Rarity"><option value="any">Any rarity</option>{RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}</select>
          <label className="check small"><input type="checkbox" checked={onlyCustom} onChange={(e) => setOnlyCustom(e.target.checked)} />My custom items</label>
          <label className="row tight small">Qty <input type="number" className="num-sm" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} /></label>
        </div>
        <div className="list panel flush" style={{ maxHeight: '55vh', overflow: 'auto' }}>
          {results.map((i) => <ItemRow key={i.id} item={i} extra={<button className="small ghost" onClick={(e) => { e.stopPropagation(); onCreate(i); }}>Use as template</button>} action="Add" onClick={() => onAdd(i, qty)} />)}
          {results.length === 0 && <Empty>No matching items. <button className="small" onClick={() => onCreate()}>Create a custom item</button></Empty>}
        </div>
      </div>
    </Modal>
  );
}

export function CreateItemDialog({ initial, onClose, onSave, templateOnly }: { initial: ItemDefinition; onClose: () => void; onSave: (def: ItemDefinition, addToInventory: boolean, saveTemplate: boolean) => void; templateOnly?: boolean }) {
  const [item, setItem] = useState(initial);
  const tplDb = useDb();
  const [saveTpl, setSaveTpl] = useState(true);
  const [picking, setPicking] = useState(!initial.name && !templateOnly);
  const errs = itemErrors(item);
  return (
    <Modal title={templateOnly ? (initial.name ? `Edit item: ${initial.name}` : 'New custom item') : 'Add New Item'} onClose={onClose} size="wide" footer={<>
      {!templateOnly && <label className="check small grow"><input type="checkbox" checked={saveTpl} onChange={(e) => setSaveTpl(e.target.checked)} />Also save as a reusable template (Library)</label>}
      <button onClick={onClose}>Cancel</button>
      {templateOnly ? <button className="primary" disabled={errs.length > 0} onClick={() => onSave(item, false, true)}>Save template</button> : <>
        <button disabled={errs.length > 0 || !saveTpl} onClick={() => onSave(item, false, true)}>Save template only</button>
        <button className="primary" disabled={errs.length > 0} onClick={() => onSave(item, true, saveTpl)}>Save & add to inventory</button>
      </>}
    </>}>
      <div className="stack">
        {picking ? (
          <div className="stack">
            <p className="ink2">Start from an existing item (its properties are copied into the editor) or from scratch.</p>
            <TemplatePicker onPick={(t) => { setItem(fromTemplate(t)); setPicking(false); }} />
            <button style={{ alignSelf: 'flex-start' }} onClick={() => setPicking(false)}>Start from scratch</button>
          </div>
        ) : (
          <>
            {item.baseItemId && <div className="small muted">Based on: {tplDb.items.get(item.baseItemId)?.name ?? item.baseItemId} <button className="small ghost" onClick={() => setPicking(true)}>Choose another template</button></div>}
            <ItemEditor mode="template" value={item} onChange={setItem} />
          </>
        )}
      </div>
    </Modal>
  );
}
