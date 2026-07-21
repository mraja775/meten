import { NextRequest } from "next/server";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";
import { createOtpCode, hashOtp, normalizeEmail, otpExpiry, OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/auth/otp";
import { sendStudentOtpEmail } from "@/lib/auth/email";
import { requestStudentOtpSchema } from "@/lib/validations/consumer-auth";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("BAD_REQUEST", "Request body must be valid JSON.", 400); }
  const parsed = requestStudentOtpSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const email = normalizeEmail(parsed.data.email);
  const students = await prisma.student.findMany({
    where: { email: { equals: email, mode: "insensitive" }, status: "ACTIVE", deletedAt: null,
      academy: { deletedAt: null, ...(parsed.data.academySlug ? { slug: parsed.data.academySlug } : {}) } },
    select: { id: true, academyId: true, email: true }, take: 2
  });
  const generic = { message: "If an eligible account exists, a code has been sent.", retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS };
  if (students.length !== 1 || !students[0].email) return apiData(generic, { status: 202 });
  const student = students[0];
  const recent = await prisma.studentAuthOtp.findFirst({
    where: { studentId: student.id, consumedAt: null, deletedAt: null,
      createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000) } }
  });
  if (recent) return apiData(generic, { status: 202 });
  const code = createOtpCode();
  await prisma.$transaction([
    prisma.studentAuthOtp.updateMany({ where: { studentId: student.id, consumedAt: null, deletedAt: null }, data: { consumedAt: new Date() } }),
    prisma.studentAuthOtp.create({ data: { academyId: student.academyId, studentId: student.id, email,
      codeHash: hashOtp(email, code), expiresAt: otpExpiry(), createdBy: student.id, updatedBy: student.id } })
  ]);
  try { await sendStudentOtpEmail({ email, code }); }
  catch { return apiError("INTERNAL_ERROR", "Login code could not be delivered. Try again later.", 503); }
  return apiData(generic, { status: 202 });
}
