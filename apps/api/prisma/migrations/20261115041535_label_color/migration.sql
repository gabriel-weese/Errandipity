-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Label" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'gray',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Label" ("createdAt", "id", "name") SELECT "createdAt", "id", "name" FROM "Label";
DROP TABLE "Label";
ALTER TABLE "new_Label" RENAME TO "Label";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
