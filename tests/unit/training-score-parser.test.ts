import { describe, expect, it } from "vitest";
import { parseTrainingScores } from "@/lib/training/score-parser";

describe("training score parser", () => {
  it("extracts series totals, shot scores, group size, and MPI from OCR text", () => {
    const parsed = parseTrainingScores(`
      Series total: 99.5
      MPI: X: -1.4 mm; Y: 1.1 mm
      Group size: Ø 11.7 mm
      Series 4: 8.8/ 10.6/ 9.7/ 9.3/ 9.4/ 10.0/ 10.1/ 9.8/ 8.6/ 9.9
    `);

    expect(parsed.seriesTotals).toContain(99.5);
    expect(parsed.shotScores).toContain(10.6);
    expect(parsed.bestScore).toBe(99.5);
    expect(parsed.groupSizeMm).toBe(11.7);
    expect(parsed.mpi).toEqual({ xMm: -1.4, yMm: 1.1 });
    expect(parsed.averageShotScore).toBe(9.6);
    expect(parsed.actionSuggestions.length).toBeGreaterThan(0);
    expect(parsed.confidence).toBe("high");
  });

  it("handles common OCR spacing and decimal mistakes from blurred score photos", () => {
    const parsed = parseTrainingScores(`
      Group size @ 117mm
      Senes 4 8.87 10.6\\ 9.7/ 9.31 9.41 10.07 1014 987 BGs 99-
      Seriestota: 96.2
      MPI X: 0.5 mm; ¥: 0.7 mm
    `);

    expect(parsed.seriesTotals).toContain(96.2);
    expect(parsed.shotScores).toContain(10.6);
    expect(parsed.shotScores).toContain(10.1);
    expect(parsed.groupSizeMm).toBe(11.7);
    expect(parsed.mpi).toEqual({ xMm: 0.5, yMm: 0.7 });
    expect(parsed.seriesTotals).not.toContain(99);
  });
});
