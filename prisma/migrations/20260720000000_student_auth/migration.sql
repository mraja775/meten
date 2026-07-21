CREATE TABLE "StudentAuthOtp" (
  "id" TEXT NOT NULL, "academyId" TEXT NOT NULL, "studentId" TEXT NOT NULL,
  "email" TEXT NOT NULL, "codeHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3), "createdBy" TEXT, "updatedBy" TEXT,
  CONSTRAINT "StudentAuthOtp_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StudentSession" (
  "id" TEXT NOT NULL, "academyId" TEXT NOT NULL, "studentId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3), "createdBy" TEXT, "updatedBy" TEXT,
  CONSTRAINT "StudentSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudentAuthOtp_email_createdAt_idx" ON "StudentAuthOtp"("email", "createdAt");
CREATE INDEX "StudentAuthOtp_studentId_consumedAt_expiresAt_idx" ON "StudentAuthOtp"("studentId", "consumedAt", "expiresAt");
CREATE UNIQUE INDEX "StudentSession_tokenHash_key" ON "StudentSession"("tokenHash");
CREATE INDEX "StudentSession_studentId_deletedAt_expiresAt_idx" ON "StudentSession"("studentId", "deletedAt", "expiresAt");
CREATE INDEX "StudentSession_academyId_deletedAt_expiresAt_idx" ON "StudentSession"("academyId", "deletedAt", "expiresAt");
ALTER TABLE "StudentAuthOtp" ADD CONSTRAINT "StudentAuthOtp_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentAuthOtp" ADD CONSTRAINT "StudentAuthOtp_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentSession" ADD CONSTRAINT "StudentSession_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentSession" ADD CONSTRAINT "StudentSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
