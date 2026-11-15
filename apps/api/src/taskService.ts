import type { Prisma, TaskSeries } from '@prisma/client';
import {
  NEEDS_DATE,
  nextDueDate,
  todayLocal,
  type CreateTaskData,
  type EditScope,
  type IsoDate,
  type Recurrence,
  type TaskDto,
  type UpdateTaskInput,
} from '@errandipity/shared';
import { prisma } from './db';
import { ConflictError, NotFoundError } from './errors';
import { byLabelName, toLabelDto } from './labelService';
import { assertPlacement } from './projectService';

/** What every task query loads: the task's labels and project, and its series with the template labels. */
const taskInclude = {
  labels: true,
  project: { select: { id: true, name: true } },
  series: { include: { labels: true } },
} satisfies Prisma.TaskInclude;
type TaskWithSeries = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

/** Rebuilds the recurrence rule from a series row. The inverse of ruleColumns. */
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

/** The series columns for a rule. Columns that do not apply to its type are cleared. */
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
    labels: [...task.labels].sort(byLabelName).map(toLabelDto),
    project: task.project,
    sectionId: task.sectionId,
  };
}

/** The relation value that links exactly these labels; fails if any of them does not exist. */
async function labelRefs(tx: Prisma.TransactionClient, labelIds: string[]) {
  const ids = [...new Set(labelIds)];
  const found = await tx.label.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw new NotFoundError('One of the labels no longer exists');
  return ids.map((id) => ({ id }));
}

async function getTask(tx: Prisma.TransactionClient, id: string): Promise<TaskWithSeries> {
  const task = await tx.task.findUnique({ where: { id }, include: taskInclude });
  if (!task) throw new NotFoundError(`Task ${id} not found`);
  return task;
}

/** Creates the series' next task from its template, if the series recurs. */
async function spawnNext(
  tx: Prisma.TransactionClient,
  task: TaskWithSeries,
  today: IsoDate,
): Promise<TaskDto | null> {
  // A repeating task always has a date; the check is for the type.
  if (task.series.archivedAt || task.dueDate === null) return null;
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
      labels: { connect: task.series.labels.map(({ id }) => ({ id })) },
      projectId: task.series.projectId,
      sectionId: task.series.sectionId,
    },
    include: taskInclude,
  });
  return toDto(next);
}

export async function listTasks(query: { from?: IsoDate; to?: IsoDate; status?: 'pending' | 'done' }) {
  // Without a range, tasks that have no date are included (first, as the database orders them).
  const inRange = query.from || query.to ? { gte: query.from, lte: query.to } : undefined;
  const tasks = await prisma.task.findMany({
    where: { dueDate: inRange, status: query.status },
    include: taskInclude,
    orderBy: { dueDate: 'asc' },
  });
  return tasks.map(toDto);
}

/** A project's completed tasks, newest first. */
export async function listCompletedInProject(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId, status: 'done' },
    orderBy: { completedAt: 'desc' },
    include: taskInclude,
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
    include: taskInclude,
  });
  return tasks.map(toDto);
}

/** Pending tasks whose due day has passed. */
export async function listOverdue(today = todayLocal()) {
  const tasks = await prisma.task.findMany({
    where: { status: 'pending', dueDate: { lt: today } },
    include: taskInclude,
    orderBy: { dueDate: 'asc' },
  });
  return tasks.map(toDto);
}

/** Creates a task together with the series that defines it. */
export async function createTask(input: CreateTaskData) {
  const { title, notes, priority, dueDate, dueTime, recurrence, labelIds, projectId, sectionId } = input;
  return prisma.$transaction(async (tx) => {
    await assertPlacement(tx, projectId, sectionId);
    const template = {
      title,
      notes,
      priority,
      dueTime,
      projectId,
      sectionId,
      labels: { connect: await labelRefs(tx, labelIds) },
    };
    const series = await tx.taskSeries.create({ data: { ...template, ...ruleColumns(recurrence) } });
    const task = await tx.task.create({ data: { ...template, dueDate, seriesId: series.id }, include: taskInclude });
    return toDto(task);
  });
}

/**
 * scope "occurrence": changes only this task; the next one reverts to the series template.
 * scope "series": changes the template (and recurrence rule) as well as this task.
 * A due date applies to this task only; moving it from one day to another counts as a
 * reschedule, while giving a task its first date or removing its date does not.
 * The project and section apply to the series and this task, whatever the scope.
 */
export async function updateTask(id: string, scope: EditScope, input: UpdateTaskInput) {
  const { recurrence, dueDate, labelIds, projectId, sectionId, ...plainFields } = input;
  return prisma.$transaction(async (tx) => {
    const task = await getTask(tx, id);
    if (task.status !== 'pending') throw new ConflictError('Completed tasks cannot be edited');

    const rule = scope === 'series' && recurrence ? recurrence : ruleOf(task.series);
    if ((dueDate === undefined ? task.dueDate : dueDate) === null && rule.type !== 'none') {
      throw new ConflictError(NEEDS_DATE);
    }

    if (projectId !== undefined || sectionId !== undefined) {
      const project = projectId === undefined ? task.projectId : projectId;
      // Moving to another project leaves the old project's section behind.
      const keptSection = project === task.projectId ? task.sectionId : null;
      const placement = { projectId: project, sectionId: sectionId === undefined ? keptSection : sectionId };
      await assertPlacement(tx, placement.projectId, placement.sectionId);
      await tx.taskSeries.update({ where: { id: task.seriesId }, data: placement });
      await tx.task.update({ where: { id }, data: placement });
    }

    const fields = { ...plainFields, ...(labelIds ? { labels: { set: await labelRefs(tx, labelIds) } } : {}) };
    if (scope === 'series') {
      await tx.taskSeries.update({
        where: { id: task.seriesId },
        data: { ...fields, ...(recurrence ? ruleColumns(recurrence) : {}) },
      });
    }
    const rescheduled = dueDate != null && task.dueDate !== null && dueDate !== task.dueDate;
    const updated = await tx.task.update({
      where: { id },
      data: {
        ...fields,
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(rescheduled ? { timesRescheduled: { increment: 1 } } : {}),
      },
      include: taskInclude,
    });
    return toDto(updated);
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
      include: taskInclude,
    });
    return { completed: toDto(completed), next: await spawnNext(tx, task, today) };
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
      include: taskInclude,
    });
    return toDto(restored);
  });
}

/**
 * Moves pending tasks to a new day and counts the move against each of them.
 * Completed tasks in `ids` are left untouched but still returned.
 */
export async function rescheduleTasks(ids: string[], dueDate: IsoDate) {
  await prisma.task.updateMany({
    where: { id: { in: ids }, status: 'pending' },
    data: { dueDate, timesRescheduled: { increment: 1 } },
  });
  const tasks = await prisma.task.findMany({ where: { id: { in: ids } }, include: taskInclude });
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
