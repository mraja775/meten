import { apiData, apiError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { getDashboardSummary } from "@/lib/services/dashboard";

export async function GET() {
  try {
    const session = await getSessionContext();
    const summary = await getDashboardSummary(session.academyId);
    return apiData(summary);
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to load dashboard",
      500
    );
  }
}
