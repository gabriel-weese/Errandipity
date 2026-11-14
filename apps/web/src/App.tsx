import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_SETTINGS, todayLocal, type GoalProgress, type TaskDto } from '@errandipity/shared';
import { useCallback, useMemo, useState } from 'react';
import { Route, Routes } from 'react-router';
import { api } from './api';
import { AppContext, useSettings, type AppActions, type TaskDraft } from './context';
import { HelpView } from './HelpView';
import { SettingsView } from './SettingsView';
import { Sidebar } from './Sidebar';
import { TaskDialog } from './TaskDialog';
import { useAppliedTheme } from './theme';
import { Toasts, type ToastData } from './Toasts';
import { AllTasksView, CompletedView, TodayView, UpcomingView } from './views';

type NewToast = ToastData extends infer T ? (T extends { id: string } ? Omit<T, 'id'> : never) : never;
interface EditorState {
  /** null = creating a new task */
  task: TaskDto | null;
  draft?: TaskDraft;
  key: string;
}

/** True when this completion is the one that brought the count up to the goal. */
const justReached = ({ done, goal }: GoalProgress) => goal > 0 && done === goal;

export function App() {
  const today = todayLocal();
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['progress'] }),
      ]),
    [queryClient],
  );
  const settings = useSettings().data ?? DEFAULT_SETTINGS;
  useAppliedTheme(settings);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const pushToast = useCallback(
    (toast: NewToast) => setToasts((all) => [...all, { ...toast, id: crypto.randomUUID() } as ToastData]),
    [],
  );
  const dismissToast = useCallback((id: string) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const onError = useCallback((error: Error) => pushToast({ kind: 'error', message: error.message }), [pushToast]);

  const create = useMutation({
    mutationFn: api.create,
    onSuccess: refresh,
    onError,
  });
  const complete = useMutation({
    mutationFn: (task: TaskDto) => api.complete(task.id),
    onSuccess: ({ completed, next, progress }) => {
      pushToast({ kind: 'completed', taskId: completed.id, title: completed.title, nextDate: next?.dueDate ?? null });
      if (justReached(progress.daily)) {
        pushToast({
          kind: 'goal',
          title: 'Daily goal reached!',
          message: `Congratulations! ${progress.daily.done} tasks completed today.`,
        });
      }
      if (justReached(progress.weekly)) {
        pushToast({
          kind: 'goal',
          title: 'Weekly goal reached!',
          message: `Congratulations! ${progress.weekly.done} tasks completed this week.`,
        });
      }
      queryClient.setQueryData(['progress'], progress);
      return refresh();
    },
    onError,
  });
  const undoComplete = useMutation({
    mutationFn: api.uncomplete,
    onSuccess: (task) => {
      // The count just dropped, so a goal toast would no longer be true.
      setToasts((all) => all.filter((t) => t.kind !== 'goal' && !(t.kind === 'completed' && t.taskId === task.id)));
      return refresh();
    },
    onError,
  });
  const reschedule = useMutation({
    mutationFn: (vars: { ids: string[]; dueDate: string }) => api.reschedule(vars.ids, vars.dueDate),
    onSuccess: refresh,
    onError,
  });

  const openEditor = useCallback(
    (task?: TaskDto, draft?: TaskDraft) =>
      setEditor({ task: task ?? null, draft, key: task?.id ?? crypto.randomUUID() }),
    [],
  );
  const closeEditor = useCallback(() => setEditor(null), []);

  const actions = useMemo<AppActions>(
    () => ({
      today,
      openEditor,
      quickAdd: create.mutateAsync,
      complete: complete.mutate,
      undoComplete: undoComplete.mutate,
      reschedule: (ids, dueDate) => reschedule.mutate({ ids, dueDate }),
    }),
    [today, openEditor, create.mutateAsync, complete.mutate, undoComplete.mutate, reschedule.mutate],
  );

  return (
    <AppContext.Provider value={actions}>
      <div className={`flex min-h-screen ${settings.sidebarSide === 'right' ? 'flex-row-reverse' : ''}`}>
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl px-4 py-8">
            <Routes>
              <Route path="/" element={<UpcomingView />} />
              <Route path="/today" element={<TodayView />} />
              <Route path="/tasks" element={<AllTasksView />} />
              <Route path="/completed" element={<CompletedView />} />
              <Route path="/help" element={<HelpView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </div>
        </main>
      </div>

      {editor && (
        <TaskDialog
          key={editor.key}
          task={editor.task}
          draft={editor.draft}
          today={today}
          onClose={closeEditor}
          onSaved={refresh}
        />
      )}
      <Toasts toasts={toasts} onDismiss={dismissToast} onUndo={undoComplete.mutate} />
    </AppContext.Provider>
  );
}
