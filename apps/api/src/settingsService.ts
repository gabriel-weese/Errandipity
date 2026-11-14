import type { UserSettings } from '@prisma/client';
import type { SettingsDto, UpdateSettingsInput } from '@errandipity/shared';
import { prisma } from './db';

const SETTINGS_ID = 'default';

function toDto(row: UserSettings): SettingsDto {
  return {
    matchSystem: row.matchSystem,
    theme: row.theme === 'dark' ? 'dark' : 'light',
    sidebarSide: row.sidebarSide === 'right' ? 'right' : 'left',
    sidebarCollapsed: row.sidebarCollapsed,
    dailyGoal: row.dailyGoal,
    weeklyGoal: row.weeklyGoal,
  };
}

/** Creates the settings row with defaults on first use. */
export async function updateSettings(changes: UpdateSettingsInput = {}): Promise<SettingsDto> {
  const row = await prisma.userSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...changes },
    update: changes,
  });
  return toDto(row);
}

export const getSettings = () => updateSettings();
