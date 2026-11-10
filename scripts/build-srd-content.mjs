#!/usr/bin/env node
// Converts SRD 5.1 data (vendor/srd-5e-database, from github.com/5e-bits/5e-database, MIT; content
// itself is the System Reference Document 5.1 by Wizards of the Coast, CC-BY-4.0) into this app's
// structured content format under src/content/srd/. Run: `npm run content`.
// Output files are committed so the app builds without network access.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'vendor', 'srd-5e-database');
const OUT = join(root, 'src', 'content', 'srd');
mkdirSync(OUT, { recursive: true });

if (!existsSync(join(SRC, '5e-SRD-Spells.json'))) {
  console.log('[content] vendor SRD data missing; keeping committed src/content/srd/*.json');
  process.exit(0);
}

const load = (n) => JSON.parse(readFileSync(join(SRC, `5e-SRD-${n}.json`), 'utf8'));
const SRD = { book: 'SRD 5.1', kind: 'srd' };
const joinDesc = (d) => (Array.isArray(d) ? d.join('\n\n') : d || '');
const write = (name, data) => {
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 0));
  console.log(`[content] ${name}: ${Array.isArray(data) ? data.length : Object.keys(data).length} entries`);
};

// ----------------------------------------------------------------------------- spells
const spells = load('Spells').map((s) => {
  const damageTypes = [];
  const damage = {};
  if (s.damage) {
    if (s.damage.damage_type) damageTypes.push(s.damage.damage_type.index);
    if (s.damage.damage_at_slot_level) damage.bySlot = s.damage.damage_at_slot_level;
    if (s.damage.damage_at_character_level) damage.byCharLevel = s.damage.damage_at_character_level;
  }
  const desc = joinDesc(s.desc);
  const tags = [];
  if (/regain(s)? .*hit points|restores? .*hit points/i.test(desc)) tags.push('healing');
  if (s.damage) tags.push('damage');
  if (/\bteleport/i.test(desc)) tags.push('teleportation');
  if (/\bcharmed\b|frightened|paralyzed|restrained|stunned|incapacitated|blinded/i.test(desc)) tags.push('control');
  if (s.area_of_effect) tags.push('area');
  return {
    id: s.index,
    name: s.name,
    level: s.level,
    school: s.school.index,
    castingTime: s.casting_time,
    range: s.range,
    components: {
      v: s.components.includes('V'),
      s: s.components.includes('S'),
      m: s.components.includes('M'),
      ...(s.material ? { material: s.material } : {}),
      ...(s.material && /consume/i.test(s.material) ? { consumed: true } : {}),
    },
    duration: s.duration,
    concentration: !!s.concentration,
    ritual: !!s.ritual,
    ...(s.attack_type ? { attack: s.attack_type } : {}),
    ...(s.dc ? { save: s.dc.dc_type.index } : {}),
    ...(damageTypes.length ? { damageTypes } : {}),
    ...(Object.keys(damage).length ? { damage } : {}),
    ...(s.heal_at_slot_level ? { heal: s.heal_at_slot_level } : {}),
    classes: s.classes.map((c) => c.index),
    subclasses: (s.subclasses || []).map((c) => c.index),
    description: desc,
    ...(s.higher_level?.length ? { higherLevels: joinDesc(s.higher_level) } : {}),
    tags,
    source: SRD,
  };
});
write('spells.json', spells);

// ----------------------------------------------------------------------------- equipment
const equipment = load('Equipment');
const PROP = (p) => p.index;
const gearCat = (e) => {
  const g = e.gear_category?.index;
  if (g === 'ammunition') return 'ammunition';
  if (g === 'equipment-packs') return 'pack';
  if (g === 'arcane-foci' || g === 'druidic-foci' || g === 'holy-symbols') return 'focus';
  if (/clothes|robes|vestments/.test(e.index)) return 'clothing';
  if (/rations|flask-or-tankard/.test(e.index)) return 'food';
  if (/potion|antitoxin|acid-vial|alchemists-fire|holy-water|oil-flask/.test(e.index)) return 'consumable';
  if (/poison/.test(e.index)) return 'poison';
  if (/^(backpack|barrel|basket|bottle|bucket|case-|chest|jug|pouch|quiver|sack|vial|pot-iron|component-pouch)/.test(e.index)) return 'container';
  return 'gear';
};
const ALIASES = {
  'rope-hempen-50-feet': ['hempen rope', 'rope'],
  'rope-silk-50-feet': ['silk rope', 'rope'],
  'rations-1-day': ['food', 'rations', 'trail rations'],
  'crossbow-light': ['light crossbow'],
  'crossbow-heavy': ['heavy crossbow'],
  'crossbow-hand': ['hand crossbow'],
  'thieves-tools': ['lockpicks', 'lock picks'],
  'healers-kit': ['healing kit', 'medkit'],
  'alchemists-fire-flask': ['alchemist fire', 'firebomb'],
  'chain-mail': ['chainmail'],
  'chain-shirt': ['chainshirt'],
  'plate-armor': ['plate', 'full plate'],
  'half-plate-armor': ['half plate', 'halfplate'],
  'studded-leather-armor': ['studded leather'],
  'leather-armor': ['leather'],
  'padded-armor': ['padded'],
  'shield': ['buckler'],
  'shortbow': ['short bow'],
  'longbow': ['long bow'],
  'shortsword': ['short sword'],
  'longsword': ['long sword'],
  'greatsword': ['great sword', 'two-handed sword', 'zweihander'],
  'greataxe': ['great axe'],
  'warhammer': ['war hammer'],
  'handaxe': ['hand axe'],
  'lantern-hooded': ['hooded lantern'],
  'lantern-bullseye': ['bullseye lantern'],
};
const items = [];
const weaponByIndex = {};
const armorByIndex = {};
for (const e of equipment) {
  const cat = e.equipment_category.index;
  const base = {
    id: e.index,
    name: e.name,
    description: joinDesc(e.desc) || '',
    rarity: 'none',
    weight: e.weight ?? 0,
    ...(e.cost ? { cost: { amount: e.cost.quantity, unit: e.cost.unit } } : {}),
    magical: false,
    source: SRD,
    effects: [],
    aliases: ALIASES[e.index] || [],
    tags: [],
  };
  if (cat === 'weapon') {
    const props = (e.properties || []).map(PROP).filter((p) => p !== 'special' || true);
    const w = {
      category: e.weapon_category.toLowerCase(),
      kind: e.weapon_range.toLowerCase(),
      damage: e.damage ? { dice: e.damage.damage_dice, type: e.damage.damage_type.index } : { dice: '0', type: 'bludgeoning' },
      properties: props,
      baseWeapon: e.index,
    };
    if (e.two_handed_damage) w.versatile = e.two_handed_damage.damage_dice;
    if (e.weapon_range === 'Ranged' && e.range) w.range = { normal: e.range.normal, long: e.range.long };
    if (e.throw_range) w.range = { normal: e.throw_range.normal, long: e.throw_range.long };
    if (e.index === 'net') w.damage = { dice: '0', type: 'bludgeoning' };
    const special = e.special?.length ? joinDesc(e.special) : '';
    items.push({ ...base, category: 'weapon', type: `${e.weapon_category} ${e.weapon_range} Weapon`, description: [base.description, special].filter(Boolean).join('\n\n'), weapon: w, tags: [e.weapon_category.toLowerCase(), e.weapon_range.toLowerCase(), ...props] });
    weaponByIndex[e.index] = items[items.length - 1];
  } else if (cat === 'armor') {
    const ac = e.armor_class;
    const isShield = e.armor_category === 'Shield';
    const a = {
      category: isShield ? 'shield' : e.armor_category.toLowerCase(),
      baseAc: ac.base,
      dexCap: ac.dex_bonus ? (ac.max_bonus ?? undefined) : null,
      ...(e.str_minimum ? { strRequirement: e.str_minimum } : {}),
      ...(e.stealth_disadvantage ? { stealthDisadvantage: true } : {}),
    };
    if (a.dexCap === undefined) delete a.dexCap;
    items.push({ ...base, category: isShield ? 'shield' : 'armor', type: isShield ? 'Shield' : `${e.armor_category} Armor`, armor: a, tags: [e.armor_category.toLowerCase()] });
    armorByIndex[e.index] = items[items.length - 1];
  } else if (cat === 'tools') {
    const isInstr = e.tool_category === 'Musical Instrument';
    items.push({ ...base, category: isInstr ? 'instrument' : 'tool', type: e.tool_category, tags: [e.tool_category.toLowerCase()] });
  } else if (cat === 'mounts-and-vehicles') {
    const isMount = e.vehicle_category === 'Mounts and Other Animals';
    items.push({ ...base, category: isMount ? 'mount' : 'vehicle', type: e.vehicle_category, ...(e.speed ? { description: [base.description, `Speed: ${e.speed.quantity} ${e.speed.unit}`].filter(Boolean).join('\n') } : {}) });
  } else {
    const c = gearCat(e);
    const it = { ...base, category: c, type: e.gear_category?.name || 'Adventuring Gear' };
    if (e.contents) it.contents = e.contents.map((x) => ({ itemId: x.item.index, quantity: x.quantity }));
    if (e.quantity && e.quantity > 1) it.type = `${it.type} (bundle of ${e.quantity})`;
    if (c === 'ammunition') it.extra = { bundle: e.quantity || 1 };
    items.push(it);
  }
}

// Consumable on-use outcomes for mundane consumables
const mundaneUse = {
  'alchemists-fire-flask': [{ kind: 'damage', dice: '1d4', damageType: 'fire', text: 'Ranged attack (improvised, 20 ft). On hit 1d4 fire at start of each of target\'s turns; DC 10 Dex action to extinguish.' }],
  'acid-vial': [{ kind: 'damage', dice: '2d6', damageType: 'acid', text: 'Ranged attack (improvised, 20 ft).' }],
  'holy-water-flask': [{ kind: 'damage', dice: '2d6', damageType: 'radiant', text: 'Vs. fiend or undead only. Ranged attack (improvised, 20 ft).' }],
  'antitoxin-vial': [{ kind: 'text', text: 'Advantage on saving throws against poison for 1 hour.' }],
  'healers-kit': [{ kind: 'text', text: 'Stabilize a creature at 0 HP without a Medicine check (10 uses).' }],
};
for (const it of items) {
  if (mundaneUse[it.id]) it.consumable = { onUse: mundaneUse[it.id], destroyOnUse: it.id !== 'healers-kit' };
  if (it.id === 'healers-kit') it.charges = { max: 10, recharge: 'none' };
  if (it.category === 'food' || it.category === 'consumable' || it.category === 'ammunition' || it.id === 'torch' || it.id === 'candle') {
    it.consumable = it.consumable || { destroyOnUse: true };
  }
}

// ----------------------------------------------------------------------------- magic items
const RAR = { Common: 'common', Uncommon: 'uncommon', Rare: 'rare', 'Very Rare': 'very-rare', Legendary: 'legendary', Artifact: 'artifact', Varies: 'varies' };
const MCAT = { 'wondrous-items': 'wondrous', potion: 'potion', ring: 'ring', weapon: 'weapon', armor: 'armor', wand: 'wand', staff: 'staff', scroll: 'scroll', rod: 'rod', ammunition: 'ammunition' };
const magic = load('Magic-Items');

const ac = (n, extra = {}) => ({ target: 'ac', value: n, ...extra });
const eff = (id, activation, modifiers, extra = {}) => ({ id, activation, modifiers, ...extra });
const ATT = 'attuned', EQ = 'equipped';
// Curated structured effects for commonly used SRD magic items.
const CURATED = {
  'cloak-of-protection': [eff('cloak-protection', ATT, [ac(1), { target: 'save:all', value: 1 }])],
  'ring-of-protection': [eff('ring-protection', ATT, [ac(1), { target: 'save:all', value: 1 }])],
  'bracers-of-defense': [eff('bracers-defense', ATT, [ac(2, { requires: ['unarmored', 'no-shield'] })])],
  'gauntlets-of-ogre-power': [eff('ogre-power', ATT, [{ target: 'ability-set:str', op: 'set', value: 19 }])],
  'headband-of-intellect': [eff('headband-int', ATT, [{ target: 'ability-set:int', op: 'set', value: 19 }])],
  'amulet-of-health': [eff('amulet-health', ATT, [{ target: 'ability-set:con', op: 'set', value: 19 }])],
  'belt-of-giant-strength-hill': [eff('belt-str', ATT, [{ target: 'ability-set:str', op: 'set', value: 21 }])],
  'belt-of-giant-strength-stone': [eff('belt-str', ATT, [{ target: 'ability-set:str', op: 'set', value: 23 }])],
  'belt-of-giant-strength-frost': [eff('belt-str', ATT, [{ target: 'ability-set:str', op: 'set', value: 23 }])],
  'belt-of-giant-strength-fire': [eff('belt-str', ATT, [{ target: 'ability-set:str', op: 'set', value: 25 }])],
  'belt-of-giant-strength-cloud': [eff('belt-str', ATT, [{ target: 'ability-set:str', op: 'set', value: 27 }])],
  'belt-of-giant-strength-storm': [eff('belt-str', ATT, [{ target: 'ability-set:str', op: 'set', value: 29 }])],
  'stone-of-good-luck-luckstone': [eff('luckstone', ATT, [{ target: 'check:all', value: 1 }, { target: 'save:all', value: 1 }])],
  'periapt-of-proof-against-poison': [eff('periapt-poison', EQ, [{ target: 'immunity:poison', op: 'grant' }, { target: 'condition-immunity:poisoned', op: 'grant' }])],
  'periapt-of-health': [eff('periapt-health', EQ, [], { manual: true, description: 'Immune to contracting disease.' })],
  'boots-of-elvenkind': [eff('boots-elvenkind', EQ, [{ target: 'skill:stealth', op: 'advantage', condition: 'checks that rely on moving silently' }])],
  'cloak-of-elvenkind': [eff('cloak-elvenkind', ATT, [{ target: 'skill:stealth', op: 'advantage', condition: 'checks to hide (hood up)' }])],
  'eyes-of-the-eagle': [eff('eyes-eagle', ATT, [{ target: 'skill:perception', op: 'advantage', condition: 'checks that rely on sight' }])],
  'gloves-of-swimming-and-climbing': [eff('gloves-swim', ATT, [{ target: 'speed:climb', op: 'max', value: 'walk' }, { target: 'speed:swim', op: 'max', value: 'walk' }, { target: 'skill:athletics', value: 5, condition: 'climbing or swimming' }])],
  'winged-boots': [eff('winged-boots', ATT, [{ target: 'speed:fly', op: 'max', value: 'walk' }], { uses: { max: 4, recharge: 'long' }, description: 'Fly speed equal to walking speed for up to 4 hours (in 1-minute increments), regains 2 hours per 12 hours.' })],
  'boots-of-striding-and-springing': [eff('boots-striding', ATT, [{ target: 'speed:walk', op: 'max', value: 30 }])],
  'boots-of-speed': [eff('boots-speed', ATT, [{ target: 'speed:walk', op: 'add', value: 'walk' }], { activation: 'toggle', description: 'Bonus action: click heels to double walking speed; opportunity attacks against you have disadvantage. 10 minutes per long rest.' })],
  'brooch-of-shielding': [eff('brooch', ATT, [{ target: 'resistance:force', op: 'grant' }])],
  'ring-of-swimming': [eff('ring-swim', EQ, [{ target: 'speed:swim', op: 'max', value: 40 }])],
  'ring-of-warmth': [eff('ring-warmth', ATT, [{ target: 'resistance:cold', op: 'grant' }])],
  'ring-of-free-action': [eff('ring-free', ATT, [], { manual: true, description: 'Difficult terrain costs no extra movement; magic can\'t reduce speed or paralyze/restrain you.' })],
  'robe-of-the-archmagi': [eff('robe-archmagi', ATT, [
    { target: 'ac-formula', acFormula: { label: 'Robe of the Archmagi', base: 15, abilities: ['dex'], allowsArmor: false, allowsShield: true } },
    { target: 'spell-dc', value: 2 }, { target: 'spell-attack', value: 2 },
    { target: 'save:all', op: 'advantage', condition: 'against spells and other magical effects' },
  ])],
  'staff-of-power': [eff('staff-power', ATT, [ac(2), { target: 'save:all', value: 2 }, { target: 'spell-attack', value: 2 }])],
  'staff-of-the-magi': [eff('staff-magi', ATT, [{ target: 'save:all', op: 'advantage', condition: 'against spells' }])],
  'wand-of-the-war-mage-1': [eff('war-mage', ATT, [{ target: 'spell-attack', value: 1 }])],
  'wand-of-the-war-mage-2': [eff('war-mage', ATT, [{ target: 'spell-attack', value: 2 }])],
  'wand-of-the-war-mage-3': [eff('war-mage', ATT, [{ target: 'spell-attack', value: 3 }])],
  'sentinel-shield': [eff('sentinel-shield', EQ, [{ target: 'initiative', op: 'advantage' }, { target: 'skill:perception', op: 'advantage' }])],
  'spellguard-shield': [eff('spellguard', ATT, [{ target: 'save:all', op: 'advantage', condition: 'against spells and magical effects' }])],
  'arrow-catching-shield': [eff('arrow-catching', ATT, [ac(2, { condition: 'against ranged attacks' })])],
  'dwarven-plate': [eff('dwarven-plate', EQ, [], { description: 'Push/knockback: reaction to reduce distance by up to 10 ft.', manual: true })],
  'mithral-armor': [],
  'adamantine-armor': [eff('adamantine', EQ, [], { manual: true, description: 'Any critical hit against you becomes a normal hit.' })],
  'flame-tongue': [eff('flame-tongue', ATT, [{ target: 'extra-damage', value: '2d6', damageType: 'fire', scope: 'this-item' }], { activation: 'toggle', name: 'Ablaze', description: 'Bonus action to ignite: +2d6 fire on hit, bright light 40 ft.' })],
  'frost-brand': [
    eff('frost-brand-dmg', ATT, [{ target: 'extra-damage', value: '1d6', damageType: 'cold', scope: 'this-item' }]),
    eff('frost-brand-res', ATT, [{ target: 'resistance:fire', op: 'grant' }]),
  ],
  'holy-avenger': [
    eff('holy-avenger-dmg', ATT, [{ target: 'extra-damage', value: '2d10', damageType: 'radiant', scope: 'this-item', condition: 'fiends and undead' }]),
    eff('holy-avenger-aura', ATT, [{ target: 'save:all', op: 'advantage', condition: 'against spells and magical effects (aura 10 ft, 30 ft if paladin 17+)' }]),
  ],
  'mace-of-disruption': [eff('disruption', ATT, [{ target: 'extra-damage', value: '2d6', damageType: 'radiant', scope: 'this-item', condition: 'fiends and undead' }], { trigger: 'on-hit', save: { ability: 'wis', dc: { kind: 'fixed', value: 15 }, onFailure: [{ kind: 'text', text: 'Fiend/undead with 25 HP or fewer is destroyed; otherwise frightened until end of your next turn.' }] } })],
  'mace-of-smiting': [eff('smiting', EQ, [{ target: 'extra-damage', value: '2d6', damageType: 'bludgeoning', scope: 'this-item', condition: 'constructs (4d6 on crit)' }])],
  'mace-of-terror': [],
  'dragon-slayer': [eff('dragon-slayer', EQ, [{ target: 'extra-damage', value: '3d6', damageType: 'slashing', scope: 'this-item', condition: 'dragons' }])],
  'giant-slayer': [eff('giant-slayer', EQ, [{ target: 'extra-damage', value: '2d6', damageType: 'slashing', scope: 'this-item', condition: 'giants' }], { trigger: 'on-hit', save: { ability: 'str', dc: { kind: 'fixed', value: 15 }, onFailure: [{ kind: 'prone' }] }, description: 'When you hit a giant, it must succeed on a DC 15 STR save or fall prone.' })],
  'dagger-of-venom': [eff('venom', EQ, [], { trigger: 'on-hit', activation: 'toggle', name: 'Poison coated', uses: { max: 1, recharge: 'dawn' }, save: { ability: 'con', dc: { kind: 'fixed', value: 15 }, onFailure: [{ kind: 'damage', dice: '2d10', damageType: 'poison' }, { kind: 'condition', condition: 'poisoned', duration: '1 minute' }] } })],
  'javelin-of-lightning': [],
  'sun-blade': [eff('sun-blade', ATT, [{ target: 'extra-damage', value: '1d8', damageType: 'radiant', scope: 'this-item', condition: 'undead' }])],
  'vicious-weapon': [eff('vicious', EQ, [], { trigger: 'on-crit', outcomes: [{ kind: 'damage', dice: '7', text: 'Extra 7 damage of the weapon\'s type on a natural 20.' }] })],
  'sword-of-wounding': [],
  'defender': [],
  'ring-of-evasion': [],
  'ioun-stone-of-strength': [eff('ioun', ATT, [{ target: 'ability:str', value: 2 }])],
  'ioun-stone-of-agility': [eff('ioun', ATT, [{ target: 'ability:dex', value: 2 }])],
  'ioun-stone-of-fortitude': [eff('ioun', ATT, [{ target: 'ability:con', value: 2 }])],
  'ioun-stone-of-insight': [eff('ioun', ATT, [{ target: 'ability:wis', value: 2 }])],
  'ioun-stone-of-intellect': [eff('ioun', ATT, [{ target: 'ability:int', value: 2 }])],
  'ioun-stone-of-leadership': [eff('ioun', ATT, [{ target: 'ability:cha', value: 2 }])],
  'ioun-stone-of-protection': [eff('ioun-prot', ATT, [ac(1)])],
  'ioun-stone-of-awareness': [eff('ioun-aware', ATT, [], { manual: true, description: "You can't be surprised while it orbits your head." })],
  'cloak-of-the-manta-ray': [eff('manta', EQ, [{ target: 'speed:swim', op: 'max', value: 60 }])],
  'cap-of-water-breathing': [],
  'necklace-of-adaptation': [],
  'mantle-of-spell-resistance': [eff('mantle', ATT, [{ target: 'save:all', op: 'advantage', condition: 'against spells' }])],
  'cloak-of-displacement': [eff('displacement', ATT, [], { manual: true, description: 'Creatures have disadvantage on attack rolls against you until you take damage (resets each turn).' })],
  'ring-of-feather-falling': [],
  'ring-of-jumping': [],
  'boots-of-the-winterlands': [eff('winterlands', ATT, [{ target: 'resistance:cold', op: 'grant' }])],
  'scarab-of-protection': [eff('scarab', ATT, [{ target: 'save:all', op: 'advantage', condition: 'against spells' }])],
  'armor-of-invulnerability': [eff('invuln', ATT, [{ target: 'resistance:all-nonmagical-bps', op: 'grant' }])],
  'efreeti-chain': [eff('efreeti', ATT, [ac(3), { target: 'immunity:fire', op: 'grant' }])],
  'dragon-scale-mail': [eff('dragon-scale', ATT, [ac(1), { target: 'save:all', op: 'advantage', condition: 'against Frightful Presence and dragon breath weapons' }], { description: 'Also grants resistance to one damage type determined by the dragon (choose by editing the item).' })],
  'elven-chain': [eff('elven-chain', EQ, [ac(1)])],
  'plate-armor-of-etherealness': [],
  'demon-armor': [eff('demon-armor', ATT, [ac(1)])],
  'shield-of-missile-attraction': [],
  'animated-shield': [],
  'ring-of-spell-storing': [],
  'ring-of-regeneration': [],
  'ring-of-mind-shielding': [],
};

// Resistance variants (Ring/Armor/Potion of Resistance)
const resTypeOf = (name) => {
  const m = name.match(/\((\w+)\)/);
  return m ? m[1].toLowerCase() : null;
};

const HEALING = {
  'potion-of-healing-common': '2d4+2',
  'potion-of-healing-greater': '4d4+4',
  'potion-of-healing-superior': '8d4+8',
  'potion-of-healing-supreme': '10d4+20',
};

function parseAttunement(first) {
  const m = first.match(/\(requires attunement(?: by ([^)]+))?\)/i);
  if (!m) return { required: false };
  return { required: true, ...(m[1] ? { restriction: m[1].trim() } : {}) };
}

function parseCharges(text) {
  const m = text.match(/has (\d+) charges/i);
  if (!m) return null;
  const max = Number(m[1]);
  const r = text.match(/regains? ([0-9d+\s]+?) expended charges? (daily at dawn|at dawn|each dawn)/i)
    || text.match(/regains? (all|1d\d+(?:\s*\+\s*\d+)?|\d+) (?:expended )?charges? (daily at dawn|at dawn|each dawn)/i);
  return { max, recharge: r ? 'dawn' : 'none', ...(r && r[1] !== 'all' ? { rechargeAmount: r[1].replace(/\s+/g, '') } : {}) };
}

const magicItems = [];
for (const m of magic) {
  if (m.variants && m.variants.length) continue; // generic parent; concrete variants are listed separately
  const desc = Array.isArray(m.desc) ? m.desc : [m.desc];
  const typeLine = desc[0] || '';
  const body = desc.slice(1).join('\n\n');
  const category = MCAT[m.equipment_category.index] || 'wondrous';
  const it = {
    id: `mi-${m.index}`,
    name: m.name,
    category,
    type: typeLine.replace(/\s*\(requires attunement[^)]*\)/i, ''),
    description: body,
    rarity: RAR[m.rarity.name] || 'varies',
    weight: 0,
    magical: true,
    attunement: parseAttunement(typeLine),
    source: SRD,
    effects: [],
    aliases: [],
    tags: ['magic'],
  };
  if (/amulet|necklace|periapt|medallion|brooch|scarab/i.test(m.name)) it.category = it.category === 'wondrous' ? 'amulet' : it.category;
  if (/cursed|curse/i.test(body)) { it.cursed = /this .* is cursed|curse\b/i.test(body); if (it.cursed) it.curse = (body.match(/Curse\.[^\n]*/)?.[0]) || 'This item carries a curse. See description.'; }
  const ds = m.index.match(/^dragon-scale-mail-([a-z]+)$/);
  if (ds) {
    const DT = { black: 'acid', blue: 'lightning', brass: 'fire', bronze: 'lightning', copper: 'acid', gold: 'fire', green: 'poison', red: 'fire', silver: 'cold', white: 'cold' };
    it.effects = [eff('dragon-scale', ATT, [ac(1), { target: `resistance:${DT[ds[1]]}`, op: 'grant' }, { target: 'save:all', op: 'advantage', condition: 'against Frightful Presence and dragon breath weapons' }])];
  }
  // Base weapon/armor stats from the type line, e.g. "Armor (plate)", "Weapon (longsword)", "Weapon (any sword)".
  const baseMatch = typeLine.match(/^(Armor|Weapon)\s*\(([^)]+)\)/i);
  if (baseMatch) {
    const kind = baseMatch[1].toLowerCase();
    const spec = baseMatch[2].toLowerCase().split(',')[0].trim();
    const ARMOR_ALIAS = { plate: 'plate-armor', 'half plate': 'half-plate-armor', 'studded leather': 'studded-leather-armor', leather: 'leather-armor', padded: 'padded-armor', 'scale mail': 'scale-mail', 'chain mail': 'chain-mail', 'chain shirt': 'chain-shirt', breastplate: 'breastplate', hide: 'hide-armor', 'ring mail': 'ring-mail', splint: 'splint-armor', 'medium or heavy': 'chain-mail', 'light': 'leather-armor', 'any medium or heavy': 'chain-mail', 'medium or heavy but not hide': 'chain-mail', 'light or medium': 'chain-shirt' };
    const WEAPON_ALIAS = { 'any sword': 'longsword', 'any sword that deals slashing damage': 'longsword', 'any axe': 'battleaxe', 'any axe or sword': 'longsword', 'any': 'longsword', 'any ammunition': null, 'any hammer': 'warhammer', 'any sword or axe': 'longsword', 'any slashing weapon': 'longsword', 'any weapon that deals slashing damage': 'longsword', 'any melee weapon': 'longsword', 'longsword': 'longsword', 'greatsword or longsword': 'longsword', 'dagger': 'dagger', 'javelin': 'javelin', 'mace': 'mace', 'trident': 'trident', 'warhammer': 'warhammer', 'scimitar': 'scimitar', 'quarterstaff': 'quarterstaff', 'longbow': 'longbow', 'shortbow': 'shortbow', 'rapier': 'rapier', 'whip': 'whip', 'shortsword': 'shortsword' };
    if (kind === 'armor') {
      const baseId = ARMOR_ALIAS[spec] ?? ARMOR_ALIAS[spec.replace(/^any /, '')] ?? (armorByIndex[spec] ? spec : armorByIndex[`${spec}-armor`] ? `${spec}-armor` : undefined);
      const base = baseId && armorByIndex[baseId];
      if (base) {
        it.armor = structuredClone(base.armor); it.weight = base.weight; it.baseItemId = base.id; it.category = 'armor';
        if (!/^(plate|half plate|studded leather|leather|padded|scale mail|chain mail|chain shirt|breastplate|hide|ring mail|splint)$/.test(spec)) it.notes = `Base armor assumed: ${base.name}. Edit the item to choose a different base.`;
      }
      if (m.index === 'mithral-armor' && it.armor) { delete it.armor.strRequirement; delete it.armor.stealthDisadvantage; }
    } else {
      const baseId = spec in WEAPON_ALIAS ? WEAPON_ALIAS[spec] : (weaponByIndex[spec] ? spec : 'longsword');
      const base = baseId && weaponByIndex[baseId];
      if (base) {
        it.weapon = structuredClone(base.weapon); it.weight = base.weight; it.baseItemId = base.id;
        if (!weaponByIndex[spec]) it.notes = `Base weapon assumed: ${base.name}. Edit the item to choose a different base weapon.`;
      }
    }
  }
  if (m.index === 'shield-of-missile-attraction' || m.index === 'animated-shield' || m.index === 'sentinel-shield' || m.index === 'spellguard-shield' || m.index === 'arrow-catching-shield') {
    it.armor = { category: 'shield', baseAc: 2 }; it.category = 'shield'; it.weight = 6;
  }
  // Weapon magic bonuses parsed from common text
  const wb = body.match(/You (?:gain|have) a \+(\d) bonus to attack and damage rolls made with this (?:magic )?weapon/i);
  if (wb && it.weapon) { it.weapon.attackBonus = Number(wb[1]); it.weapon.damageBonus = Number(wb[1]); }
  const ab = body.match(/(?:You have|you gain) a \+(\d) bonus to AC while (?:you're )?wearing this armor/i);
  if (ab && it.armor) it.armor.bonus = Number(ab[1]);
  const ch = parseCharges(body);
  if (ch) it.charges = ch;
  if (CURATED[m.index]) it.effects = CURATED[m.index].map((e) => ({ ...e, id: `${m.index}--${e.id}` }));
  const rm = m.index.match(/^(ring|armor|potion)-of-resistance-([a-z]+)$/);
  const rt = rm ? rm[2] : null;
  if (rt) {
    it.effects = [eff(`resistance-${rt}`, m.index.startsWith('potion') ? 'toggle' : ATT, [{ target: `resistance:${rt}`, op: 'grant' }], m.index.startsWith('potion') ? { name: 'Potion active (1 hour)' } : {})];
  }
  if (HEALING[m.index]) {
    it.consumable = { onUse: [{ kind: 'heal', dice: HEALING[m.index] }], destroyOnUse: true };
    it.aliases = ['healing potion', 'health potion', 'hp potion'];
    it.weight = 0.5;
  } else if (category === 'potion') {
    it.consumable = { onUse: [{ kind: 'text', text: 'See description.' }], destroyOnUse: true };
    it.weight = 0.5;
  }
  if (category === 'scroll') { it.consumable = { destroyOnUse: true }; it.weight = 0; }
  if (category === 'wand') it.weight = 1;
  if (category === 'staff') it.weight = 4;
  if (category === 'rod') it.weight = 2;
  if (category === 'ring') it.weight = 0;
  // +N armor/shield/weapon generic variants → become templates; also expand per base item below.
  magicItems.push(it);
}

// Mark +N generic templates with structured effects and generate concrete variants.
const plusVariants = [];
const RARITY_FOR = { weapon: { 1: 'uncommon', 2: 'rare', 3: 'very-rare' }, armor: { 1: 'rare', 2: 'very-rare', 3: 'legendary' }, shield: { 1: 'uncommon', 2: 'rare', 3: 'very-rare' }, ammo: { 1: 'uncommon', 2: 'rare', 3: 'very-rare' } };
for (const n of [1, 2, 3]) {
  for (const w of Object.values(weaponByIndex)) {
    if (w.id === 'net') continue;
    plusVariants.push({
      ...structuredClone(w),
      id: `${w.id}-plus-${n}`,
      name: `${w.name}, +${n}`,
      aliases: [`+${n} ${w.name}`, `${w.name} +${n}`, `magic ${w.name}`],
      description: `You have a +${n} bonus to attack and damage rolls made with this magic weapon.`,
      rarity: RARITY_FOR.weapon[n],
      magical: true,
      attunement: { required: false },
      weapon: { ...structuredClone(w.weapon), attackBonus: n, damageBonus: n },
      baseItemId: w.id,
      tags: [...w.tags, 'magic'],
      cost: undefined,
    });
  }
  for (const a of Object.values(armorByIndex)) {
    const isShield = a.category === 'shield';
    plusVariants.push({
      ...structuredClone(a),
      id: `${a.id}-plus-${n}`,
      name: `${a.name}, +${n}`,
      aliases: [`+${n} ${a.name}`, `${a.name} +${n}`, `magic ${a.name}`],
      description: isShield
        ? `While holding this shield, you have a +${n} bonus to AC in addition to the shield's normal bonus.`
        : `You have a +${n} bonus to AC while wearing this armor.`,
      rarity: isShield ? RARITY_FOR.shield[n] : RARITY_FOR.armor[n],
      magical: true,
      attunement: { required: false },
      armor: { ...structuredClone(a.armor), bonus: n },
      baseItemId: a.id,
      tags: [...a.tags, 'magic'],
      cost: undefined,
    });
  }
  for (const ammo of ['arrow', 'crossbow-bolt', 'sling-bullet', 'blowgun-needle']) {
    const base = items.find((i) => i.id === ammo);
    if (!base) continue;
    plusVariants.push({
      ...structuredClone(base), id: `${ammo}-plus-${n}`, name: `${base.name}, +${n}`, aliases: [`+${n} ${base.name}`],
      description: `You have a +${n} bonus to attack and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical.`,
      rarity: RARITY_FOR.ammo[n], magical: true, baseItemId: ammo, tags: ['ammunition', 'magic'], cost: undefined,
      effects: [eff(`ammo-plus-${n}`, 'carried', [], { manual: true, description: `+${n} attack and damage when fired from a weapon.` })],
    });
  }
}
// Drop the generic "Weapon, +1" etc. — replaced by concrete variants.
const genericDrop = new Set(['mi-weapon-1', 'mi-weapon-2', 'mi-weapon-3', 'mi-armor-1', 'mi-armor-2', 'mi-armor-3', 'mi-shield-1', 'mi-shield-2', 'mi-shield-3', 'mi-ammunition-1', 'mi-ammunition-2', 'mi-ammunition-3']);
const finalMagic = magicItems.filter((m) => !genericDrop.has(m.id));
for (const v of plusVariants) if (v.cost === undefined) delete v.cost;
write('items.json', [...items, ...finalMagic, ...plusVariants]);

// ----------------------------------------------------------------------------- conditions
write('conditions.json', load('Conditions').map((c) => ({ id: c.index, name: c.name, description: joinDesc(c.desc) })));

// ----------------------------------------------------------------------------- feature texts
// Map of SRD feature/trait index → description text, used by hand-authored class/race data.
const texts = {};
for (const f of load('Features')) texts[f.index] = joinDesc(f.desc);
for (const t of load('Traits')) texts[`trait:${t.index}`] = joinDesc(t.desc);
for (const s of load('Subclasses')) texts[`subclass:${s.index}`] = joinDesc(s.desc);
for (const r of load('Races')) texts[`race:${r.index}`] = [r.alignment, r.age, r.size_description, r.language_desc].filter(Boolean).join('\n\n');
for (const r of load('Subraces')) texts[`subrace:${r.index}`] = joinDesc(r.desc);
for (const b of load('Backgrounds')) texts[`background:${b.index}`] = joinDesc(b.feature?.desc);
for (const f of load('Feats')) texts[`feat:${f.index}`] = joinDesc(f.desc);
write('texts.json', texts);
console.log('[content] done');
