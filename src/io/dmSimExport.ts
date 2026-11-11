// Export a character to the "DM Simulator LAN" character sheet format (dnd_project,
// shared/dnd_shared/character.py). That format is a flat, strict sheet (pydantic, extra="forbid"):
// it stores *final* numbers rather than choices, so everything here comes from the derived view.
//
// The target validator rejects unknown keys, over-long strings and too-long lists, so every field is
// clamped to the limits of the Python model. The player app refuses files over 60 KB, so long
// descriptions are shortened step by step until the sheet fits.

import type { Character, InventoryItem } from '@/types/character';
import type { ContentDB } from '@/content/registry';
import type { Ability, SkillId } from '@/types/core';
import { ABILITIES, ABILITY_NAMES, SKILL_IDS } from '@/types/core';
import type { Derived, AttackView } from '@/engine/derive';
import { derive } from '@/engine/derive';
import { downloadJson } from './exportImport';

export const DMSIM_SCHEMA_VERSION = 1;
/** dnd_project's player app refuses character files larger than this. */
export const DMSIM_MAX_BYTES = 60_000;

const SHORT = 120, MEDIUM = 500, LONG = 8000;

type Recharge = 'none' | 'short' | 'long' | 'dawn';
type ProfLevel = 'none' | 'half' | 'proficient' | 'expertise';
type ItemCategory = 'weapon' | 'armor' | 'shield' | 'gear' | 'consumable' | 'ammunition' | 'tool' | 'container' | 'treasure' | 'magic' | 'other';
type Slot = '' | 'armor' | 'shield' | 'main_hand' | 'off_hand' | 'two_hands' | 'worn';

export interface DmSimAttack {
  name: string; ability: 'str' | 'dex' | 'finesse' | 'spell' | 'int' | 'wis' | 'cha' | 'con';
  proficient: boolean; bonus: number; damage: string; add_ability_to_damage: boolean;
  damage_type: string; range: string; properties: string[]; item_id?: string;
}
export interface DmSimSpell {
  name: string; level: number; prepared: boolean; ritual: boolean; concentration: boolean; damage: string;
  notes: string; attack: boolean; save: Ability | null; heal: string; heal_add_mod: boolean; temp_hp: boolean; upcast: string;
}
export interface DmSimFeature { name: string; source: string; kind: 'feature' | 'trait' | 'feat' | 'other'; description: string; resource_id?: string }
export interface DmSimItem {
  id: string; name: string; category: ItemCategory; qty: number; weight: number; equipped: boolean; equippable: boolean;
  slot: Slot; requires_attunement: boolean; attuned: boolean; container_id?: string; ac_bonus: number;
  effect?: { heal?: string; note?: string }; notes: string;
}
export interface DmSimCharacter {
  schema_version: number; status: 'draft';
  name: string; gender: string; player_name: string; species: string;
  classes: { name: string; subclass: string; level: number; hit_die: number }[];
  background: string; alignment: string; xp: number;
  abilities: Record<Ability, number>; save_proficiencies: Ability[];
  skills: Record<string, ProfLevel>; skill_bonus: Record<string, number>;
  initiative_bonus: number; jack_of_all_trades: boolean;
  ac: number; ac_notes: string;
  hp: { max: number; current: number; temp: number };
  hit_dice: { die: number; total: number; remaining: number }[];
  speed: string;
  death_saves: { successes: number; failures: number; stable: boolean; dead: boolean };
  conditions: { name: string; source: string; duration: string }[];
  concentration: string; exhaustion: number;
  proficiencies: { armor: string[]; weapons: string[]; tools: string[] };
  languages: string[]; senses: string[]; resistances: string[]; immunities: string[]; vulnerabilities: string[];
  attacks: DmSimAttack[];
  spellcasting: {
    ability: Ability | null; slots: Record<string, { max: number; used: number }>;
    pact_slots?: { max: number; used: number }; pact_level: number; spells: DmSimSpell[]; focus: string;
  };
  features: DmSimFeature[];
  resources: { id: string; name: string; max: number; current: number; recharge: Recharge }[];
  inventory: DmSimItem[];
  currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
  max_attunement: number;
  appearance: string; backstory: string;
  persona: { traits: string; ideals: string; bonds: string; flaws: string };
  extra: Record<string, unknown>;
}

export interface DmSimExportResult { sheet: DmSimCharacter; warnings: string[]; bytes: number }

// ------------------------------------------------------------------ helpers

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : 0)));
const cut = (s: string | undefined, max: number): string => {
  const t = (s ?? '').replace(/\r\n?/g, '\n').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
};
const list = (xs: Iterable<string>, maxItems: number): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const v = cut(x, SHORT);
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase()); out.push(v);
    if (out.length >= maxItems) break;
  }
  return out;
};
const pyDice = (s: string) => s.replace(/\s+/g, '').replace(/[×x]/g, '*').slice(0, 40);
/** Signed constant appended to a dice expression ("1d8" + 2 → "1d8+2"). */
const withConst = (dice: string, n: number) => (n ? `${dice}${n > 0 ? '+' : ''}${n}` : dice);

const RECHARGE: Record<string, Recharge> = { none: 'none', short: 'short', long: 'long', dawn: 'dawn', turn: 'short', manual: 'none' };

function itemCategory(it: InventoryItem): ItemCategory {
  const def = it.item;
  if (def.weapon || def.category === 'weapon') return 'weapon';
  if (def.armor?.category === 'shield' || def.category === 'shield') return 'shield';
  if (def.armor || def.category === 'armor') return 'armor';
  switch (def.category) {
    case 'ammunition': return 'ammunition';
    case 'tool': case 'instrument': return 'tool';
    case 'pack': case 'container': return 'container';
    case 'consumable': case 'potion': case 'poison': case 'scroll': case 'food': return 'consumable';
    case 'treasure': case 'trade-good': return 'treasure';
    case 'ring': case 'amulet': case 'wand': case 'rod': case 'staff': case 'wondrous': return def.magical ? 'magic' : 'gear';
    case 'mount': case 'vehicle': case 'other': return 'other';
    default: return def.magical ? 'magic' : 'gear';
  }
}

function itemSlot(it: InventoryItem): { slot: Slot; equippable: boolean } {
  const def = it.item;
  if (def.armor?.category === 'shield') return { slot: 'shield', equippable: true };
  if (def.armor) return { slot: 'armor', equippable: true };
  if (def.weapon) {
    if (def.weapon.properties.includes('two-handed')) return { slot: 'two_hands', equippable: true };
    return { slot: it.equipped && it.offHand ? 'off_hand' : 'main_hand', equippable: true };
  }
  const wearable = ['ring', 'amulet', 'wondrous', 'clothing', 'staff', 'rod', 'wand'].includes(def.category)
    || !!def.attunement?.required || (def.effects?.length ?? 0) > 0;
  return wearable ? { slot: 'worn', equippable: true } : { slot: '', equippable: false };
}

function healDice(it: InventoryItem): string {
  const h = it.item.consumable?.onUse?.find((o) => o.kind === 'heal' && o.dice);
  return h?.dice ? pyDice(h.dice) : '';
}

/** Spell damage/heal dice at a given slot level or character level from a level-keyed table. */
function atLevel(table: Record<string, string> | undefined, lvl: number): string {
  if (!table) return '';
  const keys = Object.keys(table).map(Number).filter((k) => k <= lvl).sort((a, b) => a - b);
  const k = keys.length ? keys[keys.length - 1] : Math.min(...Object.keys(table).map(Number));
  return table[String(k)] ?? '';
}

/** "2d6" → "3d6" gives "1d6"; anything less regular gives "". */
function upcastStep(a: string, b: string): string {
  const pa = /^(\d+)d(\d+)$/.exec(pyDice(a)), pb = /^(\d+)d(\d+)$/.exec(pyDice(b));
  if (!pa || !pb || pa[2] !== pb[2]) return '';
  const n = Number(pb[1]) - Number(pa[1]);
  return n > 0 ? `${n}d${pa[2]}` : '';
}

/** Fallback for spells without structured dice (most 2014 SRD text): read them from the description. */
function textDice(desc: string, higher: string | undefined, level: number, charLevel: number) {
  const m = /(\d+d\d+(?:\s*\+\s*\d+)?)\s+([a-z]+)\s+damage/i.exec(desc);
  let damage = m ? pyDice(m[1]) : '';
  const type = m?.[2]?.toLowerCase() ?? '';
  if (damage && level === 0 && /5th level/i.test(desc)) {
    const tier = charLevel >= 17 ? 4 : charLevel >= 11 ? 3 : charLevel >= 5 ? 2 : 1;
    damage = damage.replace(/^(\d+)d/, (_, n) => `${Number(n) * tier}d`);
  }
  const h = /regains?[^.]*?(\d+d\d+)\s*\+\s*your spellcasting ability modifier/i.exec(desc);
  const up = level > 0 ? /increases by (\d+d\d+)/i.exec(higher ?? '')?.[1] ?? '' : '';
  return { damage, type, heal: h ? h[1] : '', upcast: up };
}

// ------------------------------------------------------------------ main

export function toDmSim(ch: Character, db: ContentDB, d: Derived = derive(ch, db)): DmSimExportResult {
  const warnings: string[] = [];
  const pb = d.profBonus;
  const scores = Object.fromEntries(ABILITIES.map((a) => [a, clamp(d.abilities[a].score, 1, 30)])) as Record<Ability, number>;
  const mod = (a: Ability) => Math.floor((scores[a] - 10) / 2);

  // ---- identity
  const race = db.races.get(ch.race.raceId);
  const sub = race?.subraces?.find((s) => s.id === ch.race.subraceId);
  const bg = db.backgrounds.get(ch.background.backgroundId);
  const classes = d.classes.slice(0, 6).map((c) => ({
    name: cut(c.def?.name ?? c.entry.classId, SHORT), subclass: cut(c.subclass?.name ?? '', SHORT),
    level: clamp(c.level, 1, 20), hit_die: clamp(c.def?.hitDie ?? 8, 4, 12),
  }));
  if (d.classes.length > 6) warnings.push('Only the first 6 classes were exported.');

  // ---- skills (the target adds prof/expertise/JoAT itself; anything else becomes a misc bonus)
  const joat = d.initiative.parts.some((p) => p.label === 'Jack of All Trades');
  const skills: Record<string, ProfLevel> = {};
  const skillBonus: Record<string, number> = {};
  for (const id of SKILL_IDS as SkillId[]) {
    const s = d.skills[id];
    const key = id.replace(/-/g, '_');
    let lvl: ProfLevel = s.prof === 2 ? 'expertise' : s.prof === 1 ? 'proficient' : s.prof === 0.5 && !joat ? 'half' : 'none';
    if (lvl !== 'none') skills[key] = lvl;
    if (lvl === 'none' && s.prof === 0.5 && joat) lvl = 'half';
    const expected = mod(s.ability) + (lvl === 'expertise' ? 2 * pb : lvl === 'proficient' ? pb : lvl === 'half' ? Math.floor(pb / 2) : 0);
    const diff = s.total - expected;
    if (diff) skillBonus[key] = diff;
  }
  const initBonus = d.initiative.total - mod('dex') - (joat ? Math.floor(pb / 2) : 0);

  // Save bonuses beyond ability + proficiency (Paladin aura, Cloak of Protection…) have no field there.
  const saveBonus: Record<string, number> = {};
  for (const a of ABILITIES) {
    const sv = d.saves[a];
    const diff = sv.total - mod(a) - (sv.proficient ? pb : 0);
    if (diff) saveBonus[a] = diff;
  }
  if (Object.keys(saveBonus).length) warnings.push(`Saving throw bonuses (${Object.entries(saveBonus).map(([a, v]) => `${a.toUpperCase()} ${v > 0 ? '+' : ''}${v}`).join(', ')}) are not supported by DM Simulator; they are kept in "extra".`);

  // ---- inventory (ids must be ≤16 chars and unique; containers and attacks refer to them)
  const idMap = new Map<string, string>();
  ch.inventory.forEach((it, i) => idMap.set(it.id, `i${i + 1}`));
  const attunementLimit = clamp(d.attunement.limit, 0, 6);
  let attunedCount = 0;
  let mainHandUsed = false;
  const inventory: DmSimItem[] = ch.inventory.slice(0, 300).map((it) => {
    let { slot } = itemSlot(it);
    const { equippable } = itemSlot(it);
    // A second equipped one-handed weapon goes to the off hand.
    if (slot === 'main_hand' && it.equipped) { if (mainHandUsed) slot = 'off_hand'; mainHandUsed = true; }
    const requires = !!it.item.attunement?.required;
    let attuned = requires && it.attuned;
    if (attuned && ++attunedCount > attunementLimit) { attuned = false; warnings.push(`${it.item.name}: over the attunement limit, exported as not attuned.`); }
    const heal = healDice(it);
    const armorBonus = it.item.armor ? (it.item.armor.category === 'shield' ? it.item.armor.baseAc + (it.item.armor.bonus ?? 0) : it.item.armor.bonus ?? 0) : 0;
    const notes = it.notes || (it.item.magical ? it.item.description : '') || it.item.notes || '';
    const out: DmSimItem = {
      id: idMap.get(it.id)!, name: cut(it.item.name, SHORT) || 'Item', category: itemCategory(it),
      qty: clamp(it.quantity, 0, 99999), weight: Math.max(0, Math.min(10000, Number(it.item.weight) || 0)),
      equipped: equippable && it.equipped, equippable, slot, requires_attunement: requires, attuned,
      ac_bonus: clamp(armorBonus, -5, 20), notes: cut(notes, MEDIUM),
    };
    if (it.containerId && idMap.has(it.containerId)) out.container_id = idMap.get(it.containerId);
    if (heal) out.effect = { heal };
    return out;
  });
  if (ch.inventory.length > 300) warnings.push('Only the first 300 items were exported.');

  // ---- attacks
  const attacks: DmSimAttack[] = [];
  const atkFrom = (a: AttackView) => {
    const props = a.properties ?? [];
    const finesse = props.includes('finesse');
    const abilityMod = mod(a.ability);
    const bonus = clamp(a.attack.total - abilityMod - (a.proficient ? pb : 0), -10, 10);
    const addAbility = a.damageBonus.parts.some((p) => p.label.startsWith(`${ABILITY_NAMES[a.ability]} modifier`));
    const dmgRest = a.damageBonus.total - (addAbility ? abilityMod : 0) - bonus;
    let dmg = withConst(pyDice(a.damageDice), dmgRest);
    const extras: string[] = [];
    for (const x of a.extraDamage) {
      if (x.condition) continue;
      dmg += `+${pyDice(x.dice)}`;
      extras.push(`+${x.dice} ${x.type}`.trim());
    }
    const itemId = a.itemInstanceId ? idMap.get(a.itemInstanceId) : undefined;
    const range = a.range && /\//.test(a.range) ? a.range.replace(/\s*ft$/, '') : '';
    attacks.push({
      name: cut(a.kind === 'offhand' ? `${a.name} (off-hand)` : a.name, SHORT),
      ability: finesse ? 'finesse' : a.ability, proficient: a.proficient, bonus,
      damage: dmg.slice(0, 40), add_ability_to_damage: addAbility, damage_type: cut(String(a.damageType ?? ''), SHORT),
      range, properties: list([...props, ...(a.mastery ? [`mastery: ${a.mastery.name}`] : []), ...extras], 12),
      ...(itemId ? { item_id: itemId } : {}),
    });
  };
  for (const a of d.attacks) if (attacks.length < 30) atkFrom(a);

  // ---- spellcasting
  const caster = [...d.casters].sort((a, b) => b.classLevel - a.classLevel)[0];
  const slots: Record<string, { max: number; used: number }> = {};
  for (const s of d.slots) if (s.max > 0) slots[String(s.level)] = { max: clamp(s.max, 0, 9), used: clamp(Math.min(s.used, s.max), 0, 9) };
  const spells: DmSimSpell[] = [];
  const spellAbility = (a?: Ability): DmSimAttack['ability'] => (!a || a === caster?.ability ? 'spell' : a);
  const seenSpells = new Set<string>();
  for (const sv of d.spells) {
    const sp = sv.spell;
    if (!sp || seenSpells.has(sp.name.toLowerCase()) || spells.length >= 200) continue;
    seenSpells.add(sp.name.toLowerCase());
    const lvl = clamp(sp.level, 0, 9);
    const dmgData = sp.level === 0 ? atLevel(sp.damage?.byCharLevel ?? sp.damage?.bySlot, d.totalLevel) : atLevel(sp.damage?.bySlot, lvl) || atLevel(sp.damage?.byCharLevel, d.totalLevel);
    const healRaw = atLevel(sp.heal, lvl);
    const txt = textDice(sp.description ?? '', sp.higherLevels, lvl, d.totalLevel);
    const heal = pyDice(healRaw.replace(/\+?\s*mod\b/i, '')) || txt.heal;
    const healAddMod = healRaw ? /\bmod\b/i.test(healRaw) : !!txt.heal;
    const dmg = dmgData || txt.damage;
    const up = sp.level > 0 ? upcastStep(atLevel(sp.damage?.bySlot, lvl), atLevel(sp.damage?.bySlot, lvl + 1)) || upcastStep(atLevel(sp.heal, lvl).replace(/\+?\s*mod\b/i, ''), atLevel(sp.heal, lvl + 1).replace(/\+?\s*mod\b/i, '')) || txt.upcast : '';
    const note = [sv.sourceLabel && sv.kind !== 'prepared' && sv.kind !== 'known' && sv.kind !== 'cantrip' ? sv.sourceLabel : '', sp.castingTime, sp.range, sp.duration, sv.entry?.notes ?? '']
      .filter(Boolean).join(' · ');
    spells.push({
      name: cut(sp.name, SHORT), level: lvl, prepared: sp.level === 0 || sv.prepared || sv.alwaysPrepared || sv.granted,
      ritual: !!sp.ritual, concentration: !!sp.concentration, damage: pyDice(dmg), notes: cut(note, MEDIUM),
      attack: !!sp.attack, save: sp.save ?? null, heal, heal_add_mod: healAddMod, temp_hp: false, upcast: up,
    });
    // Attack cantrips are also handy as attack rows (like the bundled examples).
    if (sp.level === 0 && sp.attack && dmg && attacks.length < 30) {
      attacks.push({ name: cut(sp.name, SHORT), ability: spellAbility(sv.entry?.ability ?? d.casters.find((c) => c.classId === sv.classId)?.ability), proficient: true, bonus: 0,
        damage: pyDice(dmg), add_ability_to_damage: false, damage_type: cut(sp.damageTypes?.[0] ?? txt.type, SHORT), range: '', properties: list(['spell'], 12) });
    }
  }
  if (d.casters.length > 1) warnings.push(`Multiclass spellcaster: DM Simulator uses one spellcasting ability (${caster.ability.toUpperCase()}, from ${caster.name}).`);

  // ---- resources & features
  const resIds = new Map<string, string>();
  const resources = d.resources.slice(0, 30).map((r, i) => {
    const id = `r${i + 1}`;
    resIds.set(r.id, id);
    const max = clamp(r.max, 0, 999);
    return { id, name: cut(r.name, SHORT), max, current: clamp(Math.min(r.remaining, max), 0, 999), recharge: RECHARGE[r.recharge] ?? 'long' };
  });
  const kindFor = (k: string): DmSimFeature['kind'] => (k === 'race' || k === 'subrace' || k === 'background' ? 'trait' : k === 'feat' ? 'feat' : k === 'custom' ? 'other' : 'feature');
  const features: DmSimFeature[] = d.features.slice(0, 100).map((f) => {
    const chosen = f.choices.flatMap((c) => c.selected.map((s) => c.options.find((o) => o.id === s)?.name ?? s));
    const desc = [f.def.description, chosen.length ? `Chosen: ${chosen.join(', ')}.` : ''].filter(Boolean).join('\n\n');
    const rid = f.resourceId ?? f.def.resource?.id ?? f.def.usesResource;
    const source = `${f.source.label}${f.level && (f.source.kind === 'class' || f.source.kind === 'subclass') ? ` ${f.level}` : ''}`;
    return { name: cut(f.def.name, SHORT) || 'Feature', source: cut(source, SHORT), kind: kindFor(f.source.kind), description: cut(desc, LONG), ...(rid && resIds.has(rid) ? { resource_id: resIds.get(rid) } : {}) };
  });
  if (d.features.length > 100) warnings.push('Only the first 100 features were exported.');

  // ---- speed: the target reads the first number as walking speed
  const sp = d.speed;
  const speedParts = [`${sp.walk.value} ft`, ...(['fly', 'swim', 'climb', 'burrow'] as const).filter((m) => sp[m].value > 0).map((m) => `${m} ${sp[m].value} ft`)];

  const conditionImm = d.conditionImmunities.map((c) => c.type);
  const physical = [['Age', ch.identity.age], ['Height', ch.identity.height], ['Weight', ch.identity.weight], ['Eyes', ch.identity.eyes], ['Skin', ch.identity.skin], ['Hair', ch.identity.hair]]
    .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');
  const backstory = [ch.personality.backstory, ch.personality.allies && `Allies: ${ch.personality.allies}`, ch.personality.organization && `Organization: ${ch.personality.organization}`,
    (ch.identity.faith || ch.identity.deity) && `Faith: ${ch.identity.faith || ch.identity.deity}`].filter(Boolean).join('\n\n');
  const hpMax = clamp(d.hp.max, 0, 9999);

  const sheet: DmSimCharacter = {
    schema_version: DMSIM_SCHEMA_VERSION, status: 'draft',
    name: cut(ch.identity.name, SHORT), gender: cut(ch.identity.gender, SHORT), player_name: cut(ch.identity.playerName, SHORT),
    species: cut(sub?.name ?? race?.name ?? '', SHORT), classes, background: cut(bg?.name ?? '', SHORT),
    alignment: cut(ch.identity.alignment, SHORT), xp: clamp(ch.identity.xp, 0, 10_000_000),
    abilities: scores, save_proficiencies: ABILITIES.filter((a) => d.saves[a].proficient),
    skills, skill_bonus: skillBonus, initiative_bonus: clamp(initBonus, -10, 20), jack_of_all_trades: joat,
    ac: clamp(d.ac.total, 0, 40), ac_notes: cut(d.ac.formula, SHORT),
    hp: { max: hpMax, current: clamp(Math.min(ch.combat.hpCurrent, hpMax), 0, 9999), temp: clamp(ch.combat.hpTemp, 0, 9999) },
    hit_dice: d.hitDice.slice(0, 6).map((h) => ({ die: clamp(h.die, 4, 12), total: clamp(h.total, 0, 20), remaining: clamp(h.total - h.used, 0, Math.min(20, h.total)) })),
    speed: cut(speedParts.join(', '), SHORT),
    death_saves: { successes: clamp(ch.combat.deathSaves.successes, 0, 3), failures: clamp(ch.combat.deathSaves.failures, 0, 3), stable: !!ch.combat.stable, dead: ch.combat.deathSaves.failures >= 3 },
    conditions: d.activeConditions.slice(0, 30).map((c) => ({ name: c, source: '', duration: '' })),
    concentration: cut(ch.combat.concentration, SHORT), exhaustion: clamp(ch.combat.exhaustion, 0, 6),
    proficiencies: { armor: list(d.proficiencies.armor, 30), weapons: list(d.proficiencies.weapons.map((w) => (w === 'simple' || w === 'martial' ? `${w} weapons` : db.items.get(w)?.name ?? w.replace(/-/g, ' '))), 30), tools: list(d.proficiencies.tools, 30) },
    languages: list(d.proficiencies.languages, 20),
    senses: list(d.senses.map((s) => `${s.name[0].toUpperCase()}${s.name.slice(1)} ${s.range} ft`), 10),
    resistances: list(d.resistances.filter((r) => !r.conditional).map((r) => r.type), 20),
    immunities: list([...d.immunities.map((r) => r.type), ...conditionImm.map((c) => `${c} (condition)`)], 20),
    vulnerabilities: list(d.vulnerabilities.map((r) => r.type), 20),
    attacks,
    spellcasting: {
      ability: caster?.ability ?? null, slots,
      ...(d.pact && d.pact.slots > 0 ? { pact_slots: { max: clamp(d.pact.slots, 0, 9), used: clamp(Math.min(d.pact.used, d.pact.slots), 0, 9) } } : {}),
      pact_level: d.pact && d.pact.slots > 0 ? clamp(d.pact.level, 0, 5) : 0, spells, focus: '',
    },
    features, resources, inventory,
    currency: { cp: clamp(ch.currency.cp, 0, 1e7), sp: clamp(ch.currency.sp, 0, 1e7), ep: clamp(ch.currency.ep, 0, 1e7), gp: clamp(ch.currency.gp, 0, 1e7), pp: clamp(ch.currency.pp, 0, 1e7) },
    max_attunement: attunementLimit,
    appearance: cut([ch.identity.appearance, physical].filter(Boolean).join('\n\n'), LONG),
    backstory: cut(backstory, LONG),
    persona: { traits: cut(ch.personality.traits, MEDIUM), ideals: cut(ch.personality.ideals, MEDIUM), bonds: cut(ch.personality.bonds, MEDIUM), flaws: cut(ch.personality.flaws, MEDIUM) },
    extra: {
      source: 'Grimoire 5e', ruleset: ch.ruleset,
      ...(Object.keys(saveBonus).length ? { save_bonus: saveBonus } : {}),
      ...(ch.combat.inspiration ? { inspiration: true } : {}),
    },
  };

  // ---- fit the player app's 60 KB file limit: shorten the longest texts first
  const size = () => new TextEncoder().encode(JSON.stringify(sheet, null, 2)).length;
  let bytes = size();
  if (bytes > DMSIM_MAX_BYTES) {
    for (const max of [1500, 800, 400, 200, 80, 0]) {
      for (const f of sheet.features) f.description = cut(f.description, max || 1).replace(/^…$/, '');
      for (const it of sheet.inventory) it.notes = cut(it.notes, Math.min(MEDIUM, max || 1)).replace(/^…$/, '');
      for (const s of sheet.spellcasting.spells) s.notes = cut(s.notes, Math.min(MEDIUM, Math.max(max, 60)));
      bytes = size();
      if (bytes <= DMSIM_MAX_BYTES) break;
    }
    warnings.push('Long feature and item descriptions were shortened to fit DM Simulator\'s 60 KB character file limit.');
    if (bytes > DMSIM_MAX_BYTES) warnings.push(`The sheet is still ${Math.ceil(bytes / 1000)} KB; DM Simulator may refuse it.`);
  }
  return { sheet, warnings, bytes };
}

export const dmSimFilename = (ch: Character) =>
  `${(ch.identity.name || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'character'}.json`;

/** Build the DM Simulator sheet and download it. Returns a short message for a toast. */
export function downloadDmSim(ch: Character, db: ContentDB): { text: string; kind: 'success' | 'info' } {
  const { sheet, warnings } = toDmSim(ch, db);
  const file = dmSimFilename(ch);
  downloadJson(file, sheet);
  const base = `Exported ${file} for DM Simulator. Players: /import ${file} · DM: /import <seat> ${file}, or copy it to examples/characters/.`;
  return warnings.length ? { kind: 'info', text: `${base} Note: ${warnings.join(' ')}` } : { kind: 'success', text: base };
}
