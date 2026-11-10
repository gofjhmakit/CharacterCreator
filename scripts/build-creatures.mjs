#!/usr/bin/env node
// Builds compact creature templates (SRD 5.1 beasts + common familiar/summon forms) for companion cards.
// Source: vendor/srd-5e-database/5e-SRD-Monsters.json (5e-bits, MIT; SRD 5.1 CC-BY-4.0).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'vendor', 'srd-5e-database', '5e-SRD-Monsters.json');
if (!existsSync(src)) { console.log('[creatures] vendor data missing; keeping committed file'); process.exit(0); }
const EXTRA = new Set(['imp', 'pseudodragon', 'quasit', 'sprite', 'skeleton', 'zombie', 'ghoul', 'air-elemental', 'earth-elemental', 'fire-elemental', 'water-elemental', 'homunculus', 'flameskull', 'shield-guardian', 'griffon', 'hippogriff', 'pegasus', 'unicorn', 'blink-dog', 'dryad']);
const crStr = (cr) => (cr === 0.125 ? '1/8' : cr === 0.25 ? '1/4' : cr === 0.5 ? '1/2' : String(cr));
const SK = (p) => p.proficiency.index.replace(/^skill-/, '').replace(/^saving-throw-/, '');
const out = JSON.parse(readFileSync(src, 'utf8'))
  .filter((m) => m.type === 'beast' || EXTRA.has(m.index))
  .map((m) => ({
    id: m.index, name: m.name, size: m.size, type: m.type, cr: crStr(m.challenge_rating),
    ac: m.armor_class?.[0]?.value ?? 10, hp: m.hit_points, hitDice: m.hit_dice,
    speed: Object.entries(m.speed ?? {}).map(([k, v]) => (k === 'walk' ? v : `${k} ${v}`)).join(', '),
    abilities: { str: m.strength, dex: m.dexterity, con: m.constitution, int: m.intelligence, wis: m.wisdom, cha: m.charisma },
    saves: (m.proficiencies ?? []).filter((p) => p.proficiency.index.startsWith('saving-throw-')).map((p) => `${SK(p).toUpperCase()} +${p.value}`).join(', '),
    skills: (m.proficiencies ?? []).filter((p) => p.proficiency.index.startsWith('skill-')).map((p) => `${SK(p).replace(/-/g, ' ')} +${p.value}`).join(', '),
    senses: Object.entries(m.senses ?? {}).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', '),
    attacks: (m.actions ?? []).filter((a) => a.attack_bonus !== undefined).map((a) => ({ name: a.name, bonus: a.attack_bonus, damage: (a.damage ?? []).map((d) => d.damage_dice).filter(Boolean).join('+') || '0', damageType: a.damage?.[0]?.damage_type?.index, notes: a.desc.replace(/^.*?Hit: [^.]*\.\s*/, '').slice(0, 200) })),
    traits: [...(m.special_abilities ?? []), ...(m.actions ?? []).filter((a) => a.attack_bonus === undefined && a.name !== 'Multiattack')].map((t) => `${t.name}. ${t.desc}`).join('\n').slice(0, 1200),
    multiattack: (m.actions ?? []).find((a) => a.name === 'Multiattack')?.desc,
  }));
writeFileSync(join(root, 'src', 'content', 'srd', 'creatures.json'), JSON.stringify(out));
console.log(`[creatures] creatures.json: ${out.length}`);
