import { z } from "zod";

export const requestStudentOtpSchema = z.object({
  email: z.string().trim().email().max(254),
  academySlug: z.string().trim().min(1).max(100).optional()
}).strict();

export const verifyStudentOtpSchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{6}$/)
}).strict();
