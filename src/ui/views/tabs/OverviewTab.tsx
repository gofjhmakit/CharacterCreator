import { useUnits } from '@/ui/units';
import { useDb } from '@/ui/ruleset';
import { useState } from 'react';
import type { TabProps } from '../CharacterView';
import { ABILITIES, ABILITY_NAMES, signed, type Ability } from '@/types/core';
import { HpPanel, ConditionsPanel, ResourcesPanel, TogglesPanel, SlotsPanel, AttacksPanel, RestButtons, QuickEffectsPanel, SavesMini, DefensesPanel } from '../panels';
import { useRoller } from '../../components/roll';
import { Modal, BreakdownView } from '../../components/common';
import { useApp } from '@/state/store';
import { SpellDetailModal } from '../../components/spells';
import { TriggerReminder } from './SpellsTab';
import { CompanionsPanel } from '../Companions';
import type { SpellDef } from '@/types/content';
import { href } from '../../router';

export function AbilityBoxes({ d }: { d: TabProps['d'] }) {
  const roller = useRoller();
  const [info, setInfo] = useState<Ability | null>(null);
  return (
    <>
      <div className="abil-grid">
        {ABILITIES.map((a) => (
          <div key={a} className={`abil ${d.checks[a].mode === 'advantage' ? 'adv-dot' : d.checks[a].mode === 'disadvantage' ? 'dis-dot' : ''}`} role="button" tabIndex={0} title={`Roll ${ABILITY_NAMES[a]} check`}
            onClick={() => roller.d20(`${ABILITY_NAMES[a]} check`, d.checks[a], 'check', { halflingLucky: d.flags.has('halfling-lucky') })}
            onKeyDown={(e) => { if (e.key === 'Enter') roller.d20(`${ABILITY_NAMES[a]} check`, d.checks[a]); }}>
            <div className="name">{ABILITY_NAMES[a].slice(0, 3)}</div>
            <div className="mod">{signed(d.abilities[a].mod)}</div>
            <button className="score ghost" style={{ minHeight: 0, padding: '0 8px' }} onClick={(e) => { e.stopPropagation(); setInfo(a); }} aria-label={`${ABILITY_NAMES[a]} score breakdown`}>{d.abilities[a].score}</button>
          </div>
        ))}
      </div>
      {info && <Modal title={`${ABILITY_NAMES[info]} ${d.abilities[info].score}`} onClose={() => setInfo(null)} size="narrow">
        <BreakdownView b={{ total: d.abilities[info].score, parts: d.abilities[info].parts }} unit=" " />
        <p className="small muted" style={{ marginTop: 8 }}>Maximum {d.abilities[info].max}. Modifier {signed(d.abilities[info].mod)}.</p>
        <hr /><BreakdownView b={d.checks[info]} title="Ability check" />
      </Modal>}
    </>
  );
}

export function StatStrip({ d, ch }: Pick<TabProps, 'd' | 'ch'>) {
  const roller = useRoller();
  const [show, setShow] = useState<null | 'ac' | 'init' | 'speed' | 'pp'>(null);
  const un = useUnits();
  const other = (['fly', 'swim', 'climb', 'burrow'] as const).filter((m) => d.speed[m].value > 0);
  return (
    <>
      <div className="stat-strip">
        <div className="stat clickable" onClick={() => setShow('ac')}><span className="label">Armor Class</span><span className="value">{d.ac.total}</span><span className="sub">{d.ac.override !== undefined ? 'override' : d.ac.formula.replace(/\s*\(.*\)/, '')}</span></div>
        <div className={`stat clickable ${d.initiative.mode === 'advantage' ? 'adv' : d.initiative.mode === 'disadvantage' ? 'dis' : ''}`} onClick={() => roller.d20('Initiative', d.initiative, 'initiative', { halflingLucky: d.flags.has('halfling-lucky') })} onContextMenu={(e) => { e.preventDefault(); setShow('init'); }} title="Click to roll; right-click for breakdown"><span className="label">Initiative</span><span className="value">{signed(d.initiative.total)}</span><span className="sub">roll</span></div>
        <div className="stat clickable" onClick={() => setShow('speed')}><span className="label">Speed</span><span className="value">{un.u === 'metric' ? un.dist(d.speed.walk.value).replace(' m', '') : d.speed.walk.value}</span><span className="sub">{other.length ? other.map((m) => `${m} ${un.dist(d.speed[m].value)}`).join(', ') : un.short}</span></div>
        <div className="stat"><span className="label">Proficiency</span><span className="value">{signed(d.profBonus)}</span></div>
        <div className="stat clickable" onClick={() => setShow('pp')}><span className="label">Passive Perc.</span><span className="value">{d.passives.perception.total}</span><span className="sub">Inv {d.passives.investigation.total} · Ins {d.passives.insight.total}</span></div>
        <div className="stat"><span className="label">Hit Dice</span><span className="value" style={{ fontSize: '1.2rem' }}>{d.hitDice.map((h) => `${h.total - h.used}d${h.die}`).join(' ')}</span><span className="sub">remaining</span></div>
      </div>
      {show === 'ac' && <Modal title="Armor Class" onClose={() => setShow(null)} size="narrow">
        <BreakdownView b={{ total: d.ac.total, parts: d.ac.parts, conditional: d.ac.conditional }} unit=" " />
        <hr /><div className="caps">Calculation methods</div>
        {d.ac.candidates.map((c) => <div key={c.label} className="row between small"><span>{c.active ? '● ' : '○ '}{c.label}</span><span>{c.valid ? c.value : `n/a (${c.reason})`}</span></div>)}
        <p className="small muted" style={{ marginTop: 8 }}>Only the best valid base calculation applies; they never stack.{ch.settings.overrides.ac !== undefined && ' A manual AC override is set in Character Settings.'}</p>
      </Modal>}
      {show === 'init' && <Modal title="Initiative" onClose={() => setShow(null)} size="narrow"><BreakdownView b={d.initiative} /></Modal>}
      {show === 'speed' && <Modal title="Speed" onClose={() => setShow(null)} size="narrow">
        {(['walk', 'fly', 'swim', 'climb', 'burrow'] as const).filter((m) => m === 'walk' || d.speed[m].value > 0).map((m) => <div key={m} style={{ marginBottom: 10 }}><BreakdownView b={{ total: d.speed[m].value, parts: d.speed[m].parts }} title={m} unit=" ft" /></div>)}
      </Modal>}
      {show === 'pp' && <Modal title="Passive scores" onClose={() => setShow(null)} size="narrow">
        <BreakdownView b={d.passives.perception} title="Passive Perception" unit=" " /><hr />
        <BreakdownView b={d.passives.investigation} title="Passive Investigation" unit=" " /><hr />
        <BreakdownView b={d.passives.insight} title="Passive Insight" unit=" " />
      </Modal>}
    </>
  );
}

function QuickSpells({ ch, d }: Pick<TabProps, 'ch' | 'd'>) {
  const [detail, setDetail] = useState<SpellDef | null>(null);
  const favs = d.spells.filter((s) => s.favorite || (s.prepared && (s.spell?.level ?? 0) > 0) || s.kind === 'cantrip' || s.kind === 'innate').filter((s) => s.spell);
  if (!favs.length) return null;
  const sorted = [...favs].sort((a, b) => Number(b.favorite) - Number(a.favorite) || (a.spell!.level - b.spell!.level) || a.spell!.name.localeCompare(b.spell!.name)).slice(0, 16);
  return (
    <div className="panel">
      <div className="panel-title"><h3>Spells at hand</h3><span className="spacer" /><a className="small" href={href('c', ch.id, 'spells')}>Spellbook →</a></div>
      <div className="list">
        {sorted.map((s) => (
          <div key={s.key} className="list-row clickable" onClick={() => setDetail(s.spell!)}>
            <span className="grow">{s.favorite && '★ '}{s.spell!.name}{s.spell!.concentration && <span className="badge" style={{ marginLeft: 4 }}>C</span>}</span>
            <span className="small muted">{s.spell!.level === 0 ? 'cantrip' : `lvl ${s.spell!.level}`}{s.uses ? ` · ${s.uses.max - s.uses.used}/${s.uses.max}` : ''}</span>
          </div>
        ))}
      </div>
      {detail && <SpellDetailModal spell={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

export function OverviewTab(p: TabProps) {
  const { ch, d } = p;
  const db = useDb();
  void db;
  return (
    <div className="stack lg">
      <StatStrip d={d} ch={ch} />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', alignItems: 'start' }}>
        <div className="stack lg">
          <HpPanel {...p} />
          <ConditionsPanel {...p} />
          <RestButtons {...p} />
        </div>
        <div className="stack lg">
          <AttacksPanel ch={ch} d={d} compact />
          <SavesMini d={d} />
          <AbilityBoxes d={d} />
        </div>
        <div className="stack lg">
          <ResourcesPanel {...p} />
          <SlotsPanel {...p} />
          <TogglesPanel {...p} />
          <QuickEffectsPanel ch={ch} set={p.set} />
          {(ch.companions?.length ?? 0) > 0 && <CompanionsPanel ch={ch} d={d} set={p.set} />}
          <QuickSpells ch={ch} d={d} />
          <DefensesPanel d={d} />
          {d.triggers.length > 0 && <div className="panel stack"><div className="panel-title"><h3>Effects to remember</h3><span className="badge manual">triggered</span></div>{d.triggers.map((t, i) => <TriggerReminder key={i} r={t} set={p.set} />)}</div>}
          {d.manual.length > 0 && <div className="panel"><div className="panel-title"><h3>Manual effects</h3><span className="badge manual">apply yourself</span></div>{d.manual.map((m, i) => <div key={i} className="small" style={{ marginBottom: 4 }}><b>{m.name}</b>: {m.description}</div>)}</div>}
          {d.warnings.length > 0 && <div className="panel"><div className="panel-title"><h3>Rules notes</h3></div><ul className="warnings">{d.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>}
        </div>
      </div>
    </div>
  );
}
