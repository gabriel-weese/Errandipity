import { useEffect } from 'react';
import type { SettingsDto } from '@errandipity/shared';

/** Must match the key read by the inline script in index.html. */
const THEME_HINT_KEY = 'errandipity-theme';
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

/** The last settings seen by this browser, used until the server responds. */
export function readThemeHint(): SettingsDto | undefined {
  try {
    const hint = JSON.parse(localStorage.getItem(THEME_HINT_KEY) ?? 'null');
    if (hint && typeof hint.matchSystem === 'boolean' && (hint.theme === 'light' || hint.theme === 'dark')) {
      return { matchSystem: hint.matchSystem, theme: hint.theme };
    }
  } catch {
    // Storage unavailable: fall through to the defaults.
  }
  return undefined;
}

function apply(settings: SettingsDto) {
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
    try {
      localStorage.setItem(THEME_HINT_KEY, JSON.stringify({ matchSystem, theme }));
    } catch {
      // The hint is optional.
    }
    if (!matchSystem) return;
    const media = systemDark();
    const onChange = () => apply({ matchSystem, theme });
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [matchSystem, theme]);
}
