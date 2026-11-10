import { useMemo, useState } from 'react';
import { useApp } from '@/state/store';
import { parseImport, asCopy, type ConflictPolicy } from '@/io/exportImport';
import { Modal } from '../components/common';
import { go } from '../router';

/** Validates first, shows a preview, and only writes to storage after confirmation. */
export function ImportDialog({ text, onClose, contentOnly }: { text: string; onClose: () => void; contentOnly?: boolean }) {
  const parsed = useMemo(() => parseImport(text), [text]);
  const characters = useApp((s) => s.characters);
  const custom = useApp((s) => s.custom);
  const replace = useApp((s) => s.replace);
  const saveCustom = useApp((s) => s.saveCustom);
  const toast = useApp((s) => s.toast);
  const [charPolicy, setCharPolicy] = useState<ConflictPolicy>('copy');
  const [contentPolicy, setContentPolicy] = useState<ConflictPolicy>('keep-existing');
  const [busy, setBusy] = useState(false);

  const charConflicts = parsed.characters.filter((c) => characters[c.id]);
  const contentConflicts = parsed.content.filter((r) => custom.some((x) => x.kind === r.kind && x.id === r.id && JSON.stringify(x.data) !== JSON.stringify(r.data)));
  const canImport = parsed.errors.length === 0 && (parsed.characters.length > 0 || parsed.content.length > 0);

  const doImport = async () => {
    setBusy(true);
    try {
      for (const r of parsed.content) {
        const exists = custom.find((x) => x.kind === r.kind && x.id === r.id);
        if (exists && contentPolicy === 'keep-existing') continue;
        await saveCustom(r);
      }
      let lastId: string | undefined;
      if (!contentOnly) for (const c of parsed.characters) {
        const exists = characters[c.id];
        if (exists && charPolicy === 'keep-existing') continue;
        const toSave = exists && charPolicy === 'copy' ? asCopy(c) : c;
        replace({ ...toSave, draft: false });
        lastId = toSave.id;
      }
      toast({ kind: 'success', text: `Imported ${contentOnly ? 0 : parsed.characters.length} character(s) and ${parsed.content.length} custom content item(s).` });
      onClose();
      if (parsed.characters.length === 1 && lastId) go('c', lastId);
    } catch (e) {
      toast({ kind: 'error', text: `Import failed: ${(e as Error).message}` });
    } finally { setBusy(false); }
  };

  return (
    <Modal title="Import" onClose={onClose} footer={<><button onClick={onClose}>Cancel</button><button className="primary" disabled={!canImport || busy} onClick={doImport}>Import</button></>}>
      <div className="stack">
        {parsed.errors.length > 0 && <div className="notice error"><b>The file can’t be imported:</b><ul className="warnings">{parsed.errors.map((e, i) => <li key={i}>{e}</li>)}</ul><p className="small" style={{ marginTop: 6 }}>Nothing was changed.</p></div>}
        {parsed.errors.length === 0 && <>
          <div className="notice ok">Validated: {parsed.characters.length} character(s), {parsed.content.length} custom content item(s). Type: {parsed.kind}.</div>
          {!contentOnly && parsed.characters.map((c) => <div key={c.id} className="row"><b>{c.identity.name || 'Unnamed'}</b><span className="muted small">{c.classes.map((x) => `${x.classId} ${x.level}`).join(' / ')}</span>{characters[c.id] && <span className="badge warn">already exists</span>}</div>)}
          {charConflicts.length > 0 && !contentOnly && (
            <label className="field">When a character already exists
              <select value={charPolicy} onChange={(e) => setCharPolicy(e.target.value as ConflictPolicy)}>
                <option value="copy">Import as a new copy</option>
                <option value="overwrite">Overwrite the existing character</option>
                <option value="keep-existing">Skip (keep existing)</option>
              </select>
            </label>
          )}
          {contentConflicts.length > 0 && (
            <label className="field">{contentConflicts.length} custom content item(s) differ from your existing versions
              <select value={contentPolicy} onChange={(e) => setContentPolicy(e.target.value as ConflictPolicy)}>
                <option value="keep-existing">Keep my existing versions</option>
                <option value="overwrite">Overwrite with imported versions</option>
              </select>
            </label>
          )}
        </>}
        {parsed.warnings.length > 0 && <details><summary className="small">{parsed.warnings.length} note(s)</summary><ul className="warnings">{parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
      </div>
    </Modal>
  );
}
