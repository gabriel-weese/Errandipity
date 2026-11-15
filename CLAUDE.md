# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Errandipity is a single-user todo app that runs locally. It is a Yarn 1 workspace monorepo on Node 26 (`.nvmrc`), TypeScript throughout. `README.md` documents the task model, projects, labels, themes and quick-add symbols in more depth; keep it in step when behaviour changes.

## Before changing code

Present a draft before executing any code change, even when the request does not ask for one: what will change, the decisions you would make where the request leaves a choice, and any questions that need an answer. Wait for approval, then implement. Do not fill gaps in a request with your own design choices and report them afterwards.

## Commands

Run from the repository root.

```
yarn install
yarn dev            # API on http://127.0.0.1:3001 and web on http://localhost:5173, together
yarn dev:lan        # the same, with the web app also reachable from other devices on the network (no login: trusted networks only)
yarn typecheck      # tsc in all three workspaces
yarn test           # vitest, all unit tests
yarn vitest run packages/shared/src/quickAdd.test.ts     # one test file
yarn vitest run -t "resolveQuickEdit"                    # tests matching a name
yarn db:migrate     # prisma migrate dev (creates and applies migrations)
yarn db:generate    # regenerate the Prisma client
```

There is no lint or build step in use. Only `packages/shared` has tests; API and UI changes are checked by running the app (see "Trying changes without touching real data").

## Architecture

```
packages/shared   Zod schemas, DTO types and all pure domain logic (dates, recurrence, sorting, quick-add parsing)
apps/api          Fastify REST API over Prisma + SQLite
apps/web          React 19 + Vite + Tailwind 4 client, TanStack Query for server state, react-router
```

Both apps import `@errandipity/shared`. Anything that can be a pure function belongs there with a unit test: the API and the client must agree on it, and it is the only tested layer.

### Task model (the part that needs several files to see)

- A **TaskSeries** is a task's definition: the template (title, notes, priority, time, labels) and the recurrence rule. A **Task** is one occurrence. A one-off task is a series with `recurrenceType: "none"`. A series has at most one pending task.
- Completing a recurring task creates the next occurrence from the series template (`spawnNext` in `apps/api/src/taskService.ts`, date from `nextDueDate` in `packages/shared/src/recurrence.ts`). Missed days never pile up.
- Edits and deletes take `?scope=occurrence` (this task only; the next one reverts to the template) or `?scope=series` (the template and this task). The recurrence rule only changes with `scope=series`.
- A changed `dueDate` always applies to that task only and increments `timesRescheduled`, whatever the scope.
- Labels follow the same pattern: stored on the series and copied to each task, through Prisma implicit many-to-many join tables.
- A task's project and section (`projectId`, `sectionId`) are also on both the series and the task, but always change for the whole series, whatever the scope. Deleting a project deletes its tasks; deleting a section only clears `sectionId`.
- `dueDate` can be null (no date). Such a task cannot repeat (`NEEDS_DATE`), is never overdue (`isOverdue`), and is listed only on its project's page, in the Labels view if it has a project, and in All Tasks. Code that reads `dueDate` must allow for null. A reschedule is only a move from one day to another.
- Goal progress is counted from completed tasks on each request, never stored.

### Dates

Calendar dates are `"YYYY-MM-DD"` strings (`IsoDate`) in the user's local timezone and compare correctly as strings. Date arithmetic goes through the UTC helpers in `packages/shared/src/dates.ts` so daylight saving cannot shift a day. Times are `"HH:mm"` strings. Only the "completed since" queries use real `Date` moments.

### API (`apps/api/src`)

- `app.ts` holds every route and only parses input with the shared Zod schemas, then calls a service. `taskService.ts`, `projectService.ts`, `labelService.ts`, `settingsService.ts` and `progressService.ts` hold the logic.
- Services throw `NotFoundError` / `ConflictError` (`errors.ts`); the error handler in `app.ts` maps them to 404 / 409, and a `ZodError` to 400.
- The schema is kept portable to PostgreSQL: string UUID ids, enum-like values stored as strings and validated in the application layer, arrays stored as JSON strings.
- Limits such as the 10-label cap and the uniqueness of label, project and section names are enforced in the service, not the database.

### Web (`apps/web/src`)

- `context.tsx`: `AppContext` (the task actions every row uses, via `useApp()`), the `queryKeys` object and the query hooks. Use `queryKeys`, not string literals.
- `useTaskActions.ts`: the task mutations. Each one invalidates the task lists and progress on success and reports failure as a toast.
- `App.tsx`: layout, routes, and the editor and toast state. Views live in `views.tsx` (Upcoming, Today, All Tasks, Recently Completed), `LabelsView.tsx`, `ProjectsView.tsx` (the list), `ProjectView.tsx` (one project), `SettingsView.tsx` and `HelpView.tsx`.
- The client fetches all pending tasks once and filters in the browser (overdue, per day, per label, per project and section). Projects come with their sections and task counts from one request (`useProjects`); every task change reloads them. Upcoming is an endless, window-virtualised list of days.
- Task rows: `TaskRow.tsx` renders a row; `RowActions.tsx` its hover icons; `ActionMenu.tsx` the dropdown shell; `RowMenus.tsx` the priority, date and time menus.
- Dates and times are picked with `DateMenu` and `TimeMenu` everywhere. In a form, use `DateField` / `TimeField` (`PickerFields.tsx`), not native `type="date"` or `type="time"` inputs. A dropdown is drawn in a portal, but React still bubbles its events to the component that opened it, so a form inside a menu must stop its submit event from reaching an enclosing form.
- Accordions use `CollapseButton` (`ui.tsx`). On a project's page the folded state is saved on the project or section and applied to the cached project list at once (`useProjectActions`).
- Quick add: `QuickAddInput.tsx` is the shared one-line input. `QuickAdd.tsx` uses it to create a task and `TaskRowEditor.tsx` to edit one in place. `AddLine.tsx` is the same kind of row for a plain name (a new project or section). Parsing is `parseQuickAdd`; `resolveQuickAdd` turns the result into a new task. For an edit, `formatQuickEdit` writes the task out as text with all its symbols and `resolveQuickEdit` turns the edited text into changes; a symbol that was removed clears its field. Every recurrence rule must stay expressible as a `$$` symbol, or editing a task in place would drop its rule.
- Quick-add symbols are one list, `SYMBOLS` in `packages/shared/src/quickAdd.ts`. The Help page is generated from it, so a new symbol is documented by adding it there.
- `TaskDialog.tsx` is the full form; the repeat controls and their validation are in `RecurrenceFields.tsx`.

### Phone layout

- Below Tailwind's `md` breakpoint (768px) the app is laid out for a phone: `MobileNav.tsx` (bottom tab bar and add button) replaces `Sidebar.tsx`, and `MoreView.tsx` lists the views without a tab. Target is Chromium on Android, online only.
- Write layout differences with `md:` / `max-md:` classes. Use `useIsNarrow()` only where a phone renders something else altogether.
- `ActionMenu` already turns into a `BottomSheet` on a phone, so anything opened through it (including `DateField` / `TimeField`) needs no extra work; give menu content `max-md:w-full`. `RowActions` renders one "more" button and a sheet instead of the hover icons.
- Anything new that needs a place in the dashboard also needs one on a phone (a tab, the More page, or the page itself, as the section links on a project's page).
- Touch targets should be about 44px; nothing may rely on hover. Check new screens at 390px wide for horizontal overflow.
- The API stays bound to 127.0.0.1. Other devices reach it through Vite's `/api` proxy, so do not bind the API to the network.

### Styling and themes

- Colours are theme tokens defined in `apps/web/src/index.css`. Components use token classes (`bg-surface`, `text-muted`, `border-line`, `bg-accent`), never raw palette colours. The exceptions are priority and status colours (red, orange, amber, blue, emerald), which are fixed Tailwind colours; a theme they do not show up on (Meadow) redefines those `--color-*` variables in its own block.
- A new theme is one more `[data-theme='…']` block in `index.css`, plus an entry in `themeSchema` (`packages/shared/src/schemas.ts`) and the `THEMES` list in `SettingsView.tsx`. Themes: light, dark, dusk, lagoon, meadow, reef. A light theme must also be listed in `LIGHT_THEMES`; a dark theme must be added to the selector that sets the dark `--label-*` colours. The Settings theme tiles draw themselves from the tokens (each tile sets `data-theme`), so they need no per-theme code.
- Shared class strings and small pieces (`cardClass`, `fieldClass`, `accentButtonClass`, `toggleClass`, `QueryState`, `LabelIcon`, `LabelToggle`) are in `ui.tsx`.
- A label's colour is a name from `LABEL_COLORS` (`packages/shared`), stored on the label. Render it with `LabelIcon` or `labelColorClass`; the shades are the `--label-*` tokens. Class-string constants are named `somethingClass`.
- The inline script in `apps/web/index.html` applies the cached theme before first paint and must stay in step with `apply()` in `theme.ts`. The cache is only a hint; the database is the source of truth for settings.

## Version control

Do not create git commits, and do not push. Leave changes in the working tree; the developers review and commit them manually.

## Conventions

- Comments are sparse and explain why, not what. Exported functions and non-obvious props get a short `/** */` doc comment.
- Shared constants (`PRIORITIES`, `DEFAULT_PRIORITY`, `MAX_GOAL`, `MAX_LABELS`, `WEEKDAYS_SHORT`) live in `packages/shared`; do not retype their values.
- `noUncheckedIndexedAccess` is on, so indexed reads are possibly undefined.
- Days of the week are numbers with 0 = Sunday. Priority runs 1 (highest) to 5 (lowest).

## Trying changes without touching real data

`apps/api/prisma/dev.db` is the developer's real working data. Never delete or reset it. To exercise the app, use a separate database and ports:

```
cd apps/api
DATABASE_URL="file:./smoke.db" yarn prisma db push --skip-generate # create the throwaway database from schema.prisma
DATABASE_URL="file:./smoke.db" PORT=3101 yarn start                # API against it
cd ../web && API_PORT=3101 yarn vite --port 5174 --strictPort      # web pointed at that API
```

Delete `apps/api/prisma/smoke.db` afterwards (`*.db` is git-ignored).

Schema changes:

- Create the migration against the throwaway database (`DATABASE_URL="file:./smoke.db" yarn prisma migrate dev --name <name>`), review the generated SQL, and only then apply it to `dev.db` with `yarn prisma migrate deploy` after copying `dev.db` to a backup.
- On Windows, `prisma generate` fails with `EPERM` while an API process is running, because the process holds the query-engine file open. Stop the API process first; the `tsx watch` started by `yarn dev` restarts it on the next file change.
