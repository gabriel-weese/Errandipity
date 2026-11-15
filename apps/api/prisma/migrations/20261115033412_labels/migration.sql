-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "_LabelToTask" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_LabelToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Label" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LabelToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_LabelToTaskSeries" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_LabelToTaskSeries_A_fkey" FOREIGN KEY ("A") REFERENCES "Label" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LabelToTaskSeries_B_fkey" FOREIGN KEY ("B") REFERENCES "TaskSeries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_LabelToTask_AB_unique" ON "_LabelToTask"("A", "B");

-- CreateIndex
CREATE INDEX "_LabelToTask_B_index" ON "_LabelToTask"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_LabelToTaskSeries_AB_unique" ON "_LabelToTaskSeries"("A", "B");

-- CreateIndex
CREATE INDEX "_LabelToTaskSeries_B_index" ON "_LabelToTaskSeries"("B");
