import Fastify from 'fastify';
import { z, ZodError } from 'zod';
import {
  bulkRescheduleSchema,
  createLabelSchema,
  createProjectSchema,
  createSectionSchema,
  createTaskSchema,
  editScopeSchema,
  listTasksQuerySchema,
  rescheduleSchema,
  updateLabelSchema,
  updateProjectSchema,
  updateSectionSchema,
  updateSettingsSchema,
  updateTaskSchema,
} from '@errandipity/shared';
import { ConflictError, NotFoundError } from './errors';
import * as labels from './labelService';
import { getProgress } from './progressService';
import * as projects from './projectService';
import * as settings from './settingsService';
import * as tasks from './taskService';

const idParams = z.object({ id: z.string() });
const scopeQuery = z.object({ scope: editScopeSchema.default('occurrence') });

export function buildApp() {
  const app = Fastify({ logger: true });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'Invalid request', issues: error.issues });
    }
    if (error instanceof NotFoundError) return reply.status(404).send({ error: error.message });
    if (error instanceof ConflictError) return reply.status(409).send({ error: error.message });
    app.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  });

  app.get('/api/health', async () => ({ ok: true }));

  // ---- Settings and progress ----

  app.get('/api/settings', async () => settings.getSettings());

  app.patch('/api/settings', async (request) =>
    settings.updateSettings(updateSettingsSchema.parse(request.body)),
  );

  app.get('/api/progress', async () => getProgress());

  // ---- Labels ----

  app.get('/api/labels', async () => labels.listLabels());

  app.post('/api/labels', async (request, reply) => {
    const label = await labels.createLabel(createLabelSchema.parse(request.body));
    return reply.status(201).send(label);
  });

  app.patch('/api/labels/:id', async (request) => {
    const { id } = idParams.parse(request.params);
    return labels.updateLabel(id, updateLabelSchema.parse(request.body));
  });

  app.delete('/api/labels/:id', async (request) => {
    const { id } = idParams.parse(request.params);
    return labels.deleteLabel(id);
  });

  // ---- Projects and their sections ----

  app.get('/api/projects', async () => projects.listProjects());

  app.post('/api/projects', async (request, reply) => {
    const project = await projects.createProject(createProjectSchema.parse(request.body));
    return reply.status(201).send(project);
  });

  app.patch('/api/projects/:id', async (request) => {
    const { id } = idParams.parse(request.params);
    return projects.updateProject(id, updateProjectSchema.parse(request.body));
  });

  app.delete('/api/projects/:id', async (request) => {
    const { id } = idParams.parse(request.params);
    return projects.deleteProject(id);
  });

  app.get('/api/projects/:id/completed', async (request) => {
    const { id } = idParams.parse(request.params);
    return tasks.listCompletedInProject(id);
  });

  app.post('/api/projects/:id/sections', async (request, reply) => {
    const { id } = idParams.parse(request.params);
    const section = await projects.createSection(id, createSectionSchema.parse(request.body));
    return reply.status(201).send(section);
  });

  app.patch('/api/sections/:id', async (request) => {
    const { id } = idParams.parse(request.params);
    return projects.updateSection(id, updateSectionSchema.parse(request.body));
  });

  app.delete('/api/sections/:id', async (request) => {
    const { id } = idParams.parse(request.params);
    return projects.deleteSection(id);
  });

  // ---- Tasks ----
  // Fastify matches static segments (/tasks/overdue, /tasks/completed, /tasks/reschedule)
  // before /tasks/:id, so their registration order does not matter.

  app.get('/api/tasks', async (request) => tasks.listTasks(listTasksQuerySchema.parse(request.query)));

  // Not used by the web client, which picks overdue tasks out of the pending list.
  app.get('/api/tasks/overdue', async () => tasks.listOverdue());

  app.get('/api/tasks/completed', async () => tasks.listRecentlyCompleted());

  app.post('/api/tasks', async (request, reply) => {
    const task = await tasks.createTask(createTaskSchema.parse(request.body));
    return reply.status(201).send(task);
  });

  app.patch('/api/tasks/:id', async (request) => {
    const { id } = idParams.parse(request.params);
    const { scope } = scopeQuery.parse(request.query);
    return tasks.updateTask(id, scope, updateTaskSchema.parse(request.body));
  });

  app.delete('/api/tasks/:id', async (request) => {
    const { id } = idParams.parse(request.params);
    const { scope } = scopeQuery.parse(request.query);
    return tasks.deleteTask(id, scope);
  });

  app.post('/api/tasks/:id/complete', async (request) => {
    const { id } = idParams.parse(request.params);
    const result = await tasks.completeTask(id);
    return { ...result, progress: await getProgress() };
  });

  app.post('/api/tasks/:id/uncomplete', async (request) => {
    const { id } = idParams.parse(request.params);
    return tasks.uncompleteTask(id);
  });

  app.post('/api/tasks/reschedule', async (request) => {
    const { ids, dueDate } = bulkRescheduleSchema.parse(request.body);
    return tasks.rescheduleTasks(ids, dueDate);
  });

  // Not used by the web client, which always sends the bulk request above.
  app.post('/api/tasks/:id/reschedule', async (request) => {
    const { id } = idParams.parse(request.params);
    const { dueDate } = rescheduleSchema.parse(request.body);
    const [task] = await tasks.rescheduleTasks([id], dueDate);
    if (!task) throw new NotFoundError(`Task ${id} not found`);
    return task;
  });

  return app;
}
