// Dense one-page character sheet: covers every field of the official 2014 sheet (pages 1–3) and more. Print-friendly.
import type { TabProps } from '../CharacterView';
import { ABILITIES, ABILITY_NAMES, SKILLS, SKILL_IDS, signed } from '@/types/core';
import { useApp } from '@/state/store';
import { useRoller } from '../../components/roll';
import { titleCase } from '../../components/common';
import { lvlLabel } from '../../components/spells';

export function SheetTab({ ch, d }: TabProps) {
  const db = useApp((s) => s.db);
  const roller = useRoller();
  const race = db.races.get(ch.race.raceId);
  const sub = race?.subraces?.find((s) => s.id === ch.race.subraceId);
  const bg = db.backgrounds.get(ch.background.backgroundId);
  const spellsByLevel = new Map<number, typeof d.spells>();
  for (const s of d.spells) { const l = s.spell?.level ?? 0; spellsByLevel.set(l, [...(spellsByLevel.get(l) ?? []), s]); }
  const box = (label: string, value: React.ReactNode, sub?: React.ReactNode) => <div className="stat"><span className="label">{label}</span><span className="value" style={{ fontSize: '1.4rem' }}>{value}</span>{sub && <span className="sub">{sub}</span>}</div>;
  return (
    <div className="sheet stack">
      <div className="row no-print"><button onClick={() => window.print()}>Print / save as PDF</button><span className="small muted">Uses your browser’s print dialog.</span></div>
      <div className="panel">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          {[['Character name', ch.identity.name], ['Class & level', d.classLine], ['Background', bg?.name], ['Player name', ch.identity.playerName], ['Race', sub?.name ?? race?.name], ['Alignment', ch.identity.alignment], ['Experience points', ch.identity.milestone ? 'Milestone' : ch.identity.xp.toLocaleString()], ['Size', titleCase(d.size)]].map(([k, v]) => <div key={k as string}><div className="caps">{k}</div><div style={{ fontWeight: 700 }}>{v || '—'}</div></div>)}
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="stack">
          <div className="panel">
            <div className="row tight"><span className={`chip ${ch.combat.inspiration ? 'gold' : ''}`}>Inspiration {ch.combat.inspiration ? '★' : '—'}</span><span className="chip">Proficiency {signed(d.profBonus)}</span></div>
            <table className="data" style={{ marginTop: 6 }}><tbody>
              {ABILITIES.map((a) => <tr key={a}><td><b>{ABILITY_NAMES[a]}</b></td><td className="num">{d.abilities[a].score}</td><td className="num"><button className="small ghost" onClick={() => roller.d20(`${ABILITY_NAMES[a]} check`, d.checks[a])}>{signed(d.abilities[a].mod)}</button></td></tr>)}
            </tbody></table>
          </div>
          <div className="panel"><h3>Saving throws</h3>
            {ABILITIES.map((a) => <div key={a} className="row between small"><span>{d.saves[a].proficient ? '●' : '○'} {ABILITY_NAMES[a]}</span><button className="small ghost" onClick={() => roller.d20(`${ABILITY_NAMES[a]} save`, d.saves[a], 'save')}>{signed(d.saves[a].total)}</button></div>)}
          </div>
          <div className="panel"><h3>Skills</h3>
            {SKILL_IDS.map((s) => <div key={s} className="row between small"><span>{d.skills[s].prof === 2 ? '◉' : d.skills[s].prof === 1 ? '●' : d.skills[s].prof === 0.5 ? '◐' : '○'} {SKILLS[s].name} <span className="muted">({SKILLS[s].ability.slice(0, 3)})</span></span><button className="small ghost" onClick={() => roller.d20(SKILLS[s].name, d.skills[s])}>{signed(d.skills[s].total)}</button></div>)}
          </div>
          <div className="panel small"><b>Passive Wisdom (Perception)</b> {d.passives.perception.total} · Investigation {d.passives.investigation.total} · Insight {d.passives.insight.total}</div>
          <div className="panel small"><h3>Other proficiencies & languages</h3>
            <div><b>Armor:</b> {d.proficiencies.armor.join(', ') || '—'}</div>
            <div><b>Weapons:</b> {d.proficiencies.weapons.map(titleCase).join(', ') || '—'}</div>
            <div><b>Tools:</b> {d.proficiencies.tools.join(', ') || '—'}</div>
            <div><b>Languages:</b> {d.proficiencies.languages.join(', ') || '—'}</div>
          </div>
        </div>
        <div className="stack">
          <div className="stat-strip">
            {box('Armor Class', d.ac.total, d.ac.formula.replace(/\s*\(.*\)/, ''))}
            {box('Initiative', signed(d.initiative.total))}
            {box('Speed', `${d.speed.walk.value} ft`, (['fly', 'swim', 'climb', 'burrow'] as const).filter((m) => d.speed[m].value).map((m) => `${m} ${d.speed[m].value}`).join(', '))}
          </div>
          <div className="stat-strip">
            {box('HP maximum', d.hp.max)}
            {box('Current HP', Math.min(ch.combat.hpCurrent, d.hp.max))}
            {box('Temporary HP', ch.combat.hpTemp)}
          </div>
          <div className="stat-strip">
            {box('Hit dice', d.hitDice.map((h) => `${h.total}d${h.die}`).join(' + '), `${d.hitDice.map((h) => `${h.total - h.used}d${h.die}`).join(' + ')} left`)}
            {box('Death saves', `${ch.combat.deathSaves.successes}✓ ${ch.combat.deathSaves.failures}✗`)}
          </div>
          <div className="panel"><h3>Attacks & spellcasting</h3>
            <table className="data"><thead><tr><th>Name</th><th className="num">Atk</th><th>Damage/type</th></tr></thead><tbody>
              {d.attacks.map((a) => <tr key={a.id}><td>{a.name}</td><td className="num">{signed(a.attack.total)}</td><td>{a.damageDice === '0' ? '' : a.damageDice}{a.damageBonus.total ? signed(a.damageBonus.total) : ''} {a.damageType}{a.extraDamage.map((x) => ` +${x.dice} ${x.type}`).join('')}</td></tr>)}
              {d.casters.map((c) => <tr key={c.classId}><td>{c.name} spell attack</td><td className="num">{signed(c.attack.total)}</td><td>DC {c.dc.total}</td></tr>)}
            </tbody></table>
          </div>
          <div className="panel small"><h3>Equipment</h3>
            <div className="row tight">{(['cp', 'sp', 'ep', 'gp', 'pp'] as const).map((k) => <span key={k} className="chip">{k.toUpperCase()} {ch.currency[k]}</span>)}</div>
            <div style={{ marginTop: 6 }}>{ch.inventory.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.item.name}${i.equipped ? ' (E)' : ''}${i.attuned ? ' (A)' : ''}`).join(', ') || '—'}</div>
            <div className="muted" style={{ marginTop: 4 }}>Carrying {d.carrying.weight}/{d.carrying.capacity} lb</div>
          </div>
          <div className="panel small"><h3>Defenses & conditions</h3>
            <div>Resistances: {d.resistances.map((r) => r.type).join(', ') || '—'}; Immunities: {[...d.immunities, ...d.conditionImmunities].map((r) => r.type).join(', ') || '—'}; Senses: {d.senses.map((s) => `${s.name} ${s.range} ft`).join(', ') || '—'}</div>
            <div>Conditions: {d.activeConditions.join(', ') || 'none'}{ch.combat.exhaustion ? `; exhaustion ${ch.combat.exhaustion}` : ''}</div>
          </div>
        </div>
        <div className="stack">
          {(['traits', 'ideals', 'bonds', 'flaws'] as const).map((k) => <div key={k} className="panel small"><h3>{k === 'traits' ? 'Personality traits' : titleCase(k)}</h3><div className="pre">{ch.personality[k] || '—'}</div></div>)}
          <div className="panel small"><h3>Features & traits</h3>
            {d.features.filter((f) => f.source.kind !== 'option').map((f) => <div key={f.key}><b>{f.def.name}</b> <span className="muted">({f.source.label})</span>{(() => { const r = d.resources.find((x) => x.id === f.resourceId); return r ? ` — ${r.remaining}/${r.max >= 99 ? '∞' : r.max}` : ''; })()}</div>)}
          </div>
        </div>
      </div>
      <div className="grid cols-2">
        <div className="panel small"><h3>Character appearance & details</h3>
          <div>Age {ch.identity.age || '—'} · Height {ch.identity.height || '—'} · Weight {ch.identity.weight || '—'} · Eyes {ch.identity.eyes || '—'} · Skin {ch.identity.skin || '—'} · Hair {ch.identity.hair || '—'}{ch.identity.deity ? ` · Deity ${ch.identity.deity}` : ''}</div>
          <div className="pre" style={{ marginTop: 4 }}>{ch.identity.appearance}</div>
          <h3 style={{ marginTop: 8 }}>Backstory</h3><div className="pre">{ch.personality.backstory || '—'}</div>
        </div>
        <div className="panel small"><h3>Allies & organizations</h3><div className="pre">{ch.personality.allies || '—'}</div>
          <h3 style={{ marginTop: 8 }}>Treasure</h3><div>{ch.notes.treasure.map((t) => t.title).join(', ') || ch.inventory.filter((i) => i.item.category === 'treasure' || i.item.magical).map((i) => i.item.name).join(', ') || '—'}</div>
        </div>
      </div>
      {(d.casters.length > 0 || d.spells.length > 0) && (
        <div className="panel small">
          <h3>Spellcasting</h3>
          <div className="row">{d.casters.map((c) => <span key={c.classId} className="chip">{c.name}: {ABILITY_NAMES[c.ability]} · DC {c.dc.total} · attack {signed(c.attack.total)}</span>)}</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginTop: 8 }}>
            {[...spellsByLevel.keys()].sort((a, b) => a - b).map((l) => {
              const slot = d.slots.find((s) => s.level === l);
              return <div key={l}><b>{l === 0 ? 'Cantrips' : lvlLabel(l)}</b>{slot && <span className="muted"> · slots {slot.max} (used {slot.used})</span>}{d.pact?.level === l && <span className="muted"> · pact {d.pact.slots}</span>}
                {spellsByLevel.get(l)!.map((s) => <div key={s.key}>{s.prepared || s.alwaysPrepared ? '●' : '○'} {s.spell?.name ?? s.spellId}</div>)}
              </div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
