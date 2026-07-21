import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiData, apiList, validationError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import {
  createMessageSchema,
  messageListQuerySchema
} from "@/lib/validations/messages";

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  const parsed = messageListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { page, pageSize, status, type } = parsed.data;
  const where: Prisma.MessageWhereInput = {
    academyId: session.academyId,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(type ? { type } : {})
  };

  const [messages, total] = await prisma.$transaction([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { recipients: { where: { deletedAt: null } } }
    }),
    prisma.message.count({ where })
  ]);

  return apiList(messages, { total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  const body = await request.json();
  const parsed = createMessageSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { recipients, ...messageData } = parsed.data;
  const message = await prisma.message.create({
    data: {
      ...messageData,
      subject: messageData.subject || null,
      academyId: session.academyId,
      createdBy: session.userId,
      updatedBy: session.userId,
      recipients: {
        create: recipients.map((recipient) => ({
          ...recipient,
          academyId: session.academyId,
          createdBy: session.userId,
          updatedBy: session.userId
        }))
      }
    },
    include: { recipients: true }
  });

  return apiData(message, { status: 201 });
}
