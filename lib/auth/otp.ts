import "server-only";

import { createHmac, randomInt } from "node:crypto";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 45;

function authSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for OTP login.");
  }

  return secret;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createOtpCode() {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(email: string, code: string) {
  return createHmac("sha256", authSecret())
    .update(`${normalizeEmail(email)}:${code}`)
    .digest("hex");
}

export function otpExpiry() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MINUTES);
  return expiresAt;
}
