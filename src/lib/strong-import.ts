import { zonedDateTime } from "#/lib/dates";
import type { WorkoutInput } from "#/lib/zod-schemas/workout";

// Parses the text the Strong app puts on the clipboard when you share/export workouts.
// Pure: text in → plain objects out. No DB/zod/React, so it's easy to test and to
// map onto whatever the workout schema ends up being.
//
// Shape of one workout in the export (a paste can hold several):
//
//   Early Morning Workout                    ← title
//   Tuesday, 6 October 2026 at 07:27         ← start (wall-clock, no zone)
//                                             ← blank lines between exercises
//   Chest Press (Machine)                    ← exercise (equipment)
//   Set 1: 18 kg × 11                        ← weight × reps
//   Set 2: 32 kg × 11 @ 7                    ← … @ RPE
//   Running (Treadmill)
//   Set 1: 0.8 km | 10:00                    ← distance | duration
//   https://link.strong.app/xxxx             ← link closes the workout above it

export type ParsedSet = {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  distanceM: number | null;
  durationSec: number | null;
};

export type ParsedExercise = {
  exercise: string; // "Chest Press"
  equipment: string | null; // "Machine"
  sets: ParsedSet[];
};

export type ParsedWorkout = {
  title: string;
  date: string; // "2026-10-06" — the day as written, no timezone applied
  time: string; // "07:27"
  link: string | null;
  exercises: ParsedExercise[];
};

export type ParseResult = {
  workouts: ParsedWorkout[];
  /** Lines we couldn't understand. Shown to the user — never silently dropped. */
  warnings: string[];
};

const LINK = /^https?:\/\/\S+$/;
const SET_PREFIX = /^Set\s+\d+\s*:\s*(.+)$/i;
// "Tuesday, 6 October 2026 at 07:27" (weekday optional)
const STARTED =
  /^(?:\w+,\s*)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})$/;
const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const LB_TO_KG = 0.45359237;
const MI_TO_M = 1609.344;
const pad = (n: number) => String(n).padStart(2, "0");
const round2 = (n: number) => Math.round(n * 100) / 100;

/** "6 October 2026 at 07:27" → { date: "2026-10-06", time: "07:27" }, or null. */
function parseStarted(line: string) {
  const m = STARTED.exec(line);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month === -1) return null;
  return {
    date: `${m[3]}-${pad(month + 1)}-${pad(Number(m[1]))}`,
    time: `${pad(Number(m[4]))}:${m[5]}`,
  };
}

/** "Lat Pulldown (Cable)" → { exercise: "Lat Pulldown", equipment: "Cable" } */
function parseExerciseName(line: string) {
  const m = /^(.*?)\s*\(([^()]+)\)$/.exec(line);
  return m
    ? { exercise: m[1].trim(), equipment: m[2].trim() }
    : { exercise: line, equipment: null };
}

/** "10:00" → 600, "1:02:30" → 3750. */
function parseDuration(s: string): number | null {
  const parts = s.split(":").map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return null;
  return parts.reduce((total, p) => total * 60 + p, 0);
}

/**
 * The bit after "Set N: ". Handles:
 *   "25 kg × 12", "25 kg × 12 @ 7", "+10 kg × 8", "-20 kg × 8" (assisted),
 *   "50 lb × 10", "12 reps", "0.8 km | 10:00", "1 mi | 9:30", "10:00", "0.8 km".
 * Returns null when it's none of those.
 */
export function parseSet(text: string): ParsedSet | null {
  const set: ParsedSet = {
    weightKg: null,
    reps: null,
    rpe: null,
    distanceM: null,
    durationSec: null,
  };

  // Optional "@ 7" effort at the end.
  let rest = text.trim();
  const rpe = /\s*@\s*(\d+(?:\.\d+)?)$/.exec(rest);
  if (rpe) {
    set.rpe = Math.round(Number(rpe[1]));
    rest = rest.slice(0, rpe.index).trim();
  }

  // Weight × reps. The app uses "×"; accept a plain "x" too.
  const lifted = /^([+-]?\d+(?:\.\d+)?)\s*(kg|lbs?)\s*[×x]\s*(\d+)$/i.exec(
    rest,
  );
  if (lifted) {
    const w = Number(lifted[1]);
    set.weightKg = round2(lifted[2].toLowerCase() === "kg" ? w : w * LB_TO_KG);
    set.reps = Number(lifted[3]);
    return set;
  }

  // Bodyweight: "12 reps"
  const repsOnly = /^(\d+)\s*reps?$/i.exec(rest);
  if (repsOnly) {
    set.reps = Number(repsOnly[1]);
    return set;
  }

  // Cardio: "0.8 km | 10:00", or either half on its own.
  let matched = false;
  for (const part of rest.split("|").map((p) => p.trim())) {
    const dist = /^(\d+(?:\.\d+)?)\s*(km|mi|m)$/i.exec(part);
    if (dist) {
      const n = Number(dist[1]);
      const unit = dist[2].toLowerCase();
      set.distanceM = Math.round(
        unit === "km" ? n * 1000 : unit === "mi" ? n * MI_TO_M : n,
      );
      matched = true;
    } else if (/^\d+(?::\d{2}){1,2}$/.test(part)) {
      set.durationSec = parseDuration(part);
      matched = true;
    } else {
      return null; // one unknown half → don't guess
    }
  }
  return matched ? set : null;
}

export function parseStrongExport(text: string): ParseResult {
  const workouts: ParsedWorkout[] = [];
  const warnings: string[] = [];

  let current: ParsedWorkout | null = null;
  let exercise: ParsedExercise | null = null;

  const finish = (link: string | null) => {
    if (current) {
      current.link = link;
      workouts.push(current);
    }
    current = null;
    exercise = null;
  };

  // Lines that aren't part of a workout yet: the title waits here until we see the date under it.
  let pendingTitle: string | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    // A link ends the workout above it. A link with no workout above
    // (the tail of a previous, cut-off export) is just skipped.
    if (LINK.test(line)) {
      finish(line);
      pendingTitle = null;
      continue;
    }

    const started = parseStarted(line);
    if (started) {
      // A new date while a workout is open = the previous one had no link; close it.
      if (current) finish(null);
      current = {
        title: pendingTitle ?? "Workout",
        ...started,
        link: null,
        exercises: [],
      };
      pendingTitle = null;
      continue;
    }

    if (!current) {
      // Before the first date line: remember it as a possible title.
      if (pendingTitle) warnings.push(`Skipped: "${pendingTitle}"`);
      pendingTitle = line;
      continue;
    }

    const setMatch = SET_PREFIX.exec(line);
    if (setMatch) {
      const set = parseSet(setMatch[1]);
      if (!exercise) warnings.push(`Set without an exercise: "${line}"`);
      else if (!set)
        warnings.push(`Couldn't read set: "${line}" (${exercise.exercise})`);
      else exercise.sets.push(set);
      continue;
    }

    // Anything else inside a workout starts a new exercise. Could also be the next
    // workout's title — if a date line follows, we fix that up below.
    exercise = { ...parseExerciseName(line), sets: [] };
    (current as ParsedWorkout).exercises.push(exercise);
  }

  if (pendingTitle) warnings.push(`Skipped: "${pendingTitle}"`);
  finish(null);

  // An "exercise" with no sets right before a date line was really the next title.
  // (Only happens when a workout has no link after it.) Easier to fix here than to look ahead.
  for (let i = 0; i < workouts.length - 1; i++) {
    const last = workouts[i].exercises.at(-1);
    if (last && last.sets.length === 0 && workouts[i + 1].title === "Workout") {
      workouts[i].exercises.pop();
      workouts[i + 1].title = last.equipment
        ? `${last.exercise} (${last.equipment})`
        : last.exercise;
    }
  }

  return { workouts, warnings };
}

/**
 * One parsed Strong workout → what saveWorkout / the import expects.
 * Each exercise's sets are flattened in order; the exercise name rides on every set.
 * `timeZone`: the wall-clock "07:27" in the export is the user's local time.
 */
export function toWorkoutInput(
  w: ParsedWorkout,
  timeZone: string,
): WorkoutInput {
  return {
    date: w.date,
    title: w.title,
    sourceUrl: w.link,
    startedAt: zonedDateTime(w.date, w.time, timeZone),
    durationMin: null, // Strong's text has no total duration
    quality: null,
    cardioType: null, // deprecated: cardio is in the sets now
    cardioDurationMin: null,
    cardioDistanceM: null,
    notes: null,
    sets: w.exercises.flatMap((e) =>
      e.sets.map((set) => ({
        exercise: e.exercise,
        equipment: e.equipment,
        ...set,
      })),
    ),
  };
}
