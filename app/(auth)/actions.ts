"use server";

import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendOwnerOtpEmail } from "@/lib/auth/email";
import {
  createOtpCode,
  hashOtp,
  normalizeEmail,
  otpExpiry,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS
} from "@/lib/auth/otp";
import {
  clearSessionCookie,
  createSessionToken,
  hashToken,
  readSessionCookie,
  sessionExpiry,
  setSessionCookie
} from "@/lib/auth/session";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function requestOwnerOtpAction(formData: FormData) {
  const email = normalizeEmail(getString(formData, "email"));

  if (!email) {
    redirect("/sign-in?error=email-required");
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      role: Role.OWNER,
      deletedAt: null,
      academy: { deletedAt: null }
    },
    select: { id: true, email: true }
  });

  if (!user) {
    redirect(`/sign-in?sent=1&email=${encodeURIComponent(email)}`);
  }

  const recentOtp = await prisma.authOtp.findFirst({
    where: {
      userId: user.id,
      consumedAt: null,
      deletedAt: null,
      createdAt: {
        gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000)
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (recentOtp) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&cooldown=1`);
  }

  await prisma.authOtp.updateMany({
    where: {
      userId: user.id,
      consumedAt: null,
      deletedAt: null
    },
    data: {
      consumedAt: new Date(),
      updatedBy: user.id
    }
  });

  const code = createOtpCode();

  await prisma.authOtp.create({
    data: {
      userId: user.id,
      email,
      codeHash: hashOtp(email, code),
      expiresAt: otpExpiry(),
      createdBy: user.id,
      updatedBy: user.id
    }
  });

  const delivery = await sendOwnerOtpEmail({ email, code });
  redirect(`/verify-otp?email=${encodeURIComponent(email)}&sent=1&delivery=${delivery}`);
}

export async function verifyOwnerOtpAction(formData: FormData) {
  const email = normalizeEmail(getString(formData, "email"));
  const code = getString(formData, "code").replace(/\D/g, "");

  if (!email || code.length !== 6) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=invalid-code`);
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      role: Role.OWNER,
      deletedAt: null,
      academy: { deletedAt: null }
    },
    select: { id: true }
  });

  if (!user) {
    redirect("/sign-in?error=invalid-login");
  }

  const otp = await prisma.authOtp.findFirst({
    where: {
      userId: user.id,
      consumedAt: null,
      deletedAt: null
    },
    orderBy: { createdAt: "desc" }
  });

  if (!otp || otp.expiresAt <= new Date()) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=expired`);
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=too-many-attempts`);
  }

  if (otp.codeHash !== hashOtp(email, code)) {
    await prisma.authOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 }, updatedBy: user.id }
    });
    redirect(`/verify-otp?email=${encodeURIComponent(email)}&error=invalid-code`);
  }

  const token = createSessionToken();
  const expiresAt = sessionExpiry();

  await prisma.$transaction([
    prisma.authOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date(), updatedBy: user.id }
    }),
    prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        createdBy: user.id,
        updatedBy: user.id
      }
    })
  ]);

  await setSessionCookie(token, expiresAt);
  redirect("/dashboard");
}

export async function logoutAction() {
  const token = await readSessionCookie();

  if (token) {
    await prisma.userSession.updateMany({
      where: {
        tokenHash: hashToken(token),
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });
  }

  await clearSessionCookie();
  redirect("/sign-in");
}
