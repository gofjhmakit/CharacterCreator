// Subclasses: Barbarian, Bard, Cleric, Druid.
// SRD subclasses use SRD 5.1 text. Others are brief original summaries of the mechanics, tagged with
// the source book; consult the book for the full rules text.
import type { SubclassDef } from '@/types/content';
import { SRD, PHB, XGE, TCE, MOOT, T, mod, adv, grant, flag, eff, toggle, choice, byLevel } from './helpers';
import { sc, f, res, domainSpells, divineStrike, potentSpellcasting, spellBlocks } from './subclassHelpers';

const barbarian: SubclassDef[] = [
  sc('barbarian', 'berserker', 'Path of the Berserker', SRD, T('subclass:berserker', 'A path of untamed fury.'), [
    f(3, 'frenzy', 'Frenzy', T('frenzy'), { effects: [toggle('frenzy', 'Frenzied', [], { description: 'While raging: one melee weapon attack as a bonus action each turn. Suffer one level of exhaustion when the rage ends.' })] }),
    f(6, 'mindless-rage', 'Mindless Rage', T('mindless-rage'), { effects: [eff('mindless-rage', [grant('condition-immunity:charmed', { condition: 'while raging' }), grant('condition-immunity:frightened', { condition: 'while raging' })])] }),
    f(10, 'intimidating-presence', 'Intimidating Presence', T('intimidating-presence'), { activation: 'action', effects: [{ id: 'intimidating-presence', name: 'Intimidating Presence', trigger: 'on-use', save: { ability: 'wis', dc: { kind: 'formula', formula: '8 + prof + cha' }, onFailure: [{ kind: 'condition', condition: 'frightened', duration: 'until end of your next turn' }] } }] }),
    f(14, 'retaliation', 'Retaliation', T('retaliation'), { activation: 'reaction' }),
  ]),
  sc('barbarian', 'totem-warrior', 'Path of the Totem Warrior', PHB, 'A spiritual journey guided by an animal spirit guide.', [
    f(3, 'spirit-seeker', 'Spirit Seeker', 'Cast beast sense and speak with animals as rituals.', { grants: { spells: [{ spellId: 'speak-with-animals', mode: 'always-prepared', note: 'Ritual only' }] } }),
    f(3, 'totem-spirit', 'Totem Spirit', 'Choose a totem animal; it grants a benefit while you rage.', { choices: [choice('totem', 'Totem spirit', 'options', 1, { pool: 'totem-spirits' })] }),
    f(6, 'aspect-of-the-beast', 'Aspect of the Beast', 'Choose a totem animal for a permanent benefit (bear: double carrying capacity and advantage on STR checks to push/pull/lift/break; eagle: keen sight; wolf: track at fast pace and stealth at normal pace; elk: double travel pace; tiger: extra skill proficiencies).', {
      choices: [choice('aspect', 'Aspect', 'options', 1, { options: [
        { id: 'aspect-bear', name: 'Bear', effects: [eff('aspect-bear', [{ target: 'carry-multiplier', value: 2 }, adv('check:str', 'pushing, pulling, lifting, or breaking objects')])] },
        { id: 'aspect-eagle', name: 'Eagle', description: 'See up to 1 mile clearly; dim light no disadvantage on Perception.' },
        { id: 'aspect-wolf', name: 'Wolf', description: 'Track at a fast pace; move stealthily at a normal pace.' },
        { id: 'aspect-elk', name: 'Elk (SCAG)', description: 'Your travel pace is doubled for you and up to 10 companions.' },
        { id: 'aspect-tiger', name: 'Tiger (SCAG)', description: 'Gain two skills from Athletics, Acrobatics, Stealth, Survival.', features: [f(6, 'tiger-skills', 'Tiger Aspect Skills', 'Two skills.', { choices: [choice('skills', 'Tiger skills', 'skill', 2, { from: ['athletics', 'acrobatics', 'stealth', 'survival'] })] })] },
      ] })],
    }),
    f(10, 'spirit-walker', 'Spirit Walker', 'Cast commune with nature as a ritual.', { grants: { spells: [{ spellId: 'commune-with-nature', mode: 'always-prepared', note: 'Ritual only' }] } }),
    f(14, 'totemic-attunement', 'Totemic Attunement', 'Choose a totem for a magical benefit (bear: enemies within 5 ft have disadvantage vs others while you rage; eagle: fly while raging; wolf: knock Large or smaller prone with a bonus action on hit; elk: charge to knock prone; tiger: bonus action attack after moving 20 ft).', { manual: true }),
  ]),
  sc('barbarian', 'ancestral-guardian', 'Path of the Ancestral Guardian', XGE, 'Spectral ancestors protect your allies and punish your foes.', [
    f(3, 'ancestral-protectors', 'Ancestral Protectors', 'While raging, the first creature you hit each turn has disadvantage on attacks against others and those others gain resistance to its damage until your next turn.', { effects: [{ id: 'ancestral-protectors', name: 'Ancestral Protectors', trigger: 'on-hit', oncePerTurn: true, outcomes: [{ kind: 'text', text: 'Target has disadvantage on attacks vs. others; others resist its damage (while raging).' }] }] }),
    f(6, 'spirit-shield', 'Spirit Shield', 'Reaction while raging: reduce damage to a creature within 30 ft by 2d6 (3d6 at 10th, 4d6 at 14th).', { activation: 'reaction' }),
    f(10, 'consult-the-spirits', 'Consult the Spirits', 'Cast augury or clairvoyance without a slot (WIS). Once per short or long rest.', { resource: res('consult-the-spirits', 'Consult the Spirits', 1, 'short'), grants: { spells: [{ spellId: 'augury', mode: 'innate', ability: 'wis' }, { spellId: 'clairvoyance', mode: 'innate', ability: 'wis' }] } }),
    f(14, 'vengeful-ancestors', 'Vengeful Ancestors', 'When Spirit Shield reduces damage, the attacker takes force damage equal to the amount reduced.'),
  ]),
  sc('barbarian', 'zealot', 'Path of the Zealot', XGE, 'Divine fury fuels your rage.', [
    f(3, 'divine-fury', 'Divine Fury', 'While raging, the first creature you hit with a weapon each turn takes extra 1d6 + half your barbarian level necrotic or radiant damage.', { effects: [{ id: 'divine-fury', name: 'Divine Fury (while raging)', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, outcomes: [{ kind: 'damage', dice: '1d6+{floor(cl/2)}', text: 'necrotic or radiant (choose at 3rd level)' }] }] }),
    f(3, 'warrior-of-the-gods', 'Warrior of the Gods', 'Spells that restore you to life require no material components.'),
    f(6, 'fanatical-focus', 'Fanatical Focus', 'Once per rage, reroll a failed saving throw.', { manual: true }),
    f(10, 'zealous-presence', 'Zealous Presence', 'Bonus action: up to 10 creatures within 60 ft gain advantage on attacks and saves until your next turn. Once per long rest.', { activation: 'bonus', resource: res('zealous-presence', 'Zealous Presence', 1, 'long') }),
    f(14, 'rage-beyond-death', 'Rage beyond Death', 'While raging, dropping to 0 HP does not knock you unconscious; you die only if your rage ends at 0 HP.', { manual: true }),
  ]),
  sc('barbarian', 'storm-herald', 'Path of the Storm Herald', XGE, 'Your rage manifests as a primal storm aura.', [
    f(3, 'storm-aura', 'Storm Aura', 'While raging, emanate a 10-ft aura (desert: fire damage 2 + scaling; sea: lightning DEX save 1d6+; tundra: temp HP to allies). Choose the environment.', { choices: [choice('env', 'Storm environment', 'options', 1, { options: [{ id: 'storm-desert', name: 'Desert' }, { id: 'storm-sea', name: 'Sea' }, { id: 'storm-tundra', name: 'Tundra' }] })] }),
    f(6, 'storm-soul', 'Storm Soul', 'Resistance by environment: desert fire, sea lightning (and breathe underwater, swim 30), tundra cold.', { choices: [choice('res', 'Storm Soul resistance', 'damage-type', 1, { from: ['fire', 'lightning', 'cold'] })] }),
    f(10, 'shielding-storm', 'Shielding Storm', 'Creatures of your choice in your aura gain your Storm Soul resistance.'),
    f(14, 'raging-storm', 'Raging Storm', 'Aura gains a reaction effect (desert: fire damage on hit; sea: knock prone; tundra: speed 0).'),
  ]),
  sc('barbarian', 'wild-magic-barbarian', 'Path of Wild Magic', TCE, 'Wild magic surges when you rage.', [
    f(3, 'magic-awareness', 'Magic Awareness', 'Action: sense spells and magic items within 60 ft. Proficiency bonus times per long rest.', { activation: 'action', resource: res('magic-awareness', 'Magic Awareness', 'prof', 'long') }),
    f(3, 'wild-surge', 'Wild Surge', 'When you rage, roll on the Wild Magic table (d8) for a random magical effect.', { manual: true }),
    f(6, 'bolstering-magic', 'Bolstering Magic', 'Action: grant +1d3 to attacks and checks for 10 minutes, or restore a spell slot of level 1d3. Proficiency bonus times per long rest.', { resource: res('bolstering-magic', 'Bolstering Magic', 'prof', 'long') }),
    f(10, 'unstable-backlash', 'Unstable Backlash', 'Reaction when damaged or failing a save while raging: roll a new Wild Surge.', { activation: 'reaction' }),
    f(14, 'controlled-surge', 'Controlled Surge', 'Roll twice on the Wild Magic table and choose.'),
  ]),
];

const bard: SubclassDef[] = [
  sc('bard', 'lore', 'College of Lore', SRD, T('subclass:lore', 'Bards who collect knowledge from every source.'), [
    f(3, 'bonus-proficiencies', 'Bonus Proficiencies', T('bonus-proficiencies'), { choices: [choice('skills', 'Three skills of your choice', 'skill', 3)] }),
    f(3, 'cutting-words', 'Cutting Words', T('cutting-words'), { activation: 'reaction', usesResource: 'bardic-inspiration' }),
    f(6, 'additional-magical-secrets', 'Additional Magical Secrets', T('additional-magical-secrets'), { choices: [choice('spells', 'Two spells from any class', 'spell', 2, { spellMode: 'known' })] }),
    f(14, 'peerless-skill', 'Peerless Skill', T('peerless-skill'), { usesResource: 'bardic-inspiration' }),
  ]),
  sc('bard', 'valor', 'College of Valor', PHB, 'Daring skalds who inspire heroics.', [
    f(3, 'valor-bonus-proficiencies', 'Bonus Proficiencies', 'Proficiency with medium armor, shields, and martial weapons.', { grants: { armor: ['medium', 'shields'], weapons: ['martial'] } }),
    f(3, 'combat-inspiration', 'Combat Inspiration', 'A creature with your Bardic Inspiration die can add it to a weapon damage roll, or to AC against one attack as a reaction.'),
    f(6, 'valor-extra-attack', 'Extra Attack', 'Attack twice when you take the Attack action.'),
    f(14, 'battle-magic', 'Battle Magic', 'When you cast a spell with your action, you can make one weapon attack as a bonus action.'),
  ]),
  sc('bard', 'glamour', 'College of Glamour', XGE, 'Bards touched by the beguiling magic of the Feywild.', [
    f(3, 'mantle-of-inspiration', 'Mantle of Inspiration', 'Bonus action, expend Bardic Inspiration: up to CHA mod creatures gain temp HP (5, 8 at 5th, 11 at 10th, 14 at 15th) and can use a reaction to move without provoking.', { activation: 'bonus', usesResource: 'bardic-inspiration' }),
    f(3, 'enthralling-performance', 'Enthralling Performance', 'After performing for 1 minute, charm up to CHA mod humanoids (WIS save) for 1 hour. Once per short rest.', { resource: res('enthralling-performance', 'Enthralling Performance', 1, 'short') }),
    f(6, 'mantle-of-majesty', 'Mantle of Majesty', 'Bonus action: cast command without a slot, and again as a bonus action each turn for 1 minute (concentration). Once per long rest.', { resource: res('mantle-of-majesty', 'Mantle of Majesty', 1, 'long'), grants: { spells: [{ spellId: 'command', mode: 'always-prepared' }] } }),
    f(14, 'unbreakable-majesty', 'Unbreakable Majesty', 'Bonus action, 1 minute: attackers must make a CHA save or choose a new target. Once per short rest.', { resource: res('unbreakable-majesty', 'Unbreakable Majesty', 1, 'short') }),
  ]),
  sc('bard', 'swords', 'College of Swords', XGE, 'Bladesingers of entertainment: daring and deadly performers.', [
    f(3, 'swords-bonus-proficiencies', 'Bonus Proficiencies', 'Proficiency with medium armor and the scimitar; a simple or martial melee weapon you are proficient with can serve as a focus.', { grants: { armor: ['medium'], weapons: ['scimitar'] } }),
    f(3, 'swords-fighting-style', 'Fighting Style', 'Choose Dueling or Two-Weapon Fighting.', { choices: [choice('style', 'Fighting Style', 'options', 1, { options: [
      { id: 'fs-dueling', name: 'Dueling', effects: [eff('fs-dueling', [mod('damage', 2, { scope: 'melee-weapon', requires: ['one-handed-melee-only'] })])] },
      { id: 'fs-two-weapon-fighting', name: 'Two-Weapon Fighting', effects: [eff('fs-twf', [flag('two-weapon-fighting')])] },
    ] })] }),
    f(3, 'blade-flourish', 'Blade Flourish', 'When you take the Attack action, your walking speed increases by 10 ft. Once per turn on a hit, expend Bardic Inspiration for Defensive (add die to damage and AC), Slashing (die to damage to another creature too) or Mobile (die to damage and push) Flourish.', { usesResource: 'bardic-inspiration' }),
    f(6, 'swords-extra-attack', 'Extra Attack', 'Attack twice when you take the Attack action.'),
    f(14, "masters-flourish", "Master's Flourish", 'Use a d6 instead of expending Bardic Inspiration for a Blade Flourish.'),
  ]),
  sc('bard', 'whispers', 'College of Whispers', XGE, 'Bards who trade in secrets and fear.', [
    f(3, 'psychic-blades', 'Psychic Blades', 'Once per turn on a weapon hit, expend Bardic Inspiration to deal extra psychic damage: 2d6 (3d6 at 5th, 5d6 at 10th, 8d6 at 15th).', { effects: [{ id: 'psychic-blades', name: 'Psychic Blades (Bardic Inspiration)', trigger: 'on-hit', scope: 'weapon', oncePerTurn: true, consumes: { resourceId: 'bardic-inspiration', amount: 1 }, outcomes: [{ kind: 'damage', dice: '{steps(cl,3,2,5,3,10,5,15,8)}d6', damageType: 'psychic' }] }] }),
    f(3, 'words-of-terror', 'Words of Terror', 'After speaking alone with a humanoid for 1 minute, it must make a WIS save or be frightened of you or another creature for 1 hour. Once per short rest.', { resource: res('words-of-terror', 'Words of Terror', 1, 'short') }),
    f(6, 'mantle-of-whispers', 'Mantle of Whispers', 'Reaction when a humanoid dies within 30 ft: capture its shadow to take its appearance for 1 hour. Once per short rest.', { resource: res('mantle-of-whispers', 'Mantle of Whispers', 1, 'short') }),
    f(14, 'shadow-lore', 'Shadow Lore', 'Action: a creature makes a WIS save or is charmed for 8 hours, believing you know its darkest secret. Once per long rest.', { resource: res('shadow-lore', 'Shadow Lore', 1, 'long') }),
  ]),
  sc('bard', 'eloquence', 'College of Eloquence', MOOT, 'Masters of oratory.', [
    f(3, 'silver-tongue', 'Silver Tongue', 'Treat a d20 roll of 9 or lower as a 10 on Persuasion and Deception checks.', { tags: ['reliable:persuasion', 'reliable:deception'] }),
    f(3, 'unsettling-words', 'Unsettling Words', 'Bonus action, expend Bardic Inspiration: a creature within 60 ft subtracts the die from its next saving throw before your next turn.', { activation: 'bonus', usesResource: 'bardic-inspiration' }),
    f(6, 'unfailing-inspiration', 'Unfailing Inspiration', 'A creature that adds your Bardic Inspiration die and still fails keeps the die.'),
    f(6, 'universal-speech', 'Universal Speech', 'Action: up to CHA mod creatures understand you for 1 hour. Once per long rest (or spend a slot).', { resource: res('universal-speech', 'Universal Speech', 1, 'long') }),
    f(14, 'infectious-inspiration', 'Infectious Inspiration', 'Reaction when an inspired creature succeeds using your die: give Bardic Inspiration to another creature for free. CHA mod times per long rest.', { resource: res('infectious-inspiration', 'Infectious Inspiration', 'max(1, cha)', 'long') }),
  ]),
];

const cleric: SubclassDef[] = [
  sc('cleric', 'life', 'Life Domain', SRD, T('subclass:life', 'The Life domain focuses on the vibrant positive energy that sustains all life.'), [
    f(1, 'bonus-proficiency', 'Bonus Proficiency', T('bonus-proficiency', 'You gain proficiency with heavy armor.'), { grants: { armor: ['heavy'] } }),
    f(1, 'disciple-of-life', 'Disciple of Life', T('disciple-of-life'), { effects: [eff('disciple-of-life', [], { manual: true, description: 'Healing spells of 1st level or higher restore an additional 2 + spell level HP.' })] }),
    f(2, 'channel-divinity-preserve-life', 'Channel Divinity: Preserve Life', T('channel-divinity-preserve-life'), { activation: 'action', usesResource: 'channel-divinity' }),
    f(6, 'blessed-healer', 'Blessed Healer', T('blessed-healer')),
    divineStrike('radiant'),
    f(17, 'supreme-healing', 'Supreme Healing', T('supreme-healing')),
  ], { spells: domainSpells(['bless', 'cure-wounds'], ['lesser-restoration', 'spiritual-weapon'], ['beacon-of-hope', 'revivify'], ['death-ward', 'guardian-of-faith'], ['mass-cure-wounds', 'raise-dead']) }),
  sc('cleric', 'light', 'Light Domain', PHB, 'Gods of light, truth and vigilance; burning radiance.', [
    f(1, 'light-bonus-cantrip', 'Bonus Cantrip', 'You know the light cantrip.', { grants: { spells: [{ spellId: 'light', mode: 'always-prepared' }] } }),
    f(1, 'warding-flare', 'Warding Flare', 'Reaction: impose disadvantage on an attack against you by a creature within 30 ft you can see. WIS mod times per long rest (min 1).', { activation: 'reaction', resource: res('warding-flare', 'Warding Flare', 'max(1, wis)', 'long') }),
    f(2, 'radiance-of-the-dawn', 'Channel Divinity: Radiance of the Dawn', 'Action: dispel magical darkness within 30 ft; hostile creatures within 30 ft make a CON save, taking 2d10 + cleric level radiant damage (half on success).', { activation: 'action', usesResource: 'channel-divinity', effects: [{ id: 'radiance-of-the-dawn', name: 'Radiance of the Dawn', trigger: 'on-use', save: { ability: 'con', dc: { kind: 'spell', classId: 'cleric' }, onFailure: [{ kind: 'damage', dice: '2d10+{cl}', damageType: 'radiant' }], onSuccess: [{ kind: 'text', text: 'half damage' }] } }] }),
    f(6, 'improved-flare', 'Improved Flare', 'You can use Warding Flare to protect another creature attacked within 30 ft.'),
    potentSpellcasting(),
    f(17, 'corona-of-light', 'Corona of Light', 'Action: emit sunlight for 1 minute; enemies in it have disadvantage on saves against fire and radiant spells.', { activation: 'action' }),
  ], { spells: domainSpells(['burning-hands', 'faerie-fire'], ['flaming-sphere', 'scorching-ray'], ['daylight', 'fireball'], ['guardian-of-faith', 'wall-of-fire'], ['flame-strike', 'scrying']) }),
  sc('cleric', 'war', 'War Domain', PHB, 'Gods of battle reward clerics who fight in their name.', [
    f(1, 'war-bonus-proficiencies', 'Bonus Proficiencies', 'Proficiency with martial weapons and heavy armor.', { grants: { armor: ['heavy'], weapons: ['martial'] } }),
    f(1, 'war-priest', 'War Priest', 'When you take the Attack action, make one weapon attack as a bonus action. WIS mod times per long rest (min 1).', { activation: 'bonus', resource: res('war-priest', 'War Priest', 'max(1, wis)', 'long') }),
    f(2, 'guided-strike', 'Channel Divinity: Guided Strike', 'Gain +10 to an attack roll after seeing the roll.', { usesResource: 'channel-divinity' }),
    f(6, 'war-gods-blessing', "Channel Divinity: War God's Blessing", 'Reaction: grant +10 to an attack roll by a creature within 30 ft.', { activation: 'reaction', usesResource: 'channel-divinity' }),
    divineStrike('slashing'),
    f(17, 'avatar-of-battle', 'Avatar of Battle', 'Resistance to bludgeoning, piercing, and slashing damage from nonmagical attacks.', { effects: [eff('avatar-of-battle', [grant('resistance:all-nonmagical-bps')])] }),
  ], { spells: domainSpells(['divine-favor', 'shield-of-faith'], ['magic-weapon', 'spiritual-weapon'], ['crusaders-mantle', 'spirit-guardians'], ['freedom-of-movement', 'stoneskin'], ['flame-strike', 'hold-monster']) }),
  sc('cleric', 'tempest', 'Tempest Domain', PHB, 'Gods of storms, sea and sky.', [
    f(1, 'tempest-bonus-proficiencies', 'Bonus Proficiencies', 'Proficiency with martial weapons and heavy armor.', { grants: { armor: ['heavy'], weapons: ['martial'] } }),
    f(1, 'wrath-of-the-storm', 'Wrath of the Storm', 'Reaction when hit by a creature within 5 ft: it makes a DEX save, taking 2d8 lightning or thunder (half on success). WIS mod times per long rest.', { activation: 'reaction', resource: res('wrath-of-the-storm', 'Wrath of the Storm', 'max(1, wis)', 'long'), effects: [{ id: 'wrath-of-the-storm', name: 'Wrath of the Storm', trigger: 'on-damage-taken', save: { ability: 'dex', dc: { kind: 'spell', classId: 'cleric' }, onFailure: [{ kind: 'damage', dice: '2d8', damageType: 'lightning' }], onSuccess: [{ kind: 'text', text: 'half' }] } }] }),
    f(2, 'destructive-wrath', 'Channel Divinity: Destructive Wrath', 'When you roll lightning or thunder damage, deal maximum damage instead.', { usesResource: 'channel-divinity' }),
    f(6, 'thunderbolt-strike', 'Thunderbolt Strike', 'When you deal lightning damage to a Large or smaller creature, you can push it up to 10 ft.'),
    divineStrike('thunder'),
    f(17, 'stormborn', 'Stormborn', 'Flying speed equal to your walking speed while outdoors and not underground.', { grants: { speeds: { fly: 'walk' } } }),
  ], { spells: domainSpells(['fog-cloud', 'thunderwave'], ['gust-of-wind', 'shatter'], ['call-lightning', 'sleet-storm'], ['control-water', 'ice-storm'], ['destructive-wave', 'insect-plague']) }),
  sc('cleric', 'knowledge', 'Knowledge Domain', PHB, 'Gods of learning and understanding.', [
    f(1, 'blessings-of-knowledge', 'Blessings of Knowledge', 'Learn two languages. Gain proficiency and expertise in two of Arcana, History, Nature, Religion.', { choices: [choice('languages', 'Languages', 'language', 2), choice('skills', 'Skills (with expertise)', 'skill', 2, { from: ['arcana', 'history', 'nature', 'religion'] }), choice('expertise', 'Expertise (same skills)', 'expertise', 2, { from: ['arcana', 'history', 'nature', 'religion'] })] }),
    f(2, 'knowledge-of-the-ages', 'Channel Divinity: Knowledge of the Ages', 'Action: gain proficiency with a skill or tool for 10 minutes.', { usesResource: 'channel-divinity' }),
    f(6, 'read-thoughts', 'Channel Divinity: Read Thoughts', 'Action: read a creature\'s surface thoughts (WIS save); can cast suggestion on it without a slot.', { usesResource: 'channel-divinity' }),
    potentSpellcasting(),
    f(17, 'visions-of-the-past', 'Visions of the Past', 'Meditate to see past events tied to an object or location.'),
  ], { spells: domainSpells(['command', 'identify'], ['augury', 'suggestion'], ['nondetection', 'speak-with-dead'], ['arcane-eye', 'confusion'], ['legend-lore', 'scrying']) }),
  sc('cleric', 'nature', 'Nature Domain', PHB, 'Gods of nature, the wilds and the seasons.', [
    f(1, 'acolyte-of-nature', 'Acolyte of Nature', 'Learn one druid cantrip, and gain proficiency in Animal Handling, Nature, or Survival.', { choices: [choice('cantrip', 'Druid cantrip', 'spell', 1, { spellFilter: { classes: ['druid'], levels: [0] }, spellMode: 'always-prepared' }), choice('skill', 'Skill', 'skill', 1, { from: ['animal-handling', 'nature', 'survival'] })] }),
    f(1, 'nature-bonus-proficiency', 'Bonus Proficiency', 'Proficiency with heavy armor.', { grants: { armor: ['heavy'] } }),
    f(2, 'charm-animals-and-plants', 'Channel Divinity: Charm Animals and Plants', 'Action: beasts and plant creatures within 30 ft make a WIS save or are charmed for 1 minute.', { usesResource: 'channel-divinity' }),
    f(6, 'dampen-elements', 'Dampen Elements', 'Reaction: grant resistance to an instance of acid, cold, fire, lightning, or thunder damage to a creature within 30 ft.', { activation: 'reaction' }),
    divineStrike('cold'),
    f(17, 'master-of-nature', 'Master of Nature', 'Command charmed animals and plants as a bonus action.'),
  ], { spells: domainSpells(['animal-friendship', 'speak-with-animals'], ['barkskin', 'spike-growth'], ['plant-growth', 'wind-wall'], ['dominate-beast', 'grasping-vine'], ['insect-plague', 'tree-stride']) }),
  sc('cleric', 'trickery', 'Trickery Domain', PHB, 'Gods of mischief and deception.', [
    f(1, 'blessing-of-the-trickster', 'Blessing of the Trickster', 'Action: a willing creature gains advantage on Stealth checks for 1 hour.', { activation: 'action' }),
    f(2, 'invoke-duplicity', 'Channel Divinity: Invoke Duplicity', 'Create an illusory duplicate for 1 minute (concentration); cast spells from its space and gain advantage on attacks when both are within 5 ft of a target.', { usesResource: 'channel-divinity' }),
    f(6, 'cloak-of-shadows', 'Channel Divinity: Cloak of Shadows', 'Action: become invisible until the end of your next turn.', { usesResource: 'channel-divinity' }),
    divineStrike('poison'),
    f(17, 'improved-duplicity', 'Improved Duplicity', 'Create up to four duplicates.'),
  ], { spells: domainSpells(['charm-person', 'disguise-self'], ['mirror-image', 'pass-without-trace'], ['blink', 'dispel-magic'], ['dimension-door', 'polymorph'], ['dominate-person', 'modify-memory']) }),
  sc('cleric', 'death', 'Death Domain', { book: 'DMG', kind: 'summary' }, 'Gods of death and the forces that cause it (villainous option).', [
    f(1, 'death-bonus-proficiency', 'Bonus Proficiency', 'Proficiency with martial weapons.', { grants: { weapons: ['martial'] } }),
    f(1, 'reaper', 'Reaper', 'Learn one necromancy cantrip; your single-target necromancy cantrips can target two creatures within 5 ft of each other.', { choices: [choice('cantrip', 'Necromancy cantrip', 'spell', 1, { spellFilter: { levels: [0], schools: ['necromancy'] }, spellMode: 'always-prepared' })] }),
    f(2, 'touch-of-death', 'Channel Divinity: Touch of Death', 'On a melee hit, deal extra necrotic damage equal to 5 + twice your cleric level.', { usesResource: 'channel-divinity', effects: [{ id: 'touch-of-death', name: 'Touch of Death (Channel Divinity)', trigger: 'on-hit', scope: 'melee', consumes: { resourceId: 'channel-divinity', amount: 1 }, outcomes: [{ kind: 'damage', dice: '{5+2*cl}', damageType: 'necrotic' }] }] }),
    f(6, 'inescapable-destruction', 'Inescapable Destruction', 'Necrotic damage from your cleric spells and Channel Divinity ignores resistance.'),
    divineStrike('necrotic'),
    f(17, 'improved-reaper', 'Improved Reaper', 'Single-target necromancy spells of 1st–5th level can target two creatures within 5 ft of each other.'),
  ], { spells: domainSpells(['false-life', 'ray-of-sickness'], ['blindness-deafness', 'ray-of-enfeeblement'], ['animate-dead', 'vampiric-touch'], ['blight', 'death-ward'], ['antilife-shell', 'cloudkill']) }),
  sc('cleric', 'forge', 'Forge Domain', XGE, 'Gods of invention and smithing.', [
    f(1, 'forge-bonus-proficiencies', 'Bonus Proficiencies', "Proficiency with heavy armor and smith's tools.", { grants: { armor: ['heavy'], tools: ["Smith's tools"] } }),
    f(1, 'blessing-of-the-forge', 'Blessing of the Forge', 'At the end of a long rest, touch a nonmagical weapon or armor: it gains +1 to AC or attack and damage until your next long rest. Once per long rest.', { resource: res('blessing-of-the-forge', 'Blessing of the Forge', 1, 'long') }),
    f(2, 'artisans-blessing', "Channel Divinity: Artisan's Blessing", 'Ritual of 1 hour: create a metal item worth up to 100 gp.', { usesResource: 'channel-divinity' }),
    f(6, 'soul-of-the-forge', 'Soul of the Forge', 'Resistance to fire damage; +1 AC while wearing heavy armor.', { grants: { resistances: ['fire'] }, effects: [eff('soul-of-the-forge', [mod('ac', 1, { requires: ['armored'], condition: undefined })])] }),
    divineStrike('fire'),
    f(17, 'saint-of-forge-and-fire', 'Saint of Forge and Fire', 'Immunity to fire damage; while in heavy armor, resistance to nonmagical bludgeoning, piercing, and slashing.', { grants: { immunities: ['fire'] }, effects: [eff('saint-forge-bps', [grant('resistance:all-nonmagical-bps', { condition: 'while wearing heavy armor' })])] }),
  ], { spells: domainSpells(['identify', 'searing-smite'], ['heat-metal', 'magic-weapon'], ['elemental-weapon', 'protection-from-energy'], ['fabricate', 'wall-of-fire'], ['animate-objects', 'creation']) }),
  sc('cleric', 'grave', 'Grave Domain', XGE, 'Gods who watch over the line between life and death.', [
    f(1, 'circle-of-mortality', 'Circle of Mortality', 'Healing a creature at 0 HP uses maximum dice. Spare the dying is a bonus action with 30 ft range.', { grants: { spells: [{ spellId: 'spare-the-dying', mode: 'always-prepared' }] } }),
    f(1, 'eyes-of-the-grave', 'Eyes of the Grave', 'Action: sense undead within 60 ft. WIS mod times per long rest.', { activation: 'action', resource: res('eyes-of-the-grave', 'Eyes of the Grave', 'max(1, wis)', 'long') }),
    f(2, 'path-to-the-grave', 'Channel Divinity: Path to the Grave', 'Action: curse a creature; the next attack hit against it deals vulnerability-doubled damage.', { usesResource: 'channel-divinity' }),
    f(6, 'sentinel-at-deaths-door', "Sentinel at Death's Door", 'Reaction: turn a critical hit against a creature within 30 ft into a normal hit. WIS mod times per long rest.', { activation: 'reaction', resource: res('sentinel-at-deaths-door', "Sentinel at Death's Door", 'max(1, wis)', 'long') }),
    potentSpellcasting(),
    f(17, 'keeper-of-souls', 'Keeper of Souls', 'Once per round when an enemy dies within 60 ft, you or an ally regains HP equal to its Hit Dice number.'),
  ], { spells: domainSpells(['bane', 'false-life'], ['gentle-repose', 'ray-of-enfeeblement'], ['revivify', 'vampiric-touch'], ['blight', 'death-ward'], ['antilife-shell', 'raise-dead']) }),
  sc('cleric', 'order', 'Order Domain', TCE, 'Gods of law and order.', [
    f(1, 'order-bonus-proficiencies', 'Bonus Proficiencies', 'Proficiency with heavy armor and one of Intimidation or Persuasion.', { grants: { armor: ['heavy'] }, choices: [choice('skill', 'Skill', 'skill', 1, { from: ['intimidation', 'persuasion'] })] }),
    f(1, 'voice-of-authority', 'Voice of Authority', 'When you cast a 1st-level+ spell targeting an ally, that ally can use its reaction to make one weapon attack.'),
    f(2, 'orders-demand', "Channel Divinity: Order's Demand", 'Action: creatures of your choice within 30 ft make a WIS save or are charmed until the end of your next turn and can drop items.', { usesResource: 'channel-divinity' }),
    f(6, 'embodiment-of-the-law', 'Embodiment of the Law', 'Cast enchantment spells of 1st level+ as a bonus action instead of an action. WIS mod times per long rest.', { resource: res('embodiment-of-the-law', 'Embodiment of the Law', 'max(1, wis)', 'long') }),
    divineStrike('psychic'),
    f(17, 'orders-wrath', "Order's Wrath", 'When Divine Strike damages a creature, curse it; the next ally hit against it deals an extra 2d8 psychic.'),
  ], { spells: domainSpells(['command', 'heroism'], ['hold-person', 'zone-of-truth'], ['mass-healing-word', 'slow'], ['compulsion', 'locate-creature'], ['commune', 'dominate-person']) }),
  sc('cleric', 'peace', 'Peace Domain', TCE, 'Gods of harmony and community.', [
    f(1, 'implement-of-peace', 'Implement of Peace', 'Proficiency in Insight, Performance, or Persuasion.', { choices: [choice('skill', 'Skill', 'skill', 1, { from: ['insight', 'performance', 'persuasion'] })] }),
    f(1, 'emboldening-bond', 'Emboldening Bond', 'Action: bond up to proficiency bonus creatures for 10 minutes; once per turn a bonded creature within 30 ft of another can add 1d4 to an attack, check, or save. Proficiency bonus times per long rest.', { resource: res('emboldening-bond', 'Emboldening Bond', 'prof', 'long') }),
    f(2, 'balm-of-peace', 'Channel Divinity: Balm of Peace', 'Action: move up to your speed without provoking; each creature within 5 ft of you along the way heals 2d6 + WIS mod.', { usesResource: 'channel-divinity' }),
    f(6, 'protective-bond', 'Protective Bond', 'Reaction: a bonded creature teleports to another bonded creature that is about to take damage and takes the damage instead.'),
    potentSpellcasting(),
    f(17, 'expansive-bond', 'Expansive Bond', 'Bond range becomes 60 ft; Protective Bond grants resistance to the damage taken.'),
  ], { spells: domainSpells(['heroism', 'sanctuary'], ['aid', 'warding-bond'], ['beacon-of-hope', 'sending'], ['aura-of-purity', 'resilient-sphere'], ['greater-restoration', 'telepathic-bond']) }),
  sc('cleric', 'twilight', 'Twilight Domain', TCE, 'Gods who guard against the horrors of the night and grant rest.', [
    f(1, 'twilight-bonus-proficiencies', 'Bonus Proficiencies', 'Proficiency with martial weapons and heavy armor.', { grants: { armor: ['heavy'], weapons: ['martial'] } }),
    f(1, 'eyes-of-night', 'Eyes of Night', 'Darkvision out to 300 ft. Action: share it with up to WIS mod willing creatures within 10 ft for 1 hour. Once per long rest (or spend any spell slot).', { grants: { senses: { darkvision: 300 } }, resource: res('eyes-of-night', 'Eyes of Night (share)', 1, 'long') }),
    f(1, 'vigilant-blessing', 'Vigilant Blessing', 'Action: give one creature advantage on its next initiative roll. Lasts until used or you use this again.', { activation: 'action', effects: [toggle('vigilant-blessing', 'Vigilant Blessing (on self)', [adv('initiative')], { description: 'Advantage on the next initiative roll.' })] }),
    f(2, 'twilight-sanctuary', 'Channel Divinity: Twilight Sanctuary', 'Action: 30-ft sphere of twilight for 1 minute. When a creature (including you) ends its turn in it, choose: it gains 1d6 + cleric level temp HP, or end one charmed or frightened effect on it.', { activation: 'action', usesResource: 'channel-divinity',
      effects: [toggle('twilight-sanctuary', 'Twilight Sanctuary active', [], { description: 'End of turn in the sphere: 1d6 + cleric level temporary HP, or end charmed/frightened.', outcomes: [{ kind: 'temp-hp', dice: '1d6+{cl}' }] })] }),
    f(6, 'steps-of-night', 'Steps of Night', 'Bonus action while in dim light or darkness: gain a flying speed equal to your walking speed for 1 minute. Proficiency bonus times per long rest.', { activation: 'bonus', resource: res('steps-of-night', 'Steps of Night', 'prof', 'long'), effects: [toggle('steps-of-night', 'Steps of Night (flying)', [mod('speed:fly', 'walk', { op: 'max' })])] }),
    divineStrike('radiant'),
    f(17, 'twilight-shroud', 'Twilight Shroud', 'You and your allies have half cover while in the Twilight Sanctuary sphere.', { effects: [eff('twilight-shroud', [mod('ac', 2, { condition: 'while inside your Twilight Sanctuary (half cover)' }), mod('save:dex', 2, { condition: 'while inside your Twilight Sanctuary (half cover)' })])] }),
  ], { spells: domainSpells(['faerie-fire', 'sleep'], ['moonbeam', 'see-invisibility'], ['aura-of-vitality', 'tiny-hut'], ['aura-of-life', 'greater-invisibility'], ['circle-of-power', 'mislead']) }),
];

const LAND_SPELLS: Record<string, [string[], string[], string[], string[]]> = {
  arctic: [['hold-person', 'spike-growth'], ['sleet-storm', 'slow'], ['freedom-of-movement', 'ice-storm'], ['commune-with-nature', 'cone-of-cold']],
  coast: [['mirror-image', 'misty-step'], ['water-breathing', 'water-walk'], ['control-water', 'freedom-of-movement'], ['conjure-elemental', 'scrying']],
  desert: [['blur', 'silence'], ['create-food-and-water', 'protection-from-energy'], ['blight', 'hallucinatory-terrain'], ['insect-plague', 'wall-of-stone']],
  forest: [['barkskin', 'spider-climb'], ['call-lightning', 'plant-growth'], ['divination', 'freedom-of-movement'], ['commune-with-nature', 'tree-stride']],
  grassland: [['invisibility', 'pass-without-trace'], ['daylight', 'haste'], ['divination', 'freedom-of-movement'], ['dream', 'insect-plague']],
  mountain: [['spider-climb', 'spike-growth'], ['lightning-bolt', 'meld-into-stone'], ['stone-shape', 'stoneskin'], ['passwall', 'wall-of-stone']],
  swamp: [['acid-arrow', 'darkness'], ['water-walk', 'stinking-cloud'], ['freedom-of-movement', 'locate-creature'], ['insect-plague', 'scrying']],
  underdark: [['spider-climb', 'web'], ['gaseous-form', 'stinking-cloud'], ['greater-invisibility', 'stone-shape'], ['cloudkill', 'insect-plague']],
};

const druid: SubclassDef[] = [
  sc('druid', 'land', 'Circle of the Land', SRD, T('subclass:land', 'Mystics and sages who safeguard ancient knowledge.'), [
    f(2, 'bonus-cantrip', 'Bonus Cantrip', T('bonus-cantrip', 'You learn one additional druid cantrip.'), { choices: [choice('cantrip', 'Druid cantrip', 'spell', 1, { spellFilter: { classes: ['druid'], levels: [0] }, spellMode: 'always-prepared' })] }),
    f(2, 'natural-recovery', 'Natural Recovery', T('natural-recovery'), { resource: res('natural-recovery', 'Natural Recovery', 1, 'long'), tags: ['short-rest'] }),
    f(3, 'circle-spells', 'Circle Spells', T('circle-spells-1', 'Your mystical connection to the land grants always-prepared circle spells based on your chosen terrain.'), {
      choices: [choice('terrain', 'Circle terrain', 'options', 1, { options: Object.entries(LAND_SPELLS).map(([t, s]) => ({
        id: `land-${t}`, name: t[0].toUpperCase() + t.slice(1),
        grants: { spells: [...s[0].map((x) => ({ spellId: x, mode: 'always-prepared' as const, minLevel: 3 })), ...s[1].map((x) => ({ spellId: x, mode: 'always-prepared' as const, minLevel: 5 })), ...s[2].map((x) => ({ spellId: x, mode: 'always-prepared' as const, minLevel: 7 })), ...s[3].map((x) => ({ spellId: x, mode: 'always-prepared' as const, minLevel: 9 }))] },
      })) })],
    }),
    f(6, 'druid-lands-stride', "Land's Stride", T('druid-lands-stride'), { effects: [eff('druid-lands-stride', [adv('save:all', 'against plants magically created or manipulated to impede movement')])] }),
    f(10, 'natures-ward', "Nature's Ward", T('natures-ward'), { grants: { immunities: ['poison'], conditionImmunities: ['poisoned'] } }),
    f(14, 'natures-sanctuary', "Nature's Sanctuary", T('natures-sanctuary')),
  ]),
  sc('druid', 'moon', 'Circle of the Moon', PHB, 'Fierce guardians of the wilds who change shape in battle.', [
    f(2, 'combat-wild-shape', 'Combat Wild Shape', 'Wild Shape as a bonus action; while transformed, expend a spell slot as a bonus action to regain 1d8 HP per slot level.', { activation: 'bonus' }),
    f(2, 'circle-forms', 'Circle Forms', 'Transform into beasts of CR 1 (CR = druid level ÷ 3 from 6th level).'),
    f(6, 'primal-strike', 'Primal Strike', 'Attacks in beast form count as magical.'),
    f(10, 'elemental-wild-shape', 'Elemental Wild Shape', 'Expend two Wild Shape uses to become an air, earth, fire, or water elemental.'),
    f(14, 'thousand-forms', 'Thousand Forms', 'Cast alter self at will.', { grants: { spells: [{ spellId: 'alter-self', mode: 'innate' }] } }),
  ]),
  sc('druid', 'dreams', 'Circle of Dreams', XGE, 'Druids tied to the Feywild and dreams.', [
    f(2, 'balm-of-the-summer-court', 'Balm of the Summer Court', 'Pool of d6s equal to druid level. Bonus action: spend up to half your level of dice to heal a creature within 120 ft, plus 1 temp HP per die.', { activation: 'bonus', resource: res('balm-summer-court', 'Balm of the Summer Court (d6s)', 'cl', 'long', { pool: true, die: 'd6' }) }),
    f(6, 'hearth-of-moonlight-and-shadow', 'Hearth of Moonlight and Shadow', 'During a rest, create a 30-ft sphere granting +5 to Stealth and Perception checks.'),
    f(10, 'hidden-paths', 'Hidden Paths', 'Bonus action: teleport up to 60 ft (or a willing creature 30 ft as an action). WIS mod times per long rest.', { resource: res('hidden-paths', 'Hidden Paths', 'max(1, wis)', 'long') }),
    f(14, 'walker-in-dreams', 'Walker in Dreams', 'After a short rest, cast dream, scrying, or teleportation circle once without a slot. Once per long rest.', { resource: res('walker-in-dreams', 'Walker in Dreams', 1, 'long') }),
  ]),
  sc('druid', 'shepherd', 'Circle of the Shepherd', XGE, 'Druids who commune with nature spirits and protect beasts.', [
    f(2, 'speech-of-the-woods', 'Speech of the Woods', 'Learn Sylvan; beasts can understand you.', { grants: { languages: ['Sylvan'] } }),
    f(2, 'spirit-totem', 'Spirit Totem', 'Bonus action: summon a Bear (temp HP 5 + druid level, adv. STR), Hawk (reaction advantage), or Unicorn (healing bonus) spirit aura for 1 minute. Once per short rest.', { resource: res('spirit-totem', 'Spirit Totem', 1, 'short') }),
    f(6, 'mighty-summoner', 'Mighty Summoner', 'Summoned beasts and fey gain 2 extra HP per Hit Die and magical natural weapons.'),
    f(10, 'guardian-spirit', 'Guardian Spirit', 'Summoned creatures ending their turn in your totem aura regain HP equal to half your druid level.'),
    f(14, 'faithful-summons', 'Faithful Summons', 'When reduced to 0 HP, cast conjure animals (9th level) for free. Once per long rest.', { resource: res('faithful-summons', 'Faithful Summons', 1, 'long') }),
  ]),
  sc('druid', 'spores', 'Circle of Spores', TCE, 'Druids who find beauty in decay.', [
    f(2, 'halo-of-spores', 'Halo of Spores', 'Reaction: a creature moving within 10 ft or starting its turn there makes a CON save or takes 1d4 necrotic (1d6 at 6th, 1d8 at 10th, 1d10 at 14th).', { activation: 'reaction', effects: [{ id: 'halo-of-spores', name: 'Halo of Spores', trigger: 'reaction', save: { ability: 'con', dc: { kind: 'spell', classId: 'druid' }, onFailure: [{ kind: 'damage', dice: '1d{steps(cl,2,4,6,6,10,8,14,10)}', damageType: 'necrotic' }] } }] }),
    f(2, 'symbiotic-entity', 'Symbiotic Entity', 'Action, expend a Wild Shape use: gain 4 temp HP per druid level; Halo of Spores dice are doubled and melee weapon attacks deal +1d6 necrotic for 10 minutes.', { usesResource: 'wild-shape', effects: [toggle('symbiotic-entity', 'Symbiotic Entity', [mod('extra-damage', '1d6', { damageType: 'necrotic', scope: 'melee-weapon' })], { description: 'Temp HP = 4 × druid level; Halo dice doubled.' })] }),
    f(2, 'spores-cantrip', 'Circle Spells', 'You know chill touch; gain circle spells at 3rd, 5th, 7th, and 9th level.', { grants: { spells: [{ spellId: 'chill-touch', mode: 'always-prepared' }] } }),
    f(6, 'fungal-infestation', 'Fungal Infestation', 'Reaction when a beast or humanoid dies within 10 ft: animate it as a zombie with 1 HP for 1 hour. WIS mod times per long rest.', { resource: res('fungal-infestation', 'Fungal Infestation', 'max(1, wis)', 'long') }),
    f(10, 'spreading-spores', 'Spreading Spores', 'While Symbiotic Entity is active, bonus action to hurl spores creating a 10-ft cube of Halo damage.'),
    f(14, 'fungal-body', 'Fungal Body', "Immune to blinded, deafened, frightened, poisoned; critical hits against you count as normal hits unless you're incapacitated.", { grants: { conditionImmunities: ['blinded', 'deafened', 'frightened', 'poisoned'] } }),
  ], { spells: spellBlocks('always-prepared', [[3, ['blindness-deafness', 'gentle-repose']], [5, ['animate-dead', 'gaseous-form']], [7, ['blight', 'confusion']], [9, ['cloudkill', 'contagion']]]) }),
  sc('druid', 'stars', 'Circle of Stars', TCE, 'Druids who draw power from starlight.', [
    f(2, 'star-map', 'Star Map', 'You know guidance and always have guiding bolt prepared; cast guiding bolt without a slot proficiency bonus times per long rest.', { resource: res('star-map', 'Star Map (Guiding Bolt)', 'prof', 'long'), grants: { spells: [{ spellId: 'guidance', mode: 'always-prepared' }, { spellId: 'guiding-bolt', mode: 'always-prepared' }] } }),
    f(2, 'starry-form', 'Starry Form', 'Bonus action, expend a Wild Shape use: take a starry form for 10 minutes — Archer (bonus action radiant ranged spell attack 1d8 + WIS), Chalice (healing spell heals another 1d8 + WIS), or Dragon (treat 9 or lower as 10 on INT/WIS checks and concentration saves).', { activation: 'bonus', usesResource: 'wild-shape', effects: [toggle('starry-form', 'Starry Form', [], { description: 'Choose Archer, Chalice, or Dragon constellation.' })] }),
    f(6, 'cosmic-omen', 'Cosmic Omen', 'After a long rest, roll for Weal (even) or Woe (odd); reaction to add or subtract 1d6 from a roll. Proficiency bonus times per long rest.', { activation: 'reaction', resource: res('cosmic-omen', 'Cosmic Omen', 'prof', 'long') }),
    f(10, 'twinkling-constellations', 'Twinkling Constellations', 'Starry Form dice become 2d8; Dragon grants 20 ft fly speed; you can change constellation each turn.'),
    f(14, 'full-of-stars', 'Full of Stars', 'While in Starry Form, resistance to bludgeoning, piercing, and slashing damage.', { effects: [toggle('starry-form', 'Starry Form', [grant('resistance:bludgeoning'), grant('resistance:piercing'), grant('resistance:slashing')], { id: 'full-of-stars' } as never)] }),
  ]),
  sc('druid', 'wildfire', 'Circle of Wildfire', TCE, 'Druids who understand that destruction precedes rebirth.', [
    f(2, 'summon-wildfire-spirit', 'Summon Wildfire Spirit', 'Action, expend a Wild Shape use: summon a wildfire spirit; creatures within 10 ft of it make a DEX save or take 2d6 fire.', { usesResource: 'wild-shape' }),
    f(6, 'enhanced-bond', 'Enhanced Bond', 'While your spirit is summoned, add 1d8 to one damage roll of a fire spell or one healing roll; spells can originate from the spirit.'),
    f(10, 'cauterizing-flames', 'Cauterizing Flames', 'When a creature dies within 30 ft of you or your spirit, create a flame; reaction to heal or damage 2d10 + WIS mod. Proficiency bonus times per long rest.', { resource: res('cauterizing-flames', 'Cauterizing Flames', 'prof', 'long') }),
    f(14, 'blazing-revival', 'Blazing Revival', 'When you drop to 0 HP with your spirit within 120 ft, it can drop to 0 to restore you to half your HP. Once per long rest.', { resource: res('blazing-revival', 'Blazing Revival', 1, 'long') }),
  ], { spells: spellBlocks('always-prepared', [[2, ['burning-hands', 'cure-wounds']], [3, ['flaming-sphere', 'scorching-ray']], [5, ['plant-growth', 'revivify']], [7, ['aura-of-life', 'fire-shield']], [9, ['flame-strike', 'mass-cure-wounds']]]) }),
];

// Twilight / others fix: Full of Stars should piggyback on starry form toggle with unique id.
druid.find((d) => d.id === 'stars')!.features.find((x) => x.id === 'full-of-stars')!.effects = [
  toggle('full-of-stars', 'Starry Form', [grant('resistance:bludgeoning'), grant('resistance:piercing'), grant('resistance:slashing')], { toggleKey: 'starry-form' }),
];

export const SUBCLASSES_1: SubclassDef[] = [...barbarian, ...bard, ...cleric, ...druid];
export { byLevel };
