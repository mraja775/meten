import { NextRequest } from "next/server";
import { apiData, apiError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const message = await prisma.message.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null },
    include: { recipients: { where: { deletedAt: null } } }
  });

  if (!message) {
    return apiError("NOT_FOUND", "Message not found", 404);
  }

  return apiData(message);
}
