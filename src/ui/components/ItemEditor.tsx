import { useUnits } from '@/ui/units';
import { useDb } from '@/ui/ruleset';
// Item editor used for (a) reusable custom item definitions/templates and (b) individual inventory instances.
import { useMemo, useState } from 'react';
import type { ItemDefinition, ItemCategory, WeaponProperty } from '@/types/content';
import { ITEM_CATEGORY_LABEL, WEAPON_PROPERTIES } from '@/types/content';
import { ABILITIES, DAMAGE_TYPES, RARITIES, RARITY_LABEL, type Recharge } from '@/types/core';
import { Field, titleCase } from './common';
import { EffectBuilder, effectProblems, SpellSelect } from './EffectBuilder';
import { useApp } from '@/state/store';
import { searchItems } from '@/search/fuzzy';
import { validateItem } from '@/content/validate';
import { uid } from '@/engine/factory';
import { isValidDice } from '@/dice/dice';

export function blankItem(): ItemDefinition {
  return { id: uid('item'), name: '', category: 'gear', description: '', rarity: 'none', weight: 0, magical: false, attunement: { required: false }, source: { book: 'Homebrew', kind: 'custom' }, effects: [], tags: [], aliases: [] };
}

/** Make a new custom definition from an existing item (template). Keeps all mechanics. */
export function fromTemplate(t: ItemDefinition): ItemDefinition {
  const c = structuredClone(t);
  return { ...c, id: uid('item'), baseItemId: t.baseItemId ?? t.id, source: { book: 'Homebrew', kind: 'custom' }, effects: (c.effects ?? []).map((e) => ({ ...e, id: uid('fx') })) };
}

export function itemErrors(i: ItemDefinition): string[] {
  const errs = validateItem(i).filter((x) => x.level === 'error').map((x) => x.message);
  if (i.spells?.some((s) => !s.spellId)) errs.push('Choose a spell for each castable spell (or remove the empty row).');
  if (!i.name.trim()) errs.unshift('Name is required.');
  for (const e of i.effects) errs.push(...effectProblems(e));
  return [...new Set(errs)];
}

export function TemplatePicker({ onPick }: { onPick: (i: ItemDefinition) => void }) {
  const db = useDb();
  const [q, setQ] = useState('');
  const items = useMemo(() => [...db.items.values()], [db]);
  const res = q ? searchItems(q, items, {}, 30) : [];
  return (
    <div className="stack">
      <input autoFocus placeholder="Search an existing item to use as a template (e.g. dagger, plate, healing pot)…" value={q} onChange={(e) => setQ(e.target.value)} />
      {res.length > 0 && <div className="list panel flush" style={{ maxHeight: 260, overflow: 'auto' }}>{res.map((i) => <ItemRow key={i.id} item={i} onClick={() => onPick(i)} action="Use as template" />)}</div>}
    </div>
  );
}

export function itemSummary(i: ItemDefinition): string {
  const bits: string[] = [];
  if (i.weapon) bits.push(`${i.weapon.damage.dice !== '0' ? `${i.weapon.damage.dice} ${i.weapon.damage.type}` : 'special'}${i.weapon.versatile ? ` (${i.weapon.versatile})` : ''}${i.weapon.attackBonus ? `, +${i.weapon.attackBonus}` : ''}`);
  if (i.armor) bits.push(i.armor.category === 'shield' ? `+${i.armor.baseAc + (i.armor.bonus ?? 0)} AC` : `AC ${i.armor.baseAc + (i.armor.bonus ?? 0)}${i.armor.dexCap === null ? '' : i.armor.dexCap !== undefined ? ` + Dex (max ${i.armor.dexCap})` : i.armor.category === 'heavy' ? '' : ' + Dex'}`);
  if (i.weapon?.properties.length) bits.push(i.weapon.properties.filter((p) => p !== 'monk').join(', '));
  if (i.weight) bits.push(`${i.weight} lb`);
  if (i.cost) bits.push(`${i.cost.amount} ${i.cost.unit}`);
  return bits.join(' · ');
}

export function ItemRow({ item, onClick, action, extra }: { item: ItemDefinition; onClick?: () => void; action?: string; extra?: React.ReactNode }) {
  const db = useDb();
  const un = useUnits();
  return (
    <div className="list-row clickable" onClick={onClick}>
      <span className="grow">
        <b>{item.name}</b> {item.magical && <span className="badge magic">{RARITY_LABEL[item.rarity]}</span>} {item.attunement?.required && <span className="badge" title={item.attunement.restriction}>attune</span>} {db.isCustom('item', item.id) && <span className="badge custom">custom</span>} {item.tags?.includes('from-2014') && db.ruleset === 'dnd5e-2024' && <span className="badge" title="2014 SRD item with no 2024 SRD version (2014 wording)">2014</span>}
        <div className="small muted">{ITEM_CATEGORY_LABEL[item.category] ?? item.category}{item.type && item.type !== ITEM_CATEGORY_LABEL[item.category] ? ` · ${item.type}` : ''}{itemSummary(item) ? ` · ${un.text(itemSummary(item))}` : ''}</div>
      </span>
      {extra}
      {action && <button className="small" onClick={(e) => { e.stopPropagation(); onClick?.(); }}>{action}</button>}
    </div>
  );
}

export function ItemEditor({ value, onChange, mode }: { value: ItemDefinition; onChange: (i: ItemDefinition) => void; mode: 'template' | 'instance' }) {
  const i = value;
  const up = (p: Partial<ItemDefinition>) => onChange({ ...i, ...p });
  const [tab, setTab] = useState<'general' | 'weapon' | 'armor' | 'magic' | 'effects'>('general');
  const errs = itemErrors(i);
  return (
    <div className="stack">
      <div className={`notice ${mode === 'instance' ? '' : 'ok'}`}>
        {mode === 'instance'
          ? <>You are editing <b>this character’s copy</b> of the item. Changes affect only this inventory entry — not the reusable template or other characters.</>
          : <>You are editing a <b>reusable custom item definition</b> (template). Saving it does <b>not</b> change copies already in inventories; those can be re-synced explicitly.</>}
      </div>
      <div className="subtabs">
        {(['general', 'weapon', 'armor', 'magic', 'effects'] as const).map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t === 'effects' ? `Effects (${i.effects.length})` : titleCase(t)}{t === 'weapon' && i.weapon ? ' ✓' : ''}{t === 'armor' && i.armor ? ' ✓' : ''}</button>)}
      </div>
      {tab === 'general' && (
        <div className="stack">
          <div className="field-row">
            <Field label="Name" required><input value={i.name} onChange={(e) => up({ name: e.target.value })} /></Field>
            <Field label="Category"><select value={i.category} onChange={(e) => up({ category: e.target.value as ItemCategory })}>{Object.entries(ITEM_CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Type / subtype"><input value={i.type ?? ''} onChange={(e) => up({ type: e.target.value })} placeholder="e.g. Wondrous item, Martial Melee Weapon" /></Field>
            <Field label="Rarity"><select value={i.rarity} onChange={(e) => up({ rarity: e.target.value as ItemDefinition['rarity'] })}>{RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}</select></Field>
          </div>
          <div className="field-row">
            <Field label="Weight (lb, each)"><input type="number" min={0} step={0.1} value={i.weight} onChange={(e) => up({ weight: Math.max(0, Number(e.target.value) || 0) })} /></Field>
            <Field label="Value"><div className="row tight"><input type="number" min={0} value={i.cost?.amount ?? ''} onChange={(e) => up({ cost: e.target.value === '' ? undefined : { amount: Number(e.target.value), unit: i.cost?.unit ?? 'gp' } })} style={{ width: 90 }} /><select value={i.cost?.unit ?? 'gp'} onChange={(e) => up({ cost: { amount: i.cost?.amount ?? 0, unit: e.target.value as 'gp' } })} style={{ width: 70 }}>{['cp', 'sp', 'ep', 'gp', 'pp'].map((u) => <option key={u}>{u}</option>)}</select></div></Field>
            <Field label="Source"><input value={i.source.book} onChange={(e) => up({ source: { ...i.source, book: e.target.value } })} /></Field>
            {mode === 'template' && <Field label="Ruleset"><select value={i.ruleset ?? 'any'} onChange={(e) => up({ ruleset: e.target.value as ItemDefinition['ruleset'] })}><option value="any">Both 2014 and 2024</option><option value="dnd5e-2014">2014 only</option><option value="dnd5e-2024">2024 only</option></select></Field>}
            <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" checked={i.magical} onChange={(e) => up({ magical: e.target.checked })} />Magical</label>
          </div>
          <Field label="Description"><textarea rows={4} value={i.description} onChange={(e) => up({ description: e.target.value })} /></Field>
          <div className="field-row">
            <Field label="Tags (comma separated)"><input value={(i.tags ?? []).join(', ')} onChange={(e) => up({ tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></Field>
            <Field label="Aliases for search"><input value={(i.aliases ?? []).join(', ')} onChange={(e) => up({ aliases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></Field>
          </div>
          <Field label="Notes"><textarea rows={2} value={i.notes ?? ''} onChange={(e) => up({ notes: e.target.value })} /></Field>
          <ItemImage value={i.image} onChange={(image) => up({ image })} />
        </div>
      )}
      {tab === 'weapon' && <WeaponEditor i={i} up={up} />}
      {tab === 'armor' && <ArmorEditor i={i} up={up} />}
      {tab === 'magic' && (
        <div className="stack">
          <div className="field-row">
            <label className="check"><input type="checkbox" checked={!!i.attunement?.required} onChange={(e) => up({ attunement: { ...(i.attunement ?? {}), required: e.target.checked } })} />Requires attunement</label>
            {i.attunement?.required && <Field label="Attunement restriction"><input value={i.attunement.restriction ?? ''} onChange={(e) => up({ attunement: { required: true, restriction: e.target.value || undefined } })} placeholder="e.g. a cleric or paladin" /></Field>}
          </div>
          <div className="field-row">
            <label className="check"><input type="checkbox" checked={!!i.charges} onChange={(e) => up({ charges: e.target.checked ? { max: 3, recharge: 'dawn' } : undefined })} />Has charges</label>
            {i.charges && <>
              <Field label="Max charges"><input type="number" min={1} value={i.charges.max} onChange={(e) => up({ charges: { ...i.charges!, max: Math.max(1, Number(e.target.value) || 1) } })} /></Field>
              <Field label="Recharge"><select value={i.charges.recharge} onChange={(e) => up({ charges: { ...i.charges!, recharge: e.target.value as Recharge } })}><option value="dawn">At dawn</option><option value="long">Long rest</option><option value="short">Short rest</option><option value="none">Never</option><option value="manual">Manual</option></select></Field>
              <Field label="Recharge amount" hint="dice, e.g. 1d6+1; empty = all"><input value={i.charges.rechargeAmount ?? ''} onChange={(e) => up({ charges: { ...i.charges!, rechargeAmount: e.target.value || undefined } })} /></Field>
            </>}
          </div>
          {i.charges?.rechargeAmount && !isValidDice(i.charges.rechargeAmount) && <span className="small bad">Recharge amount is not valid dice.</span>}
          <Field label="Activation"><input value={i.activation ?? ''} onChange={(e) => up({ activation: e.target.value || undefined })} placeholder="e.g. Action, command word" /></Field>
          <ItemSpellsEditor i={i} up={up} />
          <div className="field-row">
            <label className="check"><input type="checkbox" checked={!!i.consumable} onChange={(e) => up({ consumable: e.target.checked ? { destroyOnUse: true } : undefined })} />Consumable (quantity decreases on use)</label>
            <label className="check"><input type="checkbox" checked={!!i.cursed} onChange={(e) => up({ cursed: e.target.checked })} />Cursed</label>
          </div>
          {i.consumable && <Field label="On use: heal dice (optional)" hint="e.g. 2d4+2"><input value={i.consumable.onUse?.find((o) => o.kind === 'heal')?.dice ?? ''} onChange={(e) => up({ consumable: { ...i.consumable!, onUse: e.target.value ? [{ kind: 'heal', dice: e.target.value }] : undefined } })} /></Field>}
          {i.cursed && <Field label="Curse"><textarea rows={2} value={i.curse ?? ''} onChange={(e) => up({ curse: e.target.value })} /></Field>}
        </div>
      )}
      {tab === 'effects' && <EffectBuilder effects={i.effects} onChange={(effects) => up({ effects })} />}
      {errs.length > 0 && <ul className="warnings">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}
    </div>
  );
}

function ItemImage({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  return (
    <div className="row">
      {value && <img src={value} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--line)' }} />}
      <label className="btn small">{value ? 'Change image' : 'Add image (optional)'}<input type="file" accept="image/*" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        const img = new Image(); const url = URL.createObjectURL(f);
        await new Promise((r) => { img.onload = r; img.src = url; });
        const s = Math.min(1, 128 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s;
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        onChange(c.toDataURL('image/webp', 0.8));
      }} /></label>
      {value && <button className="small ghost" onClick={() => onChange(undefined)}>Remove</button>}
    </div>
  );
}

function WeaponEditor({ i, up }: { i: ItemDefinition; up: (p: Partial<ItemDefinition>) => void }) {
  const db = useDb();
  if (!i.weapon) return <div className="stack"><p className="muted">This item has no weapon statistics.</p><button onClick={() => up({ category: i.category === 'gear' ? 'weapon' : i.category, weapon: { category: 'simple', kind: 'melee', damage: { dice: '1d6', type: 'slashing' }, properties: [] } })}>Add weapon statistics</button></div>;
  const w = i.weapon;
  const uw = (p: Partial<typeof w>) => up({ weapon: { ...w, ...p } });
  const bases = [...db.items.values()].filter((x) => x.weapon && !x.magical);
  return (
    <div className="stack">
      <div className="field-row">
        <Field label="Category"><select value={w.category} onChange={(e) => uw({ category: e.target.value as 'simple' })}><option value="simple">Simple</option><option value="martial">Martial</option></select></Field>
        <Field label="Melee / ranged"><select value={w.kind} onChange={(e) => uw({ kind: e.target.value as 'melee' })}><option value="melee">Melee</option><option value="ranged">Ranged</option></select></Field>
        <Field label="Proficiency counts as" hint="Base weapon for proficiency"><select value={w.baseWeapon ?? ''} onChange={(e) => uw({ baseWeapon: e.target.value || undefined })}><option value="">(by category only)</option>{bases.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Attack ability"><select value={w.ability ?? 'auto'} onChange={(e) => uw({ ability: e.target.value as 'auto' })}><option value="auto">Automatic (STR/DEX by rules)</option>{ABILITIES.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}</select></Field>
      </div>
      <div className="field-row">
        <Field label="Damage dice"><input value={w.damage.dice} onChange={(e) => uw({ damage: { ...w.damage, dice: e.target.value } })} /></Field>
        <Field label="Damage type"><select value={w.damage.type} onChange={(e) => uw({ damage: { ...w.damage, type: e.target.value as 'slashing' } })}>{DAMAGE_TYPES.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</select></Field>
        <Field label="Versatile dice"><input value={w.versatile ?? ''} onChange={(e) => uw({ versatile: e.target.value || undefined })} placeholder="e.g. 1d10" /></Field>
        <Field label="Attack bonus"><input type="number" value={w.attackBonus ?? 0} onChange={(e) => uw({ attackBonus: Number(e.target.value) || undefined })} /></Field>
        <Field label="Damage bonus"><input type="number" value={w.damageBonus ?? 0} onChange={(e) => uw({ damageBonus: Number(e.target.value) || undefined })} /></Field>
      </div>
      <div className="field-row">
        <Field label="Range (ft)"><input type="number" value={w.range?.normal ?? ''} onChange={(e) => uw({ range: e.target.value ? { normal: Number(e.target.value), long: w.range?.long } : undefined })} /></Field>
        <Field label="Long range (ft)"><input type="number" value={w.range?.long ?? ''} onChange={(e) => uw({ range: { normal: w.range?.normal ?? 0, long: e.target.value ? Number(e.target.value) : undefined } })} /></Field>
        <Field label="Crits on (natural)"><input type="number" min={2} max={20} value={w.critRange ?? 20} onChange={(e) => uw({ critRange: Number(e.target.value) < 20 ? Number(e.target.value) : undefined })} /></Field>
      </div>
      <div><span className="section-label">Properties</span>
        <div className="row">{WEAPON_PROPERTIES.map((p) => <label key={p} className="check small"><input type="checkbox" checked={w.properties.includes(p)} onChange={(e) => uw({ properties: e.target.checked ? [...w.properties, p] : w.properties.filter((x) => x !== p) as WeaponProperty[] })} />{titleCase(p)}</label>)}</div>
      </div>
      <div><span className="section-label">Extra damage on hit</span>
        {(w.extraDamage ?? []).map((x, j) => (
          <div key={j} className="row">
            <input value={x.dice} onChange={(e) => uw({ extraDamage: w.extraDamage!.map((y, k) => (k === j ? { ...y, dice: e.target.value } : y)) })} style={{ width: 90 }} aria-label="Dice" />
            <select value={x.type} onChange={(e) => uw({ extraDamage: w.extraDamage!.map((y, k) => (k === j ? { ...y, type: e.target.value as 'fire' } : y)) })} style={{ width: 140 }}>{DAMAGE_TYPES.map((d) => <option key={d} value={d}>{titleCase(d)}</option>)}</select>
            <input value={x.condition ?? ''} placeholder="only vs… (optional)" onChange={(e) => uw({ extraDamage: w.extraDamage!.map((y, k) => (k === j ? { ...y, condition: e.target.value || undefined } : y)) })} style={{ width: 180 }} />
            <button className="small ghost danger" onClick={() => uw({ extraDamage: w.extraDamage!.filter((_, k) => k !== j) })}>✕</button>
          </div>
        ))}
        <button className="small" onClick={() => uw({ extraDamage: [...(w.extraDamage ?? []), { dice: '1d6', type: 'fire' }] })}>+ Extra damage</button>
      </div>
      <Field label="Critical hit effect (extra dice on crit, optional)"><input value={w.critExtraDice ?? ''} onChange={(e) => uw({ critExtraDice: e.target.value || undefined })} placeholder="e.g. 1d8" /></Field>
      <button className="small ghost danger" style={{ alignSelf: 'flex-start' }} onClick={() => up({ weapon: undefined })}>Remove weapon statistics</button>
    </div>
  );
}

function ArmorEditor({ i, up }: { i: ItemDefinition; up: (p: Partial<ItemDefinition>) => void }) {
  if (!i.armor) return <div className="stack"><p className="muted">This item has no armor statistics.</p><button onClick={() => up({ category: i.category === 'gear' ? 'armor' : i.category, armor: { category: 'light', baseAc: 11 } })}>Add armor statistics</button></div>;
  const a = i.armor;
  const ua = (p: Partial<typeof a>) => up({ armor: { ...a, ...p } });
  const dexMode = a.dexCap === null ? 'none' : a.dexCap === undefined ? 'full' : 'cap';
  return (
    <div className="stack">
      <div className="field-row">
        <Field label="Armor category"><select value={a.category} onChange={(e) => { const c = e.target.value as typeof a.category; ua({ category: c, ...(c === 'shield' ? { baseAc: 2 } : {}) }); if (c === 'shield') up({ category: 'shield', armor: { ...a, category: 'shield', baseAc: 2 } }); }}><option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option><option value="shield">Shield</option></select></Field>
        <Field label={a.category === 'shield' ? 'Shield AC bonus' : 'Base AC'}><input type="number" value={a.baseAc} onChange={(e) => ua({ baseAc: Number(e.target.value) || 0 })} /></Field>
        <Field label="Magic AC bonus"><input type="number" value={a.bonus ?? 0} onChange={(e) => ua({ bonus: Number(e.target.value) || undefined })} /></Field>
      </div>
      {a.category !== 'shield' && <div className="field-row">
        <Field label="Dexterity modifier"><select value={dexMode} onChange={(e) => ua({ dexCap: e.target.value === 'none' ? null : e.target.value === 'full' ? undefined : 2 })}><option value="full">Full DEX</option><option value="cap">DEX up to a maximum</option><option value="none">No DEX</option></select></Field>
        {dexMode === 'cap' && <Field label="Max DEX bonus"><input type="number" value={a.dexCap ?? 2} onChange={(e) => ua({ dexCap: Number(e.target.value) })} /></Field>}
        <Field label="STR requirement"><input type="number" value={a.strRequirement ?? ''} onChange={(e) => ua({ strRequirement: e.target.value ? Number(e.target.value) : undefined })} /></Field>
        <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" checked={!!a.stealthDisadvantage} onChange={(e) => ua({ stealthDisadvantage: e.target.checked || undefined })} />Stealth disadvantage</label>
      </div>}
      <p className="small muted">Additional AC modifiers (e.g. “+1 AC while attuned”) can be added on the Effects tab.</p>
      <button className="small ghost danger" style={{ alignSelf: 'flex-start' }} onClick={() => up({ armor: undefined })}>Remove armor statistics</button>
    </div>
  );
}

function ItemSpellsEditor({ i, up }: { i: ItemDefinition; up: (p: Partial<ItemDefinition>) => void }) {
  const db = useDb();
  const list = i.spells ?? [];
  const set = (j: number, p: Partial<NonNullable<ItemDefinition['spells']>[number]>) => up({ spells: list.map((x, k) => (k === j ? { ...x, ...p } : x)) });
  return (
    <div className="stack">
      <span className="section-label">Spells this item lets you cast</span>
      {list.length === 0 && <span className="small muted">None. Example: gloves that cast Revivify once per day.</span>}
      {list.map((sp, j) => (
        <div key={j} className="row" style={{ alignItems: 'flex-end', borderTop: '1px dashed var(--line)', paddingTop: 6 }}>
          <Field label="Spell"><SpellSelect value={sp.spellId} onChange={(spellId) => set(j, { spellId })} /></Field>
          <Field label="How it's cast">
            <select value={sp.chargeCost ? 'charges' : sp.uses ? 'uses' : 'at-will'} onChange={(e) => set(j, e.target.value === 'charges' ? { chargeCost: 1, uses: undefined } : e.target.value === 'uses' ? { uses: 1, recharge: 'long', chargeCost: undefined } : { uses: undefined, chargeCost: undefined })} style={{ width: 170 }}>
              <option value="uses">Limited uses</option><option value="charges">Spend item charges</option><option value="at-will">At will</option>
            </select>
          </Field>
          {sp.uses !== undefined && <><Field label="Uses"><input type="number" min={1} value={sp.uses} onChange={(e) => set(j, { uses: Math.max(1, Number(e.target.value) || 1) })} style={{ width: 70 }} /></Field>
            <Field label="Recharge"><select value={sp.recharge ?? 'long'} onChange={(e) => set(j, { recharge: e.target.value as Recharge })} style={{ width: 130 }}><option value="long">Long rest</option><option value="dawn">Dawn</option><option value="short">Short rest</option><option value="none">Never</option></select></Field></>}
          {sp.chargeCost !== undefined && <Field label="Charges per cast"><input type="number" min={1} value={sp.chargeCost} onChange={(e) => set(j, { chargeCost: Math.max(1, Number(e.target.value) || 1) })} style={{ width: 80 }} /></Field>}
          <Field label="Fixed save DC" hint="empty = your own"><input type="number" value={sp.dc ?? ''} onChange={(e) => set(j, { dc: e.target.value ? Number(e.target.value) : undefined })} style={{ width: 80 }} /></Field>
          <Field label="Fixed attack" hint="empty = your own"><input type="number" value={sp.attack ?? ''} onChange={(e) => set(j, { attack: e.target.value ? Number(e.target.value) : undefined })} style={{ width: 80 }} /></Field>
          <button className="small ghost danger" onClick={() => up({ spells: list.filter((_, k) => k !== j) })} aria-label="Remove spell">✕</button>
          {!db.spells.get(sp.spellId) && sp.spellId && <span className="small bad">Unknown spell.</span>}
        </div>
      ))}
      <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => up({ spells: [...list, { spellId: '', uses: 1, recharge: 'long' }] })}>+ Add spell</button>
      {list.some((x) => x.chargeCost) && !i.charges && <span className="small bad">Charge-based spells need “Has charges” enabled above.</span>}
    </div>
  );
}
