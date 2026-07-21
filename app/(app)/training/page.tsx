import {
  TrainingSessionUploader,
  type ParsedScores
} from "@/components/training/training-session-uploader";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const session = await getSessionContext();
  const [students, trainingSessions] = await Promise.all([
    prisma.student.findMany({
      where: {
        academyId: session.academyId,
        deletedAt: null,
        status: "ACTIVE"
      },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true
      }
    }),
    prisma.trainingSession.findMany({
      where: {
        academyId: session.academyId,
        deletedAt: null
      },
      orderBy: { sessionDate: "desc" },
      take: 20,
      include: {
        student: {
          select: {
            fullName: true
          }
        }
      }
    })
  ]);

  return (
    <TrainingSessionUploader
      students={students}
      initialSessions={trainingSessions.map((trainingSession) => ({
        id: trainingSession.id,
        studentName: trainingSession.student.fullName,
        sessionDate: trainingSession.sessionDate.toISOString(),
        notes: trainingSession.notes,
        imageUrl: trainingSession.imageUrl,
        ocrStatus: trainingSession.ocrStatus,
        bestScore: trainingSession.bestScore,
        totalScore: trainingSession.totalScore,
        parsedScores: trainingSession.parsedScores as ParsedScores | null,
        createdAt: trainingSession.createdAt.toISOString()
      }))}
    />
  );
}
