import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiData, apiList, validationError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import {
  createStudentSchema,
  studentListQuerySchema
} from "@/lib/validations/students";

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  const parsed = studentListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { page, pageSize, search, status } = parsed.data;
  const where: Prisma.StudentWhereInput = {
    academyId: session.academyId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { guardianName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [students, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.student.count({ where })
  ]);

  return apiList(students, { total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  const body = await request.json();
  const parsed = createStudentSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const student = await prisma.student.create({
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
      academyId: session.academyId,
      createdBy: session.userId,
      updatedBy: session.userId,
      activities: {
        create: {
          academyId: session.academyId,
          type: "STUDENT_CREATED",
          description: "Student created.",
          createdBy: session.userId,
          updatedBy: session.userId
        }
      }
    }
  });

  return apiData(student, { status: 201 });
}
