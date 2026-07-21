import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { getBearerToken, getTrainingApiActor } from "@/lib/auth/api-context";
import { hashToken } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  const actor = await getTrainingApiActor(request);
  if (!token || !actor || actor.kind !== "student") return apiError("UNAUTHORIZED", "Valid student bearer token required.", 401);
  await prisma.studentSession.updateMany({ where: { tokenHash: hashToken(token), deletedAt: null }, data: { deletedAt: new Date() } });
  return new NextResponse(null, { status: 204 });
}
