import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import {
  DEFAULT_SETTINGS,
  type CreateTaskInput,
  type IsoDate,
  type Recurrence,
  type SettingsDto,
  type TaskDto,
  type UpdateLabelInput,
  type ProgressDto,
  type ProjectDto,
  type UpdateProjectInput,
  type UpdateSectionInput,
  type UpdateSettingsInput,
  type UpdateTaskInput,
} from '@errandipity/shared';
import { api } from './api';
import { readSettingsHint } from './theme';

/** Values to pre-fill when the dialog opens for a new task. */
export interface TaskDraft {
  title?: string;
  /** null = no date. */
  dueDate?: IsoDate | null;
  priority?: number;
  dueTime?: string | null;
  recurrence?: Recurrence;
  labelIds?: string[];
  projectId?: string | null;
  sectionId?: string | null;
}

export interface AppActions {
  today: IsoDate;
  /** Opens the task dialog: with a task to edit it, without one to create. */
  openEditor: (task?: TaskDto, draft?: TaskDraft) => void;
  /** Creates a task without opening the dialog; priority defaults to 3. */
  quickAdd: (task: CreateTaskInput) => Promise<unknown>;
  complete: (task: TaskDto) => void;
  undoComplete: (taskId: string) => void;
  reschedule: (ids: string[], dueDate: IsoDate) => void;
  /**
   * Changes a task and its future occurrences from a row's quick controls.
   * A new `dueDate` moves this task only and counts as a reschedule.
   */
  quickEdit: (task: TaskDto, changes: UpdateTaskInput) => void;
}

export const AppContext = createContext<AppActions | null>(null);

export function useApp(): AppActions {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppContext');
  return value;
}

/** Cache keys for server data. Invalidating `tasks` covers both task lists. */
export const queryKeys = {
  tasks: ['tasks'],
  pendingTasks: ['tasks', 'pending'],
  completedTasks: ['tasks', 'completed'],
  projectCompleted: (projectId: string) => ['tasks', 'project-completed', projectId],
  progress: ['progress'],
  labels: ['labels'],
  projects: ['projects'],
  settings: ['settings'],
} as const;

export const usePendingTasks = () => useQuery({ queryKey: queryKeys.pendingTasks, queryFn: api.listPending });
export const useCompletedTasks = () =>
  useQuery({ queryKey: queryKeys.completedTasks, queryFn: api.listCompleted });
/** The user's labels, in name order. */
export const useLabels = () => useQuery({ queryKey: queryKeys.labels, queryFn: api.listLabels });
/** The user's projects in creation order, with their sections and task counts. */
export const useProjects = () => useQuery({ queryKey: queryKeys.projects, queryFn: api.listProjects });
export const useProjectCompleted = (projectId: string) =>
  useQuery({ queryKey: queryKeys.projectCompleted(projectId), queryFn: () => api.listProjectCompleted(projectId) });
export const useProgress = () => useQuery({ queryKey: queryKeys.progress, queryFn: api.getProgress });
export const useSettings = () =>
  useQuery({ queryKey: queryKeys.settings, queryFn: api.getSettings, placeholderData: () => readSettingsHint() });

/** Saves setting changes: applied immediately, then confirmed or rolled back by the server. */
export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateSettings,
    onMutate: (changes: UpdateSettingsInput) => {
      queryClient.setQueryData<SettingsDto>(queryKeys.settings, (current) => ({ ...(current ?? DEFAULT_SETTINGS), ...changes }));
      // The dashboard reads the goals from the progress figures, so show a new goal there at once too.
      queryClient.setQueryData<ProgressDto>(
        queryKeys.progress,
        (current) =>
          current && {
            daily: { ...current.daily, goal: changes.dailyGoal ?? current.daily.goal },
            weekly: { ...current.weekly, goal: changes.weeklyGoal ?? current.weekly.goal },
          },
      );
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.settings, saved);
      // Goals are part of the progress figures.
      return queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    },
    onError: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.progress }),
      ]),
  });
}

/** Creating, changing and deleting labels. Tasks carry their labels' names and colours, so the task lists reload too. */
export function useLabelActions() {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.labels }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
    ]);
  return {
    create: useMutation({ mutationFn: api.createLabel, onSuccess }),
    update: useMutation({
      mutationFn: ({ id, ...changes }: { id: string } & UpdateLabelInput) => api.updateLabel(id, changes),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: api.deleteLabel, onSuccess }),
  };
}

/**
 * Creating, changing and deleting projects and their sections. Tasks carry their project's
 * name and their section, so the task lists reload too. Changes to a project or a section
 * show at once (folding one away should not wait for the server) and are then confirmed
 * or rolled back by the reload.
 */
export function useProjectActions() {
  const queryClient = useQueryClient();
  const reloadProjects = () => queryClient.invalidateQueries({ queryKey: queryKeys.projects });
  const onSuccess = () => Promise.all([reloadProjects(), queryClient.invalidateQueries({ queryKey: queryKeys.tasks })]);
  const showNow = (change: (project: ProjectDto) => ProjectDto) =>
    queryClient.setQueryData<ProjectDto[]>(queryKeys.projects, (projects) => projects?.map(change));
  return {
    create: useMutation({ mutationFn: api.createProject, onSuccess }),
    update: useMutation({
      mutationFn: ({ id, ...changes }: { id: string } & UpdateProjectInput) => api.updateProject(id, changes),
      onMutate: ({ id, ...changes }) => void showNow((project) => (project.id === id ? { ...project, ...changes } : project)),
      onSuccess,
      onError: reloadProjects,
    }),
    remove: useMutation({ mutationFn: api.deleteProject, onSuccess }),
    addSection: useMutation({
      mutationFn: ({ projectId, name }: { projectId: string; name: string }) => api.createSection(projectId, name),
      onSuccess,
    }),
    updateSection: useMutation({
      mutationFn: ({ id, ...changes }: { id: string } & UpdateSectionInput) => api.updateSection(id, changes),
      onMutate: ({ id, ...changes }) =>
        void showNow((project) => ({
          ...project,
          sections: project.sections.map((section) => (section.id === id ? { ...section, ...changes } : section)),
        })),
      onSuccess,
      onError: reloadProjects,
    }),
    removeSection: useMutation({ mutationFn: api.deleteSection, onSuccess }),
  };
}
