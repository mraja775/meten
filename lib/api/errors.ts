import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export function apiData<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function apiList<T>(
  data: T[],
  meta: { total: number; page: number; pageSize: number },
  init?: ResponseInit
) {
  return NextResponse.json({ data, meta }, init);
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = 400,
  fields?: Record<string, string[]>
) {
  return NextResponse.json({ error: { code, message, fields } }, { status });
}

export function validationError(error: ZodError) {
  const fields = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1])
    )
  );

  return apiError(
    "VALIDATION_ERROR",
    "Invalid request",
    400,
    fields
  );
}
