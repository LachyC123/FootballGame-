/**
 * Settings live in localStorage (not IndexedDB) so they are readable pre-boot —
 * mute/reduced-motion must apply before the save DB opens (docs/05 §7).
 */
export interface Settings {
  readonly revision: number;
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  screenShake: number;
  autoSwitch: boolean;
  leftHanded: boolean;
}

const KEY = 'solport.settings.v1';

export function defaultSettings(): Settings {
  const prefersReduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    revision: 1,
    muted: false,
    musicVolume: 0.8,
    sfxVolume: 1,
    reducedMotion: prefersReduced,
    screenShake: 1,
    autoSwitch: true,
    leftHanded: false,
  };
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return defaultSettings();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaultSettings();
    return { ...defaultSettings(), ...(parsed as Partial<Settings>) };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private mode) — settings simply don't persist.
  }
}
