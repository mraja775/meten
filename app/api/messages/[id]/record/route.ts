import { NextRequest } from "next/server";
import { MessageStatus } from "@prisma/client";
import { apiData, apiError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const existing = await prisma.message.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    select: { id: true }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Message not found", 404);
  }

  const message = await prisma.message.update({
    where: { id },
    data: {
      status: MessageStatus.RECORDED,
      updatedBy: session.userId
    },
    include: { recipients: { where: { deletedAt: null } } }
  });

  return apiData(message);
}
