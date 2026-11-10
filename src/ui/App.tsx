import { useEffect } from 'react';
import { useApp } from '@/state/store';
import { useRoute, href } from './router';
import { DiceTray } from './components/DiceTray';
import { IconLogo } from './components/icons';
import { CharacterList } from './views/CharacterList';
import { CharacterView } from './views/CharacterView';
import { Wizard } from './wizard/Wizard';
import { Library } from './views/Library';
import { AppSettings } from './views/AppSettings';
import { About } from './views/About';

function useTheme() {
  const theme = useApp((s) => s.prefs.theme);
  useEffect(() => {
    const apply = () => {
      const t = theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = t;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#e7dfcb' : '#1d1b18');
    };
    apply();
    const mq = matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismiss);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismiss(t.id)}>
          {t.kind === 'roll' ? (
            <div className="row between"><div className="grow"><div style={{ fontWeight: 700 }}>{t.text.replace(/: -?\d+$/, '')}</div><div className="small muted">{t.detail}</div></div><div className="total num">{t.text.match(/-?\d+$/)?.[0]}</div></div>
          ) : (<div className="row between" style={{ flexWrap: 'nowrap' }}><div className="grow"><div>{t.text}</div>{t.detail && <div className="small muted">{t.detail}</div>}</div>{t.action && <button className="small" onClick={(e) => { e.stopPropagation(); t.action!.run(); dismiss(t.id); }}>{t.action.label}</button>}</div>)}
        </div>
      ))}
    </div>
  );
}

export function App() {
  const init = useApp((s) => s.init);
  const ready = useApp((s) => s.ready);
  const storageWarning = useApp((s) => s.storageWarning);
  const loadErrors = useApp((s) => s.loadErrors);
  const route = useRoute();
  useTheme();
  useEffect(() => { void init(); }, [init]);

  const [section, id, sub] = route;
  let page;
  if (!ready) page = <div className="empty">Loading your characters…</div>;
  else if (section === 'c' && id) page = <CharacterView id={id} tab={sub ?? 'overview'} />;
  else if (section === 'new' && id) page = <Wizard id={id} step={sub} />;
  else if (section === 'library') page = <Library kind={id} />;
  else if (section === 'settings') page = <AppSettings />;
  else if (section === 'about') page = <About />;
  else page = <CharacterList />;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={href()}><IconLogo /> Grimoire</a>
        <nav className="topnav" aria-label="Main">
          <a href={href()} className={!section || section === 'c' || section === 'new' ? 'active' : ''}>Characters</a>
          <a href={href('library')} className={section === 'library' ? 'active' : ''}>Library</a>
          <a href={href('settings')} className={section === 'settings' ? 'active' : ''}>Settings</a>
          <a href={href('about')} className={section === 'about' ? 'active' : ''}>About</a>
        </nav>
        <span className="spacer" />
        <span className="small muted" title="All data is stored in this browser">Offline · Local</span>
      </header>
      <main className="main">
        {storageWarning && <div className="notice error" style={{ marginBottom: 12 }}>{storageWarning}</div>}
        {loadErrors.length > 0 && <div className="notice error" style={{ marginBottom: 12 }}><b>Some data could not be loaded:</b><ul className="warnings">{loadErrors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
        {page}
      </main>
      <DiceTray />
      <Toasts />
    </div>
  );
}
