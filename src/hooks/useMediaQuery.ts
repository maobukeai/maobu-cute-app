import { useEffect, useState } from 'react';

/**
 * Media-query state via matchMedia — re-renders only when the breakpoint
 * actually crosses, instead of on every resize event.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Wide-screen breakpoint used by the desktop workbench / phone chassis preview. */
export function useIsWideScreen(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
