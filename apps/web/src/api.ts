import type {
  CreateTaskInput,
  EditScope,
  ProgressDto,
  SettingsDto,
  TaskDto,
  UpdateSettingsInput,
  UpdateTaskInput,
} from '@errandipity/shared';

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  listPending: () => request<TaskDto[]>('/tasks?status=pending'),
  listCompleted: () => request<TaskDto[]>('/tasks/completed'),
  create: (input: CreateTaskInput) => request<TaskDto>('/tasks', 'POST', input),
  update: (id: string, scope: EditScope, input: UpdateTaskInput) =>
    request<TaskDto>(`/tasks/${id}?scope=${scope}`, 'PATCH', input),
  complete: (id: string) =>
    request<{ completed: TaskDto; next: TaskDto | null; progress: ProgressDto }>(`/tasks/${id}/complete`, 'POST'),
  uncomplete: (id: string) => request<TaskDto>(`/tasks/${id}/uncomplete`, 'POST'),
  reschedule: (ids: string[], dueDate: string) =>
    request<TaskDto[]>('/tasks/reschedule', 'POST', { ids, dueDate }),
  remove: (id: string, scope: EditScope) =>
    request<{ next: TaskDto | null }>(`/tasks/${id}?scope=${scope}`, 'DELETE'),
  getProgress: () => request<ProgressDto>('/progress'),
  getSettings: () => request<SettingsDto>('/settings'),
  updateSettings: (changes: UpdateSettingsInput) => request<SettingsDto>('/settings', 'PATCH', changes),
};
