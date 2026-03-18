import { useEffect } from 'react';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function useTauriOpener() {
  useEffect(() => {
    if (!isTauri) return undefined;
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');
      if (target === '_blank' && href && /^https?:\/\//.test(href)) {
        e.preventDefault();
        import('@tauri-apps/plugin-opener').then(({ openUrl }) => openUrl(href));
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
}
