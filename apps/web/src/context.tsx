import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import type { TaskDto } from '@errandipity/shared';
import { api } from './api';
import { readThemeHint } from './theme';

/** Values to pre-fill when the dialog opens for a new task. */
export interface TaskDraft {
  title?: string;
  dueDate?: string;
}

export interface AppActions {
  today: string;
  /** Opens the task dialog: with a task to edit it, without one to create. */
  openEditor: (task?: TaskDto, draft?: TaskDraft) => void;
  /** Creates a task from just a name and a date, with default priority and no repeat. */
  quickAdd: (title: string, dueDate: string) => Promise<unknown>;
  complete: (task: TaskDto) => void;
  undoComplete: (taskId: string) => void;
  reschedule: (ids: string[], dueDate: string) => void;
}

export const AppContext = createContext<AppActions | null>(null);

export function useApp(): AppActions {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppContext');
  return value;
}

export const usePendingTasks = () => useQuery({ queryKey: ['tasks', 'pending'], queryFn: api.listPending });
export const useCompletedTasks = () =>
  useQuery({ queryKey: ['tasks', 'completed'], queryFn: api.listCompleted });
export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: api.getSettings, placeholderData: () => readThemeHint() });
