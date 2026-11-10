import { useApp } from '@/state/store';
import { CONTENT_COVERAGE, CONTENT_VERSION } from '@/content';

export function About() {
  const db = useApp((s) => s.db);
  const count = (m: Map<string, { source?: { kind: string } }>) => {
    let srd = 0, summary = 0, custom = 0;
    for (const v of m.values()) { const k = v.source?.kind; if (k === 'srd') srd++; else if (k === 'custom') custom++; else summary++; }
    return `${m.size} (${srd} SRD, ${summary} summaries${custom ? `, ${custom} custom` : ''})`;
  };
  return (
    <div className="stack lg" style={{ maxWidth: 900 }}>
      <h1>About Grimoire</h1>
      <p>An offline-first D&D 5th Edition (2014 rules) character builder and manager. It runs entirely in your browser: no account, no server, no tracking. Characters are saved locally and can be exported as JSON.</p>
      <div className="panel">
        <h3>Bundled content (v{CONTENT_VERSION})</h3>
        <dl className="kv" style={{ marginTop: 8 }}>
          <dt>Races</dt><dd>{count(db.races)}</dd>
          <dt>Classes</dt><dd>{count(db.classes)}</dd>
          <dt>Subclasses</dt><dd>{count(db.subclasses)}</dd>
          <dt>Backgrounds</dt><dd>{count(db.backgrounds)}</dd>
          <dt>Feats</dt><dd>{count(db.feats)}</dd>
          <dt>Spells</dt><dd>{count(db.spells)}</dd>
          <dt>Items</dt><dd>{count(db.items)}</dd>
        </dl>
        <p className="small" style={{ marginTop: 10 }}>{CONTENT_COVERAGE.srd}</p>
        <p className="small">{CONTENT_COVERAGE.summary}</p>
        <p className="small muted">This is not a complete copy of every published option. Add anything missing in the Library.</p>
      </div>
      <div className="panel small">
        <h3>Legal</h3>
        <p>This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.</p>
        <p>Dungeons & Dragons is a trademark of Wizards of the Coast. This app is unofficial fan content and is not affiliated with or endorsed by Wizards of the Coast.</p>
      </div>
    </div>
  );
}
