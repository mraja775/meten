import { describe, expect, it } from "vitest";
import { createLeadSchema } from "@/lib/validations/leads";
import { createPaymentSchema } from "@/lib/validations/payments";
import { updateSettingsSchema } from "@/lib/validations/settings";

describe("validation schemas", () => {
  it("accepts a minimal valid lead", () => {
    const result = createLeadSchema.safeParse({
      name: "Aarav Sharma",
      phone: "+91 98765 43210"
    });

    expect(result.success).toBe(true);
  });

  it("rejects payments without a positive amount", () => {
    const result = createPaymentSchema.safeParse({
      studentId: "6f2e966b-b7c4-4b77-a06d-5db8ef59e4fc",
      amount: 0,
      dueDate: new Date()
    });

    expect(result.success).toBe(false);
  });

  it("requires valid brand colors in settings", () => {
    const result = updateSettingsSchema.safeParse({
      name: "Bangalore Precision Shooting Academy",
      brandPrimaryColor: "black",
      brandSecondaryColor: "#64748B"
    });

    expect(result.success).toBe(false);
  });
});
