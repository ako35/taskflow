CREATE INDEX "Task_workspaceId_status_priority_createdAt_idx"
ON "Task"("workspaceId", "status", "priority", "createdAt" DESC);