import { NextRequest } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { apiData, apiError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const existing = await prisma.payment.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    select: { id: true }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Payment not found", 404);
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      status: PaymentStatus.PAID,
      paidDate: new Date(),
      updatedBy: session.userId
    }
  });

  return apiData(payment);
}
