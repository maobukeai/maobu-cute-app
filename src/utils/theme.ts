// Centralized accent color registry.
// App.tsx applies the active accent to CSS variables at startup and
// whenever settings change; components must never hardcode these hex
// values — consume them via the `accent` Tailwind token or
// `var(--theme-accent)`.

import type { AccentColor } from '../types';

export interface AccentDefinition {
  /** Base accent hex */
  hex: string;
  /** Pre-mixed soft tint for subtle fills (accent-soft token) */
  light: string;
  /** Chat bubble tint for the self side */
  bubble: string;
  /** Glow shadow color */
  glow: string;
  /** RGB triplet string for --accent-rgb (alpha-capable token) */
  rgb: string;
}

export const ACCENTS: Record<AccentColor, AccentDefinition> = {
  wechat: {
    hex: '#07C160',
    light: '#E8F8F0',
    bubble: '#95EC69',
    glow: 'rgba(7, 193, 96, 0.25)',
    rgb: '7 193 96',
  },
  catpaw: {
    hex: '#FF6B8B',
    light: '#FFF0F3',
    bubble: '#FF8DA6',
    glow: 'rgba(255, 107, 139, 0.3)',
    rgb: '255 107 139',
  },
  apple: {
    hex: '#0A84FF',
    light: '#EFF6FF',
    bubble: '#5AC8FA',
    glow: 'rgba(10, 132, 255, 0.28)',
    rgb: '10 132 255',
  },
  orange: {
    hex: '#FF9500',
    light: '#FFF7ED',
    bubble: '#FFB340',
    glow: 'rgba(255, 149, 0, 0.28)',
    rgb: '255 149 0',
  },
  purple: {
    hex: '#AF52DE',
    light: '#FAF5FF',
    bubble: '#DA8FFF',
    glow: 'rgba(175, 82, 222, 0.28)',
    rgb: '175 82 222',
  },
};

export const ACCENT_ORDER: AccentColor[] = ['apple', 'catpaw', 'wechat', 'orange', 'purple'];

/** Write all accent CSS variables for the given accent onto documentElement. */
export function applyAccent(accent: AccentColor) {
  const def = ACCENTS[accent] ?? ACCENTS.apple;
  const root = document.documentElement;
  root.style.setProperty('--theme-accent', def.hex);
  root.style.setProperty('--theme-accent-light', def.light);
  root.style.setProperty('--theme-accent-glow', def.glow);
  root.style.setProperty('--theme-bubble', def.bubble);
  root.style.setProperty('--accent-rgb', def.rgb);
}

/** Resolve the active accent safely (falls back to apple blue). */
export function resolveAccent(accent: AccentColor | undefined): AccentDefinition {
  if (accent && ACCENTS[accent]) return ACCENTS[accent];
  return ACCENTS.apple;
}
