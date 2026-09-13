/// <reference types="vite/client" />

// Dev-only performance instrumentation via the User Timing API.
// No-ops in production builds — zero cost at runtime.

export const perf = {
  mark(name: string) {
    if (!import.meta.env.DEV) return;
    try {
      performance.mark(name);
    } catch {
      /* unsupported */
    }
  },

  /** Logs the duration since `fromMark` (if it exists) and clears entries. */
  measure(name: string, fromMark: string) {
    if (!import.meta.env.DEV) return;
    try {
      performance.mark(`${name}:end`);
      performance.measure(name, fromMark, `${name}:end`);
      const entry = performance.getEntriesByName(name).pop();
      if (entry) {
        console.info(`[perf] ${name}: ${entry.duration.toFixed(1)}ms`);
      }
      performance.clearMarks(`${name}:end`);
      performance.clearMeasures(name);
    } catch {
      /* mark missing — ignore */
    }
  },

  clear(name: string) {
    if (!import.meta.env.DEV) return;
    try {
      performance.clearMarks(name);
    } catch {
      /* ignore */
    }
  },
};
