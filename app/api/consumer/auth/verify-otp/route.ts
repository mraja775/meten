import { NextRequest } from "next/server";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";
import { hashOtp, normalizeEmail, OTP_MAX_ATTEMPTS } from "@/lib/auth/otp";
import { createSessionToken, hashToken, sessionExpiry } from "@/lib/auth/session";
import { verifyStudentOtpSchema } from "@/lib/validations/consumer-auth";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("BAD_REQUEST", "Request body must be valid JSON.", 400); }
  const parsed = verifyStudentOtpSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const email = normalizeEmail(parsed.data.email);
  const otp = await prisma.studentAuthOtp.findFirst({
    where: { email, consumedAt: null, deletedAt: null, student: { status: "ACTIVE", deletedAt: null, academy: { deletedAt: null } } },
    orderBy: { createdAt: "desc" }, include: { student: { select: { id: true, academyId: true, fullName: true, email: true, phone: true } } }
  });
  if (!otp || otp.expiresAt <= new Date()) return apiError("UNAUTHORIZED", "Invalid or expired login code.", 401);
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return apiError("UNAUTHORIZED", "Invalid or expired login code.", 401);
  if (otp.codeHash !== hashOtp(email, parsed.data.code)) {
    await prisma.studentAuthOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return apiError("UNAUTHORIZED", "Invalid or expired login code.", 401);
  }
  const token = createSessionToken();
  const expiresAt = sessionExpiry();
  await prisma.$transaction([
    prisma.studentAuthOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date(), updatedBy: otp.studentId } }),
    prisma.studentSession.create({ data: { academyId: otp.academyId, studentId: otp.studentId, tokenHash: hashToken(token), expiresAt,
      createdBy: otp.studentId, updatedBy: otp.studentId } })
  ]);
  return apiData({ token, tokenType: "Bearer", expiresAt: expiresAt.toISOString(), student: otp.student });
}
