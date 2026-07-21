CREATE TYPE "TrainingProcessingStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED', 'UNAVAILABLE');

CREATE TABLE "TrainingSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "academyId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "sessionDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "imageUrl" TEXT,
  "imagePath" TEXT,
  "imageMimeType" TEXT,
  "imageSizeBytes" INTEGER,
  "imageWidth" INTEGER,
  "imageHeight" INTEGER,
  "originalFileName" TEXT,
  "ocrProvider" TEXT,
  "ocrStatus" "TrainingProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "ocrText" TEXT,
  "parsedScores" JSONB,
  "bestScore" DOUBLE PRECISION,
  "totalScore" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrainingSession_academyId_sessionDate_deletedAt_idx" ON "TrainingSession"("academyId", "sessionDate", "deletedAt");
CREATE INDEX "TrainingSession_academyId_studentId_sessionDate_deletedAt_idx" ON "TrainingSession"("academyId", "studentId", "sessionDate", "deletedAt");
CREATE INDEX "TrainingSession_academyId_ocrStatus_deletedAt_idx" ON "TrainingSession"("academyId", "ocrStatus", "deletedAt");

ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
