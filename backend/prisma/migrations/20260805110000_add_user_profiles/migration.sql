CREATE TABLE "UserProfile" (
  "id" SERIAL NOT NULL,
  "authEmail" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "picture" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProfile_authEmail_key" ON "UserProfile"("authEmail");