-- Add task comments for per-task discussion panel.
CREATE TABLE "TaskComment" (
  "id" SERIAL NOT NULL,
  "taskId" INTEGER NOT NULL,
  "userProfileId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");
CREATE INDEX "TaskComment_userProfileId_idx" ON "TaskComment"("userProfileId");

ALTER TABLE "TaskComment"
  ADD CONSTRAINT "TaskComment_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskComment"
  ADD CONSTRAINT "TaskComment_userProfileId_fkey"
  FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
