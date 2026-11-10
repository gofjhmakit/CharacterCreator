import { useMemo } from 'react';
import type { Character } from '@/types/character';
import type { Derived } from '@/engine/derive';
import type { ItemDefinition, StartingItem } from '@/types/content';
import { useApp } from '@/state/store';
import { instantiateItem } from '@/engine/inventory';
import { rollExpression } from '@/dice/dice';
import { Empty } from '../components/common';
import { ARTISAN_TOOLS } from '@/types/core';

type Props = { ch: Character; d: Derived; set: (r: (c: Character) => void) => void };

/** Resolve placeholder item ids like "@martial-melee" to a list of candidate items. */
export function placeholderOptions(id: string, items: ItemDefinition[]): ItemDefinition[] {
  const w = items.filter((i) => i.weapon && !i.magical);
  switch (id) {
    case '@simple': return w.filter((i) => i.weapon!.category === 'simple');
    case '@simple-melee': return w.filter((i) => i.weapon!.category === 'simple' && i.weapon!.kind === 'melee');
    case '@martial': return w.filter((i) => i.weapon!.category === 'martial');
    case '@martial-melee': return w.filter((i) => i.weapon!.category === 'martial' && i.weapon!.kind === 'melee');
    case '@instrument': return items.filter((i) => i.category === 'instrument');
    case '@artisan': return items.filter((i) => i.category === 'tool' && ARTISAN_TOOLS.some((t) => t.toLowerCase() === i.name.toLowerCase()));
    default: return [];
  }
}

export function EquipmentStep({ ch, d, set }: Props) {
  const db = useApp((s) => s.db);
  const items = useMemo(() => [...db.items.values()], [db]);
  const cls = db.classes.get(ch.classes[0]?.classId ?? '');
  const bg = db.backgrounds.get(ch.background.backgroundId);
  void d;
  if (!cls) return <Empty>Choose a class first.</Empty>;
  const mode = ch.choices['wizard:equip-mode']?.[0] ?? 'package';
  const sel = (gi: number) => Number(ch.choices[`wizard:equip:${gi}`]?.[0] ?? 0);
  const ph = (key: string) => ch.choices[`wizard:ph:${key}`]?.[0];
  const setC = (k: string, v: string[]) => set((c) => { c.choices[k] = v; });

  const renderItems = (list: StartingItem[], keyBase: string) => (
    <span className="row tight">{list.map((it, i) => {
      if (it.itemId.startsWith('@')) {
        const opts = placeholderOptions(it.itemId, items);
        const k = `${keyBase}:${i}`;
        return <select key={i} value={ph(k) ?? ''} onChange={(e) => setC(`wizard:ph:${k}`, [e.target.value])} style={{ width: 'auto' }} aria-label="Choose item"><option value="">Choose…</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>;
      }
      return <span key={i} className="chip">{it.quantity && it.quantity > 1 ? `${it.quantity}× ` : ''}{it.name ?? db.items.get(it.itemId)?.name ?? it.itemId}</span>;
    })}</span>
  );

  const resolve = (): { def: ItemDefinition; qty: number }[] => {
    const out: { def: ItemDefinition; qty: number }[] = [];
    const push = (list: StartingItem[], keyBase: string) => list.forEach((it, i) => {
      const id = it.itemId.startsWith('@') ? ph(`${keyBase}:${i}`) : it.itemId;
      const def = id ? db.items.get(id) : undefined;
      if (def) {
        if (def.contents?.length) for (const c of def.contents) { const p = db.items.get(c.itemId); if (p) out.push({ def: p, qty: c.quantity * (it.quantity ?? 1) }); }
        else out.push({ def: it.name ? { ...def, name: it.name } : def, qty: it.quantity ?? 1 });
      }
    });
    if (mode === 'package') {
      cls.startingEquipment.forEach((g, gi) => push(g.options[sel(gi)]?.items ?? [], `g${gi}:${sel(gi)}`));
      push(cls.startingFixed, 'fixed');
    }
    if (bg) push(bg.equipment, 'bg');
    return out;
  };

  const apply = () => set((c) => {
    const prev = new Set(c.choices['wizard:equip-items'] ?? []);
    c.inventory = c.inventory.filter((i) => !prev.has(i.id));
    const added: string[] = [];
    // Merge identical items from different sources (e.g. pack + background) into one stack.
    const merged: { def: ItemDefinition; qty: number }[] = [];
    for (const r of resolve()) {
      const m = merged.find((x) => x.def.id === r.def.id && x.def.name === r.def.name && !r.def.weapon && !r.def.armor);
      if (m) m.qty += r.qty; else merged.push({ ...r });
    }
    for (const { def, qty } of merged) {
      const inst = instantiateItem(def, { quantity: qty });
      if (def.armor || (def.weapon && added.filter((id) => c.inventory.find((x) => x.id === id)?.item.weapon).length < 2)) inst.equipped = true;
      c.inventory.push(inst); added.push(inst.id);
    }
    c.choices['wizard:equip-items'] = added;
    c.choices['wizard:equip-applied'] = ['1'];
    const gold = (bg?.gold ?? 0) + (mode === 'gold' ? Number(c.choices['wizard:gold']?.[0] ?? 0) : 0);
    const prevGold = Number(c.choices['wizard:gold-applied']?.[0] ?? 0);
    c.currency.gp = Math.max(0, c.currency.gp - prevGold + gold);
    c.choices['wizard:gold-applied'] = [String(gold)];
  });

  const rollGold = () => {
    const [dice, mult] = cls.startingGold.split('x');
    const r = rollExpression(dice);
    setC('wizard:gold', [String(r.total * Number(mult || 1))]);
  };

  return (
    <div className="stack lg">
      <div className="btn-group">
        <button className={mode === 'package' ? 'on' : ''} onClick={() => setC('wizard:equip-mode', ['package'])}>Starting equipment</button>
        <button className={mode === 'gold' ? 'on' : ''} onClick={() => setC('wizard:equip-mode', ['gold'])}>Starting gold instead ({cls.startingGold.replace('x', ' × ')} gp)</button>
      </div>
      {mode === 'package' ? (
        <div className="stack">
          {cls.startingEquipment.map((g, gi) => (
            <div key={gi} className="stack">
              <span className="section-label">{g.label}</span>
              {g.options.map((o, oi) => (
                <label key={oi} className="check" style={{ alignItems: 'flex-start' }}>
                  <input type="radio" name={`eq-${gi}`} checked={sel(gi) === oi} onChange={() => setC(`wizard:equip:${gi}`, [String(oi)])} />
                  <span className="stack" style={{ gap: 4 }}><span>{o.label}</span>{sel(gi) === oi && renderItems(o.items, `g${gi}:${oi}`)}</span>
                </label>
              ))}
            </div>
          ))}
          {cls.startingFixed.length > 0 && <div><span className="section-label">Also</span>{renderItems(cls.startingFixed, 'fixed')}</div>}
        </div>
      ) : (
        <div className="row"><button onClick={rollGold}>Roll {cls.startingGold.replace('x', ' × ')}</button><span>Gold: <b className="num">{ch.choices['wizard:gold']?.[0] ?? '—'}</b> gp</span><span className="small muted">Buy equipment from the Inventory tab after creation.</span></div>
      )}
      {bg && <div><span className="section-label">From background ({bg.name})</span>{renderItems(bg.equipment, 'bg')} <span className="chip gold">{bg.gold} gp</span></div>}
      <div className="row">
        <button className="primary" onClick={apply}>{ch.choices['wizard:equip-applied']?.length ? 'Re-apply to inventory' : 'Add to inventory'}</button>
        {ch.choices['wizard:equip-applied']?.length ? <span className="small good">Added {ch.choices['wizard:equip-items']?.length ?? 0} items. Re-applying replaces them.</span> : <span className="small muted">Optional — you can manage inventory later.</span>}
      </div>
    </div>
  );
}
