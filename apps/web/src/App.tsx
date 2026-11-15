import { DEFAULT_SETTINGS, todayLocal, type TaskDto } from '@errandipity/shared';
import { useCallback, useMemo, useState } from 'react';
import { Route, Routes, useParams } from 'react-router';
import { AppContext, useSettings, type AppActions, type TaskDraft } from './context';
import { HelpView } from './HelpView';
import { LabelsView } from './LabelsView';
import { ProjectsView } from './ProjectsView';
import { ProjectView } from './ProjectView';
import { SettingsView } from './SettingsView';
import { Sidebar } from './Sidebar';
import { TaskDialog } from './TaskDialog';
import { useAppliedTheme } from './theme';
import { Toasts, useToasts } from './Toasts';
import { useTaskActions } from './useTaskActions';
import { AllTasksView, CompletedView, TodayView, UpcomingView } from './views';

function KeyedProjectView() {
  const { id } = useParams();
  return <ProjectView key={id} />;
}

interface EditorState {
  /** null = creating a new task */
  task: TaskDto | null;
  draft?: TaskDraft;
  /** Changes each time the dialog opens, so that it starts with fresh form state. */
  key: string;
}

export function App() {
  // Recomputed on every render, so the date rolls over at the first render after midnight.
  const today = todayLocal();
  const settings = useSettings().data ?? DEFAULT_SETTINGS;
  useAppliedTheme(settings);

  const toasts = useToasts();
  const { actions: taskActions, refresh } = useTaskActions(toasts);

  const [editor, setEditor] = useState<EditorState | null>(null);
  const openEditor = useCallback(
    (task?: TaskDto, draft?: TaskDraft) =>
      setEditor({ task: task ?? null, draft, key: task?.id ?? crypto.randomUUID() }),
    [],
  );
  const closeEditor = useCallback(() => setEditor(null), []);

  const actions = useMemo<AppActions>(() => ({ today, openEditor, ...taskActions }), [today, openEditor, taskActions]);

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
              <Route path="/labels" element={<LabelsView />} />
              <Route path="/projects" element={<ProjectsView />} />
              {/* The key gives each project its own state, so one project's unsaved text never shows on another. */}
              <Route path="/projects/:id" element={<KeyedProjectView />} />
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
      <Toasts toasts={toasts.toasts} onDismiss={toasts.dismiss} onUndo={taskActions.undoComplete} />
    </AppContext.Provider>
  );
}
