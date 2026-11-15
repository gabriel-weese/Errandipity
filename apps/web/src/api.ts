import type {
  CreateLabelInput,
  CreateProjectInput,
  CreateTaskInput,
  EditScope,
  IsoDate,
  LabelDto,
  ProgressDto,
  ProjectDto,
  SectionDto,
  SettingsDto,
  TaskDto,
  UpdateLabelInput,
  UpdateProjectInput,
  UpdateSectionInput,
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
  reschedule: (ids: string[], dueDate: IsoDate) =>
    request<TaskDto[]>('/tasks/reschedule', 'POST', { ids, dueDate }),
  remove: (id: string, scope: EditScope) =>
    request<{ next: TaskDto | null }>(`/tasks/${id}?scope=${scope}`, 'DELETE'),
  listLabels: () => request<LabelDto[]>('/labels'),
  createLabel: (input: CreateLabelInput) => request<LabelDto>('/labels', 'POST', input),
  updateLabel: (id: string, changes: UpdateLabelInput) => request<LabelDto>(`/labels/${id}`, 'PATCH', changes),
  deleteLabel: (id: string) => request<{ ok: true }>(`/labels/${id}`, 'DELETE'),
  listProjects: () => request<ProjectDto[]>('/projects'),
  createProject: (input: CreateProjectInput) => request<ProjectDto>('/projects', 'POST', input),
  updateProject: (id: string, changes: UpdateProjectInput) => request<ProjectDto>(`/projects/${id}`, 'PATCH', changes),
  deleteProject: (id: string) => request<{ ok: true }>(`/projects/${id}`, 'DELETE'),
  listProjectCompleted: (id: string) => request<TaskDto[]>(`/projects/${id}/completed`),
  createSection: (projectId: string, name: string) =>
    request<SectionDto>(`/projects/${projectId}/sections`, 'POST', { name }),
  updateSection: (id: string, changes: UpdateSectionInput) => request<SectionDto>(`/sections/${id}`, 'PATCH', changes),
  deleteSection: (id: string) => request<{ ok: true }>(`/sections/${id}`, 'DELETE'),
  getProgress: () => request<ProgressDto>('/progress'),
  getSettings: () => request<SettingsDto>('/settings'),
  updateSettings: (changes: UpdateSettingsInput) => request<SettingsDto>('/settings', 'PATCH', changes),
};
