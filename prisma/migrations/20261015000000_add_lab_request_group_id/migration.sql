-- Groups the LabRequest rows produced by ONE doctor submission so the
-- laboratory queue can render them as a single card. Nullable: every existing
-- row keeps working, and the queue falls back to grouping those by patient +
-- requesting doctor + encounter/visit + creation minute.
ALTER TABLE "LabRequest" ADD COLUMN IF NOT EXISTS "requestGroupId" TEXT;

CREATE INDEX IF NOT EXISTS "LabRequest_requestGroupId_idx" ON "LabRequest"("requestGroupId");
