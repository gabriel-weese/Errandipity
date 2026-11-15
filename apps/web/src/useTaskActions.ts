import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { GoalProgress, IsoDate, TaskDto, UpdateTaskInput } from '@errandipity/shared';
import { useCallback, useMemo } from 'react';
import { api } from './api';
import { queryKeys, type AppActions } from './context';
import type { NewToast, useToasts } from './Toasts';

/** True when this completion is the one that brought the count up to the goal. */
const justReached = ({ done, goal }: GoalProgress) => goal > 0 && done === goal;

const goalToast = (period: 'Daily' | 'Weekly', when: string, { done }: GoalProgress): NewToast => ({
  kind: 'goal',
  title: `${period} goal reached!`,
  message: `Congratulations! ${done} tasks completed ${when}.`,
});

type TaskActions = Pick<AppActions, 'quickAdd' | 'complete' | 'undoComplete' | 'reschedule' | 'quickEdit'>;

/**
 * The task changes offered through AppContext. Each one reloads the task lists, goal
 * progress and project counts when it succeeds and reports a failure as a toast.
 */
export function useTaskActions(toasts: Pick<ReturnType<typeof useToasts>, 'push' | 'dismissWhere'>) {
  const { push: pushToast, dismissWhere: dismissToasts } = toasts;
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.progress }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
      ]),
    [queryClient],
  );
  const onError = useCallback((error: Error) => pushToast({ kind: 'error', message: error.message }), [pushToast]);

  const create = useMutation({ mutationFn: api.create, onSuccess: refresh, onError });
  const complete = useMutation({
    mutationFn: (task: TaskDto) => api.complete(task.id),
    onSuccess: ({ completed, next, progress }) => {
      pushToast({ kind: 'completed', taskId: completed.id, title: completed.title, nextDate: next?.dueDate ?? null });
      if (justReached(progress.daily)) pushToast(goalToast('Daily', 'today', progress.daily));
      if (justReached(progress.weekly)) pushToast(goalToast('Weekly', 'this week', progress.weekly));
      queryClient.setQueryData(queryKeys.progress, progress);
      return refresh();
    },
    onError,
  });
  const undoComplete = useMutation({
    mutationFn: api.uncomplete,
    onSuccess: (task) => {
      // The count just dropped, so a goal toast would no longer be true.
      dismissToasts((t) => t.kind === 'goal' || (t.kind === 'completed' && t.taskId === task.id));
      return refresh();
    },
    onError,
  });
  const reschedule = useMutation({
    mutationFn: (vars: { ids: string[]; dueDate: IsoDate }) => api.reschedule(vars.ids, vars.dueDate),
    onSuccess: refresh,
    onError,
  });
  const quickEdit = useMutation({
    mutationFn: (vars: { id: string; changes: UpdateTaskInput }) =>
      api.update(vars.id, 'series', vars.changes),
    onSuccess: refresh,
    onError,
  });

  const actions = useMemo<TaskActions>(
    () => ({
      quickAdd: create.mutateAsync,
      complete: complete.mutate,
      undoComplete: undoComplete.mutate,
      reschedule: (ids, dueDate) => reschedule.mutate({ ids, dueDate }),
      quickEdit: (task, changes) => quickEdit.mutate({ id: task.id, changes }),
    }),
    [create.mutateAsync, complete.mutate, undoComplete.mutate, reschedule.mutate, quickEdit.mutate],
  );

  return { actions, refresh };
}
