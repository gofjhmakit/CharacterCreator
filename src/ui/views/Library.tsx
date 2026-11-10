// Custom content library: create/edit/duplicate/delete/import/export user content.
import { useMemo, useRef, useState } from 'react';
import { useApp } from '@/state/store';
import type { ContentKind, CustomContentRecord, ItemDefinition } from '@/types/content';
import { href, go } from '../router';
import { Empty, useConfirm, fmtDate } from '../components/common';
import { CreateItemDialog } from './tabs/InventoryTab';
import { blankItem, fromTemplate, itemSummary } from '../components/ItemEditor';
import { exportContent, downloadJson } from '@/io/exportImport';
import { ImportDialog } from './ImportDialog';
import { uid } from '@/engine/factory';
import { SpellEditor, FeatEditor, BackgroundEditor, RaceEditor, SubclassEditor, ClassEditor, SimpleEditor, blankFor } from './ContentEditors';

const KINDS: [ContentKind, string][] = [['item', 'Items'], ['spell', 'Spells'], ['feat', 'Feats'], ['feature', 'Features'], ['race', 'Races / species'], ['class', 'Classes'], ['subclass', 'Subclasses'], ['background', 'Backgrounds'], ['language', 'Languages'], ['proficiency', 'Proficiencies']];

export function Library({ kind = 'item' }: { kind?: string }) {
  const k = (KINDS.find(([x]) => x === kind)?.[0] ?? 'item') as ContentKind;
  const custom = useApp((s) => s.custom);
  const characters = useApp((s) => s.characters);
  const saveCustom = useApp((s) => s.saveCustom);
  const deleteCustom = useApp((s) => s.deleteCustom);
  const toast = useApp((s) => s.toast);
  const { ask, node } = useConfirm();
  const [editing, setEditing] = useState<CustomContentRecord | null>(null);
  const [importText, setImportText] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const list = useMemo(() => custom.filter((r) => r.kind === k).sort((a, b) => (a.data as { name: string }).name.localeCompare((b.data as { name: string }).name)), [custom, k]);

  const usage = (r: CustomContentRecord): string[] => Object.values(characters).filter((c) => {
    const s = JSON.stringify([c.race, c.background, c.classes, c.choices, c.custom.feats, c.spells.entries.map((e) => e.spellId), c.inventory.map((i) => i.origin.id)]);
    return s.includes(`"${r.id}"`) || s.includes(`feat:${r.id}"`);
  }).map((c) => c.identity.name || 'Unnamed');

  const del = async (r: CustomContentRecord) => {
    const used = usage(r);
    const ok = await ask({ title: `Delete “${(r.data as { name: string }).name}”?`, danger: true, confirmLabel: 'Delete',
      message: used.length ? <>Used by: <b>{used.join(', ')}</b>. {r.kind === 'item' ? 'Their inventory copies are kept (copies are independent).' : 'Those characters will show a “not found” warning until you remove the reference or re-import the content.'}</> : 'This content is not used by any character.' });
    if (ok) { await deleteCustom(r.kind, r.id); toast({ kind: 'success', text: 'Deleted.' }); }
  };
  const duplicate = async (r: CustomContentRecord) => {
    const id = uid(r.kind);
    const data = { ...structuredClone(r.data), id, name: `${(r.data as { name: string }).name} (copy)` } as never;
    await saveCustom({ kind: r.kind, id, data });
  };
  const startNew = () => setEditing({ kind: k, id: '', data: (k === 'item' ? blankItem() : blankFor(k)) as never, createdAt: '', updatedAt: '' });
  const save = async (data: { id: string; name: string }) => {
    await saveCustom({ kind: k, id: data.id, data: data as never });
    toast({ kind: 'success', text: `Saved “${data.name}”. Existing inventory copies are unchanged.` });
    setEditing(null);
  };

  return (
    <div className="stack lg">
      <div className="page-head">
        <h1>Library</h1>
        <button onClick={() => fileRef.current?.click()}>Import content</button>
        <button onClick={() => downloadJson(`grimoire-content-${k}.json`, exportContent(list))} disabled={!list.length}>Export {KINDS.find(([x]) => x === k)?.[1].toLowerCase()}</button>
        <button onClick={() => downloadJson('grimoire-content-all.json', exportContent(custom))} disabled={!custom.length}>Export all content</button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImportText(await f.text()); e.target.value = ''; }} />
      </div>
      <p className="ink2">Your own races, classes, subclasses, backgrounds, feats, spells, items and more. Custom content is stored separately from the bundled SRD data, so app updates never overwrite it.</p>
      <nav className="tabs">{KINDS.map(([x, label]) => <a key={x} href={href('library', x)} className={k === x ? 'active' : ''}>{label} {custom.filter((r) => r.kind === x).length ? `(${custom.filter((r) => r.kind === x).length})` : ''}</a>)}</nav>
      <div className="row"><button className="primary" onClick={startNew}>New {KINDS.find(([x]) => x === k)?.[1].replace(/s$|s \/.*$/, '').toLowerCase()}</button>{k === 'item' && <span className="small muted">Tip: from a character’s Inventory, “Add New Item…” lets you start from any existing item as a template.</span>}</div>
      <div className="panel flush">
        {list.length === 0 ? <Empty>No custom {KINDS.find(([x]) => x === k)?.[1].toLowerCase()} yet.</Empty> : (
          <div className="list">
            {list.map((r) => {
              const data = r.data as { name: string; description?: string } & Partial<ItemDefinition>;
              const used = usage(r);
              return (
                <div key={r.id} className="list-row">
                  <span className="grow">
                    <b>{data.name}</b> {used.length > 0 && <span className="badge" title={used.join(', ')}>used by {used.length}</span>}
                    <div className="small muted">{r.kind === 'item' ? itemSummary(data as ItemDefinition) : (data.description ?? '').slice(0, 120)} · updated {fmtDate(r.updatedAt)}</div>
                  </span>
                  <button className="small" onClick={() => setEditing(structuredClone(r))}>Edit</button>
                  <button className="small ghost" onClick={() => duplicate(r)}>Duplicate</button>
                  {r.kind === 'item' && <button className="small ghost" title="Create a variant based on this item" onClick={() => setEditing({ ...r, id: '', data: fromTemplate(r.data as ItemDefinition) as never })}>Variant</button>}
                  <button className="small ghost" onClick={() => downloadJson(`${r.id}.json`, exportContent([r]))}>Export</button>
                  <button className="small ghost danger" onClick={() => del(r)}>Delete</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {editing && k === 'item' && <CreateItemDialog templateOnly initial={editing.data as ItemDefinition} onClose={() => setEditing(null)} onSave={(def) => save(def)} />}
      {editing && k === 'spell' && <SpellEditor initial={editing.data as never} onClose={() => setEditing(null)} onSave={save} />}
      {editing && (k === 'feat' || k === 'feature') && <FeatEditor kind={k} initial={editing.data as never} onClose={() => setEditing(null)} onSave={save} />}
      {editing && k === 'background' && <BackgroundEditor initial={editing.data as never} onClose={() => setEditing(null)} onSave={save} />}
      {editing && k === 'race' && <RaceEditor initial={editing.data as never} onClose={() => setEditing(null)} onSave={save} />}
      {editing && k === 'subclass' && <SubclassEditor initial={editing.data as never} onClose={() => setEditing(null)} onSave={save} />}
      {editing && k === 'class' && <ClassEditor initial={editing.data as never} onClose={() => setEditing(null)} onSave={save} />}
      {editing && (k === 'language' || k === 'proficiency') && <SimpleEditor kind={k} initial={editing.data as never} onClose={() => setEditing(null)} onSave={save} />}
      {importText !== null && <ImportDialog contentOnly text={importText} onClose={() => setImportText(null)} />}
      {node}
      {void go}
    </div>
  );
}
