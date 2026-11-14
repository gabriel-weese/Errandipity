import { useEffect } from 'react';
import { DEFAULT_SETTINGS, type SettingsDto } from '@errandipity/shared';

/** Must match the key read by the inline script in index.html. */
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

function apply(settings: Pick<SettingsDto, 'matchSystem' | 'theme'>) {
  const dark = settings.matchSystem ? systemDark().matches : settings.theme === 'dark';
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.style.colorScheme = dark ? 'dark' : 'light';
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
