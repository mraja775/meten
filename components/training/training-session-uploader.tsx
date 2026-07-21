"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Loader2,
  NotebookPen,
  Target,
  Upload
} from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type StudentOption = {
  id: string;
  fullName: string;
};

export type ParsedScores = {
  shotScores?: number[];
  shotCount?: number;
  averageShotScore?: number | null;
  scoreSpread?: number | null;
  droppedShots?: number;
  seriesTotals?: number[];
  bestScore?: number | null;
  totalScore?: number | null;
  groupSizeMm?: number | null;
  confidence?: "low" | "medium" | "high";
  mpi?: {
    xMm?: number | null;
    yMm?: number | null;
  };
  actionSuggestions?: Array<{
    priority: "high" | "medium" | "low";
    title: string;
    detail: string;
  }>;
};

export type TrainingSessionView = {
  id: string;
  studentName: string;
  sessionDate: string;
  notes: string | null;
  imageUrl: string | null;
  ocrStatus: string;
  bestScore: number | null;
  totalScore: number | null;
  parsedScores: ParsedScores | null;
  createdAt: string;
};

type UploadResponse = {
  data?: {
    id: string;
    student: StudentOption;
    sessionDate: string;
    notes: string | null;
    imageUrl: string | null;
    ocrStatus: string;
    bestScore: number | null;
    totalScore: number | null;
    parsedScores: ParsedScores | null;
    createdAt: string;
  };
  error?: {
    message: string;
  };
};

function localDateValue(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function dayOptions() {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);

    return {
      value: localDateValue(date),
      label: index === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" }),
      day: date.toLocaleDateString("en-US", { day: "2-digit" })
    };
  });
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function scoreText(session: TrainingSessionView) {
  if (typeof session.totalScore === "number") {
    return session.totalScore.toFixed(1);
  }

  if (typeof session.bestScore === "number") {
    return session.bestScore.toFixed(1);
  }

  return "-";
}

export function TrainingSessionUploader({
  students,
  initialSessions
}: {
  students: StudentOption[];
  initialSessions: TrainingSessionView[];
}) {
  const days = useMemo(dayOptions, []);
  const [selectedDate, setSelectedDate] = useState(days[0]?.value ?? localDateValue(new Date()));
  const [selectedTime, setSelectedTime] = useState(() =>
    new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sessions, setSessions] = useState(initialSessions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  function setSelectedFile(nextFile: File | null) {
    setFile(nextFile);
    setMessage(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setMessage("Add a score photo before saving.");
      return;
    }

    const formData = new FormData();
    formData.set("studentId", studentId);
    formData.set("sessionDate", selectedDate);
    formData.set("sessionTime", selectedTime);
    formData.set("notes", notes);
    formData.set("image", file);

    setIsSubmitting(true);
    setMessage("Processing photo and extracting scores...");

    try {
      const response = await fetch("/api/training-sessions", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as UploadResponse;

      if (!response.ok || !payload.data) {
        setMessage(payload.error?.message ?? "Could not save this session.");
        return;
      }

      const savedSession = payload.data;

      setSessions((current) => [
        {
          id: savedSession.id,
          studentName: savedSession.student.fullName,
          sessionDate: savedSession.sessionDate,
          notes: savedSession.notes,
          imageUrl: savedSession.imageUrl,
          ocrStatus: savedSession.ocrStatus,
          bestScore: savedSession.bestScore,
          totalScore: savedSession.totalScore,
          parsedScores: savedSession.parsedScores,
          createdAt: savedSession.createdAt
        },
        ...current
      ]);
      setNotes("");
      setSelectedFile(null);
      setMessage("Session saved.");
    } catch {
      setMessage("Could not save this session.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-24 md:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Training</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture score sheets, notes, and extracted session scores.
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Target className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-3 shadow-sm sm:p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Day
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => setSelectedDate(day.value)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center rounded-md border text-xs font-medium transition-colors",
                  selectedDate === day.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                <span>{day.label}</span>
                <span className="text-base font-semibold">{day.day}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Student</span>
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="h-11 w-full rounded-md border bg-background px-3 text-base sm:text-sm"
              required
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              Time
            </span>
            <Input
              type="time"
              value={selectedTime}
              onChange={(event) => setSelectedTime(event.target.value)}
              className="h-11 text-base sm:text-sm"
              required
            />
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            Score Photo
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              className="h-12"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              Camera
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-12"
              onClick={() => uploadInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload
            </Button>
          </div>
          {previewUrl ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted">
              <Image
                src={previewUrl}
                alt="Selected score sheet"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/50 text-sm text-muted-foreground"
            >
              <Camera className="h-6 w-6" aria-hidden="true" />
              Add score sheet photo
            </button>
          )}
        </div>

        <label className="space-y-1.5">
          <span className="flex items-center gap-2 text-sm font-medium">
            <NotebookPen className="h-4 w-4" aria-hidden="true" />
            Session Notes
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 w-full rounded-md border bg-background p-3 text-base leading-6 placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-sm"
            placeholder="Rifle setup, focus points, coach feedback, fatigue, corrections..."
          />
        </label>

        {message ? (
          <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !studentId}
          className={buttonClassName({ className: "h-12 w-full text-base sm:text-sm" })}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Save Training Session
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-normal">Recent Sessions</h2>
        {sessions.length === 0 ? (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            No training sessions captured yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const parsed = session.parsedScores;

              return (
                <article key={session.id} className="overflow-hidden rounded-lg border bg-card">
                  {session.imageUrl ? (
                    <div className="relative aspect-[16/9] bg-muted">
                      <Image src={session.imageUrl} alt="" fill className="object-cover" />
                    </div>
                  ) : null}
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{session.studentName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatSessionDate(session.sessionDate)}
                        </p>
                      </div>
                      <div className="rounded-md border px-3 py-2 text-center">
                        <div className="text-xs text-muted-foreground">Score</div>
                        <div className="text-xl font-semibold">{scoreText(session)}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded-md bg-muted px-2 py-2">
                        <div className="font-semibold">{parsed?.seriesTotals?.length ?? 0}</div>
                        <div className="text-muted-foreground">Totals</div>
                      </div>
                      <div className="rounded-md bg-muted px-2 py-2">
                        <div className="font-semibold">{parsed?.shotScores?.length ?? 0}</div>
                        <div className="text-muted-foreground">Shots</div>
                      </div>
                      <div className="rounded-md bg-muted px-2 py-2">
                        <div className="font-semibold">
                          {typeof parsed?.groupSizeMm === "number" ? `${parsed.groupSizeMm}` : "-"}
                        </div>
                        <div className="text-muted-foreground">Group mm</div>
                      </div>
                      <div className="rounded-md bg-muted px-2 py-2">
                        <div className="font-semibold">
                          {typeof parsed?.averageShotScore === "number"
                            ? parsed.averageShotScore.toFixed(1)
                            : "-"}
                        </div>
                        <div className="text-muted-foreground">Avg</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md border bg-background px-2 py-2">
                        <div className="text-muted-foreground">Spread</div>
                        <div className="font-semibold">
                          {typeof parsed?.scoreSpread === "number"
                            ? parsed.scoreSpread.toFixed(1)
                            : "-"}
                        </div>
                      </div>
                      <div className="rounded-md border bg-background px-2 py-2">
                        <div className="text-muted-foreground">Dropped shots</div>
                        <div className="font-semibold">{parsed?.droppedShots ?? "-"}</div>
                      </div>
                    </div>

                    {parsed?.seriesTotals?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {parsed.seriesTotals.slice(0, 8).map((score, index) => (
                          <span
                            key={`${session.id}-${score}-${index}`}
                            className="rounded-md border bg-background px-2 py-1 text-xs font-medium"
                          >
                            {score.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {session.notes ? (
                      <p className="text-sm leading-6 text-muted-foreground">{session.notes}</p>
                    ) : null}

                    {parsed?.actionSuggestions?.length ? (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                          Actions
                        </h4>
                        {parsed.actionSuggestions.map((suggestion) => (
                          <div
                            key={`${session.id}-${suggestion.title}`}
                            className="rounded-md border bg-background p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{suggestion.title}</p>
                              <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium uppercase text-muted-foreground">
                                {suggestion.priority}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-5 text-muted-foreground">
                              {suggestion.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="text-xs uppercase tracking-normal text-muted-foreground">
                      OCR {session.ocrStatus.toLowerCase()}
                      {parsed?.confidence ? ` · ${parsed.confidence} confidence` : ""}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
