import type { Prisma } from "@prisma/client";

export type ParsedTrainingScores = {
  rawNumbers: number[];
  shotScores: number[];
  shotCount: number;
  averageShotScore: number | null;
  scoreSpread: number | null;
  droppedShots: number;
  seriesTotals: number[];
  bestScore: number | null;
  totalScore: number | null;
  groupSizeMm: number | null;
  mpi: {
    xMm: number | null;
    yMm: number | null;
  };
  actionSuggestions: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    detail: string;
  }>;
  confidence: "low" | "medium" | "high";
};

function toNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function round1(value: number) {
  return Number(value.toFixed(1));
}

function uniqueRounded(values: number[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toFixed(1);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function numbersFrom(text: string) {
  const matches = text.match(/-?\d{1,4}(?:[.,]\d{1,2})?/g) ?? [];

  return matches
    .map(toNumber)
    .filter((value): value is number => value !== null);
}

function normalizeOcrText(text: string) {
  return text
    .replace(/[|]/g, " ")
    .replace(/[¥]/g, "Y")
    .replace(/\bSenes\b/gi, "Series")
    .replace(/\bSertes\b/gi, "Series")
    .replace(/\bSeriestota\b/gi, "Series total")
    .replace(/\s+/g, " ")
    .trim();
}

function coerceShotScore(value: number, original: string) {
  const hasDecimal = /[.,]/.test(original);
  const absolute = Math.abs(value);

  if (hasDecimal && absolute >= 0 && absolute <= 10.99) {
    return round1(value);
  }

  if (!hasDecimal && absolute >= 6 && absolute <= 10) {
    return value;
  }

  if (!hasDecimal && absolute >= 80 && absolute <= 109) {
    return round1(value / 10);
  }

  if (!hasDecimal && absolute >= 800 && absolute <= 1099) {
    return round1(value / 100);
  }

  if (hasDecimal && absolute > 10.9 && absolute <= 10.99) {
    return 10.9;
  }

  return null;
}

function shotScoresFromSeriesLines(text: string) {
  return text
    .split(/\r?\n/)
    .filter((line) => /series|senes|shots?/i.test(line) && !/total/i.test(line))
    .flatMap(
      (line) =>
        line
          .replace(/\b(series|senes)\s*\d+\b/gi, " ")
          .match(/-?\d{1,4}(?:[.,]\d{1,2})?/g) ?? []
    )
    .map((token) => {
      const value = toNumber(token);
      return value === null ? null : coerceShotScore(value, token);
    })
    .filter((value): value is number => value !== null && value >= 0 && value <= 10.9);
}

function coerceMmValue(value: number, original: string) {
  if (value > 60 && value <= 600 && !original.includes(".")) {
    return Number((value / 10).toFixed(1));
  }

  if (value >= 1 && value <= 60) {
    return round1(value);
  }

  return null;
}

function extractGroupSize(text: string) {
  const matches = Array.from(
    text.matchAll(/group\s*size[^0-9-]*-?\s*(\d{1,3}(?:[.,]\d{1,2})?)/gi)
  );

  for (const match of matches) {
    const parsed = toNumber(match[1]);
    if (parsed === null) {
      continue;
    }

    const coerced = coerceMmValue(parsed, match[1]);
    if (coerced !== null) {
      return coerced;
    }
  }

  return null;
}

function extractMpi(text: string) {
  const match = text.match(
    /mpi[^x-]*x[^0-9-]*(-?\d{1,3}(?:[.,]\d{1,2})?)[^\ny-]*y[^0-9-]*(-?\d{1,3}(?:[.,]\d{1,2})?)/i
  );

  const parseOffset = (value?: string) => {
    if (!value) {
      return null;
    }

    const parsed = toNumber(value);
    if (parsed === null) {
      return null;
    }

    if (Math.abs(parsed) > 10 && Math.abs(parsed) <= 99 && !value.includes(".")) {
      return round1(parsed / 10);
    }

    return round1(parsed);
  };

  return {
    xMm: parseOffset(match?.[1]),
    yMm: parseOffset(match?.[2])
  };
}

function coerceSeriesTotal(token: string) {
  const parsed = toNumber(token);
  if (parsed === null) {
    return null;
  }

  const hasDecimal = /[.,]/.test(token);
  const absolute = Math.abs(parsed);

  if (hasDecimal && absolute >= 50 && absolute <= 110) {
    return round1(parsed);
  }

  if (!hasDecimal && absolute >= 900 && absolute <= 1100) {
    return round1(parsed / 10);
  }

  if (!hasDecimal && absolute >= 98 && absolute <= 110) {
    return parsed;
  }

  return null;
}

function extractSeriesTotals(text: string, label: RegExp) {
  return text
    .split(/\r?\n/)
    .filter((line) => label.test(line))
    .flatMap((line) => line.match(/-?\d{1,4}(?:[.,]\d{1,2})?/g) ?? [])
    .map(coerceSeriesTotal)
    .filter((value): value is number => value !== null);
}

export function parseTrainingScores(ocrText: string): ParsedTrainingScores {
  const normalized = normalizeOcrText(ocrText);
  const rawNumbers = uniqueRounded(numbersFrom(ocrText).filter((value) => value >= -100 && value <= 650));
  const explicitSeriesTotals = extractSeriesTotals(
    ocrText,
    /series\s*tota|series\s*total|senes\s*total|seniestotal|seriestota|seiestota|total\s*score|match\s*total/i
  );
  const inferredSeriesTotals =
    explicitSeriesTotals.length === 0 && /series\s*tota|total\s*score|match\s*total/i.test(normalized)
      ? rawNumbers.filter((value) => value >= 50 && value <= 110)
      : [];
  const seriesTotals = uniqueRounded([...explicitSeriesTotals, ...inferredSeriesTotals]);
  const lineShotScores = shotScoresFromSeriesLines(ocrText);
  const rawShotScores = rawNumbers.filter((value) => value >= 6 && value <= 10.9).map(round1);
  const shotScores = uniqueRounded([...lineShotScores, ...rawShotScores]);
  const groupSizeMm = extractGroupSize(ocrText);
  const mpi = extractMpi(normalized);
  const bestScore = seriesTotals.length > 0 ? Math.max(...seriesTotals) : null;
  const totalScore =
    explicitSeriesTotals.length > 1
      ? Number(explicitSeriesTotals.reduce((sum, score) => sum + score, 0).toFixed(1))
      : bestScore;
  const shotCount = shotScores.length;
  const averageShotScore =
    shotCount > 0
      ? round1(shotScores.reduce((sum, score) => sum + score, 0) / shotCount)
      : null;
  const scoreSpread =
    shotCount > 1 ? round1(Math.max(...shotScores) - Math.min(...shotScores)) : null;
  const droppedShots = shotScores.filter((score) => score < 9).length;
  const actionSuggestions = buildActionSuggestions({
    shotScores,
    averageShotScore,
    scoreSpread,
    droppedShots,
    groupSizeMm,
    mpi
  });

  let confidence: ParsedTrainingScores["confidence"] = "low";
  if (seriesTotals.length > 0 && (shotScores.length >= 3 || groupSizeMm !== null)) {
    confidence = "high";
  } else if (seriesTotals.length > 0 || shotScores.length >= 5) {
    confidence = "medium";
  }

  return {
    rawNumbers,
    shotScores,
    shotCount,
    averageShotScore,
    scoreSpread,
    droppedShots,
    seriesTotals,
    bestScore,
    totalScore,
    groupSizeMm,
    mpi,
    actionSuggestions,
    confidence
  };
}

function buildActionSuggestions({
  shotScores,
  averageShotScore,
  scoreSpread,
  droppedShots,
  groupSizeMm,
  mpi
}: Pick<
  ParsedTrainingScores,
  "shotScores" | "averageShotScore" | "scoreSpread" | "droppedShots" | "groupSizeMm" | "mpi"
>): ParsedTrainingScores["actionSuggestions"] {
  const suggestions: ParsedTrainingScores["actionSuggestions"] = [];
  const xOffset = mpi.xMm ?? 0;
  const yOffset = mpi.yMm ?? 0;

  if (groupSizeMm !== null && groupSizeMm > 15) {
    suggestions.push({
      priority: "high",
      title: "Tighten grouping before chasing score",
      detail: "Group size is wide. Prioritize hold stability, trigger squeeze, and follow-through drills before sight adjustment."
    });
  }

  if (Math.abs(xOffset) >= 1 || Math.abs(yOffset) >= 1) {
    const horizontal = xOffset < 0 ? "left" : xOffset > 0 ? "right" : "";
    const vertical = yOffset < 0 ? "low" : yOffset > 0 ? "high" : "";

    suggestions.push({
      priority: "medium",
      title: "Check zero and point of impact",
      detail: `MPI is ${[horizontal, vertical].filter(Boolean).join(" and ")}. Confirm sight alignment, natural point of aim, and only then adjust sights.`
    });
  }

  if (scoreSpread !== null && scoreSpread >= 1.5) {
    suggestions.push({
      priority: "high",
      title: "Reduce shot-to-shot variation",
      detail: "Score spread is high. Use a slower cadence and reset breathing, grip pressure, and trigger routine between shots."
    });
  }

  if (droppedShots >= 2) {
    suggestions.push({
      priority: "medium",
      title: "Review low-value shots",
      detail: "Multiple shots are below 9. Mark the shot numbers and write the cause immediately after each string."
    });
  }

  if (averageShotScore !== null && averageShotScore >= 9.8 && suggestions.length === 0) {
    suggestions.push({
      priority: "low",
      title: "Maintain match routine",
      detail: "Scores are stable. Keep the same setup and add pressure sets instead of changing technique."
    });
  }

  if (shotScores.length === 0) {
    suggestions.push({
      priority: "low",
      title: "Retake with clearer framing",
      detail: "Scores were not confidently read. Capture the score area straight-on, fill the frame, and avoid screen glare."
    });
  }

  return suggestions.slice(0, 4);
}

export function toPrismaJson(parsed: ParsedTrainingScores): Prisma.InputJsonObject {
  return {
    rawNumbers: parsed.rawNumbers,
    shotScores: parsed.shotScores,
    shotCount: parsed.shotCount,
    averageShotScore: parsed.averageShotScore,
    scoreSpread: parsed.scoreSpread,
    droppedShots: parsed.droppedShots,
    seriesTotals: parsed.seriesTotals,
    bestScore: parsed.bestScore,
    totalScore: parsed.totalScore,
    groupSizeMm: parsed.groupSizeMm,
    mpi: parsed.mpi,
    actionSuggestions: parsed.actionSuggestions,
    confidence: parsed.confidence
  };
}
