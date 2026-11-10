import { RulesetProvider } from '@/ui/ruleset';
import { useMemo, useState } from 'react';
import { useApp, useCharacter } from '@/state/store';
import { derive } from '@/engine/derive';
import { href } from '../router';
import { Empty, Modal } from '../components/common';
import { IconBag, IconBook, IconHeart, IconMore, IconStar, IconSword, IconUser } from '../components/icons';
import { Portrait } from './CharacterList';
import type { Character } from '@/types/character';
import { signed } from '@/types/core';
import { OverviewTab } from './tabs/OverviewTab';
import { AbilitiesTab } from './tabs/AbilitiesTab';
import { CombatTab } from './tabs/CombatTab';
import { SpellsTab } from './tabs/SpellsTab';
import { InventoryTab } from './tabs/InventoryTab';
import { FeaturesTab } from './tabs/FeaturesTab';
import { ProgressionTab } from './tabs/ProgressionTab';
import { NotesTab } from './tabs/NotesTab';
import { CharSettingsTab } from './tabs/CharSettingsTab';
import { SheetTab } from './tabs/SheetTab';

export const TABS = [
  ['overview', 'Overview'], ['sheet', 'Character Sheet'], ['abilities', 'Abilities & Skills'], ['combat', 'Combat'], ['spells', 'Spellbook'],
  ['inventory', 'Inventory'], ['features', 'Features & Feats'], ['progression', 'Progression'], ['notes', 'Notes & Journal'], ['settings', 'Character Settings'],
] as const;

export function SaveIndicator({ id }: { id: string }) {
  const s = useApp((st) => st.saves[id]);
  const status = s?.status ?? 'saved';
  const label = status === 'saved' ? 'Saved' : status === 'error' ? `Not saved: ${s?.error}` : 'Saving…';
  return <span className={`save-ind ${status}`} role="status" title={label}><span className="dot" />{status === 'error' ? 'Save failed — retrying' : label}</span>;
}

export function CharacterView({ id, tab }: { id: string; tab: string }) {
  const ch = useCharacter(id);
  const db = useApp((s) => s.dbs[ch?.ruleset ?? 'dnd5e-2014']);
  const update = useApp((s) => s.update);
  const replaceC = useApp((s) => s.replace);
  const [more, setMore] = useState(false);
  const d = useMemo(() => (ch ? derive(ch, db) : null), [ch, db]);
  if (!ch || !d) return <Empty>Character not found. <a href={href()}>Back to characters</a></Empty>;
  const set = (r: (c: Character) => void) => update(id, r);
  const replace = (c: Character) => replaceC(c);
  const props = { ch, d, set, replace };
  const race = db.races.get(ch.race.raceId);
  const sub = race?.subraces?.find((s) => s.id === ch.race.subraceId);
  const saveState = useApp.getState().saves[id];

  const content = (() => {
    switch (tab) {
      case 'sheet': return <SheetTab {...props} />;
      case 'abilities': return <AbilitiesTab {...props} />;
      case 'combat': return <CombatTab {...props} />;
      case 'spells': return <SpellsTab {...props} />;
      case 'inventory': return <InventoryTab {...props} />;
      case 'features': return <FeaturesTab {...props} />;
      case 'progression': return <ProgressionTab {...props} />;
      case 'notes': return <NotesTab {...props} />;
      case 'settings': return <CharSettingsTab {...props} />;
      default: return <OverviewTab {...props} />;
    }
  })();

  const mobile: [string, string, () => React.ReactElement][] = [['overview', 'Play', IconHeart], ['abilities', 'Skills', IconStar], ['spells', 'Spells', IconBook], ['inventory', 'Items', IconBag]];

  return (
    <RulesetProvider value={ch.ruleset}>
    <div>
      {saveState?.status === 'error' && <div className="notice error" style={{ marginBottom: 10 }}><b>Changes are not being saved.</b> {saveState.error} Export this character to keep a copy.</div>}
      <div className="char-head">
        <Portrait c={ch} />
        <div className="char-title">
          <h1>{ch.identity.name || 'Unnamed'}</h1>
          <div className="char-sub">Level {d.totalLevel} · {d.classLine} · {sub?.name ?? race?.name ?? `No ${d.rules.terms.race.toLowerCase()}`} · <span className={`chip ${ch.ruleset === 'dnd5e-2024' ? 'blue' : ''}`} title="Ruleset">{ch.ruleset === 'dnd5e-2024' ? '2024 rules' : '2014 rules'}</span></div>
        </div>
        <div className="head-actions row" style={{ justifyContent: 'flex-end' }}>
          <SaveIndicator id={id} />
          <span className="chip" title="Armor Class">AC {d.ac.total}</span>
          <span className="chip" title="Hit points">HP {Math.min(ch.combat.hpCurrent, d.hp.max)}/{d.hp.max}{ch.combat.hpTemp ? ` +${ch.combat.hpTemp}` : ''}</span>
          <span className="chip" title="Proficiency bonus">PB {signed(d.profBonus)}</span>
          <button className={`small ${ch.combat.inspiration ? 'on' : ''}`} onClick={() => set((c) => { c.combat.inspiration = !c.combat.inspiration; })} title="Inspiration">{ch.combat.inspiration ? '★' : '☆'} Inspiration</button>
        </div>
      </div>
      {ch.draft && <div className="notice" style={{ marginBottom: 10 }}>This character is still a draft. <a href={href('new', id)}>Continue the creation wizard</a>.</div>}
      <nav className="tabs char-tabs" aria-label="Character sections">
        {TABS.map(([k, label]) => <a key={k} href={href('c', id, k)} className={tab === k ? 'active' : ''}>{label}</a>)}
      </nav>
      {content}
      <nav className="bottom-nav" aria-label="Character sections">
        {mobile.map(([k, label, Icon]) => <a key={k} href={href('c', id, k)} className={tab === k ? 'active' : ''}><Icon />{label}</a>)}
        <button onClick={() => setMore(true)} className={!mobile.some(([k]) => k === tab) ? 'active' : ''}><IconMore />More</button>
      </nav>
      {more && (
        <Modal title="Sections" onClose={() => setMore(false)} size="narrow">
          <div className="list">{TABS.map(([k, label]) => <a key={k} className={`list-row clickable ${tab === k ? 'selected' : ''}`} href={href('c', id, k)} onClick={() => setMore(false)} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{k === 'combat' ? <IconSword /> : k === 'settings' ? <IconUser /> : null}{label}</a>)}<a className="list-row clickable" href={href()} style={{ color: 'var(--ink)', textDecoration: 'none' }}>← All characters</a></div>
        </Modal>
      )}
    </div>
    </RulesetProvider>
  );
}

export type TabProps = { ch: Character; d: ReturnType<typeof derive>; set: (r: (c: Character) => void) => void; replace: (c: Character) => void };
