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
- Day order: tasks with a time first, chronologically; then tasks without a time,
  by priority (1 = highest, 5 = lowest).
- Edits and deletes take `?scope=occurrence` (this task only) or `?scope=series`
  (this task and all future ones).

## Settings

`UserSettings` holds one row for the local user. The theme follows the operating
system while `matchSystem` is on (the default); otherwise `theme` (light or dark) applies.

## Development notes

`apps/api/prisma/dev.db` is the working database. To try the API without touching it,
run with `DATABASE_URL="file:./smoke.db"` and a different `PORT`.

## Moving to PostgreSQL

Change the datasource `provider` in `apps/api/prisma/schema.prisma`, point
`DATABASE_URL` at the server, and recreate the migrations. The schema avoids
SQLite-specific types to keep this a configuration change.
