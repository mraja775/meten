import { z } from "zod";
import { paginationSchema, phoneSchema } from "@/lib/validations/common";

export const leadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "TRIAL_SCHEDULED",
  "TRIAL_COMPLETED",
  "JOINED",
  "LOST"
]);

export const createLeadSchema = z.object({
  name: z.string().min(1).max(120),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal("")),
  parentName: z.string().max(120).optional(),
  studentAge: z.coerce.number().int().min(3).max(30).optional(),
  source: z.string().max(80).optional(),
  status: leadStatusSchema.default("NEW"),
  notes: z.string().max(2000).optional(),
  followUpDate: z.coerce.date().optional(),
  assignedToId: z.string().uuid().optional()
});

export const updateLeadSchema = createLeadSchema.partial();

export const leadListQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: leadStatusSchema.optional(),
  source: z.string().optional(),
  assignedTo: z.string().uuid().optional()
});
