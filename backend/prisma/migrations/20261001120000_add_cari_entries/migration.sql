-- CreateTable
CREATE TABLE "CariEntry" (
    "id" SERIAL NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CariEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CariEntry_workspaceId_idx" ON "CariEntry"("workspaceId");

-- CreateIndex
CREATE INDEX "CariEntry_workspaceId_date_idx" ON "CariEntry"("workspaceId", "date");

-- AddForeignKey
ALTER TABLE "CariEntry" ADD CONSTRAINT "CariEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
