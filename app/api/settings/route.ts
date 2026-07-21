import { NextRequest } from "next/server";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { canManageSettings } from "@/lib/permissions/roles";
import { updateSettingsSchema } from "@/lib/validations/settings";

export async function GET() {
  const session = await getSessionContext();
  const academy = await prisma.academy.findFirst({
    where: { id: session.academyId, deletedAt: null }
  });

  if (!academy) {
    return apiError("NOT_FOUND", "Academy not found", 404);
  }

  return apiData(academy);
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionContext();

  if (!canManageSettings(session.role)) {
    return apiError("FORBIDDEN", "Only owners can update settings", 403);
  }

  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const academy = await prisma.academy.update({
    where: { id: session.academyId },
    data: {
      ...parsed.data,
      logoUrl: parsed.data.logoUrl || null,
      email: parsed.data.email || null,
      updatedBy: session.userId
    }
  });

  return apiData(academy);
}
