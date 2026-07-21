import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

type OcrVariant = {
  name: string;
  psm: string;
  buffer: Buffer;
};

async function resolveTesseractBinary() {
  const configured = process.env.TESSERACT_BINARY;
  if (configured) {
    return configured;
  }

  const candidates = ["/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract", "tesseract"];

  for (const candidate of candidates) {
    if (candidate === "tesseract") {
      return candidate;
    }

    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common install path.
    }
  }

  return null;
}

export async function recognizeScoreText(buffer: Buffer) {
  const binary = await resolveTesseractBinary();

  if (!binary) {
    return {
      status: "UNAVAILABLE" as const,
      provider: "tesseract",
      text: "",
      error: "Tesseract binary is not installed."
    };
  }

  const tempPaths: string[] = [];

  try {
    const base = sharp(buffer)
      .rotate()
      .resize({ width: 2600, withoutEnlargement: true })
      .grayscale();

    const variants: OcrVariant[] = [
      {
        name: "normalized-layout",
        psm: "6",
        buffer: await base.clone().normalize().sharpen().png().toBuffer()
      },
      {
        name: "high-contrast-sparse",
        psm: "11",
        buffer: await base
          .clone()
          .linear(1.35, -18)
          .normalize()
          .sharpen({ sigma: 1.2 })
          .png()
          .toBuffer()
      },
      {
        name: "threshold-score",
        psm: "6",
        buffer: await base
          .clone()
          .threshold(165)
          .median(1)
          .png()
          .toBuffer()
      }
    ];

    const texts: string[] = [];
    const errors: string[] = [];

    for (const variant of variants) {
      const imagePath = path.join(tmpdir(), `meten-score-${variant.name}-${randomUUID()}.png`);
      tempPaths.push(imagePath);

      try {
        await writeFile(imagePath, variant.buffer);

        const { stdout } = await execFileAsync(binary, [
          imagePath,
          "stdout",
          "--psm",
          variant.psm,
          "-l",
          "eng",
          "-c",
          "preserve_interword_spaces=1"
        ]);

        const text = stdout.trim();
        if (text.length > 0) {
          texts.push(`--- ${variant.name} ---\n${text}`);
        }
      } catch (error) {
        errors.push(
          `${variant.name}: ${error instanceof Error ? error.message : "OCR pass failed."}`
        );
      }
    }

    if (texts.length === 0) {
      return {
        status: "FAILED" as const,
        provider: "tesseract-multipass",
        text: "",
        error: errors.join("\n") || "OCR returned no readable text."
      };
    }

    return {
      status: "PROCESSED" as const,
      provider: "tesseract-multipass",
      text: texts.join("\n\n"),
      error: null
    };
  } catch (error) {
    return {
      status: "FAILED" as const,
      provider: "tesseract",
      text: "",
      error: error instanceof Error ? error.message : "OCR failed."
    };
  } finally {
    await Promise.all(tempPaths.map((imagePath) => unlink(imagePath).catch(() => undefined)));
  }
}
