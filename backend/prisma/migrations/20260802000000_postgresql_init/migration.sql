-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "vehicle" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Orta',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Yapılacak',

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);
