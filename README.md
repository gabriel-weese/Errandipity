# Errandipity

A todo app for productivity and task accountability. Single user, runs locally.

## Running

```
yarn install
yarn db:migrate   # creates apps/api/prisma/dev.db (copy apps/api/.env.example to .env first)
yarn dev          # API on http://127.0.0.1:3001, web on http://localhost:5173
```

`yarn test` runs the unit tests; `yarn typecheck` checks all workspaces.

## Layout

```
apps/web         React + Vite + Tailwind client (TanStack Query for server state)
apps/api         Fastify REST API, Prisma + SQLite
packages/shared  Zod schemas, DTO types, recurrence and sorting logic
```

## Task model

- A **TaskSeries** is a task's definition: the template and the recurrence rule.
- A **Task** is one occurrence. A series has at most one pending task at a time.
- Completing a recurring task creates the next one from the series template:
  - daily / weekly / monthly: the next matching day after today (missed days never pile up)
  - monthly accepts specific days and/or first, middle, last; the earliest upcoming one wins.
    A specific day past the end of a short month falls on its last day; middle is half
    the month's length, rounded up
  - every X days: counted from the completion date
- Rescheduling moves a task to another day and increments `timesRescheduled`.
  The next task created on completion starts again at 0.
- A task is overdue once its due day has passed.
- A task may have no date (`dueDate: null`). It is never overdue and cannot repeat. With a
  project it shows on the project's page (and in the Labels view, under "No date");
  without one it shows only in All Tasks, under its priority. Giving a task its first
  date, or removing its date, is not a reschedule.
- Day order: tasks with a time first, chronologically; then tasks without a time,
  by priority (1 = highest, 5 = lowest).
- Edits and deletes take `?scope=occurrence` (this task only) or `?scope=series`
  (this task and all future ones).

## Settings and goals

`UserSettings` holds one row for the local user. The theme follows the operating
system while `matchSystem` is on (the default); otherwise `theme` (light, dark, dusk, lagoon, meadow or reef) applies.
It also stores the dashboard side and collapsed state, whether the dashboard's project list
is open, and the daily and weekly goals.

Themes are sets of colour tokens in `apps/web/src/index.css` (Light, Dark, Dusk, Lagoon, Meadow, Reef). Components
use token classes such as `bg-surface` and `text-muted`, so a new theme is one more block of
values there plus an entry in `themeSchema` and the Settings page.

Goal progress is counted from the task history (completions since local midnight and
since Monday), not stored, so undoing a completion lowers it. A goal of 0 is off.

## Labels

A `Label` is a user-defined tag, managed on the Settings page; the API allows at most 10.
Each has one of a fixed list of colours (`LABEL_COLORS`), which tints its tag icon; the exact
shade of each colour is a theme token (`--label-red` and so on in `index.css`).
A task can carry several. Labels follow the task model above: the series holds the set each
new occurrence starts with, and each task holds its own, so an edit with `scope=occurrence`
changes one task only. Names must be distinct ignoring case and spaces, because quick-add
text refers to a label as `##name` with the spaces left out. Deleting a label removes it
from every task.

The Labels view (`/labels?ids=a,b`) shows pending tasks carrying any of the chosen labels,
by day, leaving out days with none.

## Projects

A `Project` groups the tasks that lead to one goal. It has a name, an objective, a
description (both plain text), an optional target date and its own sort order. A
`ProjectSection` subdivides a project; sections are shown in creation order. A task belongs
to at most one project and, within it, at most one section. Labels are separate: a task can
have both.

- The project and section are stored on the series and copied to each task, so they always
  apply to the whole series, whatever the edit scope. Moving a task to another project
  clears its section.
- Progress ("3 / 8") is counted from the project's tasks, completed and pending, not stored.
  Every completed occurrence of a repeating task counts.
- Each project orders its task lists by priority, then due date and time, or the reverse
  (`sortProjectTasks`); tasks without a date come last.
- Deleting a section leaves its tasks in the project without a section. Deleting a project
  deletes all of its tasks, completed ones included.
- Project names are distinct ignoring case, as are section names within a project.
- What is folded away on a project's page is stored: `collapsed` on each section, and
  `detailsCollapsed`, `tasksCollapsed` and `completedCollapsed` on the project.

The Projects view (`/projects`) lists the projects; a project's page (`/projects/:id`) shows
its information, its pending tasks by section with a quick-add row in each, a line to add a
section, and its completed tasks. Each of these parts folds away under an arrow; the folded
information card keeps the progress bar and the target date, and the completed list starts
folded. Tasks are added inside a section. A task in the project without a section (its
section was deleted, or none was chosen in the task form) is listed under "Tasks", which
has no quick-add row. Quick-add creates tasks without a date unless the text has a `**` day
or a `$$` repeat. In the dashboard, Projects opens to list the projects, and the project
being viewed lists its sections.

## Development notes

`apps/api/prisma/dev.db` is the working database. To try the API without touching it,
start the API with `DATABASE_URL="file:./smoke.db"` and a different `PORT`, and point the
web app at it with `API_PORT`.

## Moving to PostgreSQL

Change the datasource `provider` in `apps/api/prisma/schema.prisma`, point
`DATABASE_URL` at the server, and recreate the migrations. The schema avoids
SQLite-specific types to keep this a configuration change.

## Quick-add symbols

The "+ Add task" line accepts symbols as separate words: `!!1`-`!!5` (priority),
`**Mon` / `**Today` / `**Tomorrow` (day), `%%9:30` / `%%7pm` (time), `$$Daily` /
`$$Weekly` / `$$Weekly:MWF` / `$$Monthly:10` / `$$Monthly:first` / `$$X:3` (repeat) and `##Work` (label). They are defined, with their help
text, in `packages/shared/src/quickAdd.ts`; the in-app Help page is generated from that list.

The pencil icon on a task row opens the same line for that task (`TaskRowEditor`), filled in by
`formatQuickEdit` with the title and the symbols for its priority, time, repeat and labels. The
line then describes the whole task apart from its day, so removing a symbol clears that field:
see `resolveQuickEdit`.
