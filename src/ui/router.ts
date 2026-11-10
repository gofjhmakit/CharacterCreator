// Minimal hash router (works on GitHub Pages without server rewrites).
import { useEffect, useState } from 'react';

export function parseHash(h = location.hash): string[] {
  return h.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

export function useRoute(): string[] {
  const [r, setR] = useState(parseHash());
  useEffect(() => {
    const on = () => setR(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export function go(...parts: string[]) {
  location.hash = '#/' + parts.map(encodeURIComponent).join('/');
}

export const href = (...parts: string[]) => '#/' + parts.map(encodeURIComponent).join('/');
