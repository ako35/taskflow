-- Collaboration model: workspace, membership, invitations, and task workspace ownership.

CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#5b8cff',
  "icon" TEXT NOT NULL DEFAULT 'compass',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" INTEGER NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMember" (
  "id" SERIAL NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userProfileId" INTEGER NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "invitedEmail" TEXT NOT NULL,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "invitedByUserId" INTEGER NOT NULL,
  "acceptedByUserId" INTEGER,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userProfileId_key"
ON "WorkspaceMember"("workspaceId", "userProfileId");

ALTER TABLE "Task" ADD COLUMN "workspaceId" TEXT;

INSERT INTO "UserProfile" ("authEmail", "firstName", "email", "createdAt", "updatedAt")
SELECT DISTINCT LOWER(TRIM("ownerEmail")), 'Kullanici', LOWER(TRIM("ownerEmail")), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Task"
WHERE "ownerEmail" IS NOT NULL AND TRIM("ownerEmail") <> ''
ON CONFLICT ("authEmail") DO NOTHING;

INSERT INTO "Workspace" (
  "id",
  "name",
  "color",
  "icon",
  "createdAt",
  "updatedAt",
  "createdByUserId"
)
SELECT
  'ws-' || SUBSTRING(MD5(up."authEmail" || '-default') FROM 1 FOR 24),
  'Genel',
  '#5b8cff',
  'compass',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  up."id"
FROM "UserProfile" up
WHERE NOT EXISTS (
  SELECT 1
  FROM "Workspace" w
  WHERE w."createdByUserId" = up."id"
);

INSERT INTO "WorkspaceMember" ("workspaceId", "userProfileId", "role", "createdAt")
SELECT w."id", w."createdByUserId", 'OWNER', CURRENT_TIMESTAMP
FROM "Workspace" w
ON CONFLICT ("workspaceId", "userProfileId") DO NOTHING;

UPDATE "Task" t
SET "workspaceId" = mapped."workspaceId"
FROM (
  SELECT
    up."authEmail" AS "authEmail",
    w."id" AS "workspaceId"
  FROM "UserProfile" up
  JOIN "Workspace" w ON w."createdByUserId" = up."id"
) mapped
WHERE t."workspaceId" IS NULL
  AND t."ownerEmail" IS NOT NULL
  AND LOWER(TRIM(t."ownerEmail")) = mapped."authEmail";

INSERT INTO "UserProfile" (
  "authEmail",
  "firstName",
  "lastName",
  "email",
  "createdAt",
  "updatedAt"
)
VALUES (
  'legacy-system@taskflow.local',
  'Legacy',
  'System',
  'legacy-system@taskflow.local',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("authEmail") DO NOTHING;

INSERT INTO "Workspace" (
  "id",
  "name",
  "color",
  "icon",
  "createdAt",
  "updatedAt",
  "createdByUserId"
)
SELECT
  'workspace-legacy-inbox',
  'Legacy Genel',
  '#5b8cff',
  'compass',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  up."id"
FROM "UserProfile" up
WHERE up."authEmail" = 'legacy-system@taskflow.local'
  AND NOT EXISTS (
    SELECT 1 FROM "Workspace" w WHERE w."id" = 'workspace-legacy-inbox'
  );

INSERT INTO "WorkspaceMember" ("workspaceId", "userProfileId", "role", "createdAt")
SELECT 'workspace-legacy-inbox', up."id", 'OWNER', CURRENT_TIMESTAMP
FROM "UserProfile" up
WHERE up."authEmail" = 'legacy-system@taskflow.local'
ON CONFLICT ("workspaceId", "userProfileId") DO NOTHING;

UPDATE "Task"
SET "workspaceId" = 'workspace-legacy-inbox'
WHERE "workspaceId" IS NULL;

ALTER TABLE "Task" ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "WorkspaceMember_userProfileId_idx" ON "WorkspaceMember"("userProfileId");
CREATE INDEX "Invitation_workspaceId_idx" ON "Invitation"("workspaceId");
CREATE INDEX "Invitation_invitedEmail_idx" ON "Invitation"("invitedEmail");
CREATE INDEX "Task_workspaceId_idx" ON "Task"("workspaceId");

ALTER TABLE "Workspace"
ADD CONSTRAINT "Workspace_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember"
ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember"
ADD CONSTRAINT "WorkspaceMember_userProfileId_fkey"
FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
ADD CONSTRAINT "Invitation_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
ADD CONSTRAINT "Invitation_invitedByUserId_fkey"
FOREIGN KEY ("invitedByUserId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
ADD CONSTRAINT "Invitation_acceptedByUserId_fkey"
FOREIGN KEY ("acceptedByUserId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
