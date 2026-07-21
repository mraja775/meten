import "server-only";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export type TrainingApiActor =
  | { kind: "staff"; userId: string; academyId: string }
  | { kind: "student"; studentId: string; academyId: string };

function bearerToken(request: NextRequest) {
  const value = request.headers.get("authorization");
  const match = value?.match(/^Bearer ([A-Za-z0-9_-]{20,})$/);
  return match?.[1];
}

export async function getTrainingApiActor(request: NextRequest): Promise<TrainingApiActor | null> {
  const bearer = bearerToken(request);
  if (bearer) {
    const session = await prisma.studentSession.findFirst({
      where: {
        tokenHash: hashToken(bearer), deletedAt: null, expiresAt: { gt: new Date() },
        student: { deletedAt: null, status: "ACTIVE", academy: { deletedAt: null } }
      },
      select: { id: true, academyId: true, studentId: true }
    });
    if (!session) return null;
    await prisma.studentSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    return { kind: "student", studentId: session.studentId, academyId: session.academyId };
  }

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  const session = await prisma.userSession.findFirst({
    where: {
      tokenHash: hashToken(cookie), deletedAt: null, expiresAt: { gt: new Date() },
      user: { deletedAt: null, role: { in: ["OWNER", "STAFF"] }, academy: { deletedAt: null } }
    },
    select: { id: true, user: { select: { id: true, academyId: true } } }
  });
  if (!session) return null;
  await prisma.userSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  return { kind: "staff", userId: session.user.id, academyId: session.user.academyId };
}

export function getBearerToken(request: NextRequest) { return bearerToken(request); }
