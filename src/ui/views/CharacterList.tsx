import { useMemo, useRef, useState } from 'react';
import { useApp } from '@/state/store';
import { derive } from '@/engine/derive';
import { go, href } from '../router';
import { Modal, useConfirm, fmtDate, Empty } from '../components/common';
import { exportCharacter, exportBackup, downloadJson, safeFilename } from '@/io/exportImport';
import { ImportDialog } from './ImportDialog';
import type { Character } from '@/types/character';

function Portrait({ c, size = '' }: { c: Character; size?: string }) {
  return c.identity.portrait ? <img className={`portrait ${size}`} src={c.identity.portrait} alt="" /> : <div className={`portrait ${size}`}>{(c.identity.name || '?').slice(0, 1).toUpperCase()}</div>;
}
export { Portrait };

export function CharacterList() {
  const characters = useApp((s) => s.characters);
  const db = useApp((s) => s.db);
  const custom = useApp((s) => s.custom);
  const create = useApp((s) => s.createCharacter);
  const duplicate = useApp((s) => s.duplicate);
  const remove = useApp((s) => s.remove);
  const update = useApp((s) => s.update);
  const toast = useApp((s) => s.toast);
  const { ask, node } = useConfirm();
  const [rename, setRename] = useState<Character | null>(null);
  const [importing, setImporting] = useState(false);
  const [q, setQ] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [importText, setImportText] = useState<string | null>(null);

  const rows = useMemo(() => Object.values(characters).map((c) => {
    let summary = { classLine: '', level: 1, race: '', hp: '', ac: 0 };
    try {
      const d = derive(c, db);
      const race = db.races.get(c.race.raceId);
      const sub = race?.subraces?.find((s) => s.id === c.race.subraceId);
      summary = { classLine: d.classLine, level: d.totalLevel, race: sub?.name ?? race?.name ?? '—', hp: `${c.combat.hpCurrent}/${d.hp.max}`, ac: d.ac.total };
    } catch { /* show raw */ }
    return { c, ...summary };
  }).filter((r) => !q || `${r.c.identity.name} ${r.classLine} ${r.race} ${r.c.identity.playerName}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.c.updatedAt.localeCompare(a.c.updatedAt)), [characters, db, q]);

  const newChar = () => { const id = create(); go('new', id); };

  const del = async (c: Character) => {
    const ok = await ask({ title: 'Delete character?', message: <>This permanently deletes <b>{c.identity.name || 'this character'}</b> from this browser. Export it first if you may want it back.</>, confirmLabel: 'Delete', danger: true, requireText: c.identity.name || undefined });
    if (ok) { await remove(c.id); toast({ kind: 'success', text: 'Character deleted.' }); }
  };

  return (
    <div className="stack lg">
      <div className="page-head">
        <h1>Characters</h1>
        <input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 200 }} aria-label="Filter characters" />
        <button onClick={() => fileRef.current?.click()}>Import</button>
        <button onClick={() => { downloadJson(`grimoire-backup-${new Date().toISOString().slice(0, 10)}.json`, exportBackup(Object.values(characters), custom)); toast({ kind: 'success', text: 'Full backup downloaded.' }); }} disabled={!Object.keys(characters).length && !custom.length}>Backup all</button>
        <button className="primary" onClick={newChar}>New character</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setImportText(await f.text()); setImporting(true); } e.target.value = ''; }} />
      </div>
      {rows.length === 0 ? (
        <div className="panel"><Empty>
          <h2 style={{ marginBottom: 8 }}>No characters yet</h2>
          <p>Create a character with the guided builder, or import a JSON export.</p>
          <div className="row" style={{ justifyContent: 'center' }}><button className="primary" onClick={newChar}>Create your first character</button><button onClick={() => fileRef.current?.click()}>Import</button></div>
        </Empty></div>
      ) : (
        <div className="panel flush">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th></th><th>Name</th><th>Class</th><th>Race</th><th className="num">Lvl</th><th className="num">HP</th><th className="num">AC</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {rows.map(({ c, classLine, level, race, hp, ac }) => (
                  <tr key={c.id}>
                    <td style={{ width: 52 }}><Portrait c={c} size="sm" /></td>
                    <td>
                      <a href={c.draft ? href('new', c.id) : href('c', c.id)} style={{ fontWeight: 700, color: 'var(--ink)', textDecoration: 'none' }}>{c.identity.name || 'Unnamed'}</a>
                      {c.draft && <span className="badge" style={{ marginLeft: 6 }}>draft</span>}
                      {c.identity.playerName && <div className="small muted">{c.identity.playerName}</div>}
                    </td>
                    <td>{classLine}</td>
                    <td>{race}</td>
                    <td className="num">{level}</td>
                    <td className="num">{hp}</td>
                    <td className="num">{ac}</td>
                    <td className="small muted nowrap">{fmtDate(c.updatedAt)}</td>
                    <td>
                      <div className="row tight" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <button className="small" onClick={() => go(c.draft ? 'new' : 'c', c.id)}>{c.draft ? 'Continue' : 'Open'}</button>
                        <button className="small ghost" onClick={() => setRename(c)}>Rename</button>
                        <button className="small ghost" onClick={() => { duplicate(c.id); toast({ kind: 'success', text: 'Character duplicated.' }); }}>Duplicate</button>
                        <button className="small ghost" onClick={() => downloadJson(`${safeFilename(c.identity.name)}.json`, exportCharacter(c, db))}>Export</button>
                        <button className="small ghost danger" onClick={() => del(c)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="small muted">Characters are saved automatically in this browser (IndexedDB). Use <b>Export</b> or <b>Backup all</b> to move them between browsers or devices.</p>
      {rename && <RenameDialog c={rename} onClose={() => setRename(null)} onSave={(name) => { update(rename.id, (d) => { d.identity.name = name; }); setRename(null); }} />}
      {importing && importText !== null && <ImportDialog text={importText} onClose={() => { setImporting(false); setImportText(null); }} />}
      {node}
    </div>
  );
}

function RenameDialog({ c, onClose, onSave }: { c: Character; onClose: () => void; onSave: (n: string) => void }) {
  const [name, setName] = useState(c.identity.name);
  return (
    <Modal title="Rename character" onClose={onClose} size="narrow" footer={<><button onClick={onClose}>Cancel</button><button className="primary" onClick={() => onSave(name.trim())} disabled={!name.trim()}>Save</button></>}>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }}><label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} /></label></form>
    </Modal>
  );
}
