# Grimoire 5e — D&D 5e Character Builder & Manager

An offline-first, browser-only character builder and play companion for **Dungeons & Dragons 5th Edition**, supporting both the **2014** and the **2024** rules.
No backend, no account, no tracking: characters live in your browser (IndexedDB) and can be exported as JSON.
Deployable to GitHub Pages or any static host.

---

## Features

- **Guided creation wizard** (11 steps): identity, race/subrace, class, subclass, background, ability scores, proficiencies & choices, equipment, spells, details, review. Each step shows its status (done, still to do, or optional). Drafts are autosaved, and you can move back and forth freely or reopen the wizard later.
- **Ability scores**: 27-point buy (live budget and validation), standard array (assign/swap), 3d6 and 4d6-drop-lowest. Rolling shows individual dice, greys out the dropped die, and supports unlimited rerolls, per-score rerolls, locking and reassignment. Manual entry is also available. Base scores are kept separate from bonuses.
- **Rules engine with explanations**: every derived number has a breakdown (“why is my AC 17?”). This covers abilities, saves, skills (proficiency, expertise, Jack of All Trades, Remarkable Athlete), passive scores, initiative, AC (competing calculation methods; the best valid one wins and they never stack), HP, speed modes, senses, resistances, immunities, vulnerabilities, carrying capacity and push/drag/lift, attacks, spell DC and spell attack.
- **Combat dashboard / session view**: quick damage (typed, with resistance/immunity/vulnerability, temp HP first, massive-damage death, damage at 0 HP), healing, temp HP (non-stacking), Hit Dice, death saves (nat 20 / nat 1 rules), all 14 conditions plus exhaustion with their mechanical effects, inspiration, concentration, and temporary buffs (Bless, Haste, Shield, Mage Armor, cover…).
- **Resources and rests**: Rage, Ki, Bardic Inspiration (recharge changes at level 5), Channel Divinity, Wild Shape, Superiority Dice, Sorcery Points, Lay on Hands, Arcane Recovery and many more. Each uses its real recharge rule (short / long / dawn / none) and can have its maximum overridden for house rules. Short and long rests restore exactly what the rules say, item charges recharge at dawn with a dice roll, and Pact Magic is tracked separately.
- **Spellbook**: searchable spell browser filtered by **class list**. The default is your class’s list including subclass extras; you can switch to another class’s list or all spells. Spells outside your list are labelled “not a Cleric spell” but can still be added for homebrew. Also filters by level, school, casting time, concentration and ritual. Tracks known, prepared, always-prepared (domain/oath/circle), spellbook, innate/racial, feat and feature spells, plus favourites. A cast dialog spends a regular slot, a pact slot or an innate use, rolls attack/damage/healing, and tracks concentration. It also handles Flexible Casting (sorcery points ↔ slots) and Arcane Recovery.
- **Spell slots**: full, half (rounded up when single-class), third and Pact Magic progressions, plus the PHB multiclass spellcaster table.
- **Inventory**: equip with **slot rules** (one suit of armor; two hands for weapons and shields, so a Two-Handed weapon uses both; two rings). Equipping something that doesn’t fit unequips the conflicting item and says which. Also attunement (limit enforced), quantities, charges, consumables (potions roll their healing), currency with coin weight, standard or variant encumbrance, containers (Bag of Holding contents don’t count), sorting and filtering.
- **Fuzzy item search**: tolerates typos (`longswrod`), matches word fragments (`long sw`), aliases (`lockpicks`, `healing potion`), categories, properties (`finesse`), rarity (`legendary ring`) and magic/mundane filters.
- **Add New Item editor**: start from any existing item as a template or from scratch. Edit every field (weapon, armor, magic, charges, curse, attunement restrictions, image) and save as a reusable template, add it to the inventory, or both.
- **Structured effect builder** (no code, no JSON): passive modifiers (AC, attack, damage, extra damage dice, ability bonus or “set to”, saves, skills, checks, initiative, speeds, senses, resistances and immunities, advantage/disadvantage, HP, spell DC/attack, crit range…) and triggered effects (on hit / on crit / on attack / on use / **when you heal a creature** / **when you revive a creature** / when damaged…). Outcomes can **apply a spell’s effect** (e.g. Blade Ward or Death Ward) to the affected creature or to yourself. Items can also **grant spells** (e.g. Revivify once per long rest, or spells paid for with item charges). Triggered effects support saving throws with a fixed DC, your spell DC or a formula, failure and success outcomes, once-per-turn, limited uses with recharge, and duration. Anything the engine can’t resolve is shown as a **manual effect**, never silently dropped.
- **Features & feats**: grouped feature list (class, subclass, chosen options, feats, racial, background, custom) with uses, recharge and a “Use” button that rolls its dice. Also covers fighting styles, invocations, metamagic, maneuvers, pact boons, runes, arcane shots, elemental disciplines and totem spirits, with prerequisite checks.
- **Progression**: XP tracking with thresholds, or milestone. The level-up wizard picks the class (with multiclass prerequisite checks), sets HP (average / roll / manual), previews new features and makes choices. Level-down removes the last level safely, and a per-level HP history is editable.
- **Notes & journal**: backstory/personality, campaign notes, session log, quests (with status), NPCs, locations, factions, party, goals, relationships, secrets, treasure.
- **Character sheet view**: one dense page containing everything on the official 3-page sheet, printable or saveable as PDF.
- **Custom content library**: structured editors for items, spells, feats, features, races, classes, subclasses, backgrounds, languages and proficiencies. Each can be duplicated, deleted (with “in use” warnings), exported and imported.
- **Dice roller**: d4–d100, any expression (`2d6+1d4+3`), advantage/disadvantage, crits (double dice), roll history with individual faces. Every number on the sheet is a quick-roll button.
- **Responsive**: phone (bottom tab bar, large touch targets), tablet, laptop, and large/4K displays (wider layout, scaled type). Dark (charcoal) and light (parchment) themes.
- **Offline**: a service worker precaches everything after the first visit; the app is also installable as a PWA.

## Rulesets and content coverage

Every character is created for one ruleset: **2014** (`dnd5e-2014`) or **2024** (`dnd5e-2024`). The two are never mixed. Each ruleset has its own content database (species/races, classes, subclasses, backgrounds, feats, spells, items), so a 2024 character only ever sees 2024 options. The ruleset is fixed after creation because 2014 and 2024 content use different ids. To convert a character, duplicate it and rebuild it.

What changes with **2024 rules** (`src/engine/rules.ts` plus the 2024 content):
- **Origin:** ability increases come from the **background** (+2/+1 or +1/+1/+1 among its three abilities), along with an **Origin feat** (e.g. Magic Initiate (Cleric) for the Acolyte, with the spell list preset). You get Common + 2 languages of your choice. Species give no ability increases.
- **Weapon Mastery:** Barbarian, Fighter, Paladin, Ranger and Rogue pick weapons by class table. Attack rows show the mastery property (Sap, Topple, Vex…) for mastered weapons.
- **Feats by category:** Ability Score Improvements offer general feats. Fighting Styles are feats, and level 19 is an **Epic Boon** (its ability increase can go up to 30).
- **Exhaustion:** −2 per level to every d20 test and −5 ft speed per level; level 6 is death.
- **Rests:** a long rest restores **all** Hit Dice. Resources such as Rage, Channel Divinity, Wild Shape and Second Wind regain one use on a short rest.
- **Spellcasting:** prepared-spell counts come from the class tables. Paladins and Rangers cast from level 1, and half casters round up in multiclassing.
- **Proficiencies:** Rogues are proficient with martial weapons that have Finesse or Light, and Monks with martial weapons that have Light. The Martial Arts die starts at d6.

**2014 content**

| Content | Count | Source |
|---|---|---|

| Content | Count | Source |
|---|---|---|
| Classes | 12 | SRD 5.1 text + structured progression |
| Subclasses | 99 (every subclass listed in the spec) | 12 with SRD text; the rest are original mechanical summaries |
| Races / species | 28 (all races listed in the spec, plus Custom Lineage) with subraces | SRD races with SRD text; others are summaries |
| Backgrounds | 14 (13 listed + Custom) | Acolyte is SRD; others are summaries |
| Feats | 58 | Grappler is SRD; others are summaries |
| Spells | 319 SRD + 34 referenced non-SRD (summary only) | SRD 5.1 |
| Items | 728 total: 237 mundane, 332 SRD magic items, 159 generated +1/+2/+3 weapons, armor, shields and ammunition | SRD 5.1 |

**2024 content**

| Content | Count | Source |
|---|---|---|
| Classes | 12, progression generated from the SRD 5.2 class tables | SRD 5.2 text + structured mechanics |
| Subclasses | 48 (all PHB 2024 subclasses) | 12 with SRD 5.2 text; 36 original summaries |
| Species | 9 with lineages, ancestries and legacies | SRD 5.2 |
| Backgrounds | 16 | 4 SRD 5.2 (Acolyte, Criminal, Sage, Soldier); 12 summaries |
| Feats | 10 origin, 37 general, 10 fighting style, 7 epic boons | SRD 5.2 + summaries |
| Spells | 339 SRD 5.2 + referenced summaries | SRD 5.2 |
| Items | 579 (mundane with Weapon Mastery, magic items, +N variants) | SRD 5.2 |

**Licensing.** SRD 5.1 and SRD 5.2 material © Wizards of the Coast LLC is used under
[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode). The SRD data conversion is based on
[5e-bits/5e-database](https://github.com/5e-bits/5e-database) (MIT; copy in `vendor/srd-5e-database/LICENSE.md`).
Non-SRD options (PHB 2014/2024, XGtE, TCoE, VGtM, MotM, ERLW, EEPC, SCAG, FTD, MOoT, VRGtR) are **not** reproduced. They are represented as structured mechanics (feature levels, uses, modifiers) with brief original descriptions, tagged with their book, so the app stays legally distributable. If you own the books, you can paste the full text into custom content. Dungeons & Dragons is a trademark of Wizards of the Coast; this is unofficial fan content.

**Not a complete database.** Many published items, spells and options are missing. The Library lets you add whatever you need.

## Running, building, deploying

```bash
npm install
npm run dev          # local dev server
npm test             # unit/integration tests (Vitest)
npm run build        # regenerates SRD content (if vendor data present), typechecks, builds static files to dist/
npm run preview      # serve dist/ locally
npm run screenshots  # end-to-end smoke test + screenshots at mobile/tablet/laptop/4K using installed Chrome
```

**GitHub Pages**: `.github/workflows/pages.yml` runs the tests, builds and deploys on every push to `main`.
One-time setup: in the repository, go to *Settings → Pages → Build and deployment → Source* and choose **GitHub Actions**.
The build uses a relative base path (`./`) and hash routing, so it works under `https://<user>.github.io/<repo>/` without configuration.
Any other static host also works: just upload `dist/`.

## How local storage works

- **IndexedDB** (`grimoire5e` database) has three stores: `characters` (one record per character), `content` (custom content records keyed `kind:id`), and `meta`. The app asks the browser for persistent storage.
- **Autosave**: every change is saved after about 350 ms. The header shows *Saved / Saving… / Save failed — retrying*. Pending saves are flushed when the tab is hidden or closed. Failures (for example a full quota) are reported with guidance, and saving is retried.
- **Fallback**: if IndexedDB is unavailable, the app uses localStorage. If that is unavailable too (strict private mode), it uses memory and shows a warning.
- **Preferences** (theme, dice options) live in localStorage.
- Portraits are downscaled to 320 px WebP/JPEG (about 30–80 KB) before storing.

## Import / export

- **Character export** (JSON envelope: `format`, `kind`, `schemaVersion`, `contentSchemaVersion`, `appVersion`) **includes the custom content the character depends on** (custom race, class, subclass, background, feats, spells and item templates). Inventory items are self-contained snapshots anyway.
- **Content export / import** for custom definitions (single item, a category, or everything).
- **Full backup** of all characters and custom content.
- **Import is validated before anything is written**: JSON syntax, envelope, schema version (newer → refused with a clear message), migrations, structural validation (types, ranges, classes, abilities, inventory, choices) and content-record validation. You get a preview with conflict options (import as copy / overwrite / skip; keep or overwrite differing custom content). Unknown fields are **preserved** in `extra`, not discarded.
- **Schema versioning**: `CHARACTER_SCHEMA_VERSION` (currently 1). `src/io/migrations.ts` holds step-by-step migrations (v0 pre-release → v1 included and tested). Stored characters are migrated on load.

## Architecture

```
src/
  types/          core vocabulary (abilities, skills, conditions…), content & character schemas
  engine/         rules engine: derive.ts (pure Character+Content → Derived with breakdowns),
                  formula.ts (safe expression evaluator — no eval), spellSlots.ts, abilityGen.ts,
                  actions.ts (damage/heal/rests/death saves…), inventory.ts (instance semantics),
                  conditions.ts, prereq.ts, factory.ts
  dice/           dice parser/roller, advantage resolution, seeded/scripted RNG for tests
  content/        registry.ts (bundled + custom merge), validate.ts, index.ts,
                  srd/*.json (generated), data/*.ts (classes, subclasses, races, feats, pools…)
  persistence/    IndexedDB / localStorage / memory stores
  io/             export/import envelopes, schema validation & normalization, migrations
  search/         fuzzy search (Damerau-Levenshtein, prefixes, aliases, keywords)
  state/          zustand store: autosave, custom content, rolls, toasts, prefs
  ui/             React components, wizard, views and tabs, styles
scripts/          SRD conversion, screenshot/smoke test
tests/            Vitest suites
vendor/           upstream SRD JSON (data only) used by the conversion script
```

Key principles:

- **Characters store choices, not results.** The engine recomputes everything. Choices are keyed by a stable path (for example `class:fighter:fighter-fighting-style:style`), so content features gain and lose effects automatically as levels change, and the sheet never drifts out of sync.
- **Data-driven content.** Classes, subclasses, races, feats and items are plain data built from `FeatureDef`, `Grants`, `ChoiceDef`, `Effect`/`Modifier` and `ResourceDef`. The UI contains no class-specific logic (a few well-known flags such as Jack of All Trades are interpreted by the engine). Adding a subclass means adding data.
- **Stacking rules.** Effects with the same id/name don’t stack (DMG “combining game effects”). AC calculation methods compete instead of stacking. Advantage and disadvantage never stack, and cancel each other out. Ability increases from ASIs and feats are capped at the ability maximum, while “set to” effects (belts, headbands) apply afterwards.
- **Conditional modifiers** (“vs. undead”, “while in dim light”) are shown in breakdowns as *situational*, never auto-applied.

## The item / effect system

- `ItemDefinition` holds general fields plus optional `weapon`, `armor`, `charges`, `consumable`, `attunement`, curse and `effects[]`.
- `Effect` has an `activation` (equipped / attuned / carried / toggle / always), and either continuous `modifiers[]` or a `trigger` (on-hit, on-crit, on-use…) with `save` or `outcomes`, plus optional `uses`, `oncePerTurn` and `manual`.
- `Modifier` has a `target` from a closed, validated list (`ac`, `attack`, `save:dex`, `skill:stealth`, `resistance:fire`, `ac-formula`, `ability-set:str`, …), an `op` (add / set / max / advantage / disadvantage / grant), a numeric value or safe **formula** (`prof`, `cha`, `cl`, `max(1, wis)`, `steps(cl, 1, 2, 9, 3)`), an attack `scope`, `requires` (armored, no shield…) and an optional free-text `condition`.
- **Safety**: formulas go through a tiny hand-written parser that only knows arithmetic, a whitelist of functions and whitelisted variables. User content never runs as code (no `eval`, no `Function`).
- **Copy semantics.** Adding an item to a character stores a **snapshot** of its definition in that inventory entry. Editing the template later never changes existing copies; the inventory shows a “modified” badge and offers an explicit **Re-sync from template**, which keeps quantity, equipped state, attunement and charges. Editing an inventory entry changes only that entry. The editor always states which of the two you’re editing.

Example: **Reviving Hands** (very rare gloves): Spells → Revivify, 1/long rest. Triggered effect “When you heal a creature → apply Blade Ward’s effect”, plus “When you revive a creature → apply Death Ward’s effect”. The Overview lists both under *Effects to remember*. When you cast a healing or revival spell, the cast dialog shows them, with *Apply to me* for self-targeting.

Another example: the **Holy Banana +1 Dagger** is built from the Dagger template: magical, +1/+1, plus a triggered effect *On hit → STR save DC 15 → on failure: knocked prone*. The attack row shows the rider with its DC.

## Adding custom content

Use the **Library** (top nav) to create, edit, duplicate, export or import custom content. From a character you can also:
- add an item from a template (**Inventory → Add New Item…**),
- add a custom feature or grant a bonus feat (**Features → Add custom feature**),
- add a spell from another source (**Spellbook → Add other spell**),
- add manual proficiencies, resistances and overrides (**Abilities & Skills / Character Settings**).

Content packs can be shared as JSON (`kind: "content"` envelope). Custom content lives in its own store and is never overwritten when bundled data updates.

## Testing

`npm test` runs 127 tests (2014 and 2024) covering ability modifiers, point buy, standard array, dice generation (3d6 / 4d6 drop lowest, advantage, crits, halfling luck), proficiency progression, skills, expertise, JoAT, saves, initiative, AC (armor, Unarmored Defense, Draconic Resilience, shields, magic, stacking, overrides), HP and hit dice (rolled/average, multiclass, Tough, Dwarven Toughness), spell DC/attack, slot tables (full/half/third, multiclass, Pact Magic), class progression and subclass unlocking (including Twilight Domain levels 1/2/6), racial traits (Drow, Variant Human, Half-Elf), equipment and attacks (finesse, proficiency, Archery, Dueling, Rage, Martial Arts, Sneak Attack scaling, STR requirement), attunement limits, item effect activation/removal, conditions and exhaustion, rests, consumables, custom template/instance isolation, fuzzy search, import/export validation, migrations, content integrity (no broken references in bundled data) and persistence (IndexedDB via fake-indexeddb).

`npm run screenshots` drives the built app in Chrome. It creates a character through the wizard, takes damage and heals, adds items via fuzzy search, creates a custom item from a template, rests, rolls dice and reloads to verify persistence. It then visits every tab at 375 px, 820 px, 1280 px, 1440 px and 2560 px, checking for console errors and horizontal overflow.

## Implementation status

**Complete**
- Character CRUD (create, rename, duplicate, delete with typed confirmation), list with summary, autosave with status/error display, offline use, PWA.
- Creation wizard; all four ability generation methods plus manual entry; every identity and personality field; portrait.
- Races, subraces and traits; classes 1–20 with features, resources, ASIs and choices; subclass feature unlocking; multiclassing (prerequisites, reduced proficiencies, hit dice by class, multiclass spell slots, Pact Magic separate).
- Derived stats with breakdowns; manual overrides; combat tracking; conditions; rests; dice roller with history.
- Spellbook management, slots, Flexible Casting, Arcane Recovery, concentration tracking.
- Inventory, encumbrance (standard/variant), attunement, charges, consumables, currency.
- Fuzzy item search; Add New Item editor (template or scratch); structured effect builder; template/instance copy semantics with re-sync.
- Custom content editors for all kinds; import/export/backup with validation, conflict handling and migrations.
- Notes and journal; printable sheet; responsive layouts; dark/light themes.

**Partial** (works with a manual fallback; nothing is silently ignored)
- Many non-SRD subclass and racial features are descriptive or manual where they need table context (e.g. Wild Shape stat blocks, Beast Master companion stats, Echo Knight echo, Wild Magic surge tables). Uses and recharges are still tracked.
- Some magic items keep only their description (no structured effect) when their mechanics are situational. 104 items carry structured effects (plus the +N items' built-in bonuses); magic weapons and armor get base stats automatically, with a note when a base had to be assumed (e.g. “any sword” → Longsword, editable).
- 2024: Cunning Strike, Brutal Strike, Weapon Mastery effects and many subclass features are shown with their rules text but resolved manually; their uses and recharges are tracked. Non-SRD 2024 subclass descriptions are brief summaries.
- Situational bonuses that add dice to d20 rolls (Bless, Bardic Inspiration, Guidance) are listed with the roll result rather than rolled automatically.
- Starting equipment “any martial weapon” placeholders are resolved with dropdowns; the bundle choice for Cleric’s “warhammer (if proficient)” is not proficiency-checked.
- Wizard “Spells” step lists spells to add; spells for higher-level characters created directly at level > 1 must be picked manually up to the shown limits (the limits and warnings are computed).
- Metric units: only a preference stub (rules values remain imperial).

**Not yet implemented**
- Converting an existing character between rulesets (create a new one instead).
- Companion/familiar/summon stat blocks and mounted combat tracking.
- Artificer class (not in the requested list; the `half-up` progression is implemented for when it’s added as custom content).
- Cloud sync (intentionally out of scope: no backend).

## Known limitations

- Browser storage can be cleared by the browser or the user. Export backups regularly; the Settings page shows storage usage and persistence status.
- Data is per browser and origin: a GitHub Pages URL and `localhost` have separate storage.
- The bundled description text of non-SRD content is intentionally brief.
