import { useRef, useState } from 'react';
import type { TabProps } from '../CharacterView';
import { useApp } from '@/state/store';
import { ALIGNMENTS, SIZES, RULESETS, titleCaseSize } from './charSettingsUtil';
import { Field, useConfirm } from '../../components/common';
import { PortraitInput } from '../../components/PortraitInput';
import { exportCharacter, downloadJson, safeFilename } from '@/io/exportImport';
import { go, href } from '../../router';
import { TagList } from './AbilitiesTab';
import { ABILITIES, DAMAGE_TYPES, CONDITION_IDS } from '@/types/core';
import type { Character } from '@/types/character';

const OVERRIDES: [keyof Character['settings']['overrides'], string][] = [['ac', 'Armor Class'], ['maxHp', 'Max HP'], ['initiative', 'Initiative'], ['speed', 'Walking speed'], ['passivePerception', 'Passive Perception'], ['spellDc', 'Spell save DC'], ['spellAttack', 'Spell attack'], ['profBonus', 'Proficiency bonus']];

export function CharSettingsTab({ ch, d, set }: TabProps) {
  const db = useApp((s) => s.db);
  const duplicate = useApp((s) => s.duplicate);
  const remove = useApp((s) => s.remove);
  const { ask, node } = useConfirm();
  const i = (k: keyof Character['identity'], label: string) => <Field label={label}><input value={String(ch.identity[k] ?? '')} onChange={(e) => set((c) => { (c.identity as Record<string, unknown>)[k] = e.target.value; })} /></Field>;
  const race = db.races.get(ch.race.raceId);
  const [showRaw] = useState(false);
  const ref = useRef(null);
  void ref; void showRaw;
  return (
    <div className="stack lg">
      <div className="panel stack">
        <h3>Identity</h3>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <PortraitInput value={ch.identity.portrait} onChange={(v) => set((c) => { c.identity.portrait = v; })} />
          <div className="grow stack">
            <div className="field-row">
              {i('name', 'Character name')}{i('playerName', 'Player name')}
              <Field label="Alignment"><select value={ch.identity.alignment} onChange={(e) => set((c) => { c.identity.alignment = e.target.value; })}><option value="">—</option>{ALIGNMENTS.map((a) => <option key={a}>{a}</option>)}</select></Field>
              <Field label="Size"><select value={ch.identity.size ?? ''} onChange={(e) => set((c) => { c.identity.size = (e.target.value || undefined) as Character['identity']['size']; })}><option value="">From race ({race?.size ?? 'medium'})</option>{SIZES.map((s) => <option key={s} value={s}>{titleCaseSize(s)}</option>)}</select></Field>
            </div>
            <div className="field-row">{i('age', 'Age')}{i('height', 'Height')}{i('weight', 'Weight')}{i('eyes', 'Eyes')}{i('skin', 'Skin')}{i('hair', 'Hair')}{i('gender', 'Gender / pronouns')}{i('deity', 'Deity')}</div>
          </div>
        </div>
      </div>

      <div className="panel stack">
        <h3>Origin</h3>
        <div className="field-row">
          <Field label="Race"><select value={ch.race.raceId} onChange={(e) => set((c) => { c.race = { raceId: e.target.value }; })}>{[...db.races.values()].sort((a, b) => a.name.localeCompare(b.name)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
          {race?.subraces?.length ? <Field label="Subrace"><select value={ch.race.subraceId ?? ''} onChange={(e) => set((c) => { c.race.subraceId = e.target.value || undefined; })}><option value="">—</option>{race.subraces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field> : null}
          <Field label="Background"><select value={ch.background.backgroundId} onChange={(e) => set((c) => { c.background.backgroundId = e.target.value; })}><option value="">—</option>{[...db.backgrounds.values()].sort((a, b) => a.name.localeCompare(b.name)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Ruleset"><select value={ch.ruleset} onChange={(e) => set((c) => { c.ruleset = e.target.value as Character['ruleset']; })}>{Object.entries(RULESETS).map(([k, v]) => <option key={k} value={k} disabled={!v.supported}>{v.name}</option>)}</select></Field>
        </div>
        <p className="small muted">Changing race or background keeps earlier choices stored but only applies those relevant to the new selection. Class levels are managed on the <a href={href('c', ch.id, 'progression')}>Progression</a> tab. You can reopen the <a href={href('new', ch.id)}>creation wizard</a> at any time.</p>
      </div>

      <div className="panel stack">
        <h3>Rules & house rules</h3>
        <div className="field-row">
          <Field label="Encumbrance"><select value={ch.settings.encumbrance} onChange={(e) => set((c) => { c.settings.encumbrance = e.target.value as 'standard'; })}><option value="standard">Standard (capacity only)</option><option value="variant">Variant encumbrance (speed penalties)</option><option value="off">Off</option></select></Field>
          <Field label="HP on level up"><select value={ch.settings.hpMethod} onChange={(e) => set((c) => { c.settings.hpMethod = e.target.value as 'average'; })}><option value="average">Average by default</option><option value="roll">Roll by default</option><option value="manual">Manual</option></select></Field>
          <Field label="Attunement limit"><input type="number" min={0} max={10} value={ch.settings.attunementLimit} onChange={(e) => set((c) => { c.settings.attunementLimit = Math.max(0, Number(e.target.value) || 0); })} /></Field>
        </div>
        <div className="row">
          <label className="check"><input type="checkbox" checked={ch.settings.optional.feats} onChange={(e) => set((c) => { c.settings.optional.feats = e.target.checked; })} />Feats</label>
          <label className="check"><input type="checkbox" checked={ch.settings.optional.multiclassing} onChange={(e) => set((c) => { c.settings.optional.multiclassing = e.target.checked; })} />Multiclassing</label>
          <label className="check"><input type="checkbox" checked={ch.settings.optional.multiclassPrereqs} onChange={(e) => set((c) => { c.settings.optional.multiclassPrereqs = e.target.checked; })} />Enforce multiclass prerequisites</label>
          <label className="check"><input type="checkbox" checked={!!ch.settings.optional.customOrigin} onChange={(e) => set((c) => { c.settings.optional.customOrigin = e.target.checked; })} />Customizing your origin (TCoE)</label>
        </div>
        <Field label="House rules / DM notes"><textarea rows={3} value={ch.settings.houseRules ?? ''} onChange={(e) => set((c) => { c.settings.houseRules = e.target.value; })} /></Field>
      </div>

      <div className="panel stack">
        <h3>Manual overrides</h3>
        <p className="small ink2">Override a calculated value when your DM rules differently. Leave empty to use the calculation. Overrides are shown in breakdowns.</p>
        <div className="field-row">
          {OVERRIDES.map(([k, label]) => (
            <Field key={k} label={label} hint={`Calculated: ${calc(d, k)}`}>
              <input type="number" value={ch.settings.overrides[k] ?? ''} placeholder="auto" onChange={(e) => set((c) => { if (e.target.value === '') delete c.settings.overrides[k]; else c.settings.overrides[k] = Number(e.target.value); })} />
            </Field>
          ))}
          <Field label="Max HP reduction" hint="e.g. from a wraith's touch"><input type="number" min={0} value={ch.combat.hpMaxReduction} onChange={(e) => set((c) => { c.combat.hpMaxReduction = Math.max(0, Number(e.target.value) || 0); })} /></Field>
        </div>
        <div className="grid cols-2">
          <div className="stack"><span className="section-label">Manual ability adjustments</span><div className="row">{ABILITIES.map((a) => <label key={a} className="row tight small">{a.toUpperCase()}<input type="number" className="num-sm" value={ch.custom.abilityBonuses[a] ?? 0} onChange={(e) => set((c) => { const v = Number(e.target.value) || 0; if (v) c.custom.abilityBonuses[a] = v; else delete c.custom.abilityBonuses[a]; })} /></label>)}</div></div>
          <TagList label="Extra resistances" values={ch.custom.resistances} suggestions={[...DAMAGE_TYPES]} onChange={(v) => set((c) => { c.custom.resistances = v; })} />
          <TagList label="Extra immunities" values={ch.custom.immunities} suggestions={[...DAMAGE_TYPES]} onChange={(v) => set((c) => { c.custom.immunities = v; })} />
          <TagList label="Vulnerabilities" values={ch.custom.vulnerabilities} suggestions={[...DAMAGE_TYPES]} onChange={(v) => set((c) => { c.custom.vulnerabilities = v; })} />
          <TagList label="Condition immunities" values={ch.custom.conditionImmunities} suggestions={[...CONDITION_IDS]} onChange={(v) => set((c) => { c.custom.conditionImmunities = v; })} />
        </div>
      </div>

      <div className="panel stack">
        <h3>Data</h3>
        <div className="row">
          <button onClick={() => downloadJson(`${safeFilename(ch.identity.name)}.json`, exportCharacter(ch, db))}>Export character (JSON)</button>
          <button onClick={() => { const id = duplicate(ch.id); if (id) go('c', id); }}>Duplicate</button>
          <button className="danger" onClick={async () => { if (await ask({ title: 'Delete character?', message: 'This cannot be undone. Export first if unsure.', confirmLabel: 'Delete', danger: true, requireText: ch.identity.name || undefined })) { await remove(ch.id); go(); } }}>Delete character</button>
        </div>
        <p className="small muted">Exports include any custom content this character depends on. Schema v{ch.schemaVersion} · id {ch.id}{ch.extra ? ` · preserved unknown fields: ${Object.keys(ch.extra).join(', ')}` : ''}</p>
      </div>
      {node}
    </div>
  );
}

function calc(d: TabProps['d'], k: string): string {
  switch (k) {
    case 'ac': return String(d.ac.parts.reduce((s, p) => s + p.value, 0));
    case 'maxHp': return String(d.hp.parts.reduce((s, p) => s + p.value, 0));
    case 'initiative': return String(d.initiative.parts.reduce((s, p) => s + p.value, 0));
    case 'speed': return String(d.speed.walk.value);
    case 'passivePerception': return String(d.passives.perception.parts.reduce((s, p) => s + p.value, 0));
    case 'spellDc': return d.casters[0] ? String(d.casters[0].dc.parts.reduce((s, p) => s + p.value, 0)) : '—';
    case 'spellAttack': return d.casters[0] ? String(d.casters[0].attack.parts.reduce((s, p) => s + p.value, 0)) : '—';
    case 'profBonus': return String(d.profBonus);
    default: return '';
  }
}
