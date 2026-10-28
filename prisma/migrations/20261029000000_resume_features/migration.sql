-- Add resume sharing, soft delete, and payload versioning.
ALTER TABLE "Resume" ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Resume" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resume" ADD COLUMN "publicSlug" TEXT;
ALTER TABLE "Resume" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Resume_publicSlug_key" ON "Resume"("publicSlug");
CREATE INDEX "Resume_userId_deletedAt_idx" ON "Resume"("userId", "deletedAt");
