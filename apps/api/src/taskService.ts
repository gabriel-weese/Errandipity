import type { Prisma, Task, TaskSeries } from '@prisma/client';
import {
  nextDueDate,
  todayLocal,
  type CreateTaskData,
  type EditScope,
  type Recurrence,
  type TaskDto,
  type UpdateTaskInput,
} from '@errandipity/shared';
import { prisma } from './db';

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

type TaskWithSeries = Task & { series: TaskSeries };

function ruleOf(series: TaskSeries): Recurrence {
  switch (series.recurrenceType) {
    case 'weekly':
      return { type: 'weekly', daysOfWeek: JSON.parse(series.daysOfWeek ?? '[]') };
    case 'daily':
      return { type: 'daily' };
    case 'monthly':
      return {
        type: 'monthly',
        daysOfMonth: JSON.parse(series.daysOfMonth ?? '[]'),
        anchors: JSON.parse(series.monthlyAnchors ?? '[]'),
      };
    case 'interval':
      return { type: 'interval', intervalDays: series.intervalDays ?? 1 };
    default:
      return { type: 'none' };
  }
}

function ruleColumns(rule: Recurrence) {
  return {
    recurrenceType: rule.type,
    daysOfWeek: rule.type === 'weekly' ? JSON.stringify(rule.daysOfWeek) : null,
    daysOfMonth: rule.type === 'monthly' ? JSON.stringify(rule.daysOfMonth) : null,
    monthlyAnchors: rule.type === 'monthly' ? JSON.stringify(rule.anchors) : null,
    intervalDays: rule.type === 'interval' ? rule.intervalDays : null,
  };
}

function toDto(task: TaskWithSeries): TaskDto {
  return {
    id: task.id,
    seriesId: task.seriesId,
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    status: task.status === 'done' ? 'done' : 'pending',
    completedAt: task.completedAt?.toISOString() ?? null,
    timesRescheduled: task.timesRescheduled,
    recurrence: ruleOf(task.series),
  };
}

async function getTask(tx: Prisma.TransactionClient, id: string): Promise<TaskWithSeries> {
  const task = await tx.task.findUnique({ where: { id }, include: { series: true } });
  if (!task) throw new NotFoundError(`Task ${id} not found`);
  return task;
}

/** Creates the series' next task from its template, if the series recurs. */
async function spawnNext(
  tx: Prisma.TransactionClient,
  task: TaskWithSeries,
  today: string,
): Promise<TaskDto | null> {
  if (task.series.archivedAt) return null;
  const dueDate = nextDueDate(ruleOf(task.series), { dueDate: task.dueDate, completedOn: today });
  if (!dueDate) return null;
  const next = await tx.task.create({
    data: {
      seriesId: task.seriesId,
      title: task.series.title,
      notes: task.series.notes,
      priority: task.series.priority,
      dueTime: task.series.dueTime,
      dueDate,
    },
    include: { series: true },
  });
  return toDto(next);
}

export async function listTasks(query: { from?: string; to?: string; status?: 'pending' | 'done' }) {
  const tasks = await prisma.task.findMany({
    where: { dueDate: { gte: query.from, lte: query.to }, status: query.status },
    include: { series: true },
    orderBy: { dueDate: 'asc' },
  });
  return tasks.map(toDto);
}

/** The latest completions, newest first, showing each series only once. */
export async function listRecentlyCompleted(limit = 10) {
  const tasks = await prisma.task.findMany({
    where: { status: 'done' },
    orderBy: { completedAt: 'desc' },
    distinct: ['seriesId'],
    take: limit,
    include: { series: true },
  });
  return tasks.map(toDto);
}

/** Pending tasks whose due day has passed. */
export async function listOverdue(today = todayLocal()) {
  const tasks = await prisma.task.findMany({
    where: { status: 'pending', dueDate: { lt: today } },
    include: { series: true },
    orderBy: { dueDate: 'asc' },
  });
  return tasks.map(toDto);
}

export async function createTask(input: CreateTaskData) {
  const { title, notes, priority, dueDate, dueTime, recurrence } = input;
  const task = await prisma.task.create({
    data: {
      title,
      notes,
      priority,
      dueDate,
      dueTime,
      series: { create: { title, notes, priority, dueTime, ...ruleColumns(recurrence) } },
    },
    include: { series: true },
  });
  return toDto(task);
}

/**
 * scope "occurrence": changes only this task; the next one reverts to the series template.
 * scope "series": changes the template (and recurrence rule) as well as this task.
 * A changed due date applies to this task only and counts as a reschedule.
 */
export async function updateTask(id: string, scope: EditScope, input: UpdateTaskInput) {
  const { recurrence, dueDate, ...fields } = input;
  return prisma.$transaction(async (tx) => {
    const task = await getTask(tx, id);
    if (task.status !== 'pending') throw new ConflictError('Completed tasks cannot be edited');
    if (scope === 'series') {
      await tx.taskSeries.update({
        where: { id: task.seriesId },
        data: { ...fields, ...(recurrence ? ruleColumns(recurrence) : {}) },
      });
    }
    const moved = dueDate !== undefined && dueDate !== task.dueDate;
    const updated = await tx.task.update({
      where: { id },
      data: { ...fields, ...(moved ? { dueDate, timesRescheduled: { increment: 1 } } : {}) },
      include: { series: true },
    });
    return toDto(updated);
  });
}

/**
 * Undoes a completion: the task becomes pending again with its previous reschedule
 * count, and the occurrence its completion created is removed. Only the most recent
 * completion in a series can be undone.
 */
export async function uncompleteTask(id: string) {
  return prisma.$transaction(async (tx) => {
    const task = await getTask(tx, id);
    if (task.status !== 'done' || !task.completedAt) throw new ConflictError('Task is not completed');
    const later = await tx.task.findFirst({
      where: { seriesId: task.seriesId, status: 'done', completedAt: { gt: task.completedAt } },
    });
    if (later) throw new ConflictError('Only the most recent completion of a task can be undone');
    await tx.task.deleteMany({ where: { seriesId: task.seriesId, status: 'pending' } });
    await tx.taskSeries.update({ where: { id: task.seriesId }, data: { archivedAt: null } });
    const restored = await tx.task.update({
      where: { id },
      data: { status: 'pending', completedAt: null },
      include: { series: true },
    });
    return toDto(restored);
  });
}

/** Marks the task done and, for recurring tasks, creates the next one (rescheduled count 0). */
export async function completeTask(id: string, today = todayLocal()) {
  return prisma.$transaction(async (tx) => {
    const task = await getTask(tx, id);
    if (task.status !== 'pending') throw new ConflictError('Task is already completed');
    const completed = await tx.task.update({
      where: { id },
      data: { status: 'done', completedAt: new Date() },
      include: { series: true },
    });
    return { completed: toDto(completed), next: await spawnNext(tx, task, today) };
  });
}

/** Moves pending tasks to a new day and counts the move against each of them. */
export async function rescheduleTasks(ids: string[], dueDate: string) {
  await prisma.task.updateMany({
    where: { id: { in: ids }, status: 'pending' },
    data: { dueDate, timesRescheduled: { increment: 1 } },
  });
  const tasks = await prisma.task.findMany({ where: { id: { in: ids } }, include: { series: true } });
  return tasks.map(toDto);
}

/**
 * scope "occurrence": removes this task; a recurring series moves on to its next date.
 * scope "series": removes this task and stops the series. Completed history is kept.
 */
export async function deleteTask(id: string, scope: EditScope, today = todayLocal()) {
  return prisma.$transaction(async (tx) => {
    const task = await getTask(tx, id);
    await tx.task.delete({ where: { id } });
    if (scope === 'series' || task.series.recurrenceType === 'none') {
      await tx.taskSeries.update({ where: { id: task.seriesId }, data: { archivedAt: new Date() } });
      return { next: null };
    }
    return { next: task.status === 'pending' ? await spawnNext(tx, task, today) : null };
  });
}
