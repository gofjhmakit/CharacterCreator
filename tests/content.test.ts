import { describe, it, expect } from 'vitest';
import { ContentDB } from '@/content/registry';
import { bundledContent } from '@/content';
import { validateContentDB } from '@/content/validate';
import { ARTIFICER_SPELL_LIST } from '@/content/data/artificer';
import { make, d, db24 } from './helpers';
import { longRest, useResource } from '@/engine/actions';
import { checkPrerequisite } from '@/engine/prereq';

describe('bundled content', () => {
  const db = new ContentDB(bundledContent());
  const issues = validateContentDB(db);
  it('has no content errors', () => {
    const errors = issues.filter((i) => i.level === 'error');
    expect(errors, JSON.stringify(errors.slice(0, 20), null, 1)).toEqual([]);
  });

  describe.each(['dnd5e-2014', 'dnd5e-2024'] as const)('expanded content: %s', (ruleset) => {
    const db = new ContentDB(bundledContent(ruleset), [], ruleset);
    const sub = (id: string) => ruleset === 'dnd5e-2024' ? `${id}-legacy-2024` : id;

    it('derives Shadar-kai traits and restores Raven Queen uses on a long rest', () => {
      let c = make({ ruleset, race: 'shadar-kai', classes: [{ id: 'fighter', level: 5 }] });
      const r = d(c);
      expect(r.skills.perception.prof).toBe(1);
      expect(r.resistances.map((x) => x.type)).toContain('necrotic');
      expect(r.features.some((x) => x.def.id === 'shadar-kai-trance')).toBe(true);
      expect(r.resources.find((x) => x.id === 'blessing-of-the-raven-queen')?.max).toBe(3);
      c = useResource(c, 'blessing-of-the-raven-queen');
      expect(d(c).resources.find((x) => x.id === 'blessing-of-the-raven-queen')?.used).toBe(1);
      c = longRest(c, d(c)).character;
      expect(d(c).resources.find((x) => x.id === 'blessing-of-the-raven-queen')?.used).toBe(0);
    });

    it('grants Reborn resilience, chosen past-life skills, and scaling knowledge uses', () => {
      const r = d(make({ ruleset, race: 'reborn', classes: [{ id: 'rogue', level: 9 }], choices: {
        'race:ancestral-legacy:legacy': ['new-skills'],
        'race:ancestral-legacy:legacy:new-skills:reborn-skills:skills': ['arcana', 'medicine'],
      } }));
      expect(r.resistances.map((x) => x.type)).toContain('poison');
      expect(r.skills.arcana.prof).toBe(1);
      expect(r.skills.medicine.prof).toBe(1);
      expect(r.saves.con.conditional.some((x) => x.op === 'advantage' && x.condition.includes('poison'))).toBe(true);
      expect(r.deathSave.mode).toBe('advantage');
      expect(r.saves.con.mode).toBe('normal');
      expect(r.resources.find((x) => x.id === 'knowledge-from-a-past-life')?.max).toBe(4);
    });

    it('offers Drakewardens a replacement language when Draconic is already known', () => {
      const c = make({ ruleset, race: 'dragonborn', classes: [{ id: 'ranger', level: 3, sub: sub('drakewarden') }] });
      if (ruleset === 'dnd5e-2024') c.choices['origin:languages'] = ['Draconic', 'Elvish'];
      const key = `subclass:${sub('drakewarden')}:draconic-gift:replacement-language`;
      c.choices[key] = ['Sylvan'];
      const r = d(c);
      expect(r.proficiencies.languages.filter((language) => language === 'Draconic')).toHaveLength(1);
      expect(r.proficiencies.languages).toContain('Sylvan');
      expect(r.choices.find((choice) => choice.key === key)?.def.optional).toBe(true);
      expect(r.spells.find((spell) => spell.spellId === 'thaumaturgy')).toMatchObject({ classId: 'ranger', granted: true });
      delete c.choices[key];
      expect(d(c).proficiencies.languages).not.toContain('Sylvan');
    });

    it('provides a usable Artificer spell list, starting kit, and level-1 casting', () => {
      const r = d(make({ ruleset, classes: [{ id: 'artificer', level: 1 }], scores: { int: 16 } }));
      expect(r.casters[0]).toMatchObject({ ability: 'int', preparedLimit: 3, cantripsKnown: 2, maxSpellLevel: 1, list: 'artificer' });
      expect(r.slots.map((x) => x.max)).toEqual([2]);
      for (const id of ARTIFICER_SPELL_LIST) expect(db.spells.get(id)?.classes, id).toContain('artificer');
      expect(db.spells.get('fireball')?.classes).not.toContain('artificer');
      const cls = db.classes.get('artificer')!;
      const kit = [...cls.startingFixed, ...cls.startingEquipment.flatMap((group) => group.options.flatMap((option) => option.items))];
      for (const item of kit.filter((x) => !x.itemId.startsWith('@'))) expect(db.items.has(item.itemId), item.itemId).toBe(true);
      expect(r.proficiencies.tools).toContain("Thieves' tools");
      const multi = d(make({ ruleset, classes: [{ id: 'artificer', level: 3 }, { id: 'wizard', level: 1 }] }));
      expect(multi.casterLevel).toBe(3);
      expect(multi.slots.map((x) => x.max)).toEqual([4, 2]);
    });

    it('applies specialist spells, infusion limits, and tiered class resources', () => {
      const alchemist = (level: number) => d(make({ ruleset, classes: [{ id: 'artificer', level, sub: sub('alchemist') }] }));
      expect(alchemist(3).spells.find((x) => x.spellId === 'healing-word')?.alwaysPrepared).toBe(true);
      expect(alchemist(5).spells.find((x) => x.spellId === 'acid-arrow')?.alwaysPrepared).toBe(true);
      expect([3, 6, 15].map((level) => alchemist(level).resources.find((x) => x.id === 'experimental-elixir')?.max)).toEqual([1, 2, 3]);
      const armorer = d(make({ ruleset, classes: [{ id: 'artificer', level: 9, sub: sub('armorer') }] }));
      expect(armorer.resources.find((x) => x.id === 'infused-items')?.max).toBe(5);
      expect(armorer.proficiencies.armor).toContain('Heavy armor');
      expect([10, 14, 18].map((level) => alchemist(level).attunement.limit)).toEqual([4, 5, 6]);
      expect(alchemist(13).casters[0].cantripsKnown).toBe(3);
      expect(alchemist(14).casters[0].cantripsKnown).toBe(4);
    });

    it('offers replacement proficiencies for duplicate specialist tools and Royal Envoy', () => {
      for (const [specialist, tool, featureId] of [
        ['alchemist', "Alchemist's supplies", 'alchemist-tool-proficiency'],
        ['armorer', "Smith's tools", 'tools-of-the-trade'],
        ['artillerist', "Woodcarver's tools", 'artillerist-tool-proficiency'],
        ['battle-smith', "Smith's tools", 'battle-smith-tool-proficiency'],
      ]) {
        const c = make({ ruleset, classes: [{ id: 'artificer', level: 3, sub: sub(specialist) }], choices: {
          'class:artificer:tools': [tool],
          [`subclass:${sub(specialist)}:${featureId}:replacement-tool`]: ["Brewer's supplies"],
        } });
        const r = d(c);
        expect(r.proficiencies.tools).toEqual(expect.arrayContaining([tool, "Brewer's supplies"]));
        expect(r.choices.find((choice) => choice.key.endsWith('replacement-tool'))?.def.optional).toBe(true);
      }
      const r = d(make({ ruleset, background: ruleset === 'dnd5e-2014' ? 'noble' : 'merchant', classes: [{ id: 'fighter', level: 7, sub: sub('purple-dragon-knight') }], choices: {
        [`subclass:${sub('purple-dragon-knight')}:royal-envoy:replacement-skill`]: ['insight'],
      } }));
      expect(r.skills.persuasion.prof).toBe(2);
      expect(r.skills.insight.prof).toBe(1);
      expect(r.choices.find((choice) => choice.key.endsWith('replacement-skill'))?.def.optional).toBe(true);
    });

    it('applies Infiltrator benefits only with active armor and removes them for Guardian', () => {
      const c = make({ ruleset, classes: [{ id: 'artificer', level: 3, sub: sub('armorer') }], equip: ['scale-mail'], choices: {
        [`subclass:${sub('armorer')}:armor-model:model`]: ['infiltrator'],
      } });
      expect(d(c).speed.walk.value).toBe(30);
      c.combat.toggles['infiltrator-armor'] = true;
      expect(d(c).speed.walk.value).toBe(35);
      expect(d(c).skills.stealth.advantage).toHaveLength(1);
      expect(d(c).skills.stealth.disadvantage).toHaveLength(1);
      expect(d(c).skills.stealth.mode).toBe('normal');
      c.inventory[0].equipped = false;
      expect(d(c).speed.walk.value).toBe(30);
      expect(d(c).skills.stealth.advantage).toHaveLength(0);
      c.inventory[0].equipped = true;
      c.choices[`subclass:${sub('armorer')}:armor-model:model`] = ['guardian'];
      expect(d(c).speed.walk.value).toBe(30);
      expect(d(c).skills.stealth.advantage).toHaveLength(0);
    });

  });

  describe('ruleset-specific additions', () => {
    it('keeps legacy Conjure Barrage damage at every cast level in both databases', () => {
      for (let level = 3; level <= 9; level++) {
        expect(db.spells.get('conjure-barrage')?.damage?.bySlot?.[level]).toBe('3d8');
        expect(db24.spells.get('conjure-barrage')?.damage?.bySlot?.[level]).toBe('3d8');
      }
    });

    it('translates all Shadar-kai crossbow training without modifying 2014 grants', () => {
      for (const [oldId, newId] of [['crossbow-light', 'light-crossbow'], ['crossbow-hand', 'hand-crossbow'], ['crossbow-heavy', 'heavy-crossbow']]) {
        for (const ruleset of ['dnd5e-2014', 'dnd5e-2024'] as const) {
          const c = make({ ruleset, race: 'shadar-kai', classes: [{ id: 'wizard', level: 1 }], equip: [ruleset === 'dnd5e-2014' ? oldId : newId], choices: {
            'race:shadar-kai-trance:proficiencies': [`trance-${oldId}`],
          } });
          expect(d(c).attacks.find((attack) => attack.kind === 'weapon')?.proficient).toBe(true);
        }
      }
    });

    it('replaces legacy cleric damage features with the Blessed Strikes selection', () => {
      for (const subclass of db24.subclassesFor('cleric').filter((s) => s.id.endsWith('-legacy-2024'))) {
        expect(subclass.features.filter((f) => ['Divine Strike', 'Potent Spellcasting'].includes(f.name))).toEqual([]);
      }
      for (const [subclass, legacyFeature] of [['death', 'Divine Strike'], ['arcana', 'Potent Spellcasting']]) {
        expect(db.subclasses.get(subclass)?.features.some((f) => f.name === legacyFeature)).toBe(true);
        const c = make({ ruleset: 'dnd5e-2024', classes: [{ id: 'cleric', level: 8, sub: `${subclass}-legacy-2024` }], equip: ['mace'], choices: {
          'class:cleric:cleric-blessed-strikes:strikes': ['bs-divine-strike'],
        } });
        expect(d(c).attacks[0].riders.filter((rider) => rider.label === 'Divine Strike')).toHaveLength(1);
        c.choices['class:cleric:cleric-blessed-strikes:strikes'] = ['bs-potent'];
        expect(d(c).attacks[0].riders.filter((rider) => rider.label === 'Divine Strike')).toHaveLength(0);
      }
    });

    it('recognizes Shadar-kai as elves for Elven Accuracy', () => {
      const c = make({ race: 'shadar-kai' });
      expect(checkPrerequisite(db.feats.get('elven-accuracy')!.prerequisite, c, d(c)).ok).toBe(true);
      const reborn = make({ race: 'reborn' });
      expect(checkPrerequisite(db.feats.get('elven-accuracy')!.prerequisite, reborn, d(reborn)).ok).toBe(false);
    });
    it('supports both legal flexible origin splits without allowing a +3 racial increase', () => {
      for (const race of ['shadar-kai', 'reborn']) {
        const build = (split: string[]) => d(make({ race, choices: { 'race:asi': split } }));
        expect(build(['dex', 'dex', 'con']).abilities.dex.score).toBe(12);
        expect(build(['dex', 'con', 'wis']).abilities.wis.score).toBe(11);
        expect(build(['dex', 'dex', 'dex']).abilities.dex.score).toBe(12);
      }
    });

    it('uses background ability increases, not legacy racial increases, in 2024', () => {
      for (const race of ['half-elf', 'shadar-kai', 'reborn']) {
        const r = d(make({ ruleset: 'dnd5e-2024', race, background: 'soldier', choices: {
          'background:asi': ['str', 'str', 'con'], 'race:asi': ['cha', 'cha', 'wis'], 'race:asi-1': ['dex', 'wis'],
        } }));
        expect(r.abilities.str.score).toBe(12);
        expect(r.abilities.con.score).toBe(11);
        expect(r.abilities.cha.score).toBe(10);
        expect(r.abilities.wis.score).toBe(10);
      }
    });

    it('gates 2024 legacy features at level 3 without changing their 2014 definitions', () => {
      const build = (level: number) => d(make({ ruleset: 'dnd5e-2024', classes: [{ id: 'warlock', level, sub: 'hexblade-legacy-2024' }] }));
      expect(build(2).features.some((x) => x.def.id === 'hex-warrior')).toBe(false);
      expect(build(3).features.some((x) => x.def.id === 'hex-warrior')).toBe(true);
      expect(d(make({ classes: [{ id: 'warlock', level: 1, sub: 'hexblade' }] })).features.some((x) => x.def.id === 'hex-warrior')).toBe(true);
      expect(db24.subclasses.has('totem-warrior-legacy-2024')).toBe(false);
      expect(db24.subclasses.has('evocation-legacy-2024')).toBe(false);
      expect(db24.subclasses.has('wild-heart-2024')).toBe(true);
      expect(db24.subclasses.has('evoker-2024')).toBe(true);
      const arcana = db24.subclasses.get('arcana-legacy-2024')!;
      expect(arcana.spells?.filter((block) => block.level === 3)).toHaveLength(1);
      expect(arcana.spells?.[0].spells).toEqual(expect.arrayContaining(['detect-magic', 'magic-missile', 'magic-weapon', 'arcanists-magic-aura']));
      const monk = d(make({ ruleset: 'dnd5e-2024', classes: [{ id: 'monk', level: 11, sub: 'long-death-legacy-2024' }] }));
      expect(monk.features.find((x) => x.def.id === 'mastery-of-death')?.resourceId).toBe('focus');
      expect(monk.resources.find((x) => x.id === 'focus')?.max).toBe(11);
    });

    it('offers the 2024 Aasimar transformation only from level 3 and derives its flight toggle', () => {
      const c = make({ ruleset: 'dnd5e-2024', race: 'aasimar', classes: [{ id: 'fighter', level: 2 }], choices: {
        'race:celestial-revelation:form': ['heavenly-wings'],
      } });
      expect(d(c).resources.some((x) => x.id === 'celestial-revelation')).toBe(false);
      c.classes[0].level = 3;
      c.combat.toggles['heavenly-wings'] = true;
      const r = d(c);
      expect(r.resources.find((x) => x.id === 'celestial-revelation')?.max).toBe(1);
      expect(r.speed.fly.value).toBe(r.speed.walk.value);
      expect(r.resistances.map((x) => x.type)).toEqual(expect.arrayContaining(['necrotic', 'radiant']));
      expect(r.spells.some((x) => x.spellId === 'light')).toBe(true);
    });
  });
  it('has no unresolved references', () => {
    const warnings = issues.filter((i) => i.level === 'warning');
    expect(warnings, JSON.stringify(warnings.slice(0, 40), null, 1)).toEqual([]);
  });
  it('covers 13 classes and expanded subclass/race lists', () => {
    expect(db.classes.size).toBe(13);
    expect(db.subclasses.size).toBe(114);
    expect(db.races.size).toBe(30);
    expect(db.backgrounds.size).toBeGreaterThanOrEqual(13);
    expect(db.spells.size).toBeGreaterThanOrEqual(319);
    expect(db.items.size).toBeGreaterThan(500);
  });
  it('every class has at least one subclass', () => {
    for (const c of db.classes.values()) expect(db.subclassesFor(c.id).length, c.id).toBeGreaterThan(0);
  });
});
