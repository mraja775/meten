import { NextRequest } from "next/server";
import { apiData, apiError } from "@/lib/api/errors";
import { getTrainingApiActor } from "@/lib/auth/api-context";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const actor = await getTrainingApiActor(request);
  if (!actor || actor.kind !== "student") return apiError("UNAUTHORIZED", "Valid student bearer token required.", 401);
  const student = await prisma.student.findFirst({ where: { id: actor.studentId, academyId: actor.academyId, deletedAt: null },
    select: { id: true, academyId: true, fullName: true, email: true, phone: true } });
  if (!student) return apiError("UNAUTHORIZED", "Valid student bearer token required.", 401);
  return apiData({ student });
}
