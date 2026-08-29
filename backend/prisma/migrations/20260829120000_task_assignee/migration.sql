-- AlterTable
ALTER TABLE "Task" ADD COLUMN "assigneeId" INTEGER;

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
