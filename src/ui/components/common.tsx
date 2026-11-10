import { useEffect, useRef, useState, type ReactNode } from 'react';
import { signed } from '@/types/core';
import type { Breakdown, Part, CondPart } from '@/engine/derive';

export function Modal({ title, onClose, children, footer, size }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'wide' | 'narrow' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.close)')?.focus();
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size ?? ''}`} role="dialog" aria-modal="true" ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="ghost icon close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel, requireText }: { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void; requireText?: string }) {
  const [typed, setTyped] = useState('');
  const blocked = !!requireText && typed.trim() !== requireText.trim();
  return (
    <Modal title={title} onClose={onCancel} size="narrow" footer={<>
      <button onClick={onCancel}>Cancel</button>
      <button className={danger ? 'danger solid' : 'primary'} disabled={blocked} onClick={onConfirm}>{confirmLabel}</button>
    </>}>
      <div className="stack">
        <div>{message}</div>
        {requireText && <label className="field">Type <b>{requireText}</b> to confirm<input value={typed} onChange={(e) => setTyped(e.target.value)} /></label>}
      </div>
    </Modal>
  );
}

export function useConfirm() {
  const [state, setState] = useState<null | { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; requireText?: string; resolve: (ok: boolean) => void }>(null);
  const ask = (o: { title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; requireText?: string }) => new Promise<boolean>((resolve) => setState({ ...o, resolve }));
  const node = state ? <Confirm {...state} onConfirm={() => { state.resolve(true); setState(null); }} onCancel={() => { state.resolve(false); setState(null); }} /> : null;
  return { ask, node };
}

export function BreakdownView({ b, title, unit = '' }: { b: Breakdown | { total: number; parts: Part[]; conditional?: CondPart[] }; title?: string; unit?: string }) {
  const parts = b.parts;
  const anyB = b as Breakdown;
  return (
    <div className="breakdown">
      {title && <div className="caps" style={{ marginBottom: 6 }}>{title}</div>}
      {parts.map((p, i) => (
        <div className="line" key={i}><span>{p.label}</span><span className="num">{unit ? p.value : signed(p.value)}{unit}</span></div>
      ))}
      {anyB.override !== undefined && <div className="line"><span>Manual override</span><span className="num">{anyB.override}</span></div>}
      <div className="line total"><span>Total</span><span className="num">{unit ? b.total : signed(b.total)}{unit}</span></div>
      {(anyB.advantage?.length ?? 0) > 0 && <div className="good small" style={{ marginTop: 6 }}>Advantage: {anyB.advantage.map((a) => a.label).join(', ')}</div>}
      {(anyB.disadvantage?.length ?? 0) > 0 && <div className="bad small">Disadvantage: {anyB.disadvantage.map((a) => a.label).join(', ')}</div>}
      {anyB.mode === 'normal' && anyB.advantage?.length > 0 && anyB.disadvantage?.length > 0 && <div className="muted small">Advantage and disadvantage cancel out.</div>}
      {(b.conditional?.length ?? 0) > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="caps">Situational (not included)</div>
          {b.conditional!.map((c, i) => (
            <div className="line cond" key={i}><span>{c.label}: {c.condition}</span><span>{c.op === 'advantage' ? 'adv.' : c.op === 'disadvantage' ? 'dis.' : c.value !== undefined && c.value !== 0 ? signed(c.value) : ''}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NumberField({ value, onChange, min, max, step = 1, className = 'num-sm', ariaLabel }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; className?: string; ariaLabel?: string }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  const commit = (s: string) => {
    let n = Number(s);
    if (!Number.isFinite(n)) { setTxt(String(value)); return; }
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    if (n !== value) onChange(n);
    setTxt(String(n));
  };
  return <input type="number" inputMode="numeric" className={className} value={txt} min={min} max={max} step={step} aria-label={ariaLabel}
    onChange={(e) => setTxt(e.target.value)} onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); }} />;
}

export function Stepper({ value, onChange, min = 0, max = 999, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string }) {
  return (
    <span className="row tight" aria-label={label}>
      <button className="small icon" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease">−</button>
      <span className="num" style={{ minWidth: '2ch', textAlign: 'center', fontWeight: 700 }}>{value}</span>
      <button className="small icon" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">+</button>
    </span>
  );
}

export function Pips({ max, used, onSet, kind = '', square }: { max: number; used: number; onSet: (used: number) => void; kind?: string; square?: boolean }) {
  if (max > 12) {
    return <span className="row tight"><Stepper value={max - used} min={0} max={max} onChange={(v) => onSet(max - v)} /><span className="muted small">/ {max}</span></span>;
  }
  return (
    <span className="pips">
      {Array.from({ length: max }, (_, i) => {
        const isUsed = i >= max - used;
        return <button key={i} className={`pip ${kind} ${square ? 'sq' : ''} ${isUsed ? 'used' : ''}`} aria-label={`${isUsed ? 'Expended' : 'Available'} ${i + 1}`}
          onClick={() => onSet(isUsed ? max - i - 1 : max - i)} />;
      })}
    </span>
  );
}

export function Field({ label, children, required, hint }: { label: string; children: ReactNode; required?: boolean; hint?: ReactNode }) {
  return <label className="field"><span className={required ? 'req' : ''}>{label}</span>{children}{hint && <span className="muted small" style={{ fontWeight: 400 }}>{hint}</span>}</label>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Collapsible({ title, children, defaultOpen = false, right }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel">
      <div className="panel-title" style={{ marginBottom: open ? 10 : 0, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span aria-hidden>{open ? '▾' : '▸'}</span><h3 className="grow">{title}</h3>{right && <span onClick={(e) => e.stopPropagation()}>{right}</span>}
      </div>
      {open && children}
    </div>
  );
}

export const titleCase = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function fmtDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
