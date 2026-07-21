import "server-only";

import { logger } from "@/lib/logger";

export type OtpDelivery = "email" | "console";

export async function sendOwnerOtpEmail({
  email,
  code
}: {
  email: string;
  code: string;
}): Promise<OtpDelivery> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Meten <onboarding@resend.dev>";

  if (!resendApiKey) {
    logger.info("Owner login OTP generated", {
      email,
      code,
      delivery: "console",
      reason: "RESEND_API_KEY is not configured"
    });
    return "console";
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Your Meten login code",
      text: `Your Meten login code is ${code}. It expires in 10 minutes.`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111827">
          <h1 style="font-size:20px;margin:0 0 12px">Your Meten login code</h1>
          <p style="margin:0 0 16px">Use this code to sign in to Meten:</p>
          <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:0 0 16px">${code}</div>
          <p style="margin:0;color:#6B7280">This code expires in 10 minutes.</p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("Resend OTP email failed", {
      email,
      status: response.status,
      body
    });
    throw new Error("Could not send OTP email.");
  }

  logger.info("Owner login OTP emailed", {
    email,
    delivery: "email"
  });

  return "email";
}

export async function sendStudentOtpEmail({ email, code }: { email: string; code: string }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Meten <onboarding@resend.dev>";
  if (!resendApiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required for student OTP delivery in production.");
    }
    logger.info("Student login OTP generated", { email, code, delivery: "console" });
    return "console" as const;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: email, subject: "Your Meten login code",
      text: `Your Meten login code is ${code}. It expires in 10 minutes.`
    })
  });
  if (!response.ok) {
    logger.error("Student OTP email failed", { email, status: response.status });
    throw new Error("Could not send OTP email.");
  }
  return "email" as const;
}
