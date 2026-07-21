import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiData, apiError, apiList, validationError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import {
  createPaymentSchema,
  paymentListQuerySchema
} from "@/lib/validations/payments";

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  const parsed = paymentListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { page, pageSize, status, studentId, dueFrom, dueTo } = parsed.data;
  const where: Prisma.PaymentWhereInput = {
    academyId: session.academyId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(studentId ? { studentId } : {}),
    ...(dueFrom || dueTo
      ? {
          dueDate: {
            ...(dueFrom ? { gte: dueFrom } : {}),
            ...(dueTo ? { lte: dueTo } : {})
          }
        }
      : {})
  };

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      orderBy: { dueDate: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { student: { select: { id: true, fullName: true, phone: true } } }
    }),
    prisma.payment.count({ where })
  ]);

  return apiList(payments, { total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  const body = await request.json();
  const parsed = createPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const student = await prisma.student.findFirst({
    where: {
      id: parsed.data.studentId,
      academyId: session.academyId,
      deletedAt: null
    },
    select: { id: true }
  });

  if (!student) {
    return apiError("BAD_REQUEST", "Student not found for this academy", 400);
  }

  const payment = await prisma.payment.create({
    data: {
      ...parsed.data,
      academyId: session.academyId,
      createdBy: session.userId,
      updatedBy: session.userId
    }
  });

  return apiData(payment, { status: 201 });
}
