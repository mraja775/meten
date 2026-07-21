import { z } from "zod";
import { paginationSchema } from "@/lib/validations/common";

export const paymentStatusSchema = z.enum(["PENDING", "PAID", "OVERDUE"]);

export const createPaymentSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.coerce.number().int().positive(),
  dueDate: z.coerce.date(),
  paidDate: z.coerce.date().optional(),
  status: paymentStatusSchema.default("PENDING"),
  receiptNumber: z.string().max(80).optional(),
  notes: z.string().max(2000).optional()
});

export const updatePaymentSchema = createPaymentSchema.partial();

export const paymentListQuerySchema = paginationSchema.extend({
  status: paymentStatusSchema.optional(),
  studentId: z.string().uuid().optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional()
});
