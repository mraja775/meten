import { z } from "zod";
import { uuidSchema } from "@/lib/validations/common";

export const createTrainingSessionSchema = z.object({
  studentId: uuidSchema,
  sessionDate: z.coerce.date(),
  notes: z.string().max(2000).optional(),
  reflectionText: z.string().max(4000).optional(),
  reflectionInputMode: z.enum(["typed", "speech"]).optional()
});
