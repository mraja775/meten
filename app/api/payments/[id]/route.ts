import { NextRequest } from "next/server";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { updatePaymentSchema } from "@/lib/validations/payments";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const payment = await prisma.payment.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    include: { student: { select: { id: true, fullName: true, phone: true } } }
  });

  if (!payment) {
    return apiError("NOT_FOUND", "Payment not found", 404);
  }

  return apiData(payment);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const body = await request.json();
  const parsed = updatePaymentSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const existing = await prisma.payment.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    select: { id: true }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Payment not found", 404);
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: { ...parsed.data, updatedBy: session.userId }
  });

  return apiData(payment);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const existing = await prisma.payment.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    select: { id: true }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Payment not found", 404);
  }

  await prisma.payment.update({
    where: { id },
    data: { deletedAt: new Date(), updatedBy: session.userId }
  });

  return apiData({ deleted: true });
}
