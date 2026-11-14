import { useEffect } from 'react';
import { formatUsDate } from '@errandipity/shared';

const TOAST_DURATION_MS = 10_000;

export type ToastData =
  | { id: string; kind: 'completed'; taskId: string; title: string; nextDate: string | null }
  | { id: string; kind: 'goal'; title: string; message: string }
  | { id: string; kind: 'error'; message: string };

interface Props {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
  onUndo: (taskId: string) => void;
}

function Toast({ toast, onDismiss, onUndo }: { toast: ToastData } & Omit<Props, 'toasts'>) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  if (toast.kind === 'error') {
    return (
      <div className="flex items-start gap-3 rounded-lg bg-red-700 px-4 py-3 text-sm text-white shadow-lg">
        <span className="flex-1">{toast.message}</span>
        <button type="button" onClick={() => onDismiss(toast.id)} className="font-medium underline">
          Dismiss
        </button>
      </div>
    );
  }
  if (toast.kind === 'goal') {
    return (
      <div className="flex items-start gap-3 rounded-lg bg-emerald-600 px-4 py-3 text-sm text-white shadow-lg">
        <div className="flex-1">
          <div className="font-semibold">{toast.title}</div>
          <div className="text-emerald-50">{toast.message}</div>
        </div>
        <button type="button" onClick={() => onDismiss(toast.id)} className="font-medium underline">
          Dismiss
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-700 dark:ring-1 dark:ring-slate-500">
      <div className="flex-1">
        <div className="font-semibold">Task Completed</div>
        <div className="text-slate-300">{toast.title}</div>
        {toast.nextDate && <div className="text-slate-300">Next occurrence: {formatUsDate(toast.nextDate)}</div>}
      </div>
      <button
        type="button"
        onClick={() => onUndo(toast.taskId)}
        className="rounded bg-white px-2 py-1 font-medium text-slate-900 hover:bg-slate-200"
      >
        Undo
      </button>
    </div>
  );
}

export function Toasts({ toasts, onDismiss, onUndo }: Props) {
  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} onUndo={onUndo} />
      ))}
    </div>
  );
}
