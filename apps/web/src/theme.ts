import { useEffect } from 'react';
import { DEFAULT_SETTINGS, LIGHT_THEMES, type SettingsDto } from '@errandipity/shared';

/**
 * Must match the key read by the inline script in index.html. It holds all the settings,
 * not only the theme; the name is kept so that hints already saved are still found.
 */
const SETTINGS_HINT_KEY = 'errandipity-theme';
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

/**
 * The last settings seen by this browser, used until the server responds so the
 * theme and layout do not flash. The database remains the source of truth.
 */
export function readSettingsHint(): SettingsDto | undefined {
  try {
    const hint = JSON.parse(localStorage.getItem(SETTINGS_HINT_KEY) ?? 'null');
    if (hint && typeof hint === 'object') return { ...DEFAULT_SETTINGS, ...hint };
  } catch {
    // Storage unavailable: fall through to the defaults.
  }
  return undefined;
}

/** Keep in step with the inline script in index.html, which does the same before first paint. */
function apply(settings: Pick<SettingsDto, 'matchSystem' | 'theme'>) {
  // Matching the system only ever picks between light and dark.
  const theme = settings.matchSystem ? (systemDark().matches ? 'dark' : 'light') : settings.theme;
  const root = document.documentElement;
  root.dataset.theme = theme;
  // Native controls (date pickers, scrollbars) only know light and dark.
  root.style.colorScheme = LIGHT_THEMES.includes(theme) ? 'light' : 'dark';
}

/** Keeps the page theme in sync with the settings, and with the OS when matching it. */
export function useAppliedTheme(settings: SettingsDto) {
  const { matchSystem, theme } = settings;
  useEffect(() => {
    apply({ matchSystem, theme });
    if (!matchSystem) return;
    const media = systemDark();
    const onChange = () => apply({ matchSystem, theme });
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [matchSystem, theme]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_HINT_KEY, JSON.stringify(settings));
    } catch {
      // The hint is optional.
    }
  }, [settings]);
}
