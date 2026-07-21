ALTER TABLE "TrainingSession" ADD COLUMN "verifiedScores" JSONB;
ALTER TABLE "TrainingSession" ADD COLUMN "scoresVerifiedAt" TIMESTAMP(3);
