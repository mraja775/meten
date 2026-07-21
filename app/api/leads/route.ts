import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiData, apiList, validationError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { createLeadSchema, leadListQuerySchema } from "@/lib/validations/leads";

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  const parsed = leadListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { page, pageSize, search, status, source, assignedTo } = parsed.data;
  const where: Prisma.LeadWhereInput = {
    academyId: session.academyId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(assignedTo ? { assignedToId: assignedTo } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { parentName: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [leads, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { assignedTo: { select: { id: true, name: true } } }
    }),
    prisma.lead.count({ where })
  ]);

  return apiList(leads, { total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  const body = await request.json();
  const parsed = createLeadSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const lead = await prisma.lead.create({
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
      academyId: session.academyId,
      createdBy: session.userId,
      updatedBy: session.userId,
      activities: {
        create: {
          academyId: session.academyId,
          type: "LEAD_CREATED",
          description: "Lead created.",
          createdBy: session.userId,
          updatedBy: session.userId
        }
      }
    }
  });

  return apiData(lead, { status: 201 });
}
