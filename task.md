# D&D 5e Character Builder & Manager
## Implementation Specification (`task.md`)

## 1. Project Overview

Build a fully featured, browser-based Dungeons & Dragons 5th Edition character creation and character management application.

This is not a digital copy of a paper character sheet. It should be a complete character companion for creating, maintaining, and using characters during actual D&D sessions. It must combine a guided character creator with a practical, information-dense character sheet and integrated game mechanics.

The application must prioritize, in this order:

1. Rules accuracy and reliable calculations.
2. Data integrity and safe persistence.
3. Usability during actual play.
4. Complete character creation and progression workflows.
5. Responsive, polished visual design.

Do not build a visually impressive mock-up with non-functional controls. Every visible control must work, or be clearly marked as not yet implemented.

## 2. Inspect the Existing Project First

Before changing files or implementing features:

1. Inspect the entire project structure and identify the current technology stack.
2. Locate and inspect the supplied default D&D character sheet PDF in the project folder.
3. Treat that PDF as inspiration and an absolute minimum checklist for character-sheet information, not as a layout constraint.
4. Identify existing reusable code, conventions, assets, build tooling, and deployment configuration.
5. Record the findings and propose a practical implementation plan.
6. Preserve useful existing infrastructure. Do not replace working project structure without a clear reason.

Do not assume the PDF contains everything needed. The finished application should go substantially beyond it.

## 3. Hosting and Technical Constraints

The application must run entirely in the browser and be deployable to GitHub Pages or equivalent static hosting.

Hard requirements:

- No Node.js backend or other application server.
- No server-side database.
- No authentication service.
- No backend API required for core functionality.
- No runtime dependency on third-party services.
- No external API required to create, view, edit, calculate, save, import, or export characters.
- The application must work offline after its static assets and content have been loaded.
- An existing build tool may be used if appropriate, but the deployed output must be static files.

Use an appropriate client-side architecture. IndexedDB is preferred for character data, custom content, and larger local datasets. LocalStorage may be used for small preferences. Consider a service worker/PWA approach if it fits the existing project and can be implemented reliably.

### 3.1 Persistence and character management

Implement:

- Automatic saving whenever character data changes.
- Multiple independent characters.
- Character list/selection screen.
- Create, rename, duplicate, and delete character operations.
- Confirmation before destructive deletion.
- Useful character summary information in the character list.
- Clear indication of unsaved/error states if persistence fails.
- No dependence on a network connection for editing existing characters.

### 3.2 Import and export

Implement:

- Export one character as JSON.
- Import a character from JSON.
- Export/import custom item definitions and reusable item templates.
- Include custom content needed by an exported character, or preserve stable references and package the dependencies.
- Validate imported data before modifying stored data.
- Handle malformed, unsupported, or corrupted files with understandable errors.
- Version the data schema.
- Implement migration functions for older schema versions.
- Avoid silently discarding unknown fields or unsupported content.
- Provide a full backup/export option for all characters and user-created content if practical.

Exported characters must be portable between supported browsers and installations.

## 4. Ruleset and Content Policy

Use traditional 2014 D&D 5e rules as the primary baseline. Keep the architecture sufficiently flexible to support the 2024 ruleset later. Clearly identify which ruleset a character uses and avoid silently mixing rules from different versions.

The application must distinguish between:

- Rules mechanics and calculation logic.
- Content definitions (races/species, classes, subclasses, spells, items, feats, etc.).
- Character-specific selections and state.
- User-created/custom content.
- UI presentation.

Use legally usable rules references and content sources. Do not reproduce proprietary sourcebook text wholesale. Include content that can legally be distributed, and design the content system so users can add their own material. Do not claim that the database contains every published D&D item or option unless that is demonstrably true. Document the coverage and sources of bundled content.

Do not require external content services. The bundled content database must work locally.

## 5. Character Creation Wizard

Create a polished, multi-step character creation wizard that guides the user without overwhelming them.

Suggested steps:

1. Character identity.
2. Race/species.
3. Class.
4. Subclass, when applicable.
5. Background.
6. Ability scores.
7. Skills and proficiencies.
8. Equipment and starting inventory.
9. Spells and spellcasting configuration.
10. Personality and character details.
11. Review and create.

Requirements:

- Show useful descriptions and mechanical consequences for choices.
- Validate choices and prerequisites.
- Allow navigation backwards without losing progress.
- Allow choices to be edited after character creation.
- Clearly distinguish mandatory selections from optional choices.
- Do not grant features before their required level.
- Support manual choices where the rules or table conventions require a DM decision.

### 5.1 Character identity and details

Include:

- Character name.
- Player name.
- Character level.
- Experience points.
- Race/species and subrace/variant.
- Class, subclass, and class-level distribution.
- Background.
- Alignment.
- Age, height, and weight.
- Size.
- Appearance.
- Personality traits.
- Ideals.
- Bonds.
- Flaws.
- Backstory.
- Languages.
- Deity.
- Campaign notes.
- Portrait/avatar (optional local image support, with sensible storage limits).

All relevant fields must remain editable after creation.

## 6. Races and Species

Provide a broad, extensible selection of commonly played 2014-era D&D 5e races, subraces, and variants. The following is a baseline coverage list, not a claim that every option is part of the SRD:

- Human and Variant Human.
- Elf: High Elf, Wood Elf, Drow.
- Dwarf: Hill Dwarf, Mountain Dwarf.
- Halfling: Lightfoot, Stout.
- Half-Elf.
- Half-Orc.
- Gnome: Forest Gnome, Rock Gnome.
- Tiefling.
- Dragonborn.
- Aasimar.
- Genasi.
- Goliath.
- Firbolg.
- Tabaxi.
- Kenku.
- Tortle.
- Goblin.
- Hobgoblin.
- Bugbear.
- Kobold.
- Orc.
- Yuan-ti.
- Lizardfolk.
- Triton.
- Changeling.
- Warforged.
- Shifter.

Include commonly used variants and subraces where content can legally be provided. Allow custom races/species to be added through structured content definitions.

### 6.1 Race mechanics

Race/species selection must apply the appropriate mechanical traits, including where relevant:

- Ability score increases or flexible ability bonuses according to the selected ruleset.
- Size.
- Base walking speed and alternative movement speeds.
- Darkvision and other senses.
- Languages.
- Skill proficiencies.
- Weapon, armor, and tool proficiencies.
- Resistances and immunities.
- Innate spellcasting.
- Special movement modes.
- Other racial features and resource uses.

All granted features must appear in the character's feature list and be available to relevant calculations. Avoid applying the same effect twice.

## 7. Classes and Subclasses

Implement the standard 12 classes:

- Barbarian.
- Bard.
- Cleric.
- Druid.
- Fighter.
- Monk.
- Paladin.
- Ranger.
- Rogue.
- Sorcerer.
- Warlock.
- Wizard.

Each class must have structured progression data, not merely descriptive text.

### 7.1 Class progression data

Support:

- Hit dice.
- Starting hit points and hit point progression.
- Saving throw proficiencies.
- Skill choices and selection limits.
- Armor, weapon, and tool proficiencies.
- Starting equipment.
- Spellcasting type and progression.
- Class features and feature unlock levels.
- Ability Score Improvements.
- Extra Attack.
- Fighting Styles.
- Expertise.
- Class-specific resources and recovery rules.
- All other relevant class mechanics.

### 7.2 Subclass coverage

Provide a broad baseline of commonly played subclasses. Keep subclass definitions independent and data-driven so additional subclasses can be added without changing the core application.

Examples to support where legally usable content is available:

**Barbarian:** Berserker, Totem Warrior, Ancestral Guardian, Zealot, Storm Herald, Wild Magic.

**Bard:** Lore, Valor, Glamour, Swords, Whispers, Eloquence.

**Cleric:** Life, Light, War, Tempest, Knowledge, Nature, Trickery, Death, Forge, Grave, Order, Peace, Twilight.

**Druid:** Land, Moon, Dreams, Shepherd, Spores, Stars, Wildfire.

**Fighter:** Champion, Battle Master, Eldritch Knight, Samurai, Cavalier, Arcane Archer, Echo Knight, Rune Knight, Psi Warrior.

**Monk:** Open Hand, Shadow, Four Elements, Drunken Master, Kensei, Mercy, Astral Self, Ascendant Dragon.

**Paladin:** Devotion, Ancients, Vengeance, Crown, Conquest, Redemption, Glory, Watchers.

**Ranger:** Hunter, Beast Master, Gloom Stalker, Horizon Walker, Monster Slayer, Fey Wanderer, Swarmkeeper.

**Rogue:** Thief, Assassin, Arcane Trickster, Mastermind, Swashbuckler, Inquisitive, Scout, Phantom, Soulknife.

**Sorcerer:** Draconic Bloodline, Wild Magic, Storm Sorcery, Shadow Magic, Divine Soul, Aberrant Mind, Clockwork Soul.

**Warlock:** Archfey, Fiend, Great Old One, Celestial, Hexblade, Fathomless, Genie, Undead.

**Wizard:** Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation, War Magic, Bladesinging, Order of Scribes.

This list is not exhaustive. Make it possible to add further subclasses and variants through content data.

### 7.3 Actual feature integration

Subclass and class features must be functional mechanical features, not just text descriptions.

For example, a Twilight Cleric must gain the appropriate features at the correct class levels, and applicable features must be represented in the character sheet with their uses, resources, effects, and descriptions.

Unlock features automatically at the correct levels. Do not grant features prematurely. Support selectable options and choices required by class progression.

## 8. Ability Scores

Implement all three common ability score generation methods.

### 8.1 Point Buy

- Standard 27-point buy.
- Correct point costs.
- Standard minimum and maximum values.
- Live remaining-point counter.
- Ability to redistribute points.
- Clear validation.

### 8.2 Standard Array

Provide the standard array: 15, 14, 13, 12, 10, 8.

Allow assignment to the six abilities. Each value may be assigned only once. Make reassignment easy.

### 8.3 Manual rolling

Allow the user to choose:

- 3d6.
- 4d6, drop the lowest.

Requirements:

- Generate six scores.
- Show individual die results.
- Show the discarded die when using 4d6 drop lowest.
- Allow unlimited full rerolls.
- Allow individual score rerolls.
- Allow users to lock scores they want to keep.
- Allow assignment/reassignment of generated scores to abilities.
- Never force the user to accept a result.
- Keep a clear distinction between rolled base scores and later bonuses.

### 8.4 Ability calculations

Automatically calculate and update:

- Ability modifiers.
- Saving throw modifiers.
- Skill modifiers.
- Initiative.
- Spellcasting ability.
- Spell save DC.
- Spell attack bonus.
- Carrying capacity.
- Push, drag, and lift capacity.
- Passive Perception.
- Other relevant derived values.

Apply bonuses from race/species, feats, class features, items, and temporary effects correctly.

## 9. Skills, Proficiencies, and Saving Throws

Include all six ability scores and all standard skills:

- Acrobatics.
- Animal Handling.
- Arcana.
- Athletics.
- Deception.
- History.
- Insight.
- Intimidation.
- Investigation.
- Medicine.
- Nature.
- Perception.
- Performance.
- Persuasion.
- Religion.
- Sleight of Hand.
- Stealth.
- Survival.

Implement:

- Proficiency bonus by total character level.
- Skill proficiency.
- Expertise.
- Saving throw proficiency.
- Jack of All Trades.
- Passive skill calculations.
- Custom proficiencies.
- Advantage/disadvantage indicators.
- Temporary bonuses and penalties.
- Correct handling of overlapping sources and conditional modifiers.

## 10. Combat and Character Statistics

Create a clear combat dashboard suitable for use during a live session.

Include:

- Armor Class.
- Initiative.
- Speed and other movement modes.
- Maximum HP.
- Current HP.
- Temporary HP.
- Hit Dice by class.
- Death Saving Throws.
- Inspiration.
- Proficiency Bonus.
- Conditions.
- Exhaustion.
- Resistances.
- Immunities.
- Vulnerabilities.
- Damage reduction.
- Attacks and attack modifiers.
- Spell attacks.
- Relevant defensive and offensive features.

### 10.1 Combat tracking actions

Provide quick controls for:

- Taking damage.
- Healing.
- Adding/removing temporary HP.
- Spending Hit Dice.
- Rolling death saving throws.
- Tracking death save successes and failures.
- Adding/removing conditions.
- Managing exhaustion.
- Short rests.
- Long rests.

Rest actions must restore resources according to their actual recovery rules. Do not assume every resource refreshes on a long rest. Implement resource-specific recovery behavior and allow manual adjustment when the DM uses house rules.

### 10.2 Conditions

Include all standard conditions:

- Blinded.
- Charmed.
- Deafened.
- Frightened.
- Grappled.
- Incapacitated.
- Invisible.
- Paralyzed.
- Petrified.
- Poisoned.
- Prone.
- Restrained.
- Stunned.
- Unconscious.

Allow multiple simultaneous conditions. Show concise rules descriptions and make active conditions easy to see during play.

## 11. Spellbook and Spell Management

Spell management is a core feature, not an afterthought.

### 11.1 Spell database

Include a locally available, searchable spell database with structured fields:

- Spell name.
- Spell level.
- School of magic.
- Casting time.
- Range.
- Components (V, S, M).
- Material component details.
- Duration.
- Concentration.
- Ritual.
- Attack/save type.
- Damage type.
- Classes that can access the spell.
- Description.
- Higher-level effects.
- Relevant tags and source information.

Use legally distributable spell content. Provide the data architecture for user-added spells and additional content packs.

### 11.2 Spellbook functionality

Users must be able to:

- Browse and search spells.
- Filter by name, level, school, class, concentration, ritual, and casting time.
- Add and remove spells from a character.
- Mark spells as prepared.
- Mark always-prepared spells.
- Track known spells.
- Track spellbook spells.
- Manage cantrips.
- Manage spells granted by race, feats, subclasses, and features.
- Favorite frequently used spells.
- Open a detailed spell view quickly during play.

Clearly distinguish between:

- Known spells.
- Prepared spells.
- Always-prepared spells.
- Spellbook spells.
- Innate/racial spells.
- Spells granted by feats or features.

Respect class-specific spell acquisition and preparation rules.

### 11.3 Spell slots and resources

Calculate spell slots from class, subclass, level, and multiclass rules.

Support:

- Spell slots by level.
- Used and available slots.
- Pact Magic.
- Sorcery Points.
- Flexible Casting.
- Arcane Recovery.
- Other class-specific spell resources.
- Short-rest and long-rest recovery where applicable.

Make consuming and restoring slots straightforward. Do not conflate Pact Magic slots with ordinary spell slots.

## 12. Equipment, Inventory, and Item Database

Implement a comprehensive equipment and inventory system. It must support standard equipment, magic items, consumables, and completely custom items.

### 12.1 Bundled item database

Provide as comprehensive a local database as legally practical, organized as structured content.

Include:

**Weapons**
- Simple and martial weapons.
- Melee and ranged weapons.
- Ammunition.
- Weapon variants and relevant properties.

**Armor**
- Light, medium, and heavy armor.
- Shields.
- Relevant variants.

**Adventuring gear**
- Tools and kits.
- Musical instruments.
- Packs and containers.
- Clothing.
- Camping and exploration equipment.
- Utility and miscellaneous items.

**Consumables**
- Potions.
- Poisons.
- Scrolls.
- Oils.
- Food.
- Ammunition and other consumable items.

**Magic items**
- Common.
- Uncommon.
- Rare.
- Very Rare.
- Legendary.
- Artifact.

Include commonly used magical weapons, armor, shields, rings, amulets, wands, rods, staffs, potions, wondrous items, and other categories where legally distributable content is available.

Support:
- Attunement requirements and restrictions.
- Charges and maximum charges.
- Recharge mechanics.
- Curses.
- Activation requirements.
- Limited uses.
- Passive effects.
- Item-specific notes.

Do not falsely claim complete coverage of all published sourcebooks. Clearly document bundled content coverage and allow users to add their own content.

### 12.2 Fuzzy item search

The inventory's item search must support fuzzy matching and useful suggestions.

Examples:

- `dag` should suggest `Dagger`.
- `long sw` should suggest `Longsword`.
- `healing pot` should suggest `Potion of Healing`.
- `plate` should suggest `Plate Armor`.

Search should support:

- Partial names.
- Minor spelling mistakes.
- Word fragments and multiple terms.
- Alternative names and aliases.
- Item categories and types.
- Item properties.
- Rarity.
- Magical/non-magical filtering.

Search must run locally. Results should show useful identifying information such as category, rarity, damage, AC, weight, and key properties. Ranking should prioritize close name matches while still finding relevant items by alias or property.

### 12.3 Add New Item editor

Provide a dedicated **Add New Item** workflow.

Users must be able to:

1. Search for an existing item.
2. Select an existing item as a template.
3. Automatically populate the editor with the template's properties.
4. Modify any populated properties.
5. Save the result as a new custom item.
6. Add the new item to the current character's inventory.

Users must also be able to create an item from scratch without choosing a template.

The editor should make it obvious whether the user is editing a reusable custom item definition or an individual item instance in a character's inventory.

### 12.4 General custom item fields

Support editing:

- Item name.
- Item category.
- Item type.
- Description.
- Rarity.
- Weight.
- Value/cost.
- Quantity (for inventory instances).
- Magical/non-magical status.
- Attunement requirement.
- Attunement restrictions.
- Source.
- Tags.
- Custom notes.
- Icon or optional image, if supported by the existing design.

### 12.5 Weapon properties

Support:

- Damage dice.
- Damage type.
- Attack bonus.
- Damage bonus.
- Weapon properties.
- Range and long range.
- Versatile damage.
- Critical-hit effects.
- Proficiency requirements.
- Ability score used for attacks.
- Additional damage.
- Magical status and bonuses.

### 12.6 Armor properties

Support:

- Armor category.
- Base AC.
- Dexterity modifier rules and maximum.
- Strength requirement.
- Stealth disadvantage.
- Shield bonus.
- Additional AC modifiers.
- Magical bonuses.
- Other relevant properties.

### 12.7 Magic item properties

Support:

- Magical bonuses.
- Resistances.
- Immunities.
- Special abilities.
- Charges and maximum charges.
- Recharge conditions.
- Activation requirements.
- Limited uses.
- Attunement requirements and restrictions.
- Curses.
- Passive and conditional effects.
- Custom magical effects.

### 12.8 Structured custom effect builder

Custom items must be capable of affecting actual game mechanics, not merely displaying descriptive text.

Build a user-friendly effect editor using selectable controls and fields. Users must not need to write code or manually edit JSON.

Support effect types such as:

- Attack bonuses.
- Damage bonuses.
- AC bonuses.
- Ability score bonuses.
- Skill bonuses.
- Saving throw bonuses.
- Movement bonuses.
- Resistances.
- Immunities.
- Advantage/disadvantage.
- Additional damage.
- Conditional effects.
- On-hit effects.
- On-use effects.
- Passive effects.
- Limited-use abilities.

Support configurable:

- Trigger.
- Target.
- Conditions.
- Saving throw ability.
- Saving throw DC.
- Fixed or character-stat-based DC.
- Success outcome.
- Failure outcome.
- Duration.
- Uses and recharge.
- Once-per-turn restrictions.
- Resource consumption.

Example triggers:

- On attack.
- On hit.
- On critical hit.
- When taking damage.
- When using the item.
- Passive while equipped.
- Once per turn.
- Once per short rest.
- Once per long rest.

Example outcomes:

- Apply damage of a selected type.
- Grant a bonus or penalty.
- Require a saving throw.
- Apply a condition.
- Knock a target prone.
- Restore or consume a resource.
- Apply an effect for a defined duration.

Example custom item:

**Holy Banana +1 Dagger**
- Base item: Dagger.
- Magical: Yes.
- Attack bonus: +1.
- Damage bonus: +1.
- Trigger: When hitting a creature with this weapon.
- Target: Creature hit.
- Saving throw: Strength.
- DC: 15 (or a configurable calculated DC).
- Failure: Target is knocked prone.
- Description: A suspiciously holy banana-shaped dagger.

Other examples:
- **Flaming Longsword:** Based on Longsword, +1 attack and damage, plus 1d6 fire damage on hit.
- **Ring of Unnecessarily Good Luck:** Ring granting advantage on a selected category of checks, with configurable usage limits.

These are examples of the flexibility required, not hardcoded special cases.

### 12.9 Effect engine safety and correctness

Use a controlled, validated effect model with explicitly supported triggers, targets, conditions, and mechanical operations.

**Never execute arbitrary JavaScript, eval, or user-provided code** to implement custom item effects.

If an effect cannot be resolved automatically, show it clearly as a manual effect and provide its description. Never silently ignore an unsupported effect.

Keep effect definitions separate from character base statistics. Conditional or equipment-dependent effects must only apply when their conditions are met.

### 12.10 Custom item definitions and inventory instances

Custom item definitions must be stored independently from the base database.

Users must be able to:

- Edit custom item definitions.
- Duplicate them.
- Rename them.
- Delete them, with appropriate warnings if in use.
- Create multiple variants of the same base item.
- Save reusable templates.
- Add saved templates to other characters.
- Export and import custom item definitions.

Each character inventory entry must have its own instance data, including:

- Quantity.
- Equipped status.
- Attunement status.
- Current charges.
- Instance-specific notes.
- Instance-specific modifications and state.

Editing a reusable template must not unexpectedly alter existing inventory instances. Define and implement clear copy/reference semantics.

### 12.11 Inventory management

Implement:

- Equipped and unequipped items.
- Attuned magic items.
- Quantity.
- Weight.
- Currency: CP, SP, EP, GP, PP.
- Total carried weight.
- Carrying capacity.
- Optional encumbrance rules.
- Item descriptions and notes.
- Custom items.
- Consumable usage and quantity decrement.
- Item sorting, filtering, and searching.

When an item is equipped, apply relevant effects and update attacks, AC, resistances, and other derived values. When unequipped, remove equipment-dependent effects. Enforce or warn about attunement limits and requirements.

### 12.12 Equipment calculations

**Weapons:** Calculate attack bonuses and damage using ability scores, proficiency, weapon properties, and applicable class/item features. Support finesse, versatile, two-handed, light, heavy, reach, thrown, loading, ammunition, and other relevant properties.

**Armor:** Calculate AC using armor type, base AC, Dexterity rules, shields, Unarmored Defense, and alternative class features. Avoid stacking incompatible AC calculation methods. Clearly show which calculation is active.

## 13. Feats and Character Features

Create a dedicated feature management section.

Include structured support for:

- Class features.
- Subclass features.
- Racial features.
- Background features.
- Feats.
- Fighting Styles.
- Eldritch Invocations.
- Metamagic options.
- Maneuvers.
- Channel Divinity options.
- Other selectable features.

Each feature should support:

- Name.
- Description.
- Source.
- Required level.
- Prerequisites.
- Activation type.
- Usage limitations.
- Recharge conditions.
- Resource consumption.
- Mechanical effects.
- User choices/options.

Implement resource trackers for limited-use features, including examples such as Rage, Bardic Inspiration, Channel Divinity, Lay on Hands, Second Wind, Action Surge, Ki, Sorcery Points, Wild Shape, Superiority Dice, and other class-specific resources.

Calculate maximum uses and recharge behavior where the rules are known. Allow manual adjustment for table-specific rules.

## 14. Level Progression and Multiclassing

Support character levels 1–20.

Implement:

- XP tracking and level thresholds.
- Manual level advancement.
- Progression guidance.
- Hit point increases.
- Proficiency bonus progression.
- Class and subclass feature unlocking.
- Ability Score Improvements.
- Feat selection.
- Spell progression.
- Resource progression.
- Level-down or correction workflow without corrupting character data.

### 14.1 Multiclassing

Support multiclass characters and class-level distribution, for example Fighter 5 / Wizard 3.

Implement:

- Multiclass prerequisites.
- Combined proficiency calculations.
- Hit dice by class.
- Spell slot calculations.
- Class-specific feature progression.
- Spellcasting ability by class.
- Multiclass spellcasting rules.
- Equipment and proficiency rules.
- Clear display of total character level and individual class levels.

Do not calculate multiclass spellcasting by simply adding class levels indiscriminately. Implement the relevant 5e rules for full, half, and third casters and Pact Magic separately.

## 15. Backgrounds, Languages, and Customization

Include commonly used backgrounds, where legally usable:

- Acolyte.
- Charlatan.
- Criminal.
- Entertainer.
- Folk Hero.
- Guild Artisan.
- Hermit.
- Noble.
- Outlander.
- Sage.
- Sailor.
- Soldier.
- Urchin.

Backgrounds should grant their relevant proficiencies, languages, equipment, and features.

Support custom backgrounds, languages, tools, and proficiencies. Keep background data structured and extensible.

## 16. Notes, Journal, and Campaign Information

Provide a character-focused notes section with:

- Backstory.
- Session notes.
- Quest log.
- Important NPCs.
- Locations.
- Factions.
- Party information.
- Character goals.
- Relationships.
- Secrets.
- Treasure and discoveries.

This is a character management application, not a full campaign management system. Keep these tools focused on information relevant to the individual character. All notes must save locally.

## 17. Integrated Dice Roller

Include a dice roller supporting:

- d4.
- d6.
- d8.
- d10.
- d12.
- d20.
- d100.

Features:

- Multiple dice.
- Modifiers.
- Advantage.
- Disadvantage.
- Ability checks.
- Saving throws.
- Skill checks.
- Attack rolls.
- Damage rolls.
- Critical hits.
- Roll history.

Provide quick-roll actions from relevant character-sheet fields. For example, selecting Strength (Athletics) should roll the correct d20 and modifier.

Advantage and disadvantage must follow D&D rules, including the rule that multiple sources of advantage/disadvantage do not stack into multiple dice. Show individual dice results and the final calculation.

## 18. User Interface and Visual Design

Create a professionally designed modern fantasy RPG companion application.

The design should feel intentional, polished, and suitable for a serious tabletop RPG player. Avoid a generic AI-generated dashboard aesthetic.

Avoid:
- Generic purple gradients.
- Excessive rounded cards.
- Random glowing effects.
- Unnecessary glassmorphism.
- Excessive decorative icons.
- Repetitive card grids where a table or compact list is more useful.
- Decorative fantasy elements that reduce readability.

### 18.1 Visual direction

Use a restrained palette and coherent design system. Possible direction:

- Deep charcoal.
- Warm parchment.
- Muted gold.
- Dark bronze.
- Subtle forest green.
- Carefully selected accent colors.

Use typography with a clear hierarchy. Fantasy styling should be subtle and intentional. Prioritize legibility, density, and fast access to information.

### 18.2 Responsive design

The application must work properly on:

- Mobile phones.
- Small and large tablets.
- 13-inch MacBook displays.
- Standard desktop monitors.
- Large 32-inch 4K displays.

Do not merely scale down the desktop layout. Design mobile navigation and interaction intentionally.

Mobile:
- Prioritize essential character information.
- Use accessible navigation.
- Avoid horizontal scrolling.
- Use collapsible sections/tabs where appropriate.
- Ensure touch targets are comfortable.
- Keep frequent combat actions easy to reach.

Desktop:
- Use available screen space intelligently.
- Use multi-column layouts where useful.
- Avoid excessively stretched text and controls on large displays.
- Maintain sensible maximum content widths and spacing.

Test several realistic viewport sizes, including narrow mobile, laptop, and 4K desktop dimensions.

## 19. Application Navigation and Character Views

Provide clear navigation between:

- Character Overview.
- Character Sheet.
- Abilities & Skills.
- Combat.
- Spellbook.
- Inventory.
- Features & Feats.
- Progression.
- Notes & Journal.
- Character Settings.

The overview should provide a useful snapshot of the character.

Frequently used information during actual gameplay must be accessible with minimal navigation. Consider a compact session/combat view that emphasizes HP, AC, initiative, attacks, spells, resources, conditions, and dice rolls.

## 20. Settings and Custom Rules

Provide configurable settings for:

- Ruleset version.
- Measurement units.
- Encumbrance rules.
- Optional rules.
- Manual stat overrides.
- House rules.
- Theme preferences.
- Dice preferences.

Allow users to create and manage custom:

- Races/species.
- Classes.
- Subclasses.
- Backgrounds.
- Feats.
- Spells.
- Items.
- Features.
- Languages and proficiencies.

Custom content must persist locally and survive normal application updates. Do not overwrite user-created content when updating bundled data.

## 21. Data Architecture

Keep the application modular and maintainable.

Separate at least:

1. Character data and character state.
2. Rules and calculation engine.
3. Bundled content database.
4. User-created content.
5. UI components.
6. Persistence.
7. Import/export and migrations.
8. Validation.
9. Dice and roll logic.

Use structured definitions for races, classes, subclasses, spells, items, feats, backgrounds, and features.

Do not hardcode individual race/class logic throughout UI components. Use reusable feature and modifier definitions wherever practical.

### 21.1 Modifier and effect system

Implement a reusable system capable of handling:

- Ability score bonuses.
- Proficiency bonuses.
- Skill bonuses.
- Saving throw bonuses.
- AC bonuses.
- Movement bonuses.
- Resistances.
- Immunities.
- Vulnerabilities.
- Advantage/disadvantage.
- Resource increases.
- Conditional bonuses.
- Equipment-dependent effects.
- Temporary effects.

Each effect should identify its source and conditions. The system must prevent accidental duplicate application and correctly handle effects that do not stack under the rules.

Keep base values, derived values, and temporary modifiers distinct. Provide a way to inspect why a calculated value has its current result (for example, AC breakdown or skill bonus breakdown).

### 21.2 Content data and extension

Content definitions should be data-driven and independently maintainable. Adding a subclass, spell, or item should not require editing unrelated UI code.

Use stable IDs for content references. Include source/version metadata where appropriate. Validate content definitions and handle missing references gracefully.

## 22. Quality Assurance and Testing

This application will be used during actual D&D sessions. Incorrect calculations can directly affect gameplay. Prioritize correctness over implementation shortcuts.

Implement automated tests for at least:

- Ability score modifiers.
- Point Buy costs and limits.
- Standard Array assignment.
- Dice generation methods.
- Proficiency bonus progression.
- Skill calculations.
- Expertise.
- Saving throws.
- Initiative.
- Armor Class calculations.
- Hit points and hit dice.
- Spell save DC.
- Spell attack bonuses.
- Spell slot progression.
- Pact Magic.
- Multiclass spellcasting.
- Class progression.
- Subclass feature unlocking.
- Racial feature application.
- Equipment calculations.
- Attunement limits.
- Item effect activation and removal.
- Conditions.
- Short-rest and long-rest recovery.
- Import/export validation.
- Data migration.
- Custom item template/instance isolation.
- Fuzzy search matching.

Test representative characters from different classes, including martial characters, spellcasters, subclasses with special mechanics, and multiclass characters.

Test responsive behavior and important user flows at multiple viewport sizes.

Do not silently ignore unsupported mechanics. Clearly identify incomplete implementations and provide a manual handling path where appropriate.

## 23. Development Workflow

Work incrementally and keep the application runnable throughout development.

Recommended order:

1. Inspect the project and supplied PDF.
2. Document the current architecture and implementation plan.
3. Establish core data models and stable IDs.
4. Implement rules calculation engine and automated tests.
5. Implement local persistence, schema versioning, and import/export.
6. Implement content database structure and validation.
7. Implement character creation wizard.
8. Implement races, classes, subclasses, and progression.
9. Implement core character sheet and combat.
10. Implement spellbook and spell resources.
11. Implement equipment database, fuzzy search, inventory, and custom item editor.
12. Implement structured effects and resource tracking.
13. Implement feats, features, and multiclassing.
14. Implement notes and customization.
15. Implement responsive UI and visual polish.
16. Complete integration and regression testing.
17. Verify static build and GitHub Pages deployment.

Do not leave non-functional placeholder controls in the finished application. If the full content scope is too large to complete in one pass, prioritize a robust architecture and fully functional representative coverage, document what is included, and make remaining content straightforward to add. Never represent an unimplemented feature as complete.

## 24. Documentation and Deliverables

Maintain a README explaining:

- Application functionality.
- Supported ruleset and known content coverage.
- Technical architecture.
- How to run locally.
- How to build.
- How to deploy to GitHub Pages.
- How local storage works.
- How import/export works.
- How to add custom content.
- How the item/effect system works.
- Known limitations.

Provide a clear implementation status list distinguishing completed, partial, and not-yet-implemented functionality.

## 25. Final Acceptance Criteria

The application is complete when:

- A user can create a D&D 5e character from scratch.
- The supplied PDF's core character information is represented, with substantial improvements.
- All major character statistics calculate automatically and can be inspected.
- Racial, class, and subclass features integrate with the character.
- Ability scores support Point Buy, Standard Array, 3d6, and 4d6 drop-lowest workflows.
- Skills, proficiencies, and saving throws work.
- Combat tracking and conditions work.
- Spellbooks, preparation/known spells, and spell slots work.
- Equipment and inventory management work.
- The item database includes a broad selection of ordinary and magical items that can legally be bundled.
- Fuzzy item search works locally.
- Users can create custom items from scratch or from existing item templates.
- Custom item effects can modify supported game mechanics through a safe structured effect editor.
- Custom items can be saved as reusable templates and added to multiple characters without unintended shared-instance changes.
- Feats, features, resources, and rests work.
- Character progression to level 20 works.
- Multiclassing is supported.
- Characters save automatically in the browser.
- Characters and custom content can be exported and imported with validation.
- Multiple characters can be managed independently.
- The application works without a backend and can be hosted on GitHub Pages.
- Existing characters remain editable offline after the application is loaded.
- The UI works on mobile, laptop, and large desktop/4K screens.
- Core game calculations and data workflows have automated tests.
- Documentation accurately describes implemented functionality and limitations.

**The goal is a genuinely usable, locally stored D&D 5e character builder and manager—not merely a visually impressive mock-up or a static digital character sheet. Functionality, rules accuracy, data integrity, extensibility, and usability during play take priority over decorative UI elements.**
