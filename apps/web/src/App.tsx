import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_SETTINGS, todayLocal, type TaskDto } from '@errandipity/shared';
import { useCallback, useMemo, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router';
import { api } from './api';
import { AppContext, useSettings, type AppActions, type TaskDraft } from './context';
import { SettingsView } from './SettingsView';
import { TaskDialog } from './TaskDialog';
import { useAppliedTheme } from './theme';
import { Toasts, type ToastData } from './Toasts';
import { AllTasksView, CompletedView, TodayView } from './views';

const TABS = [
  { to: '/', label: 'Today' },
  { to: '/tasks', label: 'All Tasks' },
  { to: '/completed', label: 'Recently Completed' },
];

type NewToast = ToastData extends infer T ? (T extends { id: string } ? Omit<T, 'id'> : never) : never;
interface EditorState {
  /** null = creating a new task */
  task: TaskDto | null;
  draft?: TaskDraft;
  key: string;
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M4.9 19.1l2.2-2.2M16.9 7.1l2.2-2.2" />
    </svg>
  );
}

export function App() {
  const today = todayLocal();
  const queryClient = useQueryClient();
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ['tasks'] }), [queryClient]);
  useAppliedTheme(useSettings().data ?? DEFAULT_SETTINGS);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const pushToast = useCallback(
    (toast: NewToast) => setToasts((all) => [...all, { ...toast, id: crypto.randomUUID() } as ToastData]),
    [],
  );
  const dismissToast = useCallback((id: string) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const onError = useCallback((error: Error) => pushToast({ kind: 'error', message: error.message }), [pushToast]);

  const create = useMutation({
    mutationFn: (vars: { title: string; dueDate: string }) => api.create(vars),
    onSuccess: refresh,
    onError,
  });
  const complete = useMutation({
    mutationFn: (task: TaskDto) => api.complete(task.id),
    onSuccess: ({ completed, next }) => {
      pushToast({ kind: 'completed', taskId: completed.id, title: completed.title, nextDate: next?.dueDate ?? null });
      return refresh();
    },
    onError,
  });
  const undoComplete = useMutation({
    mutationFn: api.uncomplete,
    onSuccess: (task) => {
      setToasts((all) => all.filter((t) => !(t.kind === 'completed' && t.taskId === task.id)));
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
      quickAdd: (title, dueDate) => create.mutateAsync({ title, dueDate }),
      complete: complete.mutate,
      undoComplete: undoComplete.mutate,
      reschedule: (ids, dueDate) => reschedule.mutate({ ids, dueDate }),
    }),
    [today, openEditor, create.mutateAsync, complete.mutate, undoComplete.mutate, reschedule.mutate],
  );

  return (
    <AppContext.Provider value={actions}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-center gap-2">
          <h1 className="flex-1 text-2xl font-bold">Errandipity</h1>
          <button
            type="button"
            onClick={() => openEditor()}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            New task
          </button>
          <NavLink
            to="/settings"
            aria-label="Settings"
            title="Settings"
            className={({ isActive }) =>
              `rounded p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <GearIcon />
          </NavLink>
        </header>

        <nav className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                `-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<TodayView />} />
            <Route path="/tasks" element={<AllTasksView />} />
            <Route path="/completed" element={<CompletedView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
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
