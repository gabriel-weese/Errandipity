import { z } from 'zod';

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');
/** 1 = highest priority, 5 = lowest */
export const prioritySchema = z.number().int().min(1).max(5);

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

export const themeSchema = z.enum(['light', 'dark']);
export const sidebarSideSchema = z.enum(['left', 'right']);
/** 0 turns a goal off. */
const goalSchema = z.number().int().min(0).max(999);
export const updateSettingsSchema = z.object({
  matchSystem: z.boolean().optional(),
  theme: themeSchema.optional(),
  sidebarSide: sidebarSideSchema.optional(),
  sidebarCollapsed: z.boolean().optional(),
  dailyGoal: goalSchema.optional(),
  weeklyGoal: goalSchema.optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export interface SettingsDto {
  /** When true the app follows the operating system's theme and `theme` is ignored. */
  matchSystem: boolean;
  theme: z.infer<typeof themeSchema>;
  sidebarSide: z.infer<typeof sidebarSideSchema>;
  sidebarCollapsed: boolean;
  /** Tasks to complete per day; 0 = no goal. */
  dailyGoal: number;
  /** Tasks to complete per week (Monday to Sunday); 0 = no goal. */
  weeklyGoal: number;
}
export const DEFAULT_SETTINGS: SettingsDto = {
  matchSystem: true,
  theme: 'light',
  sidebarSide: 'left',
  sidebarCollapsed: false,
  dailyGoal: 5,
  weeklyGoal: 25,
};

export interface GoalProgress {
  /** Tasks completed so far in the period. */
  done: number;
  goal: number;
}
export interface ProgressDto {
  daily: GoalProgress;
  weekly: GoalProgress;
}

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(5000).default(''),
  priority: prioritySchema.default(3),
  dueDate: isoDateSchema,
  dueTime: timeOfDaySchema.nullable().default(null),
  recurrence: recurrenceSchema.default({ type: 'none' }),
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type CreateTaskData = z.output<typeof createTaskSchema>;

/**
 * `recurrence` is only applied when editing with scope "series".
 * Changing `dueDate` counts as a reschedule.
 */
export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().max(5000).optional(),
  priority: prioritySchema.optional(),
  dueDate: isoDateSchema.optional(),
  dueTime: timeOfDaySchema.nullable().optional(),
  recurrence: recurrenceSchema.optional(),
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
  dueDate: string;
  dueTime: string | null;
  status: 'pending' | 'done';
  completedAt: string | null;
  /** Times this task was moved instead of completed; a fresh task starts at 0. */
  timesRescheduled: number;
  recurrence: Recurrence;
}
