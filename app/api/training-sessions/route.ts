import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import sharp from "sharp";
import { apiData, apiError, apiList, validationError } from "@/lib/api/errors";
import { getTrainingApiActor } from "@/lib/auth/api-context";
import { prisma } from "@/lib/db/prisma";
import { recognizeScoreText } from "@/lib/training/ocr";
import { parseTrainingScores, toPrismaJson } from "@/lib/training/score-parser";
import {
  combineOcrPages,
  primaryTrainingImage,
  trainingImagesToJson,
  type StoredTrainingImage
} from "@/lib/training/session-upload";
import { createTrainingSessionSchema } from "@/lib/validations/training";
import { deleteTrainingImage, storeTrainingImage, type StoredObject } from "@/lib/training/storage";

export const runtime = "nodejs";

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildSessionDate(dateValue: string, timeValue?: string) {
  if (!timeValue) {
    return new Date(`${dateValue}T00:00:00`);
  }

  return new Date(`${dateValue}T${timeValue}`);
}

function trainingImageFiles(formData: FormData) {
  const images = formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  const legacyImage = formData.get("image");

  if (images.length > 0) {
    return images;
  }

  return legacyImage instanceof File && legacyImage.size > 0 ? [legacyImage] : [];
}

export async function GET(request: NextRequest) {
  const session = await getTrainingApiActor(request);
  if (!session) return apiError("UNAUTHORIZED", "Authentication required.", 401);
  const page = Number(request.nextUrl.searchParams.get("page") ?? 1);
  const pageSize = Math.min(Number(request.nextUrl.searchParams.get("pageSize") ?? 20), 50);

  const where: Prisma.TrainingSessionWhereInput = {
    academyId: session.academyId,
    ...(session.kind === "student" ? { studentId: session.studentId } : {}),
    deletedAt: null
  };

  const [sessions, total] = await prisma.$transaction([
    prisma.trainingSession.findMany({
      where,
      orderBy: { sessionDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        student: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    }),
    prisma.trainingSession.count({ where })
  ]);

  return apiList(sessions, { total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const session = await getTrainingApiActor(request);
  if (!session) return apiError("UNAUTHORIZED", "Authentication required.", 401);
  const formData = await request.formData();
  const dateValue = optionalString(formData.get("sessionDate"));
  const timeValue = optionalString(formData.get("sessionTime"));
  const images = trainingImageFiles(formData);

  const parsed = createTrainingSessionSchema.safeParse({
    studentId: session.kind === "student" ? session.studentId : optionalString(formData.get("studentId")),
    sessionDate: dateValue ? buildSessionDate(dateValue, timeValue) : undefined,
    notes: optionalString(formData.get("notes")),
    reflectionText: optionalString(formData.get("reflectionText")),
    reflectionInputMode: optionalString(formData.get("reflectionInputMode"))
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (images.length === 0) {
    return apiError("VALIDATION_ERROR", "Upload at least one training score image.", 400, {
      images: ["Upload at least one training score image."]
    });
  }

  if (images.length > 6) {
    return apiError("VALIDATION_ERROR", "Upload up to 6 score images per session.", 400, {
      images: ["Upload up to 6 score images per session."]
    });
  }

  if (images.some((image) => image.size > 12 * 1024 * 1024) || images.reduce((sum, image) => sum + image.size, 0) > 36 * 1024 * 1024) {
    return apiError("VALIDATION_ERROR", "Training images exceed the upload size limit.", 413, {
      images: ["Each image must be at most 12 MB and the upload at most 36 MB."]
    });
  }

  if (images.some((image) => !image.type.startsWith("image/"))) {
    return apiError("VALIDATION_ERROR", "Upload image files only.", 400, {
      images: ["Upload image files only."]
    });
  }

  const student = await prisma.student.findFirst({
    where: {
      id: parsed.data.studentId,
      academyId: session.academyId,
      deletedAt: null
    },
    select: { id: true }
  });

  if (!student) {
    return apiError("NOT_FOUND", "Student not found.", 404);
  }

  const storedImages: StoredTrainingImage[] = [];
  const storedObjects: StoredObject[] = [];
  const ocrPages = [];

  try {
  for (const [index, image] of images.entries()) {
    const inputBuffer = Buffer.from(await image.arrayBuffer());
    const normalizedBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1800, withoutEnlargement: true })
      .jpeg({ quality: 86 })
      .toBuffer();
    const metadata = await sharp(normalizedBuffer).metadata();
    const key = `training-sessions/${session.academyId}/${randomUUID()}.jpg`;
    const ocr = await recognizeScoreText(normalizedBuffer);
    const storedObject = await storeTrainingImage(key, normalizedBuffer);
    storedObjects.push(storedObject);

    storedImages.push({
      imageUrl: storedObject.url,
      imagePath: storedObject.path,
      imageMimeType: "image/jpeg",
      imageSizeBytes: normalizedBuffer.byteLength,
      imageWidth: metadata.width ?? null,
      imageHeight: metadata.height ?? null,
      originalFileName: image.name || null
    });
    ocrPages.push({
      index,
      provider: ocr.provider,
      status: ocr.status,
      text: ocr.text,
      error: ocr.error ?? undefined
    });
  }

  const primaryImage = primaryTrainingImage(storedImages);
  const ocr = combineOcrPages(ocrPages);
  const extracted = parseTrainingScores(ocr.text);

  const trainingSession = await prisma.trainingSession.create({
    data: {
      academyId: session.academyId,
      studentId: parsed.data.studentId,
      sessionDate: parsed.data.sessionDate,
      notes: parsed.data.notes,
      reflectionText: parsed.data.reflectionText,
      reflectionInputMode: parsed.data.reflectionInputMode,
      imageUrl: primaryImage?.imageUrl,
      imagePath: primaryImage?.imagePath,
      imageMimeType: primaryImage?.imageMimeType,
      imageSizeBytes: primaryImage?.imageSizeBytes,
      imageWidth: primaryImage?.imageWidth,
      imageHeight: primaryImage?.imageHeight,
      originalFileName: primaryImage?.originalFileName,
      images: trainingImagesToJson(storedImages),
      ocrProvider: ocr.provider,
      ocrStatus: ocr.status,
      ocrText: ocr.text,
      parsedScores: toPrismaJson(extracted),
      bestScore: extracted.bestScore,
      totalScore: extracted.totalScore,
      createdBy: session.kind === "staff" ? session.userId : session.studentId,
      updatedBy: session.kind === "staff" ? session.userId : session.studentId
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true
        }
      }
    }
  });

  return apiData(trainingSession, { status: 201 });
  } catch (error) {
    await Promise.allSettled(storedObjects.map(deleteTrainingImage));
    console.error("Training session upload failed", error);
    return apiError("INTERNAL_ERROR", "Training session could not be saved. Please try again.", 500);
  }
}
