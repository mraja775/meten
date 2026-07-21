import type { TrainingProcessingStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type StoredTrainingImage = {
  imageUrl: string;
  imagePath: string;
  imageMimeType: string;
  imageSizeBytes: number;
  imageWidth: number | null;
  imageHeight: number | null;
  originalFileName: string | null;
};

export type TrainingOcrPage = {
  index: number;
  provider: string;
  status: TrainingProcessingStatus;
  text: string;
  error?: string;
};

export function trainingImagesToJson(images: StoredTrainingImage[]): Prisma.InputJsonArray {
  return images.map((image, index) => ({
    index,
    imageUrl: image.imageUrl,
    imageMimeType: image.imageMimeType,
    imageSizeBytes: image.imageSizeBytes,
    imageWidth: image.imageWidth,
    imageHeight: image.imageHeight,
    originalFileName: image.originalFileName
  }));
}

export function combineOcrPages(pages: TrainingOcrPage[]) {
  const provider = Array.from(new Set(pages.map((page) => page.provider).filter(Boolean))).join("+");
  const successfulPages = pages.filter((page) => page.status === "PROCESSED" && page.text.trim().length > 0);
  const status: TrainingProcessingStatus = successfulPages.length > 0 ? "PROCESSED" : "FAILED";
  const text = pages
    .map((page) => {
      const body = page.text.trim() || page.error?.trim() || "OCR returned no readable text.";
      return `Image ${page.index + 1}\n${body}`;
    })
    .join("\n\n");

  return {
    provider: provider || null,
    status,
    text
  };
}

export function primaryTrainingImage(images: StoredTrainingImage[]) {
  return images[0] ?? null;
}
