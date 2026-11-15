-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "targetDate" TEXT,
    "sortOrder" TEXT NOT NULL DEFAULT 'priority',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProjectSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectSection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seriesId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL,
    "dueDate" TEXT,
    "dueTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" DATETIME,
    "timesRescheduled" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT,
    "sectionId" TEXT,
    CONSTRAINT "Task_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TaskSeries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProjectSection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("completedAt", "createdAt", "dueDate", "dueTime", "id", "notes", "priority", "seriesId", "status", "timesRescheduled", "title", "updatedAt") SELECT "completedAt", "createdAt", "dueDate", "dueTime", "id", "notes", "priority", "seriesId", "status", "timesRescheduled", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_status_dueDate_idx" ON "Task"("status", "dueDate");
CREATE INDEX "Task_seriesId_idx" ON "Task"("seriesId");
CREATE INDEX "Task_status_completedAt_idx" ON "Task"("status", "completedAt");
CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");
CREATE TABLE "new_TaskSeries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "dueTime" TEXT,
    "recurrenceType" TEXT NOT NULL DEFAULT 'none',
    "daysOfWeek" TEXT,
    "daysOfMonth" TEXT,
    "monthlyAnchors" TEXT,
    "intervalDays" INTEGER,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT,
    "sectionId" TEXT,
    CONSTRAINT "TaskSeries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskSeries_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProjectSection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TaskSeries" ("archivedAt", "createdAt", "daysOfMonth", "daysOfWeek", "dueTime", "id", "intervalDays", "monthlyAnchors", "notes", "priority", "recurrenceType", "title", "updatedAt") SELECT "archivedAt", "createdAt", "daysOfMonth", "daysOfWeek", "dueTime", "id", "intervalDays", "monthlyAnchors", "notes", "priority", "recurrenceType", "title", "updatedAt" FROM "TaskSeries";
DROP TABLE "TaskSeries";
ALTER TABLE "new_TaskSeries" RENAME TO "TaskSeries";
CREATE TABLE "new_UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "matchSystem" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "sidebarSide" TEXT NOT NULL DEFAULT 'left',
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "dailyGoal" INTEGER NOT NULL DEFAULT 5,
    "weeklyGoal" INTEGER NOT NULL DEFAULT 25,
    "projectsExpanded" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_UserSettings" ("dailyGoal", "id", "matchSystem", "sidebarCollapsed", "sidebarSide", "theme", "updatedAt", "weeklyGoal") SELECT "dailyGoal", "id", "matchSystem", "sidebarCollapsed", "sidebarSide", "theme", "updatedAt", "weeklyGoal" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProjectSection_projectId_idx" ON "ProjectSection"("projectId");
