import { startOfLocalDay, startOfLocalWeek, type ProgressDto } from '@errandipity/shared';
import { prisma } from './db';
import { getSettings } from './settingsService';

/**
 * Goal progress, counted from the task history rather than stored: completions
 * since local midnight and since Monday. Undoing a completion lowers the count.
 */
export async function getProgress(now = new Date()): Promise<ProgressDto> {
  const completedSince = (since: Date) =>
    prisma.task.count({ where: { status: 'done', completedAt: { gte: since } } });
  const [settings, daily, weekly] = await Promise.all([
    getSettings(),
    completedSince(startOfLocalDay(now)),
    completedSince(startOfLocalWeek(now)),
  ]);
  return {
    daily: { done: daily, goal: settings.dailyGoal },
    weekly: { done: weekly, goal: settings.weeklyGoal },
  };
}
