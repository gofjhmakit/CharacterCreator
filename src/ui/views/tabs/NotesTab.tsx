import { useState } from 'react';
import type { TabProps } from '../CharacterView';
import { NOTE_CATEGORIES, type NoteCategory, type NoteEntry } from '@/types/character';
import { uid } from '@/engine/factory';
import { Empty, fmtDate, useConfirm } from '../../components/common';

export function NotesTab({ ch, set }: TabProps) {
  const [cat, setCat] = useState<NoteCategory | 'backstory' | 'general'>('sessions');
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const { ask, node } = useConfirm();
  const entries = cat === 'backstory' || cat === 'general' ? [] : ch.notes[cat];
  const filtered = entries.filter((e) => !q || `${e.title} ${e.body}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt));
  const add = () => {
    if (cat === 'backstory' || cat === 'general') return;
    const now = new Date().toISOString();
    const e: NoteEntry = { id: uid('note'), title: cat === 'sessions' ? `Session ${ch.notes.sessions.length + 1}` : '', body: '', date: now.slice(0, 10), createdAt: now, updatedAt: now, ...(cat === 'quests' ? { status: 'active' as const } : {}) };
    set((c) => { c.notes[cat].push(e); });
    setOpenId(e.id);
  };
  const upd = (id: string, p: Partial<NoteEntry>) => set((c) => { if (cat === 'backstory' || cat === 'general') return; const e = c.notes[cat].find((x) => x.id === id); if (e) Object.assign(e, p, { updatedAt: new Date().toISOString() }); });
  return (
    <div className="stack lg">
      <div className="subtabs">
        <button className={cat === 'backstory' ? 'active' : ''} onClick={() => setCat('backstory')}>Backstory & personality</button>
        <button className={cat === 'general' ? 'active' : ''} onClick={() => setCat('general')}>Campaign notes</button>
        {(Object.keys(NOTE_CATEGORIES) as NoteCategory[]).map((k) => <button key={k} className={cat === k ? 'active' : ''} onClick={() => setCat(k)}>{NOTE_CATEGORIES[k]} {ch.notes[k].length ? `(${ch.notes[k].length})` : ''}</button>)}
      </div>
      {cat === 'backstory' && (
        <div className="grid cols-2">
          {(['traits', 'ideals', 'bonds', 'flaws'] as const).map((k) => <label key={k} className="field">{k[0].toUpperCase() + k.slice(1)}<textarea rows={3} value={ch.personality[k]} onChange={(e) => set((c) => { c.personality[k] = e.target.value; })} /></label>)}
          <label className="field" style={{ gridColumn: '1 / -1' }}>Backstory<textarea rows={10} value={ch.personality.backstory} onChange={(e) => set((c) => { c.personality.backstory = e.target.value; })} /></label>
          <label className="field">Allies & organizations<textarea rows={4} value={ch.personality.allies} onChange={(e) => set((c) => { c.personality.allies = e.target.value; })} /></label>
          <label className="field">Appearance<textarea rows={4} value={ch.identity.appearance} onChange={(e) => set((c) => { c.identity.appearance = e.target.value; })} /></label>
        </div>
      )}
      {cat === 'general' && <label className="field">Campaign notes<textarea rows={16} value={ch.notes.general} onChange={(e) => set((c) => { c.notes.general = e.target.value; })} placeholder="Anything about the campaign relevant to this character." /></label>}
      {cat !== 'backstory' && cat !== 'general' && (
        <div className="stack">
          <div className="row"><input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} /><span className="spacer" /><button className="primary" onClick={add}>New entry</button></div>
          {filtered.length === 0 && <div className="panel"><Empty>No {NOTE_CATEGORIES[cat].toLowerCase()} yet.</Empty></div>}
          {filtered.map((e) => (
            <div key={e.id} className="panel">
              <div className="row">
                <input value={e.title} placeholder="Title" onChange={(x) => upd(e.id, { title: x.target.value })} style={{ fontWeight: 700, maxWidth: 360 }} aria-label="Title" />
                <input type="date" value={e.date ?? ''} onChange={(x) => upd(e.id, { date: x.target.value })} style={{ width: 160 }} aria-label="Date" />
                {cat === 'quests' && <select value={e.status ?? 'active'} onChange={(x) => upd(e.id, { status: x.target.value as NoteEntry['status'] })} style={{ width: 'auto' }}><option value="active">Active</option><option value="on-hold">On hold</option><option value="done">Completed</option><option value="failed">Failed</option></select>}
                <span className="spacer" />
                <span className="small muted">edited {fmtDate(e.updatedAt)}</span>
                <button className="small ghost" onClick={() => setOpenId(openId === e.id ? null : e.id)}>{openId === e.id ? 'Collapse' : 'Expand'}</button>
                <button className="small ghost danger" onClick={async () => { if (await ask({ title: 'Delete entry?', message: `Delete “${e.title || 'Untitled'}”?`, confirmLabel: 'Delete', danger: true })) set((c) => { const k = cat as NoteCategory; c.notes[k] = c.notes[k].filter((x) => x.id !== e.id); }); }}>Delete</button>
              </div>
              {openId === e.id ? <textarea rows={8} value={e.body} onChange={(x) => upd(e.id, { body: x.target.value })} style={{ marginTop: 8 }} placeholder="Write…" /> : e.body && <div className="feature-desc clamp" style={{ marginTop: 6 }} onClick={() => setOpenId(e.id)}>{e.body}</div>}
            </div>
          ))}
        </div>
      )}
      {node}
    </div>
  );
}
