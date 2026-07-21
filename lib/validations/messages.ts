import { z } from "zod";
import { paginationSchema } from "@/lib/validations/common";

export const messageTypeSchema = z.enum(["WHATSAPP", "SMS", "EMAIL"]);
export const messageTemplateSchema = z.enum([
  "PAYMENT_REMINDER",
  "TRIAL_REMINDER",
  "ADMISSION_FOLLOW_UP",
  "CUSTOM"
]);
export const messageStatusSchema = z.enum(["DRAFT", "RECORDED", "SENT", "FAILED"]);

export const createMessageSchema = z.object({
  type: messageTypeSchema,
  template: messageTemplateSchema.default("CUSTOM"),
  subject: z.string().max(160).optional(),
  body: z.string().min(1).max(3000),
  status: messageStatusSchema.default("DRAFT"),
  recipients: z.array(
    z.object({
      studentId: z.string().uuid().optional(),
      leadId: z.string().uuid().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      recipientName: z.string().min(1).max(120)
    })
  ).min(1)
});

export const messageListQuerySchema = paginationSchema.extend({
  status: messageStatusSchema.optional(),
  type: messageTypeSchema.optional()
});
