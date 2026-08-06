-- Add notifications for workspace member comments.
CREATE TABLE "Notification" (
  "id" SERIAL NOT NULL,
  "userProfileId" INTEGER NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "taskId" INTEGER NOT NULL,
  "commentId" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userProfileId_isRead_createdAt_idx"
  ON "Notification"("userProfileId", "isRead", "createdAt");
CREATE INDEX "Notification_workspaceId_createdAt_idx"
  ON "Notification"("workspaceId", "createdAt");
CREATE INDEX "Notification_taskId_idx" ON "Notification"("taskId");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userProfileId_fkey"
  FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "TaskComment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
