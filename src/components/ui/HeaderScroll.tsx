import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Scroll-aware header channel: page scroll containers are marked with
 * `data-header-scroll` and the provider listens for scroll events on the
 * document capture phase (React's synthetic onScroll proved unreliable
 * inside nested lazy boundaries on the Android WebView).
 */
interface HeaderScrollValue {
  scrolled: boolean;
}

export const HeaderScrollContext = createContext<HeaderScrollValue>({ scrolled: false });

export function useProvideHeaderScroll(resetKey?: string): HeaderScrollValue {
  const [scrolled, setScrolled] = useState(false);

  // Fresh page mounts at scrollTop 0 — drop any stale collapsed state
  // left over from the previous tab.
  useEffect(() => {
    setScrolled(false);
  }, [resetKey]);

  useEffect(() => {
    const onScrollCapture = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.getAttribute('data-header-scroll') === null) return;
      setScrolled(prev => {
        const next = target.scrollTop > 6;
        return prev === next ? prev : next;
      });
    };
    document.addEventListener('scroll', onScrollCapture, true);
    return () => document.removeEventListener('scroll', onScrollCapture, true);
  }, []);

  return { scrolled };
}

export function useHeaderScroll(): HeaderScrollValue {
  return useContext(HeaderScrollContext);
}
