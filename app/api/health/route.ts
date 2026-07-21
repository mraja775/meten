import { apiData, apiError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return apiData({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch {
    return apiError("INTERNAL_ERROR", "Health check failed", 503);
  }
}
