import { NextRequest } from "next/server";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { updateStudentSchema } from "@/lib/validations/students";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const student = await prisma.student.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    include: {
      payments: {
        where: { deletedAt: null },
        orderBy: { dueDate: "desc" },
        take: 10
      },
      activities: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!student) {
    return apiError("NOT_FOUND", "Student not found", 404);
  }

  return apiData(student);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const body = await request.json();
  const parsed = updateStudentSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const existing = await prisma.student.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    select: { id: true }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Student not found", 404);
  }

  const student = await prisma.student.update({
    where: { id },
    data: {
      ...parsed.data,
      email: parsed.data.email || undefined,
      updatedBy: session.userId
    }
  });

  return apiData(student);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const existing = await prisma.student.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    select: { id: true }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Student not found", 404);
  }

  await prisma.student.update({
    where: { id },
    data: { deletedAt: new Date(), updatedBy: session.userId }
  });

  return apiData({ deleted: true });
}
