import { useRef, useState } from 'react';

/** Accepts a local image, downscales it to max 320px and stores as a compact JPEG/WebP data URL (~30–80 KB). */
export function PortraitInput({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const onFile = async (f: File) => {
    setErr('');
    if (!f.type.startsWith('image/')) { setErr('Please choose an image file.'); return; }
    if (f.size > 15 * 1024 * 1024) { setErr('Image is larger than 15 MB.'); return; }
    try {
      const url = URL.createObjectURL(f);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const max = 320;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let data = canvas.toDataURL('image/webp', 0.82);
      if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', 0.82);
      if (data.length > 400_000) { setErr('Image could not be compressed enough.'); return; }
      onChange(data);
    } catch { setErr('Could not read this image.'); }
  };
  return (
    <div className="stack" style={{ alignItems: 'center', width: 140 }}>
      {value ? <img src={value} alt="Portrait" className="portrait" style={{ width: 120, height: 120 }} /> : <div className="portrait" style={{ width: 120, height: 120 }}>?</div>}
      <div className="row tight"><button className="small" onClick={() => ref.current?.click()}>{value ? 'Change' : 'Add portrait'}</button>{value && <button className="small ghost" onClick={() => onChange(undefined)}>Remove</button>}</div>
      {err && <span className="small bad">{err}</span>}
      <span className="small muted" style={{ textAlign: 'center' }}>Stored locally, resized to 320 px.</span>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
    </div>
  );
}
