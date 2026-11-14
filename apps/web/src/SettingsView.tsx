import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_SETTINGS, type SettingsDto, type UpdateSettingsInput } from '@errandipity/shared';
import { api } from './api';
import { useSettings } from './context';
import { cardClass, mutedClass } from './TaskRow';
import { QueryState } from './views';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export function SettingsView() {
  const queryClient = useQueryClient();
  const query = useSettings();
  const settings = query.data ?? DEFAULT_SETTINGS;

  // Applied immediately, then confirmed (or rolled back) by the server's answer.
  const save = useMutation({
    mutationFn: api.updateSettings,
    onMutate: (changes: UpdateSettingsInput) =>
      queryClient.setQueryData<SettingsDto>(['settings'], (current) => ({ ...(current ?? DEFAULT_SETTINGS), ...changes })),
    onSuccess: (saved) => queryClient.setQueryData(['settings'], saved),
    onError: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  return (
    <QueryState query={{ isPending: query.isPending && !query.data, error: query.error }}>
      <section className={`${cardClass} space-y-4 p-4`}>
        <h2 className="text-base font-semibold">Appearance</h2>

        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium">Match system</span>
            <span className={`block text-xs ${mutedClass}`}>Follow your device's light or dark setting.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="size-5"
            checked={settings.matchSystem}
            onChange={(e) => save.mutate({ matchSystem: e.target.checked })}
          />
        </label>

        <fieldset disabled={settings.matchSystem} className="flex items-center justify-between gap-4 disabled:opacity-50">
          <legend className="float-left text-sm font-medium">Theme</legend>
          <div className="flex gap-4">
            {THEMES.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === option.value}
                  onChange={() => save.mutate({ theme: option.value })}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        {settings.matchSystem && (
          <p className={`text-xs ${mutedClass}`}>Turn off "Match system" to choose a theme yourself.</p>
        )}
        {save.error && <p className="text-sm text-red-600 dark:text-red-400">Could not save: {save.error.message}</p>}
      </section>
    </QueryState>
  );
}
