import { describe, expect, it } from "vitest";
import { combineOcrPages, primaryTrainingImage, trainingImagesToJson } from "@/lib/training/session-upload";

describe("training session upload helpers", () => {
  it("combines OCR pages from multiple training images", () => {
    const combined = combineOcrPages([
      {
        index: 0,
        provider: "local-tesseract",
        status: "PROCESSED",
        text: "Series total: 99.5"
      },
      {
        index: 1,
        provider: "local-tesseract",
        status: "FAILED",
        text: "",
        error: "threshold pass failed"
      }
    ]);

    expect(combined.status).toBe("PROCESSED");
    expect(combined.provider).toBe("local-tesseract");
    expect(combined.text).toContain("Image 1");
    expect(combined.text).toContain("Series total: 99.5");
    expect(combined.text).toContain("Image 2");
    expect(combined.text).toContain("threshold pass failed");
  });

  it("marks aggregate OCR as failed when every image fails", () => {
    const combined = combineOcrPages([
      {
        index: 0,
        provider: "local-tesseract",
        status: "FAILED",
        text: "",
        error: "no readable text"
      }
    ]);

    expect(combined.status).toBe("FAILED");
    expect(combined.text).toContain("no readable text");
  });

  it("builds image JSON while preserving a first-image compatibility record", () => {
    const images = [
      {
        imageUrl: "/uploads/training-sessions/one.jpg",
        imagePath: "/tmp/one.jpg",
        imageMimeType: "image/jpeg",
        imageSizeBytes: 1200,
        imageWidth: 1600,
        imageHeight: 1200,
        originalFileName: "one.png"
      },
      {
        imageUrl: "/uploads/training-sessions/two.jpg",
        imagePath: "/tmp/two.jpg",
        imageMimeType: "image/jpeg",
        imageSizeBytes: 1400,
        imageWidth: 1600,
        imageHeight: 1200,
        originalFileName: "two.png"
      }
    ];

    expect(primaryTrainingImage(images)).toBe(images[0]);
    expect(trainingImagesToJson(images)).toMatchObject([
      { index: 0, imageUrl: "/uploads/training-sessions/one.jpg" },
      { index: 1, imageUrl: "/uploads/training-sessions/two.jpg" }
    ]);
  });
});
