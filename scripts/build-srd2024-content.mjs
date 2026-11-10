#!/usr/bin/env node
// Converts SRD 5.2 (D&D 2024 rules) data from vendor/srd-5e-database-2024 (5e-bits/5e-database, MIT;
// content: System Reference Document 5.2 by Wizards of the Coast, CC-BY-4.0) into src/content/srd2024/.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATED, CURATED_2024, CURATED_SPELLS, CURATED_SPELLS_2024, eff, ATT } from './curated-items.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'vendor', 'srd-5e-database-2024');
const OUT = join(root, 'src', 'content', 'srd2024');
mkdirSync(OUT, { recursive: true });
if (!existsSync(join(SRC, '5e-SRD-Spells.json'))) { console.log('[content-2024] vendor data missing; keeping committed files'); process.exit(0); }

const load = (n) => JSON.parse(readFileSync(join(SRC, `5e-SRD-${n}.json`), 'utf8'));
const SRD = { book: 'SRD 5.2', kind: 'srd' };
const clean = (t) => (t || '').replace(/\r/g, '').replace(/ex- pended/g, 'expended').replace(/\n\s{2,}/g, '\n').trim();
const write = (name, data) => { writeFileSync(join(OUT, name), JSON.stringify(data)); console.log(`[content-2024] ${name}: ${Array.isArray(data) ? data.length : Object.keys(data).length}`); };

// ----------------------------------------------------------------- spells
const scaleCantrip = (dice) => {
  const m = dice.match(/^(\d+)d(\d+)$/);
  if (!m) return { 1: dice };
  const n = Number(m[1]), s = m[2];
  return { 1: `${n}d${s}`, 5: `${n * 2}d${s}`, 11: `${n * 3}d${s}`, 17: `${n * 4}d${s}` };
};
const spells = load('Spells').map((s) => {
  const desc = clean(s.description);
  const damage = {};
  const dmgTypes = [];
  if (s.damage) {
    if (s.damage.damage_type) dmgTypes.push(s.damage.damage_type.index);
    const bySlot = s.damage.damage_at_slot_level;
    if (s.level === 0 && bySlot?.['0']) damage.byCharLevel = scaleCantrip(bySlot['0']);
    else if (bySlot) damage.bySlot = bySlot;
    if (s.damage.damage_at_character_level) damage.byCharLevel = s.damage.damage_at_character_level;
  }
  const save = desc.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/);
  const SAVE = { Strength: 'str', Dexterity: 'dex', Constitution: 'con', Intelligence: 'int', Wisdom: 'wis', Charisma: 'cha' };
  const heal = desc.match(/regains? (?:a number of )?Hit Points equal to (\d+d\d+) plus your spellcasting ability modifier/);
  return {
    id: s.index, name: s.name, level: s.level, school: s.school.index,
    castingTime: s.casting_time, range: s.range,
    components: { v: s.components.includes('V'), s: s.components.includes('S'), m: s.components.includes('M'), ...(s.material ? { material: s.material } : {}), ...(s.material && /consume/i.test(s.material) ? { consumed: true } : {}) },
    duration: s.duration, concentration: !!s.concentration, ritual: !!s.ritual,
    ...(s.attack_type ? { attack: s.attack_type } : {}),
    ...(save ? { save: SAVE[save[1]] } : {}),
    ...(dmgTypes.length ? { damageTypes: dmgTypes } : {}),
    ...(Object.keys(damage).length ? { damage } : {}),
    ...(heal ? { heal: { [String(Math.max(1, s.level))]: `${heal[1]} + MOD` } } : {}),
    classes: s.classes.map((c) => c.index), subclasses: [],
    description: desc, ...(s.higher_level ? { higherLevels: clean(s.higher_level) } : {}),
    tags: [], source: SRD,
  };
});
write('spells.json', spells);

// ----------------------------------------------------------------- equipment
const equipment = load('Equipment');
const cats = (e) => new Set(e.equipment_categories.map((c) => c.index));
const items = [];
const weaponById = {}, armorById = {};
const ALIASES = {
  'rope': ['hempen rope', 'silk rope'], 'rations': ['food', 'trail rations'], 'light-crossbow': ['crossbow'], 'thieves-tools': ['lockpicks', 'lock picks'],
  'healers-kit': ['healing kit'], 'plate-armor': ['plate', 'full plate'], 'half-plate-armor': ['half plate'], 'studded-leather-armor': ['studded leather'],
  'potion-of-healing': ['healing potion', 'health potion'], 'greatsword': ['two-handed sword'], 'chain-mail': ['chainmail'], 'arrows': ['arrow'], 'bolts': ['crossbow bolt', 'bolt'],
};
for (const e of equipment) {
  const c = cats(e);
  const base = {
    id: e.index, name: e.name, description: clean(e.description) + (e.notes ? `\n\n${clean(Array.isArray(e.notes) ? e.notes.join('\n') : e.notes)}` : ''),
    rarity: 'none', weight: e.weight ?? 0, ...(e.cost ? { cost: { amount: e.cost.quantity, unit: e.cost.unit } } : {}),
    magical: false, source: SRD, effects: [], aliases: ALIASES[e.index] || [], tags: [],
  };
  if (e.damage || c.has('weapons') || [...c].some((x) => x.endsWith('-weapons'))) {
    const martial = c.has('martial-weapons') || c.has('martial-melee-weapons') || c.has('martial-ranged-weapons');
    const ranged = c.has('ranged-weapons') || c.has('martial-ranged-weapons') || c.has('simple-ranged-weapons');
    const props = (e.properties || []).map((p) => p.index);
    const w = { category: martial ? 'martial' : 'simple', kind: ranged ? 'ranged' : 'melee', damage: e.damage ? { dice: e.damage.damage_dice, type: e.damage.damage_type.index } : { dice: '0', type: 'bludgeoning' }, properties: props, baseWeapon: e.index, ...(e.mastery ? { mastery: e.mastery.index } : {}) };
    if (e.two_handed_damage) w.versatile = e.two_handed_damage.damage_dice;
    if (e.range && ranged) w.range = { normal: e.range.normal, long: e.range.long };
    if (e.throw_range) w.range = { normal: e.throw_range.normal, long: e.throw_range.long };
    const it = { ...base, category: 'weapon', type: `${martial ? 'Martial' : 'Simple'} ${ranged ? 'Ranged' : 'Melee'} Weapon`, weapon: w, tags: [w.category, w.kind, ...props, ...(e.mastery ? [`mastery:${e.mastery.index}`] : [])] };
    items.push(it); weaponById[e.index] = it;
  } else if (c.has('armor')) {
    const shield = c.has('shields');
    const cat = shield ? 'shield' : c.has('heavy-armor') ? 'heavy' : c.has('medium-armor') ? 'medium' : 'light';
    const a = { category: cat, baseAc: e.armor_class.base };
    if (!shield) { if (!e.armor_class.dex_bonus) a.dexCap = null; else if (e.armor_class.max_bonus) a.dexCap = e.armor_class.max_bonus; }
    if (e.str_minimum) a.strRequirement = e.str_minimum;
    if (e.stealth_disadvantage) a.stealthDisadvantage = true;
    const it = { ...base, category: shield ? 'shield' : 'armor', type: shield ? 'Shield' : `${cat[0].toUpperCase() + cat.slice(1)} Armor`, armor: a, tags: [cat] };
    items.push(it); armorById[e.index] = it;
  } else if (c.has('artisans-tools') || c.has('other-tools') || c.has('gaming-sets') || c.has('tools')) {
    items.push({ ...base, category: 'tool', type: c.has('artisans-tools') ? "Artisan's Tools" : c.has('gaming-sets') ? 'Gaming Set' : 'Tool' });
  } else if (c.has('musical-instruments')) {
    items.push({ ...base, category: 'instrument', type: 'Musical Instrument' });
  } else if (c.has('ammunition')) {
    const bundle = e.quantity || 1;
    items.push({ ...base, category: 'ammunition', type: 'Ammunition', weight: +(base.weight / bundle).toFixed(3), consumable: { destroyOnUse: true }, extra: { bundle } });
  } else if (c.has('arcane-foci') || c.has('druidic-foci') || c.has('holy-symbols') || /emblem|amulet|reliquary/.test(e.index)) {
    items.push({ ...base, category: 'focus', type: 'Spellcasting Focus' });
  } else {
    let cat = 'gear';
    if (e.contents) cat = 'pack';
    else if (/^(backpack|barrel|basket|bottle|bucket|case-|chest|jug|pouch|quiver|sack|vial|pot-iron|component-pouch)/.test(e.index)) cat = 'container';
    else if (/clothes|costume|robe/.test(e.index)) cat = 'clothing';
    else if (/rations|flask/.test(e.index)) cat = 'food';
    else if (/^(acid|alchemists-fire|antitoxin|holy-water|oil|potion-of-healing)$/.test(e.index)) cat = 'consumable';
    else if (/poison/.test(e.index)) cat = 'poison';
    else if (/spell-scroll/.test(e.index)) cat = 'scroll';
    const it = { ...base, category: cat, type: 'Adventuring Gear' };
    if (e.contents) it.contents = e.contents.map((x) => ({ itemId: x.item.index, quantity: x.quantity }));
    if (e.index === 'potion-of-healing') { it.consumable = { onUse: [{ kind: 'heal', dice: '2d4+2' }], destroyOnUse: true }; it.magical = true; it.rarity = 'common'; it.category = 'potion'; }
    else if (['consumable', 'food', 'poison', 'scroll'].includes(cat) || /torch|candle/.test(e.index)) it.consumable = { destroyOnUse: true };
    if (e.index === 'healers-kit') it.charges = { max: 10, recharge: 'none' };
    items.push(it);
  }
}

// ----------------------------------------------------------------- magic items
const RAR = { Common: 'common', Uncommon: 'uncommon', Rare: 'rare', 'Very Rare': 'very-rare', Legendary: 'legendary', Artifact: 'artifact', Varies: 'varies' };
const MCAT = { 'wondrous-items': 'wondrous', potion: 'potion', potions: 'potion', ring: 'ring', rings: 'ring', weapon: 'weapon', weapons: 'weapon', armor: 'armor', wand: 'wand', wands: 'wand', staff: 'staff', staffs: 'staff', scroll: 'scroll', scrolls: 'scroll', rod: 'rod', rods: 'rod', ammunition: 'ammunition' };
const magic = load('Magic-Items');
const magicItems = [];
const HEAL = { 'potion-of-healing-greater': '4d4+4', 'potion-of-healing-superior': '8d4+8', 'potion-of-healing-supreme': '10d4+20', 'potion-of-healing': '2d4+2' };
const genericDrop = new Set(['weapon-1', 'weapon-2', 'weapon-3', 'armor-1', 'armor-2', 'armor-3', 'shield-1', 'shield-2', 'shield-3', 'ammunition-1', 'ammunition-2', 'ammunition-3']);
for (const m of magic) {
  if (m.variants?.length || genericDrop.has(m.index)) continue;
  const [typeLine, ...rest] = clean(m.desc).split(/\n/);
  const body = rest.join('\n').trim();
  const category = MCAT[m.equipment_category.index] || 'wondrous';
  const attMatch = typeLine.match(/Requires Attunement(?: by (.+?))?\)?$/i) || body.match(/^\(Requires Attunement(?: by ([^)]+))?\)/i);
  const it = {
    id: `mi-${m.index}`, name: m.name, category, type: typeLine.replace(/\s*\(Requires Attunement[^)]*\)/i, '').trim(),
    description: body, rarity: RAR[m.rarity?.name] || 'varies', weight: 0, magical: true,
    attunement: m.attunement ? { required: true, ...(attMatch?.[1] ? { restriction: attMatch[1].replace(/\)$/, '') } : {}) } : { required: false },
    source: SRD, effects: [], aliases: [], tags: ['magic'],
  };
  if (/amulet|necklace|periapt|medallion|brooch|scarab/i.test(m.name) && category === 'wondrous') it.category = 'amulet';
  const ch = body.match(/(?:has|have|of its) (\d+) charges/i);
  if (ch) {
    const r = body.match(/regains? (1d\d+(?:\s*\+\s*\d+)?|\d+|all) expended charges? (?:daily at dawn|at dawn|each dawn)/i);
    it.charges = { max: Number(ch[1]), recharge: r ? 'dawn' : 'none', ...(r && r[1] !== 'all' ? { rechargeAmount: r[1].replace(/\s+/g, '') } : {}) };
  }
  const cur = CURATED_2024[m.index] ?? CURATED[m.index];
  if (cur) it.effects = cur.map((e) => ({ ...e, id: `${m.index}--${e.id}` }));
  const curSpells = CURATED_SPELLS_2024[m.index] ?? CURATED_SPELLS[m.index];
  if (curSpells) it.spells = curSpells.filter((x) => spells.some((s) => s.id === x.spellId));
  const rm = m.index.match(/^(ring|armor|potion)-of-resistance-([a-z]+)$/);
  if (rm) it.effects = [eff(`resistance-${rm[2]}`, rm[1] === 'potion' ? 'toggle' : ATT, [{ target: `resistance:${rm[2]}`, op: 'grant' }])];
  if (HEAL[m.index]) { it.consumable = { onUse: [{ kind: 'heal', dice: HEAL[m.index] }], destroyOnUse: true }; it.aliases = ['healing potion']; it.weight = 0.5; }
  else if (category === 'potion') { it.consumable = { onUse: [{ kind: 'text', text: 'See description.' }], destroyOnUse: true }; it.weight = 0.5; }
  if (category === 'scroll') it.consumable = { destroyOnUse: true };
  const baseMatch = typeLine.match(/^(Armor|Weapon)\s*\(([^)]+)\)/i);
  if (baseMatch) {
    // "Half Plate Armor or Plate Armor" → use the last option (matches the 2014 item); a note records the choice.
    const slug = (x) => x.replace(/ armor$/, '').trim().replace(/\s+/g, '-');
    const options = baseMatch[2].toLowerCase().split(/\s+or\s+/);
    const last = slug(options[options.length - 1]);
    const lastIsArmor = !!(armorById[last] || armorById[`${last}-armor`]);
    const spec = lastIsArmor ? last : slug(baseMatch[2].toLowerCase());
    if (baseMatch[1].toLowerCase() === 'armor') {
      const id = armorById[spec] ? spec : armorById[`${spec}-armor`] ? `${spec}-armor` : /medium-or-heavy|any/.test(spec) ? 'chain-mail' : /light/.test(spec) ? 'leather-armor' : undefined;
      const b = id && armorById[id];
      if (b) { it.armor = structuredClone(b.armor); it.weight = b.weight; it.baseItemId = b.id; it.category = 'armor'; if (!armorById[spec] && !armorById[`${spec}-armor`]) it.notes = `Base armor assumed: ${b.name}. Edit the item to change it.`; }
    } else {
      const id = weaponById[spec] ? spec : /arrow|bolt|bullet|needle|ammunition/.test(spec) ? null : 'longsword';
      if (id === null) { it.category = 'ammunition'; }
      const b = id ? weaponById[id] : undefined;
      if (b) { it.weapon = structuredClone(b.weapon); it.weight = b.weight; it.baseItemId = b.id; if (!weaponById[spec]) it.notes = `Base weapon assumed: ${b.name}. Edit the item to change it.`; }
    }
  }
  if (/shield/i.test(m.name) && it.category === 'armor' && !it.armor) { it.armor = { category: 'shield', baseAc: 2 }; it.category = 'shield'; }
  if (it.armor && baseMatch && /\sor\s/i.test(baseMatch[2]) && !/any/i.test(baseMatch[2])) it.notes = `Base armor assumed: ${baseMatch[2].split(/\s+or\s+/i).pop()}. Edit the item to choose another option (${baseMatch[2]}).`;
  if (m.index === 'mithral-armor' && it.armor) { delete it.armor.strRequirement; delete it.armor.stealthDisadvantage; }
  const acb = body.match(/\+(\d) bonus to (?:Armor Class|AC) while (?:you(?:'re| are)? )?(?:wear|wearing)/i) || body.match(/While (?:you(?:'re| are) )?wearing this armor, you (?:gain|have) a \+(\d) bonus to (?:Armor Class|AC)/i);
  const curatedAc = (it.effects ?? []).some((e) => (e.modifiers ?? []).some((m2) => m2.target === 'ac'));
  if (acb && it.armor && it.armor.category !== 'shield' && !curatedAc) it.armor.bonus = Number(acb[1]);
  const wb = body.match(/\+(\d) bonus to attack (?:rolls )?and damage rolls made with this (?:magic )?weapon/i);
  if (wb && it.weapon) { it.weapon.attackBonus = Number(wb[1]); it.weapon.damageBonus = Number(wb[1]); }
  magicItems.push(it);
}
const plus = [];
const RARITY_FOR = { weapon: { 1: 'uncommon', 2: 'rare', 3: 'very-rare' }, armor: { 1: 'rare', 2: 'very-rare', 3: 'legendary' }, shield: { 1: 'uncommon', 2: 'rare', 3: 'very-rare' } };
for (const n of [1, 2, 3]) {
  for (const w of Object.values(weaponById)) plus.push({ ...structuredClone(w), id: `${w.id}-plus-${n}`, name: `${w.name}, +${n}`, aliases: [`+${n} ${w.name}`, `${w.name} +${n}`], description: `You have a +${n} bonus to attack rolls and damage rolls made with this magic weapon.`, rarity: RARITY_FOR.weapon[n], magical: true, attunement: { required: false }, weapon: { ...structuredClone(w.weapon), attackBonus: n, damageBonus: n }, baseItemId: w.id, tags: [...w.tags, 'magic'], cost: undefined });
  for (const a of Object.values(armorById)) { const sh = a.category === 'shield'; plus.push({ ...structuredClone(a), id: `${a.id}-plus-${n}`, name: `${a.name}, +${n}`, aliases: [`+${n} ${a.name}`], description: sh ? `While holding this Shield, you have a +${n} bonus to Armor Class in addition to the Shield's normal bonus.` : `You have a +${n} bonus to Armor Class while wearing this armor.`, rarity: sh ? RARITY_FOR.shield[n] : RARITY_FOR.armor[n], magical: true, attunement: { required: false }, armor: { ...structuredClone(a.armor), bonus: n }, baseItemId: a.id, tags: [...a.tags, 'magic'], cost: undefined }); }
}
for (const v of plus) delete v.cost;
// ----------------------------------------------------------------- port 2014 SRD items missing from 2024
// Items are largely edition-agnostic. 2014 SRD 5.1 items with no 2024 counterpart are added (text unchanged,
// tagged "from-2014"); magic weapons/armor are rebased on the 2024 base items so they gain Weapon Mastery.
// Renamed equivalents are mapped instead of duplicated.
const RENAMED_2014 = {
  arrow: 'arrows', 'crossbow-bolt': 'bolts', 'sling-bullet': 'bullets-sling', 'blowgun-needle': 'needles', 'clothes-costume': 'costume',
  'dice-set': 'dice', 'playing-card-set': 'playing-cards', robes: 'robe', 'flask-or-tankard': 'flask', 'jug-or-pitcher': 'jug', 'mirror-steel': 'mirror',
  'rope-hempen-50-feet': 'rope', 'rope-silk-50-feet': 'rope', 'tent-two-person': 'tent', 'spike-iron': 'spikes-iron', 'ink-1-ounce-bottle': 'ink',
  'oil-flask': 'oil', 'rations-1-day': 'rations', 'crossbow-light': 'light-crossbow', 'crossbow-heavy': 'heavy-crossbow', 'crossbow-hand': 'hand-crossbow',
  'paper-one-sheet': 'paper', 'parchment-one-sheet': 'parchment', 'alchemists-fire-flask': 'alchemists-fire', 'acid-vial': 'acid', 'antitoxin-vial': 'antitoxin',
  'holy-water-flask': 'holy-water', 'poison-basic-vial': 'poison-basic', 'ball-bearings-bag-of-1000': 'ball-bearings', 'chain-10-feet': 'chain',
  'ladder-10-foot': 'ladder', 'pole-10-foot': 'pole', 'string-10-feet': 'string', 'cartographers-tools': 'cartographer-tools', 'diplomats-pack': 'diplomat-pack',
  'dungeoneers-pack': 'dungeoneer-pack', 'three-dragon-ante-set': 'three-dragon-ante', 'dragonchess-set': 'dragonchess', 'climbers-kit': 'climbers-kit',
};
const norm = (n) => n.toLowerCase().replace(/^(crossbow|lantern|rope|clothes|ink|oil|bottle|case|chain|pick|ram|tent|hammer|ladder|pole|spike|string|paper|parchment|pot|mirror|scale|chalk|rations|saddle|barding|horse),\s*([^,(]+)/, '$2 $1').replace(/\(.*?\)/g, '').replace(/[^a-z0-9+]+/g, ' ').trim().replace(/ armor$/, '');
const ported = [];
const srd14Path = join(root, 'src', 'content', 'srd', 'items.json');
if (existsSync(srd14Path)) {
  const old = JSON.parse(readFileSync(srd14Path, 'utf8'));
  const all24 = [...items, ...magicItems, ...plus];
  const ids24 = new Set(all24.map((i) => i.id));
  const names24 = new Set(all24.map((i) => norm(i.name)));
  const byName24 = new Map(all24.map((i) => [norm(i.name), i]));
  const map14 = (id) => RENAMED_2014[id] ?? (ids24.has(id) ? id : undefined);
  const base24 = (baseId) => {
    const o = old.find((x) => x.id === baseId);
    const id = map14(baseId) ?? (o ? byName24.get(norm(o.name))?.id : undefined);
    return id ? all24.find((x) => x.id === id) : undefined;
  };
  for (const it of old) {
    if (/-plus-\d$/.test(it.id) || RENAMED_2014[it.id]) continue;            // 2024 has its own +N items / renamed equivalent
    if (!it.magical && (it.weapon || it.armor)) continue;                     // mundane weapons & armor exist in 2024
    if (names24.has(norm(it.name)) || ids24.has(it.id)) continue;
    const p = structuredClone(it);
    p.tags = [...new Set([...(p.tags ?? []), 'from-2014'])];
    p.source = { book: 'SRD 5.1', kind: 'srd' };
    if (p.baseItemId) {
      const b = base24(p.baseItemId);
      if (b?.weapon && p.weapon) { const keep = { attackBonus: p.weapon.attackBonus, damageBonus: p.weapon.damageBonus, extraDamage: p.weapon.extraDamage, critRange: p.weapon.critRange }; p.weapon = { ...structuredClone(b.weapon), ...Object.fromEntries(Object.entries(keep).filter(([, v]) => v !== undefined)) }; }
      if (b?.armor && p.armor) p.armor = { ...structuredClone(b.armor), ...(p.armor.bonus ? { bonus: p.armor.bonus } : {}) };
      p.baseItemId = b?.id;
    }
    if (p.contents) p.contents = p.contents.map((c) => ({ ...c, itemId: map14(c.itemId) ?? c.itemId })).filter((c) => ids24.has(c.itemId) || old.some((o) => o.id === c.itemId));
    p.notes = [p.notes, 'From the 2014 SRD (no 2024 SRD version). Rules text is the 2014 wording; adjust with your DM if needed.'].filter(Boolean).join('\n');
    ported.push(p);
  }
}
// 2024 magic ammunition +1/+2/+3 (generated like the 2014 set)
const ammoPlus = [];
for (const n of [1, 2, 3]) for (const a of items.filter((i) => i.category === 'ammunition')) {
  ammoPlus.push({ ...structuredClone(a), id: `${a.id}-plus-${n}`, name: `${a.name}, +${n}`, aliases: [`+${n} ${a.name}`], description: `You have a +${n} bonus to attack rolls and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical.`, rarity: { 1: 'uncommon', 2: 'rare', 3: 'very-rare' }[n], magical: true, cost: undefined, baseItemId: a.id, tags: ['ammunition', 'magic'], effects: [{ id: `ammo-plus-${n}`, activation: 'carried', manual: true, modifiers: [], description: `+${n} attack and damage when fired from a weapon.` }] });
}
for (const v of ammoPlus) delete v.cost;
console.log(`[content-2024] ported from 2014: ${ported.length}; magic ammunition: ${ammoPlus.length}`);
write('items.json', [...items, ...magicItems, ...plus, ...ammoPlus, ...ported]);

// ----------------------------------------------------------------- texts, tables, feats, backgrounds, species
const texts = {};
for (const f of load('Features')) texts[f.index] = clean(f.description);
for (const t of load('Traits')) texts[`trait:${t.index}`] = clean(t.description);
for (const f of load('Feats')) texts[`feat:${f.index}`] = clean(f.description);
for (const w of load('Weapon-Mastery-Properties')) texts[`mastery:${w.index}`] = clean(w.description);
for (const c of load('Conditions')) texts[`condition:${c.index}`] = clean(c.description ?? (Array.isArray(c.desc) ? c.desc.join('\n') : c.desc));
write('texts.json', texts);

// Per-class level tables: { barbarian: { rage_count: [..20], cantrips_known: [...], prepared_spells: [...] } }
const tables = {};
for (const l of load('Levels')) {
  if (l.subclass) continue;
  const c = l.class.index; tables[c] ??= {};
  const put = (k, v) => { tables[c][k] ??= Array(20).fill(null); tables[c][k][l.level - 1] = typeof v === 'object' && v !== null ? (v.dice_count ? `${v.dice_count}d${v.dice_value}` : JSON.stringify(v)) : v; };
  for (const [k, v] of Object.entries(l.class_specific ?? {})) put(k, v);
  for (const [k, v] of Object.entries(l.spellcasting ?? {})) if (k === 'cantrips_known' || k === 'prepared_spells' || k === 'spells_known') put(k, v);
}
write('tables.json', tables);

const feats = load('Feats').map((f) => ({ id: f.index, name: f.name, type: f.type, minLevel: f.prerequisites?.minimum_level, repeatable: !!f.repeatable }));
write('feats.json', feats);
const bgs = load('Backgrounds').map((b) => ({
  id: b.index, name: b.name, abilities: b.ability_scores.map((a) => a.index), feat: b.feat.index, featNote: b.feat.note,
  skills: b.proficiencies.filter((p) => p.index.startsWith('skill-')).map((p) => p.index.slice(6)),
  tools: b.proficiencies.filter((p) => p.index.startsWith('tool-')).map((p) => p.name.replace(/^Tool: /, '')),
  toolChoice: b.proficiency_choices?.[0]?.desc,
  equipment: b.equipment_options?.[0]?.desc,
}));
write('backgrounds.json', bgs);

// ----------------------------------------------------------------- class basics
const profToken = (p) => {
  const i = p.index;
  if (i === 'light-armor') return { armor: 'light' };
  if (i === 'medium-armor') return { armor: 'medium' };
  if (i === 'heavy-armor') return { armor: 'heavy' };
  if (i === 'shields') return { armor: 'shields' };
  if (i === 'simple-weapons') return { weapons: 'simple' };
  if (i === 'martial-weapons') return { weapons: 'martial' };
  if (i.startsWith('saving-throw-')) return null;
  if (/martial-weapons-that-have-the-light-property|martial-light/.test(i)) return { weapons: 'martial-light' };
  if (/finesse|light-property/.test(i)) return { weapons: 'martial-finesse-light' };
  if (i.startsWith('skill-')) return { skills: i.slice(6) };
  return { tools: p.name.replace(/^Tool: /, '') };
};
const parseEquipOption = (o) => {
  const items = []; let gold = 0;
  const walk = (x) => {
    if (x.option_type === 'money') gold += x.count;
    else if (x.option_type === 'counted_reference') items.push({ itemId: x.of.url.includes('/equipment-categories/') ? `@cat:${x.of.index}` : x.of.index, quantity: x.count, ...(x.of.note ? { name: `${x.of.name} (${x.of.note})` } : {}) });
    else if (x.option_type === 'multiple') x.items.forEach(walk);
    else if (x.option_type === 'choice') items.push({ itemId: `@cat:${x.choice?.from?.equipment_category?.index ?? 'any'}`, quantity: x.choice?.choose ?? 1 });
  };
  walk(o);
  return { items, gold };
};
const classes = load('Classes').map((c) => {
  const grants = { armor: [], weapons: [], tools: [] };
  for (const p of c.proficiencies) { const t = profToken(p); if (t) for (const [k, v] of Object.entries(t)) grants[k]?.push(v); }
  const mcGrants = { armor: [], weapons: [], tools: [] };
  for (const p of c.multi_classing?.proficiencies ?? []) { const t = profToken(p); if (t) for (const [k, v] of Object.entries(t)) mcGrants[k]?.push(v); }
  const skillChoice = c.proficiency_choices.find((pc) => pc.from.options.some((o) => o.item?.index?.startsWith('skill-')));
  const toolChoice = c.proficiency_choices.find((pc) => pc !== skillChoice);
  const prereq = {};
  for (const p of c.multi_classing?.prerequisites ?? []) prereq[p.ability_score.index] = p.minimum_score;
  const anyPrereq = c.multi_classing?.prerequisite_options ? Object.fromEntries(c.multi_classing.prerequisite_options.from.options.map((o) => [o.ability_score.index, o.minimum_score])) : undefined;
  const eq = c.starting_equipment_options?.[0];
  const options = eq ? eq.from.options.map((o, i) => { const r = parseEquipOption(o); return { label: `(${String.fromCharCode(97 + i)}) ${r.items.length ? r.items.map((x) => `${x.quantity > 1 ? `${x.quantity} ` : ''}${x.name ?? x.itemId}`).join(', ') : ''}${r.gold ? `${r.items.length ? ', ' : ''}${r.gold} GP` : ''}`, items: r.items, gold: r.gold }; }) : [];
  return {
    id: c.index, name: c.name, hitDie: c.hit_die, saves: c.saving_throws.map((s) => s.index),
    primary: (c.primary_ability?.ability_scores ?? []).map((a) => a.index),
    skillChoices: skillChoice ? { count: skillChoice.choose, from: skillChoice.from.options.map((o) => o.item.index.slice(6)) } : { count: 0, from: [] },
    toolChoices: toolChoice ? { count: toolChoice.choose, from: toolChoice.from.options.map((o) => (o.item?.name ?? '').replace(/^Tool: /, '')).filter(Boolean) } : undefined,
    ...grants, multiclass: { prerequisite: { ...(Object.keys(prereq).length ? { all: prereq } : {}), ...(anyPrereq ? { any: anyPrereq } : {}) }, grants: mcGrants },
    startingEquipment: options, equipmentDesc: eq?.desc,
  };
});
write('classes.json', classes);

// ----------------------------------------------------------------- feature index (names, levels, owners)
const lvlOf = (x) => (typeof x.level === 'object' ? Number(String(x.level.name).split(' ').pop()) : Number(x.level));
write('features.json', load('Features').map((f) => ({ id: f.index, name: f.name, level: lvlOf(f), classId: f.class?.index, subclassId: f.subclass?.index })));
const subs = load('Subclasses').map((s) => ({ id: s.index, name: s.name, classId: s.class.index, description: clean(s.description ?? s.summary ?? (Array.isArray(s.desc) ? s.desc.join('\n') : s.desc ?? '')) }));
write('subclasses.json', subs);
const spec = load('Species').map((s) => ({ id: s.index, name: s.name, size: s.size, sizeOptions: s.size_options?.from?.options?.map((o) => o.size ?? o) , speed: s.speed, traits: s.traits.map((t) => t.index), subspecies: (s.subspecies ?? []).map((x) => x.index), type: s.type }));
write('species.json', spec);
write('subspecies.json', load('Subspecies').map((s) => ({ id: s.index, name: s.name, species: s.species.index, traits: s.traits.map((t) => ({ id: t.index, level: t.level ?? 1, name: t.name })) })));
