import type { TabProps } from '../CharacterView';
import { HpPanel, ConditionsPanel, ResourcesPanel, TogglesPanel, SlotsPanel, AttacksPanel, RestButtons, QuickEffectsPanel, SavesMini, DefensesPanel } from '../panels';
import { StatStrip } from './OverviewTab';
import { BreakdownView } from '../../components/common';

export function CombatTab(p: TabProps) {
  const { ch, d } = p;
  return (
    <div className="stack lg">
      <StatStrip d={d} ch={ch} />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', alignItems: 'start' }}>
        <div className="stack lg">
          <HpPanel {...p} />
          <ConditionsPanel {...p} />
          <div className="panel"><div className="panel-title"><h3>Rest</h3></div><RestButtons {...p} /></div>
          <DefensesPanel d={d} />
        </div>
        <div className="stack lg">
          <AttacksPanel ch={ch} d={d} />
          <SavesMini d={d} />
          <div className="panel">
            <div className="panel-title"><h3>Armor Class</h3><span className="spacer" /><span className="num" style={{ fontSize: '1.6rem', fontWeight: 700 }}>{d.ac.total}</span></div>
            <BreakdownView b={{ total: d.ac.total, parts: d.ac.parts, conditional: d.ac.conditional }} unit=" " />
            <div className="small muted" style={{ marginTop: 6 }}>Active method: {d.ac.formula}. Other methods: {d.ac.candidates.filter((c) => !c.active).map((c) => `${c.label} ${c.valid ? c.value : '(n/a)'}`).join('; ') || 'none'}</div>
          </div>
        </div>
        <div className="stack lg">
          <TogglesPanel {...p} />
          <ResourcesPanel {...p} />
          <SlotsPanel {...p} />
          <QuickEffectsPanel ch={ch} set={p.set} />
          {d.manual.length > 0 && <div className="panel"><div className="panel-title"><h3>Manual effects</h3></div>{d.manual.map((m, i) => <div key={i} className="small"><b>{m.name}</b>: {m.description}</div>)}</div>}
        </div>
      </div>
    </div>
  );
}
