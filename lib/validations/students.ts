import { z } from "zod";
import { paginationSchema, phoneSchema } from "@/lib/validations/common";

export const studentStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const createStudentSchema = z.object({
  fullName: z.string().min(1).max(120),
  guardianName: z.string().max(120).optional(),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal("")),
  joiningDate: z.coerce.date(),
  status: studentStatusSchema.default("ACTIVE"),
  notes: z.string().max(2000).optional(),
  sourceLeadId: z.string().uuid().optional()
});

export const updateStudentSchema = createStudentSchema.partial();

export const studentListQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  status: studentStatusSchema.optional()
});
