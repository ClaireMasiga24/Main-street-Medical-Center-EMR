-- CreateTable: Encounter
CREATE TABLE "Encounter" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentStatus" TEXT NOT NULL DEFAULT 'AWAITING_DOCTOR',
    "currentOwnerDept" TEXT NOT NULL DEFAULT 'DOCTOR',
    "source" TEXT NOT NULL DEFAULT 'Triage',
    "lastSharedFromDept" TEXT,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "chiefComplaint" TEXT,
    "esiLevel" INTEGER,
    "triageCompletedAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ClinicalNote
CREATE TABLE "ClinicalNote" (
    "id" SERIAL NOT NULL,
    "encounterId" INTEGER NOT NULL,
    "authorStaffId" INTEGER NOT NULL,
    "authorName" TEXT NOT NULL,
    "historyOfPresentIllness" TEXT,
    "reviewOfOtherSystems" TEXT,
    "pastMedicalHistory" TEXT,
    "physicalExamination" TEXT,
    "diagnosis" TEXT,
    "differentialDiagnosis" TEXT,
    "assessment" TEXT,
    "treatmentPlan" TEXT,
    "notes" TEXT,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- Add encounterId to ImagingRequest
ALTER TABLE "ImagingRequest" ADD COLUMN IF NOT EXISTS "encounterId" INTEGER;

-- Add encounterId to LabRequest
ALTER TABLE "LabRequest" ADD COLUMN IF NOT EXISTS "encounterId" INTEGER;

-- CreateIndex
CREATE INDEX "Encounter_patientId_idx" ON "Encounter"("patientId");
CREATE INDEX "Encounter_currentOwnerDept_currentStatus_status_idx" ON "Encounter"("currentOwnerDept", "currentStatus", "status");
CREATE INDEX "ClinicalNote_encounterId_idx" ON "ClinicalNote"("encounterId");
CREATE UNIQUE INDEX "ClinicalNote_encounterId_authorStaffId_key" ON "ClinicalNote"("encounterId", "authorStaffId");
CREATE INDEX "ImagingRequest_encounterId_idx" ON "ImagingRequest"("encounterId");
CREATE INDEX "LabRequest_encounterId_idx" ON "LabRequest"("encounterId");

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImagingRequest" ADD CONSTRAINT "ImagingRequest_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
