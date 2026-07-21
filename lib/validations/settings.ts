import { z } from "zod";

export const updateSettingsSchema = z.object({
  name: z.string().min(1).max(160),
  logoUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  businessHours: z.string().max(500).optional(),
  brandPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  brandSecondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
});
