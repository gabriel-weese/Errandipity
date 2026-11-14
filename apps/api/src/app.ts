import Fastify from 'fastify';
import { z, ZodError } from 'zod';
import {
  bulkRescheduleSchema,
  createTaskSchema,
  editScopeSchema,
  listTasksQuerySchema,
  rescheduleSchema,
  updateSettingsSchema,
  updateTaskSchema,
} from '@errandipity/shared';
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
    if (error instanceof tasks.NotFoundError) return reply.status(404).send({ error: error.message });
    if (error instanceof tasks.ConflictError) return reply.status(409).send({ error: error.message });
    app.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  });

  app.get('/api/health', async () => ({ ok: true }));

  app.get('/api/settings', async () => settings.getSettings());

  app.patch('/api/settings', async (request) =>
    settings.updateSettings(updateSettingsSchema.parse(request.body)),
  );

  app.get('/api/tasks', async (request) => tasks.listTasks(listTasksQuerySchema.parse(request.query)));

  app.get('/api/tasks/overdue', async () => tasks.listOverdue());

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
    return tasks.completeTask(id);
  });

  app.get('/api/tasks/completed', async () => tasks.listRecentlyCompleted());

  app.post('/api/tasks/:id/uncomplete', async (request) => {
    const { id } = idParams.parse(request.params);
    return tasks.uncompleteTask(id);
  });

  app.post('/api/tasks/:id/reschedule', async (request) => {
    const { id } = idParams.parse(request.params);
    const { dueDate } = rescheduleSchema.parse(request.body);
    const [task] = await tasks.rescheduleTasks([id], dueDate);
    if (!task) throw new tasks.NotFoundError(`Task ${id} not found`);
    return task;
  });

  app.post('/api/tasks/reschedule', async (request) => {
    const { ids, dueDate } = bulkRescheduleSchema.parse(request.body);
    return tasks.rescheduleTasks(ids, dueDate);
  });

  return app;
}
