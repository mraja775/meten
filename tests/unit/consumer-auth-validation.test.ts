import { describe, expect, it } from "vitest";
import { requestStudentOtpSchema, verifyStudentOtpSchema } from "@/lib/validations/consumer-auth";

describe("consumer authentication validation", () => {
  it("accepts a normalized login request and optional academy slug", () => {
    expect(requestStudentOtpSchema.safeParse({ email: "student@example.com", academySlug: "academy" }).success).toBe(true);
  });
  it("rejects malformed codes and unexpected privilege fields", () => {
    expect(verifyStudentOtpSchema.safeParse({ email: "student@example.com", code: "12345" }).success).toBe(false);
    expect(verifyStudentOtpSchema.safeParse({ email: "student@example.com", code: "123456", studentId: "other" }).success).toBe(false);
  });
});
