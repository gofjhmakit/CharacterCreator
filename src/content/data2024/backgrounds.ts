// 2024 backgrounds: ability score options + origin feat + skills + tool.
// SRD 5.2: Acolyte, Criminal, Sage, Soldier. Others (PHB 2024) are mechanical summaries.
import type { BackgroundDef, StartingItem } from '@/types/content';
import type { Ability, SkillId } from '@/types/core';
import { ARTISAN_TOOLS, GAMING_SETS, MUSICAL_INSTRUMENTS } from '@/types/core';
import { SRD52, PHB24 } from './helpers24';
import { choice } from '../data/helpers';

const mi = (cls: 'cleric' | 'druid' | 'wizard') => ({ id: 'magic-initiate', presetChoices: { class: [`mi-${cls}`] }, note: `Magic Initiate (${cls[0].toUpperCase() + cls.slice(1)})` });

function bg(id: string, name: string, abilities: Ability[], feat: BackgroundDef['originFeat'], skills: SkillId[], tools: string[], o: { srd?: boolean; toolChoice?: string[]; equipment?: StartingItem[]; gold?: number; description?: string } = {}): BackgroundDef {
  return {
    id, name, ruleset: 'dnd5e-2024', source: o.srd ? SRD52 : PHB24,
    description: o.description ?? `${name}: ${abilities.map((a) => a.toUpperCase()).join(', ')}; ${feat?.note ?? feat?.id}; ${skills.join(', ')}.`,
    grants: { skills, tools }, abilityOptions: abilities, originFeat: feat,
    choices: o.toolChoice ? [choice('tool', 'Tool proficiency', 'tool', 1, { from: o.toolChoice })] : [],
    equipment: o.equipment ?? [], gold: o.gold ?? (o.equipment ? 0 : 50), goldAlternative: 50,
    feature: { id: `${id}-bg`, name: '', description: '' },
  };
}

export const BACKGROUNDS_2024: BackgroundDef[] = [
  bg('acolyte', 'Acolyte', ['int', 'wis', 'cha'], mi('cleric'), ['insight', 'religion'], ["Calligrapher's Supplies"], { srd: true, equipment: [{ itemId: 'calligraphers-supplies' }, { itemId: 'book', name: 'Book (prayers)' }, { itemId: 'emblem' }, { itemId: 'parchment', quantity: 10 }, { itemId: 'robe' }], gold: 8, description: 'You devoted yourself to service in a temple.' }),
  bg('criminal', 'Criminal', ['dex', 'con', 'int'], { id: 'alert' }, ['sleight-of-hand', 'stealth'], ["Thieves' Tools"], { srd: true, equipment: [{ itemId: 'dagger', quantity: 2 }, { itemId: 'thieves-tools' }, { itemId: 'crowbar' }, { itemId: 'pouch', quantity: 2 }, { itemId: 'clothes-travelers' }], gold: 16, description: 'You made a living in the shadows of society.' }),
  bg('sage', 'Sage', ['con', 'int', 'wis'], mi('wizard'), ['arcana', 'history'], ["Calligrapher's Supplies"], { srd: true, equipment: [{ itemId: 'quarterstaff' }, { itemId: 'calligraphers-supplies' }, { itemId: 'book', name: 'Book (history)' }, { itemId: 'parchment', quantity: 8 }, { itemId: 'robe' }], gold: 8, description: 'You spent formative years studying lore.' }),
  bg('soldier', 'Soldier', ['str', 'dex', 'con'], { id: 'savage-attacker' }, ['athletics', 'intimidation'], [], { srd: true, toolChoice: GAMING_SETS, equipment: [{ itemId: 'spear' }, { itemId: 'shortbow' }, { itemId: 'arrows', quantity: 20 }, { itemId: 'healers-kit' }, { itemId: 'quiver' }, { itemId: 'clothes-travelers' }], gold: 14, description: 'You trained for war from a young age.' }),
  bg('artisan', 'Artisan', ['str', 'dex', 'int'], { id: 'crafter' }, ['investigation', 'persuasion'], [], { toolChoice: ARTISAN_TOOLS }),
  bg('charlatan', 'Charlatan', ['dex', 'con', 'cha'], { id: 'skilled' }, ['deception', 'sleight-of-hand'], ['Forgery Kit']),
  bg('entertainer', 'Entertainer', ['str', 'dex', 'cha'], { id: 'musician' }, ['acrobatics', 'performance'], [], { toolChoice: MUSICAL_INSTRUMENTS }),
  bg('farmer', 'Farmer', ['str', 'con', 'wis'], { id: 'tough' }, ['animal-handling', 'nature'], ["Carpenter's Tools"]),
  bg('guard', 'Guard', ['str', 'int', 'wis'], { id: 'alert' }, ['athletics', 'perception'], [], { toolChoice: GAMING_SETS }),
  bg('guide', 'Guide', ['dex', 'con', 'wis'], mi('druid'), ['stealth', 'survival'], ["Cartographer's Tools"]),
  bg('hermit', 'Hermit', ['con', 'wis', 'cha'], { id: 'healer' }, ['medicine', 'religion'], ['Herbalism Kit']),
  bg('merchant', 'Merchant', ['con', 'int', 'cha'], { id: 'lucky' }, ['animal-handling', 'persuasion'], ["Navigator's Tools"]),
  bg('noble', 'Noble', ['str', 'int', 'cha'], { id: 'skilled' }, ['history', 'persuasion'], [], { toolChoice: GAMING_SETS }),
  bg('sailor', 'Sailor', ['str', 'dex', 'wis'], { id: 'tavern-brawler' }, ['acrobatics', 'perception'], ["Navigator's Tools"]),
  bg('scribe', 'Scribe', ['dex', 'int', 'wis'], { id: 'skilled' }, ['investigation', 'perception'], ["Calligrapher's Supplies"]),
  bg('wayfarer', 'Wayfarer', ['dex', 'wis', 'cha'], { id: 'lucky' }, ['insight', 'stealth'], ["Thieves' Tools"]),
];
