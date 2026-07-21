import { NextRequest } from "next/server";
import { z } from "zod";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { getTrainingApiActor } from "@/lib/auth/api-context";
import { prisma } from "@/lib/db/prisma";

const schema = z.object({
  shotScores: z.array(z.number().min(0).max(10.9)).min(1).max(100),
  seriesTotals: z.array(z.number().min(0).max(110)).max(20).optional().default([]),
  groupSizeMm: z.number().min(0).max(1000).nullable().optional(),
  notes: z.string().trim().max(2000).optional()
}).strict();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getTrainingApiActor(request);
  if (!actor || actor.kind !== "student") return apiError("UNAUTHORIZED", "Valid student bearer token required.", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("BAD_REQUEST", "Request body must be valid JSON.", 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const { id } = await params;
  const existing = await prisma.trainingSession.findFirst({ where: { id, academyId: actor.academyId, studentId: actor.studentId, deletedAt: null }, select: { id: true } });
  if (!existing) return apiError("NOT_FOUND", "Training session not found.", 404);
  const shots = parsed.data.shotScores;
  const totals = parsed.data.seriesTotals;
  const totalScore = totals.length ? Number(totals.reduce((sum, n) => sum + n, 0).toFixed(1)) : Number(shots.reduce((sum, n) => sum + n, 0).toFixed(1));
  const bestScore = totals.length ? Math.max(...totals) : Math.max(...shots);
  const verifiedScores = {
    shotScores: shots, seriesTotals: totals, shotCount: shots.length,
    averageShotScore: Number((shots.reduce((sum, n) => sum + n, 0) / shots.length).toFixed(1)),
    scoreSpread: Number((Math.max(...shots) - Math.min(...shots)).toFixed(1)),
    droppedShots: shots.filter((n) => n < 9).length, groupSizeMm: parsed.data.groupSizeMm ?? null,
    bestScore, totalScore, verifiedByStudent: true
  };
  const session = await prisma.trainingSession.update({ where: { id }, data: {
    verifiedScores, scoresVerifiedAt: new Date(), bestScore, totalScore,
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}), updatedBy: actor.studentId
  }, include: { student: { select: { id: true, fullName: true } } } });
  return apiData(session);
}
