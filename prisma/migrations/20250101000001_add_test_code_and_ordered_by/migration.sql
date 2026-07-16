-- Add testCode and orderedBy fields to LabRequest for receptionist lab ordering
ALTER TABLE "LabRequest" ADD COLUMN "testCode" TEXT;
ALTER TABLE "LabRequest" ADD COLUMN "orderedBy" TEXT;
