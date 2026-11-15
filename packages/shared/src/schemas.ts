import { z } from 'zod';
import type { IsoDate } from './dates';

// ---- Primitives ----

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');
/** 1 = highest priority, 5 = lowest */
export const prioritySchema = z.number().int().min(1).max(5);
export const PRIORITIES = [1, 2, 3, 4, 5] as const;
export const DEFAULT_PRIORITY = 3;

/** " (highest)" for 1, " (lowest)" for 5 and nothing in between, to follow a priority number. */
export function priorityHint(priority: number): string {
  return priority === 1 ? ' (highest)' : priority === 5 ? ' (lowest)' : '';
}

// ---- Recurrence ----

/** first = the 1st; middle = half the month's length, rounded up; last = the final day. */
export const monthlyAnchorSchema = z.enum(['first', 'middle', 'last']);
export type MonthlyAnchor = z.infer<typeof monthlyAnchorSchema>;

export const recurrenceSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('none') }),
    /** Every calendar day. */
    z.object({ type: z.literal('daily') }),
    /** 0 = Sunday … 6 = Saturday */
    z.object({ type: z.literal('weekly'), daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1) }),
    /**
     * Any mix of specific days and anchors; the next occurrence is whichever comes first.
     * Specific days past the end of a short month fall on its last day.
     */
    z.object({
      type: z.literal('monthly'),
      daysOfMonth: z.array(z.number().int().min(1).max(31)).default([]),
      anchors: z.array(monthlyAnchorSchema).default([]),
    }),
    /** Counted from the day the task was last completed. */
    z.object({ type: z.literal('interval'), intervalDays: z.number().int().min(1) }),
  ])
  .superRefine((rule, ctx) => {
    if (rule.type === 'monthly' && rule.daysOfMonth.length + rule.anchors.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Pick at least one day of the month' });
    }
  });
export type Recurrence = z.infer<typeof recurrenceSchema>;

// ---- Settings ----

export const themeSchema = z.enum(['light', 'dark', 'dusk', 'lagoon', 'meadow', 'reef']);
export type Theme = z.infer<typeof themeSchema>;
/** Themes with a light background; every other theme is dark. */
export const LIGHT_THEMES: readonly Theme[] = ['light', 'meadow', 'reef'];
export const sidebarSideSchema = z.enum(['left', 'right']);
export type SidebarSide = z.infer<typeof sidebarSideSchema>;

export const MAX_GOAL = 999;
/** 0 turns a goal off. */
const goalSchema = z.number().int().min(0).max(MAX_GOAL);

export const updateSettingsSchema = z.object({
  matchSystem: z.boolean().optional(),
  theme: themeSchema.optional(),
  sidebarSide: sidebarSideSchema.optional(),
  sidebarCollapsed: z.boolean().optional(),
  dailyGoal: goalSchema.optional(),
  weeklyGoal: goalSchema.optional(),
  projectsExpanded: z.boolean().optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export interface SettingsDto {
  /** When true the app follows the operating system's theme and `theme` is ignored. */
  matchSystem: boolean;
  theme: Theme;
  sidebarSide: SidebarSide;
  sidebarCollapsed: boolean;
  /** Tasks to complete per day; 0 = no goal. */
  dailyGoal: number;
  /** Tasks to complete per week (Monday to Sunday); 0 = no goal. */
  weeklyGoal: number;
  /** Whether the dashboard lists the projects under its Projects item. */
  projectsExpanded: boolean;
}

export const DEFAULT_SETTINGS: SettingsDto = {
  matchSystem: true,
  theme: 'light',
  sidebarSide: 'left',
  sidebarCollapsed: false,
  dailyGoal: 5,
  weeklyGoal: 25,
  projectsExpanded: true,
};

// ---- Labels ----

/** How many labels the user can have, and so the most a task can carry. */
export const MAX_LABELS = 10;
/** The colours a label's icon can have. Each theme supplies the shade (see index.css). */
export const LABEL_COLORS = ['gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'] as const;
export const labelColorSchema = z.enum(LABEL_COLORS);
export type LabelColor = z.infer<typeof labelColorSchema>;
export const DEFAULT_LABEL_COLOR: LabelColor = 'gray';

const labelNameSchema = z.string().trim().min(1).max(30);
export const createLabelSchema = z.object({
  name: labelNameSchema,
  color: labelColorSchema.default(DEFAULT_LABEL_COLOR),
});
export type CreateLabelInput = z.input<typeof createLabelSchema>;
export type CreateLabelData = z.output<typeof createLabelSchema>;
export const updateLabelSchema = z.object({ name: labelNameSchema.optional(), color: labelColorSchema.optional() });
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
const labelIdsSchema = z.array(z.string()).max(MAX_LABELS);

export interface LabelDto {
  id: string;
  name: string;
  color: LabelColor;
}

/**
 * The form of a label's name that identifies it: lower case with no spaces. Two labels
 * cannot share a key, and it is what follows ## in quick-add text ("Home Office" is ##homeoffice).
 */
export function labelKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

// ---- Projects ----

/** How a project's task lists are ordered: by priority then due date and time, or the reverse. */
export const projectSortSchema = z.enum(['priority', 'date']);
export type ProjectSort = z.infer<typeof projectSortSchema>;
export const DEFAULT_PROJECT_SORT: ProjectSort = 'priority';

const projectNameSchema = z.string().trim().min(1).max(80);
export const createProjectSchema = z.object({ name: projectNameSchema });
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export const updateProjectSchema = z.object({
  name: projectNameSchema.optional(),
  objective: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  targetDate: isoDateSchema.nullable().optional(),
  sortOrder: projectSortSchema.optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
/** For creating a section and for renaming one. */
export const sectionSchema = z.object({ name: projectNameSchema });
export type SectionInput = z.infer<typeof sectionSchema>;

export interface SectionDto {
  id: string;
  name: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  objective: string;
  description: string;
  targetDate: IsoDate | null;
  sortOrder: ProjectSort;
  /** In creation order. */
  sections: SectionDto[];
  /** Completed tasks in the project. */
  done: number;
  /** All its tasks, completed and pending. */
  total: number;
}

// ---- Goal progress ----

export interface GoalProgress {
  /** Tasks completed so far in the period. */
  done: number;
  goal: number;
}

export interface ProgressDto {
  daily: GoalProgress;
  weekly: GoalProgress;
}

// ---- Tasks ----

/** The message for a repeating task that would have no date. */
export const NEEDS_DATE = 'A repeating task needs a date';

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    notes: z.string().max(5000).default(''),
    priority: prioritySchema.default(DEFAULT_PRIORITY),
    /** null = no date. */
    dueDate: isoDateSchema.nullable(),
    dueTime: timeOfDaySchema.nullable().default(null),
    recurrence: recurrenceSchema.default({ type: 'none' }),
    labelIds: labelIdsSchema.default([]),
    projectId: z.string().nullable().default(null),
    /** A section of that project. */
    sectionId: z.string().nullable().default(null),
  })
  .superRefine((task, ctx) => {
    if (task.dueDate === null && task.recurrence.type !== 'none') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: NEEDS_DATE, path: ['dueDate'] });
    }
  });
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type CreateTaskData = z.output<typeof createTaskSchema>;

/**
 * `recurrence` is only applied when editing with scope "series".
 * Moving `dueDate` from one day to another counts as a reschedule; null removes the date.
 * `projectId` and `sectionId` always apply to the whole series. A new project clears the
 * section unless one is given.
 */
export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().max(5000).optional(),
  priority: prioritySchema.optional(),
  dueDate: isoDateSchema.nullable().optional(),
  dueTime: timeOfDaySchema.nullable().optional(),
  recurrence: recurrenceSchema.optional(),
  /** The complete new set of labels, replacing the current one. */
  labelIds: labelIdsSchema.optional(),
  projectId: z.string().nullable().optional(),
  sectionId: z.string().nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/** "occurrence" = only this task; "series" = this task and all future ones. */
export const editScopeSchema = z.enum(['occurrence', 'series']);
export type EditScope = z.infer<typeof editScopeSchema>;

export const rescheduleSchema = z.object({ dueDate: isoDateSchema });
export const bulkRescheduleSchema = z.object({
  ids: z.array(z.string()).min(1),
  dueDate: isoDateSchema,
});

export const listTasksQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  status: z.enum(['pending', 'done']).optional(),
});

export interface TaskDto {
  id: string;
  seriesId: string;
  title: string;
  notes: string;
  priority: number;
  /** null = no date. A repeating task always has one. */
  dueDate: IsoDate | null;
  /** "HH:mm", or null for no specific time. */
  dueTime: string | null;
  status: 'pending' | 'done';
  completedAt: string | null;
  /** Times this task was moved instead of completed; a fresh task starts at 0. */
  timesRescheduled: number;
  recurrence: Recurrence;
  /** In name order. */
  labels: LabelDto[];
  project: { id: string; name: string } | null;
  /** A section of `project`, or null. */
  sectionId: string | null;
}

/** True for a task whose day has passed. A task without a date is never overdue. */
export function isOverdue(task: { dueDate: IsoDate | null }, today: IsoDate): boolean {
  return task.dueDate !== null && task.dueDate < today;
}
