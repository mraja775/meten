CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "Role" AS ENUM ('OWNER', 'STAFF');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'TRIAL_SCHEDULED', 'TRIAL_COMPLETED', 'JOINED', 'LOST');
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');
CREATE TYPE "MessageType" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');
CREATE TYPE "MessageTemplate" AS ENUM ('PAYMENT_REMINDER', 'TRIAL_REMINDER', 'ADMISSION_FOLLOW_UP', 'CUSTOM');
CREATE TYPE "MessageStatus" AS ENUM ('DRAFT', 'RECORDED', 'SENT', 'FAILED');

CREATE TABLE "Academy" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logoUrl" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "businessHours" TEXT,
  "brandPrimaryColor" TEXT NOT NULL DEFAULT '#111827',
  "brandSecondaryColor" TEXT NOT NULL DEFAULT '#64748B',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "Academy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "academyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "role" "Role" NOT NULL DEFAULT 'STAFF',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "academyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "parentName" TEXT,
  "studentAge" INTEGER,
  "source" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "notes" TEXT,
  "followUpDate" TIMESTAMP(3),
  "assignedToId" TEXT,
  "convertedStudentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadActivity" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "academyId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Student" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "academyId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "guardianName" TEXT,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "joiningDate" TIMESTAMP(3) NOT NULL,
  "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "sourceLeadId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentActivity" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "academyId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "StudentActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "academyId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidDate" TIMESTAMP(3),
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "receiptNumber" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "academyId" TEXT NOT NULL,
  "type" "MessageType" NOT NULL,
  "template" "MessageTemplate" NOT NULL DEFAULT 'CUSTOM',
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "status" "MessageStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageRecipient" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "academyId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "studentId" TEXT,
  "leadId" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "recipientName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "MessageRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Academy_slug_key" ON "Academy"("slug");
CREATE INDEX "Academy_deletedAt_idx" ON "Academy"("deletedAt");
CREATE UNIQUE INDEX "User_academyId_email_key" ON "User"("academyId", "email");
CREATE INDEX "User_academyId_deletedAt_idx" ON "User"("academyId", "deletedAt");
CREATE UNIQUE INDEX "Lead_convertedStudentId_key" ON "Lead"("convertedStudentId");
CREATE INDEX "Lead_academyId_status_deletedAt_idx" ON "Lead"("academyId", "status", "deletedAt");
CREATE INDEX "Lead_academyId_followUpDate_deletedAt_idx" ON "Lead"("academyId", "followUpDate", "deletedAt");
CREATE INDEX "Lead_academyId_name_idx" ON "Lead"("academyId", "name");
CREATE INDEX "Lead_academyId_phone_idx" ON "Lead"("academyId", "phone");
CREATE INDEX "LeadActivity_academyId_leadId_deletedAt_idx" ON "LeadActivity"("academyId", "leadId", "deletedAt");
CREATE UNIQUE INDEX "Student_sourceLeadId_key" ON "Student"("sourceLeadId");
CREATE INDEX "Student_academyId_status_deletedAt_idx" ON "Student"("academyId", "status", "deletedAt");
CREATE INDEX "Student_academyId_fullName_idx" ON "Student"("academyId", "fullName");
CREATE INDEX "Student_academyId_phone_idx" ON "Student"("academyId", "phone");
CREATE INDEX "StudentActivity_academyId_studentId_deletedAt_idx" ON "StudentActivity"("academyId", "studentId", "deletedAt");
CREATE INDEX "Payment_academyId_status_dueDate_deletedAt_idx" ON "Payment"("academyId", "status", "dueDate", "deletedAt");
CREATE INDEX "Payment_academyId_studentId_deletedAt_idx" ON "Payment"("academyId", "studentId", "deletedAt");
CREATE INDEX "Message_academyId_status_createdAt_deletedAt_idx" ON "Message"("academyId", "status", "createdAt", "deletedAt");
CREATE INDEX "MessageRecipient_academyId_messageId_deletedAt_idx" ON "MessageRecipient"("academyId", "messageId", "deletedAt");
CREATE INDEX "MessageRecipient_academyId_studentId_deletedAt_idx" ON "MessageRecipient"("academyId", "studentId", "deletedAt");
CREATE INDEX "MessageRecipient_academyId_leadId_deletedAt_idx" ON "MessageRecipient"("academyId", "leadId", "deletedAt");

ALTER TABLE "User" ADD CONSTRAINT "User_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedStudentId_fkey" FOREIGN KEY ("convertedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_sourceLeadId_fkey" FOREIGN KEY ("sourceLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentActivity" ADD CONSTRAINT "StudentActivity_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentActivity" ADD CONSTRAINT "StudentActivity_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "Academy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
