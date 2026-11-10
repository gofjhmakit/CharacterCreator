import { useRef, useState } from 'react';
import { useApp } from '@/state/store';
import { exportBackup, downloadJson } from '@/io/exportImport';
import { ImportDialog } from './ImportDialog';
import { Field } from '../components/common';

export function AppSettings() {
  const prefs = useApp((s) => s.prefs);
  const setPrefs = useApp((s) => s.setPrefs);
  const store = useApp((s) => s.store);
  const characters = useApp((s) => s.characters);
  const custom = useApp((s) => s.custom);
  const [usage, setUsage] = useState<string>('');
  const [importText, setImportText] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const checkUsage = async () => {
    try {
      const est = await navigator.storage?.estimate?.();
      const persisted = await navigator.storage?.persisted?.();
      setUsage(est ? `${((est.usage ?? 0) / 1024 / 1024).toFixed(2)} MB used of ~${((est.quota ?? 0) / 1024 / 1024).toFixed(0)} MB available. ${persisted ? 'Storage is persistent.' : 'Storage may be cleared by the browser under pressure — export backups regularly.'}` : 'Not available in this browser.');
    } catch { setUsage('Not available.'); }
  };
  return (
    <div className="stack lg" style={{ maxWidth: 900 }}>
      <h1>Settings</h1>
      <div className="panel stack">
        <h3>Appearance</h3>
        <div className="field-row">
          <Field label="Theme"><select value={prefs.theme} onChange={(e) => setPrefs({ theme: e.target.value as 'dark' })}><option value="system">Follow system</option><option value="dark">Dark (charcoal)</option><option value="light">Light (parchment)</option></select></Field>
          <Field label="Units" hint="Rules values stay in feet/pounds; metric shown as a hint where relevant."><select value={prefs.units} onChange={(e) => setPrefs({ units: e.target.value as 'imperial' })}><option value="imperial">Imperial (ft, lb)</option><option value="metric">Metric hints</option></select></Field>
        </div>
      </div>
      <div className="panel stack">
        <h3>Dice</h3>
        <label className="check"><input type="checkbox" checked={prefs.autoAdvantage} onChange={(e) => setPrefs({ autoAdvantage: e.target.checked })} />Quick rolls apply advantage/disadvantage from active effects and conditions automatically</label>
        <label className="check"><input type="checkbox" checked={prefs.showRollToasts} onChange={(e) => setPrefs({ showRollToasts: e.target.checked })} />Show roll results as pop-up notifications</label>
        <p className="small muted">Dice use the browser’s cryptographic random number generator. Multiple sources of advantage never stack; advantage and disadvantage together cancel out.</p>
      </div>
      <div className="panel stack">
        <h3>Data & storage</h3>
        <p className="small ink2">Everything is stored locally in this browser ({store?.kind ?? '…'}): {Object.keys(characters).length} characters, {custom.length} custom content items. Nothing is sent to any server.</p>
        <div className="row">
          <button onClick={() => downloadJson(`grimoire-backup-${new Date().toISOString().slice(0, 10)}.json`, exportBackup(Object.values(characters), custom))}>Download full backup</button>
          <button onClick={() => ref.current?.click()}>Restore / import backup</button>
          <button onClick={checkUsage}>Check storage usage</button>
          <input ref={ref} type="file" accept=".json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImportText(await f.text()); e.target.value = ''; }} />
        </div>
        {usage && <p className="small">{usage}</p>}
      </div>
      {importText !== null && <ImportDialog text={importText} onClose={() => setImportText(null)} />}
    </div>
  );
}
