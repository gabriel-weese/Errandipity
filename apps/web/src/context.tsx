import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import {
  DEFAULT_SETTINGS,
  type CreateTaskInput,
  type Recurrence,
  type SettingsDto,
  type TaskDto,
  type UpdateSettingsInput,
} from '@errandipity/shared';
import { api } from './api';
import { readSettingsHint } from './theme';

/** Values to pre-fill when the dialog opens for a new task. */
export interface TaskDraft {
  title?: string;
  dueDate?: string;
  priority?: number;
  dueTime?: string | null;
  recurrence?: Recurrence;
}

export interface AppActions {
  today: string;
  /** Opens the task dialog: with a task to edit it, without one to create. */
  openEditor: (task?: TaskDto, draft?: TaskDraft) => void;
  /** Creates a task without opening the dialog; priority defaults to 3. */
  quickAdd: (task: CreateTaskInput) => Promise<unknown>;
  complete: (task: TaskDto) => void;
  undoComplete: (taskId: string) => void;
  reschedule: (ids: string[], dueDate: string) => void;
  /** Changes a task and its future occurrences from a row's quick controls. */
  quickEdit: (task: TaskDto, changes: { priority?: number; dueTime?: string | null }) => void;
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
export const useProgress = () => useQuery({ queryKey: ['progress'], queryFn: api.getProgress });
export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: api.getSettings, placeholderData: () => readSettingsHint() });

/** Saves setting changes: applied immediately, then confirmed or rolled back by the server. */
export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateSettings,
    onMutate: (changes: UpdateSettingsInput) =>
      queryClient.setQueryData<SettingsDto>(['settings'], (current) => ({ ...(current ?? DEFAULT_SETTINGS), ...changes })),
    onSuccess: (saved) => {
      queryClient.setQueryData(['settings'], saved);
      // Goals are part of the progress figures.
      return queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}
