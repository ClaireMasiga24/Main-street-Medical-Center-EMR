-- AlterEnum
-- This migration adds the 'LAB_REJECTED' value to the PatientStatus enum
ALTER TYPE "PatientStatus" ADD VALUE 'LAB_REJECTED';
