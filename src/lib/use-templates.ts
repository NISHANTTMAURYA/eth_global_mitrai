'use client';
import { useEffect, useState } from 'react';
import type { AvailableTemplate } from './templates';
export function useTemplates() {
  const [items, setItems] = useState<AvailableTemplate[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const r = await fetch('/api/templates');
        if (!r.ok) throw new Error('Could not check model availability.');
        const d = await r.json();
        if (active) {
          setItems(d.templates);
          setError('');
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    void refresh();
    const t = setInterval(() => void refresh(), 10000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);
  return { items, error };
}
