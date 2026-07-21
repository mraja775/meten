import "server-only";

import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashToken, readSessionCookie } from "@/lib/auth/session";

export type SessionContext = {
  userId: string;
  academyId: string;
  role: Role;
  name: string;
  email: string;
};

export async function getSessionContext(): Promise<SessionContext> {
  const token = await readSessionCookie();

  if (!token) {
    redirect("/sign-in");
  }

  const session = await prisma.userSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      deletedAt: null,
      expiresAt: { gt: new Date() },
      user: {
        deletedAt: null,
        role: { in: [Role.OWNER, Role.STAFF] },
        academy: {
          deletedAt: null
        }
      }
    },
    include: {
      user: {
        select: {
          id: true,
          academyId: true,
          role: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!session) {
    redirect("/sign-in");
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() }
  });

  return {
    userId: session.user.id,
    academyId: session.user.academyId,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email
  };
}
