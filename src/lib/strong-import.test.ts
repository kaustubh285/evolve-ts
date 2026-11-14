import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { workoutInput } from "#/lib/zod-schemas/workout";
import { parseSet, parseStrongExport, toWorkoutInput } from "./strong-import";

// The exact text the Strong app copied (2 workouts; the first link closes a cut-off earlier one).
const SAMPLE = `https://link.strong.app/cjkezvla
Another day workout
Monday, 27 July 2026 at 07:33

Running (Treadmill)
Set 1: 0.8 km | 10:00

Lat Pulldown (Cable)
Set 1: 25 kg × 12
Set 2: 25 kg × 12
Set 3: 25 kg × 12

Seated Row (Cable)
Set 1: 25 kg × 10
Set 2: 18 kg × 10
Set 3: 18 kg × 12
Set 4: 18 kg × 12

Reverse Fly (Machine)
Set 1: 25 kg × 10
Set 2: 25 kg × 10
Set 3: 25 kg × 10

Bicep Curl (Barbell)
Set 1: 12.5 kg × 12
Set 2: 12.5 kg × 12
Set 3: 12.5 kg × 8
https://link.strong.app/adjsdqoi
Early Morning Workout
Tuesday, 6 October 2026 at 07:27

Running (Treadmill)
Set 1: 0.72 km | 9:45

Cycling (Indoor)
Set 1: 1.82 km | 9:00

Chest Fly
Set 1: 25 kg × 11
Set 2: 32 kg × 11 @ 7

Chest Press (Machine)
Set 1: 18 kg × 11
Set 2: 18 kg × 12

Triceps Pushdown (Cable - Straight Bar)
Set 1: 9 kg × 9
Set 2: 9 kg × 8
https://link.strong.app/glijuwzc`;

const set = (s: Partial<ReturnType<typeof parseSet>>) => ({
  weightKg: null,
  reps: null,
  rpe: null,
  distanceM: null,
  durationSec: null,
  ...s,
});

describe("parseStrongExport — the real sample", () => {
  const { workouts, warnings } = parseStrongExport(SAMPLE);

  it("finds both workouts, no warnings", () => {
    assert.equal(workouts.length, 2);
    assert.deepEqual(warnings, []);
  });

  it("reads title, date, time and the link that follows each workout", () => {
    const [a, b] = workouts;
    assert.deepEqual(
      { title: a.title, date: a.date, time: a.time, link: a.link },
      {
        title: "Another day workout",
        date: "2026-07-27",
        time: "07:33",
        link: "https://link.strong.app/adjsdqoi",
      },
    );
    assert.deepEqual(
      { title: b.title, date: b.date, time: b.time, link: b.link },
      {
        title: "Early Morning Workout",
        date: "2026-10-06",
        time: "07:27",
        link: "https://link.strong.app/glijuwzc",
      },
    );
  });

  it("splits exercise name and equipment", () => {
    assert.deepEqual(
      workouts[1].exercises.map((e) => [e.exercise, e.equipment]),
      [
        ["Running", "Treadmill"],
        ["Cycling", "Indoor"],
        ["Chest Fly", null],
        ["Chest Press", "Machine"],
        ["Triceps Pushdown", "Cable - Straight Bar"],
      ],
    );
  });

  it("reads every set", () => {
    assert.deepEqual(
      workouts[0].exercises.map((e) => e.sets.length),
      [1, 3, 4, 3, 3],
    );
    assert.deepEqual(
      workouts[0].exercises[4].sets[2],
      set({ weightKg: 12.5, reps: 8 }),
    );
    assert.deepEqual(
      workouts[1].exercises[2].sets[1],
      set({ weightKg: 32, reps: 11, rpe: 7 }),
    );
    assert.deepEqual(
      workouts[1].exercises[0].sets[0],
      set({ distanceM: 720, durationSec: 585 }),
    );
  });
});

describe("parseSet — other formats Strong can produce", () => {
  it("bodyweight, assisted, weighted, pounds", () => {
    assert.deepEqual(parseSet("12 reps"), set({ reps: 12 }));
    assert.deepEqual(parseSet("-20 kg × 8"), set({ weightKg: -20, reps: 8 }));
    assert.deepEqual(parseSet("+10 kg × 8"), set({ weightKg: 10, reps: 8 }));
    assert.deepEqual(
      parseSet("50 lb × 10"),
      set({ weightKg: 22.68, reps: 10 }),
    );
  });

  it("time-only, distance-only, hours", () => {
    assert.deepEqual(parseSet("1:00"), set({ durationSec: 60 }));
    assert.deepEqual(parseSet("5 km"), set({ distanceM: 5000 }));
    assert.deepEqual(
      parseSet("10 km | 1:02:30"),
      set({ distanceM: 10000, durationSec: 3750 }),
    );
  });

  it("unknown → null (becomes a warning, never a guess)", () => {
    assert.equal(parseSet("banana"), null);
    assert.equal(parseSet("0.8 km | fast"), null);
  });
});

describe("parseStrongExport — edge cases", () => {
  it("workout with no link after it, followed by another", () => {
    const { workouts } = parseStrongExport(`Push
Monday, 2 November 2026 at 18:00
Bench Press (Barbell)
Set 1: 60 kg × 8
Pull
Tuesday, 3 November 2026 at 18:00
Deadlift (Barbell)
Set 1: 100 kg × 5`);
    assert.deepEqual(
      workouts.map((w) => [w.title, w.exercises.map((e) => e.exercise)]),
      [
        ["Push", ["Bench Press"]],
        ["Pull", ["Deadlift"]],
      ],
    );
  });

  it("unreadable set → warning, rest still imported", () => {
    const { workouts, warnings } = parseStrongExport(`Legs
Monday, 2 November 2026 at 18:00
Squat (Barbell)
Set 1: 80 kg × 5
Set 2: ???`);
    assert.equal(workouts[0].exercises[0].sets.length, 1);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /Set 2: \?\?\?/);
  });

  it("random text → nothing imported", () => {
    const { workouts } = parseStrongExport("hello\nthis is not a workout");
    assert.equal(workouts.length, 0);
  });
});

describe("toWorkoutInput", () => {
  const [, b] = parseStrongExport(SAMPLE).workouts;
  const input = toWorkoutInput(b, "Europe/London");

  it("keeps title + link, flattens sets in order", () => {
    assert.equal(input.title, "Early Morning Workout");
    assert.equal(input.sourceUrl, "https://link.strong.app/glijuwzc");
    assert.equal(input.sets?.length, 8); // run 1 + cycle 1 + fly 2 + press 2 + pushdown 2
    assert.deepEqual(input.sets?.[1], {
      exercise: "Cycling",
      equipment: "Indoor",
      ...set({ distanceM: 1820, durationSec: 540 }),
    });
  });

  it("start time is London wall-clock (BST in October → UTC−1h)", () => {
    assert.equal(input.startedAt?.toISOString(), "2026-10-06T06:27:00.000Z");
  });

  it("passes the same zod schema the server uses", () => {
    assert.equal(workoutInput.safeParse(input).success, true);
  });
});
