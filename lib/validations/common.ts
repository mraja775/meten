import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export const phoneSchema = z
  .string()
  .min(8)
  .max(20)
  .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number");
