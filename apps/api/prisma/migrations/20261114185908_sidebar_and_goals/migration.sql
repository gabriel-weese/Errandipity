-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "matchSystem" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "sidebarSide" TEXT NOT NULL DEFAULT 'left',
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "dailyGoal" INTEGER NOT NULL DEFAULT 5,
    "weeklyGoal" INTEGER NOT NULL DEFAULT 25,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_UserSettings" ("id", "matchSystem", "theme", "updatedAt") SELECT "id", "matchSystem", "theme", "updatedAt" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
