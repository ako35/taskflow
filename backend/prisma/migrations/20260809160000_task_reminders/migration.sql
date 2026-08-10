ALTER TABLE "Task"
ADD COLUMN "remindAt" TIMESTAMP(3),
ADD COLUMN "reminderNotifiedAt" TIMESTAMP(3);

ALTER TABLE "Notification"
ALTER COLUMN "commentId" DROP NOT NULL,
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'comment';

CREATE INDEX "Task_remindAt_reminderNotifiedAt_idx"
ON "Task"("remindAt", "reminderNotifiedAt");