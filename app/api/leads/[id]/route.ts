import { NextRequest } from "next/server";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { updateLeadSchema } from "@/lib/validations/leads";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const lead = await prisma.lead.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    include: {
      assignedTo: { select: { id: true, name: true } },
      activities: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!lead) {
    return apiError("NOT_FOUND", "Lead not found", 404);
  }

  return apiData(lead);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const body = await request.json();
  const parsed = updateLeadSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const existing = await prisma.lead.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    select: { id: true }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Lead not found", 404);
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email || undefined,
      updatedBy: session.userId
    }
  });

  return apiData(lead);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const existing = await prisma.lead.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    select: { id: true }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Lead not found", 404);
  }

  await prisma.lead.update({
    where: { id },
    data: { deletedAt: new Date(), updatedBy: session.userId }
  });

  return apiData({ deleted: true });
}
