// 2024 feats. SRD 5.2 feats use SRD text; PHB 2024 feats are brief mechanical summaries.
import type { FeatDef, FeatCategory } from '@/types/content';
import { ABILITIES, type Ability } from '@/types/core';
import { SRD52, PHB24, T24 } from './helpers24';
import { mod, adv, flag, eff, toggle, choice, res } from '../data/helpers';

type O = Partial<FeatDef>;
const feat = (id: string, name: string, category: FeatCategory, o: O = {}, srd = false): FeatDef => ({
  id, name, category, ruleset: 'dnd5e-2024', source: srd ? SRD52 : PHB24, description: T24(`feat:${id}`, o.description ?? ''), ...o,
  ...(category === 'general' ? { prerequisite: { level: 4, ...(o.prerequisite ?? {}) } } : {}),
  ...(category === 'epic-boon' ? { prerequisite: { level: 19, ...(o.prerequisite ?? {}) } } : {}),
});
const plus1 = (from: Ability[] | readonly Ability[], max = 20) => ({ abilityIncrease: { from: [...from], amount: 1, max } });
const epic = (from: Ability[] | readonly Ability[] = ABILITIES) => plus1(from, 30);

export const FEATS_2024: FeatDef[] = [
  // Origin (SRD)
  feat('alert', 'Alert', 'origin', { effects: [eff('alert', [mod('initiative', 'prof')])] }, true),
  feat('magic-initiate', 'Magic Initiate', 'origin', { repeatable: true, choices: [
    choice('class', 'Spell list', 'options', 1, { options: [{ id: 'mi-cleric', name: 'Cleric' }, { id: 'mi-druid', name: 'Druid' }, { id: 'mi-wizard', name: 'Wizard' }] }),
    choice('cantrips', 'Two cantrips from that list', 'spell', 2, { spellFilter: { levels: [0], classes: ['cleric', 'druid', 'wizard'] }, spellMode: 'always-prepared' }),
    choice('spell', 'One level 1 spell (always prepared, 1 free cast per long rest)', 'spell', 1, { spellFilter: { levels: [1], classes: ['cleric', 'druid', 'wizard'] }, spellMode: 'innate' }),
    choice('ability', 'Spellcasting ability', 'options', 1, { options: [{ id: 'cast-int', name: 'Intelligence' }, { id: 'cast-wis', name: 'Wisdom' }, { id: 'cast-cha', name: 'Charisma' }] }),
  ] }, true),
  feat('savage-attacker', 'Savage Attacker', 'origin', {}, true),
  feat('skilled', 'Skilled', 'origin', { repeatable: true, choices: [choice('skills', 'Three skills (or tools)', 'skill', 3)] }, true),
  // Origin (PHB 2024)
  feat('crafter', 'Crafter', 'origin', { description: "Proficiency with three Artisan's Tools; 20% discount on nonmagical items; craft faster.", choices: [choice('tools', "Artisan's tools", 'tool', 3)] }),
  feat('healer', 'Healer', 'origin', { description: "Battle Medic: as an action, a creature spends a Hit Die and you heal it with a Healer's Kit; reroll 1s on healing dice." }),
  feat('lucky', 'Lucky', 'origin', { description: 'Luck Points equal to your Proficiency Bonus per long rest: give yourself Advantage, or impose Disadvantage on an attack against you.', resource: res('luck-points', 'Luck Points', 'prof', 'long') }),
  feat('musician', 'Musician', 'origin', { description: 'Proficiency with three instruments; after a rest, give Heroic Inspiration to allies equal to your Proficiency Bonus.', choices: [choice('tools', 'Musical instruments', 'tool', 3, { from: ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Lute', 'Lyre', 'Horn', 'Pan flute', 'Shawm', 'Viol'] })] }),
  feat('tavern-brawler', 'Tavern Brawler', 'origin', { description: 'Unarmed strikes deal 1d4 + STR; reroll 1s on unarmed damage; proficiency with improvised weapons; push 5 ft once per turn on an unarmed hit.' }),
  feat('tough', 'Tough', 'origin', { description: 'Your Hit Point maximum increases by twice your character level.', effects: [eff('tough', [mod('hp-per-level', 2)])] }),
  // General (SRD) — ASI is handled by the Ability Score Improvement choice itself.
  feat('grappler', 'Grappler', 'general', { ...plus1(['str', 'dex']), prerequisite: { abilitiesAny: { str: 13, dex: 13 } }, effects: [eff('grappler', [adv('attack', 'against a creature you are grappling')])] }, true),
  // General (PHB 2024)
  feat('actor', 'Actor', 'general', { ...plus1(['cha']), prerequisite: { abilities: { cha: 13 } }, description: '+1 CHA. Advantage on Deception and Performance when disguised; mimic voices.' }),
  feat('athlete', 'Athlete', 'general', { ...plus1(['str', 'dex']), description: '+1 STR or DEX. Climb speed equal to your speed; standing up costs 5 ft; running jumps after 5 ft.', grants: { speeds: { climb: 'walk' } } }),
  feat('charger', 'Charger', 'general', { ...plus1(['str', 'dex']), description: '+1 STR or DEX. Dash grants +10 ft; after moving 10 ft straight, +1d8 damage or push 10 ft once per turn.' }),
  feat('crossbow-expert', 'Crossbow Expert', 'general', { ...plus1(['dex']), description: '+1 DEX. Ignore Loading; no Disadvantage in melee range; add ability modifier to the Light off-hand crossbow attack.' }),
  feat('defensive-duelist', 'Defensive Duelist', 'general', { ...plus1(['dex']), prerequisite: { abilities: { dex: 13 } }, description: '+1 DEX. Reaction while wielding a Finesse weapon: add Proficiency Bonus to AC until your next turn.', effects: [eff('defensive-duelist', [mod('ac', 'prof', { condition: 'reaction, while wielding a Finesse weapon' })])] }),
  feat('dual-wielder', 'Dual Wielder', 'general', { ...plus1(['str', 'dex']), description: '+1 STR or DEX. Bonus Action attack with a second non-Two-Handed weapon; draw two weapons at once.' }),
  feat('durable', 'Durable', 'general', { ...plus1(['con']), description: '+1 CON. Advantage on death saves; Bonus Action to spend a Hit Die to heal.' }),
  feat('elemental-adept', 'Elemental Adept', 'general', { ...plus1(['int', 'wis', 'cha']), prerequisite: { spellcasting: true }, repeatable: true, description: '+1 INT, WIS, or CHA. Your spells ignore resistance to a chosen element and treat 1s as 2s.' }),
  feat('fey-touched', 'Fey-Touched', 'general', { ...plus1(['int', 'wis', 'cha']), description: '+1 INT, WIS, or CHA. Misty Step and one level 1 Divination or Enchantment spell always prepared, each cast free once per long rest.', grants: { spells: [{ spellId: 'misty-step', mode: 'innate', uses: { max: 1, recharge: 'long' } }] }, choices: [choice('spell', 'Divination or Enchantment spell (level 1)', 'spell', 1, { spellFilter: { levels: [1], schools: ['divination', 'enchantment'] }, spellMode: 'innate' })] }),
  feat('great-weapon-master', 'Great Weapon Master', 'general', { ...plus1(['str']), prerequisite: { abilities: { str: 13 } }, description: '+1 STR. Heavy weapon hits deal extra damage equal to your Proficiency Bonus; Bonus Action attack after a crit or a kill.', effects: [eff('gwm-24', [mod('damage', 'prof', { scope: 'melee-weapon', condition: 'with a Heavy weapon, as part of the Attack action' })])] }),
  feat('heavily-armored', 'Heavily Armored', 'general', { ...plus1(['con', 'str']), prerequisite: { proficiency: 'medium' }, description: '+1 CON or STR. Proficiency with Heavy armor.', grants: { armor: ['heavy'] } }),
  feat('heavy-armor-master', 'Heavy Armor Master', 'general', { ...plus1(['con', 'str']), prerequisite: { proficiency: 'heavy' }, description: '+1 CON or STR. In Heavy armor, reduce bludgeoning, piercing, and slashing damage by your Proficiency Bonus.', effects: [eff('ham-24', [mod('damage-reduction', 'prof', { condition: 'B/P/S damage while wearing Heavy armor' })])] }),
  feat('inspiring-leader', 'Inspiring Leader', 'general', { ...plus1(['wis', 'cha']), description: '+1 WIS or CHA. After a rest, up to six allies gain temp HP = character level + the increased modifier.' }),
  feat('keen-mind', 'Keen Mind', 'general', { ...plus1(['int']), description: '+1 INT. Proficiency (or Expertise) in a lore skill; Study action as a Bonus Action.', choices: [choice('skill', 'Lore skill', 'skill', 1, { from: ['arcana', 'history', 'investigation', 'nature', 'religion'] })] }),
  feat('lightly-armored', 'Lightly Armored', 'general', { ...plus1(['str', 'dex']), description: '+1 STR or DEX. Proficiency with Light armor and Shields.', grants: { armor: ['light', 'shields'] } }),
  feat('mage-slayer', 'Mage Slayer', 'general', { ...plus1(['str', 'dex']), description: '+1 STR or DEX. Concentration Breaker; once per long rest, succeed on a failed mental save.' }),
  feat('martial-weapon-training', 'Martial Weapon Training', 'general', { ...plus1(['str', 'dex']), description: '+1 STR or DEX. Proficiency with Martial weapons.', grants: { weapons: ['martial'] } }),
  feat('medium-armor-master', 'Medium Armor Master', 'general', { ...plus1(['str', 'dex']), prerequisite: { proficiency: 'medium' }, description: '+1 STR or DEX. Add up to 3 DEX to AC in Medium armor.', effects: [eff('medium-armor-master', [flag('medium-armor-master')])] }),
  feat('moderately-armored', 'Moderately Armored', 'general', { ...plus1(['str', 'dex']), prerequisite: { proficiency: 'light' }, description: '+1 STR or DEX. Proficiency with Medium armor.', grants: { armor: ['medium'] } }),
  feat('mounted-combatant', 'Mounted Combatant', 'general', { ...plus1(['str', 'dex', 'wis']), description: '+1 STR, DEX, or WIS. Advantage against unmounted creatures; protect your mount.' }),
  feat('observant', 'Observant', 'general', { ...plus1(['int', 'wis']), description: '+1 INT or WIS. Proficiency (or Expertise) in Insight, Investigation, or Perception; Search as a Bonus Action.', choices: [choice('skill', 'Skill', 'skill', 1, { from: ['insight', 'investigation', 'perception'] })] }),
  feat('polearm-master', 'Polearm Master', 'general', { ...plus1(['str', 'dex']), description: '+1 STR or DEX. Bonus Action butt attack (1d4) with Quarterstaff, Spear, or Heavy+Reach weapons; opportunity attacks on entering reach.' }),
  feat('resilient', 'Resilient', 'general', { repeatable: true, description: '+1 to an ability and proficiency in its saving throws.', choices: [choice('ability', 'Ability', 'options', 1, { options: ABILITIES.map((a) => ({ id: `resilient-${a}`, name: a.toUpperCase(), grants: { saves: [a] }, effects: [eff(`resilient-${a}`, [mod(`ability:${a}`, 1)])] })) })] }),
  feat('ritual-caster', 'Ritual Caster', 'general', { ...plus1(['int', 'wis', 'cha']), description: '+1 INT, WIS, or CHA. Prepare ritual spells (count = Proficiency Bonus) and cast rituals quickly once per long rest.' }),
  feat('sentinel', 'Sentinel', 'general', { ...plus1(['str', 'dex']), description: '+1 STR or DEX. Opportunity attacks stop movement; react when a nearby creature attacks someone else.' }),
  feat('shadow-touched', 'Shadow-Touched', 'general', { ...plus1(['int', 'wis', 'cha']), description: '+1 INT, WIS, or CHA. Invisibility and one level 1 Illusion or Necromancy spell always prepared, each cast free once per long rest.', grants: { spells: [{ spellId: 'invisibility', mode: 'innate', uses: { max: 1, recharge: 'long' } }] }, choices: [choice('spell', 'Illusion or Necromancy spell (level 1)', 'spell', 1, { spellFilter: { levels: [1], schools: ['illusion', 'necromancy'] }, spellMode: 'innate' })] }),
  feat('sharpshooter', 'Sharpshooter', 'general', { ...plus1(['dex']), description: '+1 DEX. Ignore half and three-quarters cover; no Disadvantage at long range or in melee.' }),
  feat('shield-master', 'Shield Master', 'general', { ...plus1(['str']), description: '+1 STR. Shield Bash to push or knock Prone; interpose your shield for DEX saves.' }),
  feat('skill-expert', 'Skill Expert', 'general', { ...plus1(ABILITIES), description: '+1 to one ability; one skill proficiency; Expertise in one skill.', choices: [choice('skill', 'Skill', 'skill', 1), choice('expertise', 'Expertise', 'expertise', 1)] }),
  feat('speedy', 'Speedy', 'general', { ...plus1(['dex', 'con']), description: '+1 DEX or CON. +10 ft speed; Dash ignores difficult terrain; opportunity attacks against you have Disadvantage.', effects: [eff('speedy', [mod('speed:walk', 10)])] }),
  feat('spell-sniper', 'Spell Sniper', 'general', { ...plus1(['int', 'wis', 'cha']), prerequisite: { spellcasting: true }, description: '+1 INT, WIS, or CHA. Spell attack range +60 ft; ignore cover; no Disadvantage in melee.' }),
  feat('telekinetic', 'Telekinetic', 'general', { ...plus1(['int', 'wis', 'cha']), description: '+1 INT, WIS, or CHA. Invisible Mage Hand; Bonus Action shove 5 ft.', grants: { spells: [{ spellId: 'mage-hand', mode: 'always-prepared' }] } }),
  feat('telepathic', 'Telepathic', 'general', { ...plus1(['int', 'wis', 'cha']), description: '+1 INT, WIS, or CHA. Telepathy 60 ft; Detect Thoughts once per long rest free.', grants: { spells: [{ spellId: 'detect-thoughts', mode: 'innate', uses: { max: 1, recharge: 'long' } }] } }),
  feat('war-caster', 'War Caster', 'general', { ...plus1(['int', 'wis', 'cha']), prerequisite: { spellcasting: true }, description: '+1 INT, WIS, or CHA. Advantage on concentration saves; cast a spell as an opportunity attack; somatic components with hands full.', effects: [eff('war-caster', [adv('save:con', 'to maintain Concentration')])] }),
  feat('weapon-master', 'Weapon Master', 'general', { ...plus1(['str', 'dex']), description: '+1 STR or DEX. Use the Mastery property of one extra weapon kind (change on a long rest).', choices: [choice('weapons', 'Extra Weapon Mastery', 'options', 1, { pool: 'weapon-mastery' })] }),
  // Fighting styles (SRD + PHB 2024)
  feat('archery', 'Archery', 'fighting-style', { effects: [eff('fs-archery', [mod('attack', 2, { scope: 'ranged-weapon' })])] }, true),
  feat('defense', 'Defense', 'fighting-style', { effects: [eff('fs-defense', [mod('ac', 1, { requires: ['armored'] })])] }, true),
  feat('great-weapon-fighting', 'Great Weapon Fighting', 'fighting-style', { effects: [eff('fs-gwf', [], { manual: true, description: 'Treat 1s and 2s on damage dice as 3s with Two-Handed or Versatile weapons held in two hands.' })] }, true),
  feat('two-weapon-fighting', 'Two-Weapon Fighting', 'fighting-style', { effects: [eff('fs-twf', [flag('two-weapon-fighting')])] }, true),
  feat('blind-fighting', 'Blind Fighting', 'fighting-style', { description: 'You have Blindsight with a range of 10 feet.', grants: { senses: { blindsight: 10 } } }),
  feat('dueling', 'Dueling', 'fighting-style', { description: '+2 damage with a melee weapon held in one hand and no other weapons.', effects: [eff('fs-dueling', [mod('damage', 2, { scope: 'melee-weapon', requires: ['one-handed-melee-only'] })])] }),
  feat('interception', 'Interception', 'fighting-style', { description: 'Reaction: reduce damage to a creature within 5 ft by 1d10 + Proficiency Bonus.' }),
  feat('protection', 'Protection', 'fighting-style', { description: 'Reaction with a Shield: impose Disadvantage on attacks against a nearby ally and give it resistance until your next turn.' }),
  feat('thrown-weapon-fighting', 'Thrown Weapon Fighting', 'fighting-style', { description: '+2 damage with ranged attacks using Thrown weapons.', effects: [eff('fs-thrown', [mod('damage', 2, { scope: 'thrown' })])] }),
  feat('unarmed-fighting', 'Unarmed Fighting', 'fighting-style', { description: 'Unarmed strikes deal 1d6 + STR (1d8 if both hands free); 1d4 to a grappled creature each turn.' }),
  // Epic boons (SRD)
  feat('boon-of-combat-prowess', 'Boon of Combat Prowess', 'epic-boon', epic(), true),
  feat('boon-of-dimensional-travel', 'Boon of Dimensional Travel', 'epic-boon', epic(), true),
  feat('boon-of-fate', 'Boon of Fate', 'epic-boon', epic(), true),
  feat('boon-of-irresistible-offense', 'Boon of Irresistible Offense', 'epic-boon', epic(['str', 'dex']), true),
  feat('boon-of-spell-recall', 'Boon of Spell Recall', 'epic-boon', { ...epic(['int', 'wis', 'cha']), prerequisite: { spellcasting: true } }, true),
  feat('boon-of-the-night-spirit', 'Boon of the Night Spirit', 'epic-boon', epic(), true),
  feat('boon-of-truesight', 'Boon of Truesight', 'epic-boon', { ...epic(), grants: { senses: { truesight: 60 } } }, true),
];

export { toggle };
