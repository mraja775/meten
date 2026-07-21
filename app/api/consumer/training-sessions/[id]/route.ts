import { NextRequest } from "next/server";
import { apiData, apiError } from "@/lib/api/errors";
import { getTrainingApiActor } from "@/lib/auth/api-context";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getTrainingApiActor(request);
  if (!actor || actor.kind !== "student") return apiError("UNAUTHORIZED", "Valid student bearer token required.", 401);
  const { id } = await params;
  const session = await prisma.trainingSession.findFirst({
    where: { id, academyId: actor.academyId, studentId: actor.studentId, deletedAt: null },
    include: { student: { select: { id: true, fullName: true } } }
  });
  if (!session) return apiError("NOT_FOUND", "Training session not found.", 404);
  return apiData(session);
}
