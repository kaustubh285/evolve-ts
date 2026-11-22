import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  NumberInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { randomId } from "@mantine/hooks";
import { useRouter } from "@tanstack/react-router";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { timeInZone, zonedDateTime } from "#/lib/dates";
import { type WorkoutInput, workoutInput } from "#/lib/zod-schemas/workout";
import { saveWorkout } from "#/server/workout.functions";
import { groupSets, type WorkoutWithSets } from "./workout-compact";

// ── Form values ─────────────────────────────────────────────────────────────
// What the inputs hold. Empty number = "" (Mantine NumberInput), empty text = "".
// Converted to the server shape (flat sets, nulls, Date) on save.

type SetValues = {
  key: string;
  weightKg: number | string;
  reps: number | string;
  rpe: number | string;
  distanceKm: number | string;
  duration: string; // "9:45" (m:ss), "1:02:30", or "45" (minutes)
};

type ExerciseValues = {
  key: string; // stable React key while rows are added/removed
  kind: "lift" | "cardio";
  exercise: string;
  equipment: string;
  sets: SetValues[];
};

type WorkoutFormValues = {
  title: string;
  startTime: string; // "HH:MM"
  durationMin: number | string;
  notes: string;
  exercises: ExerciseValues[];
};

const emptySet = (): SetValues => ({
  key: randomId(),
  weightKg: "",
  reps: "",
  rpe: "",
  distanceKm: "",
  duration: "",
});

const emptyExercise = (
  kind: ExerciseValues["kind"] = "lift",
): ExerciseValues => ({
  key: randomId(),
  kind,
  exercise: "",
  equipment: "",
  sets: [emptySet()],
});

const num = (v: number | string) => (typeof v === "number" ? v : null);
const text = (v: string) => (v.trim() ? v.trim() : null);

/** "9:45" → 585, "1:02:30" → 3750, "45" → 2700 (plain number = minutes). "" / junk → null. */
export function parseDuration(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s) * 60;
  if (!/^\d+(:\d{1,2}){1,2}$/.test(s)) return null;
  return s.split(":").reduce((total, p) => total * 60 + Number(p), 0);
}

/** 585 → "9:45", 3750 → "1:02:30" (inverse of parseDuration). */
function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = String(sec % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Saved workout → form values (for editing). Flat sets are grouped back into exercises. */
function fromWorkout(w: WorkoutWithSets, timeZone: string): WorkoutFormValues {
  const exercises = groupSets(w.sets);
  return {
    title: w.title ?? "",
    startTime: w.startedAt ? timeInZone(w.startedAt, timeZone) : "",
    durationMin: w.durationMin ?? "",
    notes: w.notes ?? "",
    // No sets yet → one empty card to fill in.
    exercises: !exercises.length
      ? [emptyExercise()]
      : exercises.map((g) => {
          const first = g.sets[0];
          return {
            key: randomId(),
            // Any distance/time on a set → it was cardio.
            kind: g.sets.some(
              (s) => s.distanceM != null || s.durationSec != null,
            )
              ? "cardio"
              : "lift",
            exercise: first.exercise,
            equipment: first.equipment ?? "",
            sets: g.sets.map((s) => ({
              key: randomId(),
              weightKg: s.weightKg ?? "",
              reps: s.reps ?? "",
              rpe: s.rpe ?? "",
              distanceKm: s.distanceM != null ? s.distanceM / 1000 : "",
              duration:
                s.durationSec != null ? formatDuration(s.durationSec) : "",
            })),
          };
        }),
  };
}

/**
 * Form → what saveWorkout expects. Sets are flattened; exercise name rides on each set.
 * `existing`: when editing, keeps what the form doesn't show (id, Strong link, quality).
 */
function toWorkoutInput(
  v: WorkoutFormValues,
  date: string,
  timeZone: string,
  existing?: WorkoutWithSets,
): WorkoutInput {
  return {
    id: existing?.id,
    date,
    title: text(v.title),
    // Keep the Strong link on edit, or a re-import would no longer spot it as a duplicate.
    sourceUrl: existing?.sourceUrl ?? null,
    startedAt: v.startTime ? zonedDateTime(date, v.startTime, timeZone) : null,
    durationMin: num(v.durationMin),
    quality: existing?.quality ?? null, // not in the form; don't wipe it
    cardioType: null, // deprecated: cardio lives in the sets
    cardioDurationMin: null,
    cardioDistanceM: null,
    notes: text(v.notes),
    sets: v.exercises.flatMap((e) =>
      e.sets.map((s) => {
        const km = num(s.distanceKm);
        const isLift = e.kind === "lift";
        return {
          exercise: e.exercise.trim(),
          equipment: text(e.equipment),
          weightKg: isLift ? num(s.weightKg) : null,
          reps: isLift ? num(s.reps) : null,
          rpe: isLift ? num(s.rpe) : null,
          distanceM: !isLift && km != null ? Math.round(km * 1000) : null,
          durationSec: isLift ? null : parseDuration(s.duration),
        };
      }),
    ),
  };
}

// ── Component ───────────────────────────────────────────────────────────────

type WorkoutFormProps = {
  date: string;
  timeZone: string;
  /** Edit this workout instead of creating a new one. */
  workout?: WorkoutWithSets;
  /** Saved (or cancelled, when there's no onCancel) — the parent closes the form. */
  onDone: () => void;
  /** Cancel does something else than close, e.g. back to the read-only view. */
  onCancel?: () => void;
};

/** Create or edit a workout for one day. Standalone (date + onDone) so it fits a modal/drawer. */
export function WorkoutForm({
  date,
  timeZone,
  workout,
  onDone,
  onCancel,
}: WorkoutFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<WorkoutFormValues>({
    initialValues: workout
      ? fromWorkout(workout, timeZone)
      : {
          title: "",
          startTime: "",
          durationMin: "",
          notes: "",
          exercises: [emptyExercise()],
        },
    validate: {
      exercises: {
        exercise: (v) => (v.trim() ? null : "Name the exercise"),
        sets: {
          duration: (v) =>
            v.trim() && parseDuration(v) == null ? "Use m:ss, e.g. 9:45" : null,
        },
      },
    },
  });

  async function handleSubmit(values: WorkoutFormValues) {
    // Same zod rules as the server (and the importer).
    const parsed = workoutInput.safeParse(
      toWorkoutInput(values, date, timeZone, workout),
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveWorkout({ data: parsed.data });
      await router.invalidate(); // the day's list picks up the new workout
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  /** New set = copy of the previous one: gym sets usually repeat (25 kg × 12, × 12, …). */
  function addSet(i: number) {
    const last = form.getValues().exercises[i].sets.at(-1);
    form.insertListItem(
      `exercises.${i}.sets`,
      last ? { ...last, key: randomId() } : emptySet(),
    );
  }

  const exercises = form.getValues().exercises;

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
      <Stack gap="md">
        <TextInput
          label="Title"
          placeholder="Workout"
          {...form.getInputProps("title")}
        />
        <SimpleGrid cols={2} spacing="sm">
          <TextInput
            type="time"
            label="Started"
            {...form.getInputProps("startTime")}
          />
          <NumberInput
            label="Duration (min)"
            min={1}
            max={24 * 60}
            allowDecimal={false}
            allowNegative={false}
            {...form.getInputProps("durationMin")}
          />
        </SimpleGrid>

        {exercises.map((ex, i) => (
          <Card key={ex.key} withBorder radius="md" padding="sm">
            <Stack gap="xs">
              <Group justify="space-between" wrap="nowrap">
                <SegmentedControl
                  size="xs"
                  data={[
                    { label: "Lift", value: "lift" },
                    { label: "Cardio", value: "cardio" },
                  ]}
                  {...form.getInputProps(`exercises.${i}.kind`)}
                />
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Remove exercise ${i + 1}`}
                  onClick={() => form.removeListItem("exercises", i)}
                  disabled={exercises.length === 1}
                >
                  <Trash2 size={16} />
                </ActionIcon>
              </Group>

              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                <TextInput
                  label="Exercise"
                  placeholder={ex.kind === "lift" ? "Lat Pulldown" : "Running"}
                  {...form.getInputProps(`exercises.${i}.exercise`)}
                />
                <TextInput
                  label="Equipment"
                  placeholder={ex.kind === "lift" ? "Cable" : "Treadmill"}
                  {...form.getInputProps(`exercises.${i}.equipment`)}
                />
              </SimpleGrid>

              {/* Column labels once; each input also has its own aria-label. */}
              <Group gap="xs" wrap="nowrap" pr={36} aria-hidden>
                <Text size="xs" c="dimmed" w={24}>
                  #
                </Text>
                {(ex.kind === "lift"
                  ? ["kg", "reps", "RPE"]
                  : ["km", "time (m:ss)"]
                ).map((h) => (
                  <Text key={h} size="xs" c="dimmed" style={{ flex: 1 }}>
                    {h}
                  </Text>
                ))}
              </Group>

              {ex.sets.map((set, j) => {
                const path = `exercises.${i}.sets.${j}`;
                const n = j + 1;
                return (
                  <Group
                    key={set.key}
                    gap="xs"
                    wrap="nowrap"
                    align="flex-start"
                  >
                    <Text size="sm" c="dimmed" w={24} pt={6}>
                      {n}
                    </Text>
                    {ex.kind === "lift" ? (
                      <>
                        <NumberInput
                          aria-label={`Set ${n} weight in kg`}
                          style={{ flex: 1 }}
                          min={-500}
                          max={1000}
                          decimalScale={2}
                          hideControls
                          {...form.getInputProps(`${path}.weightKg`)}
                        />
                        <NumberInput
                          aria-label={`Set ${n} reps`}
                          style={{ flex: 1 }}
                          min={0}
                          max={1000}
                          allowDecimal={false}
                          allowNegative={false}
                          hideControls
                          {...form.getInputProps(`${path}.reps`)}
                        />
                        <NumberInput
                          aria-label={`Set ${n} RPE, 1 to 10`}
                          style={{ flex: 1 }}
                          min={1}
                          max={10}
                          allowDecimal={false}
                          allowNegative={false}
                          hideControls
                          {...form.getInputProps(`${path}.rpe`)}
                        />
                      </>
                    ) : (
                      <>
                        <NumberInput
                          aria-label={`Set ${n} distance in km`}
                          style={{ flex: 1 }}
                          min={0}
                          max={1000}
                          decimalScale={2}
                          allowNegative={false}
                          hideControls
                          {...form.getInputProps(`${path}.distanceKm`)}
                        />
                        <TextInput
                          aria-label={`Set ${n} time, minutes and seconds`}
                          style={{ flex: 1 }}
                          placeholder="9:45"
                          inputMode="numeric"
                          {...form.getInputProps(`${path}.duration`)}
                        />
                      </>
                    )}
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      mt={4}
                      aria-label={`Remove set ${n}`}
                      onClick={() =>
                        form.removeListItem(`exercises.${i}.sets`, j)
                      }
                      disabled={ex.sets.length === 1}
                    >
                      <X size={16} />
                    </ActionIcon>
                  </Group>
                );
              })}

              <Group>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<Plus size={14} />}
                  onClick={() => addSet(i)}
                >
                  Add set
                </Button>
              </Group>
            </Stack>
          </Card>
        ))}

        <Group>
          <Button
            variant="light"
            leftSection={<Plus size={16} />}
            onClick={() => form.insertListItem("exercises", emptyExercise())}
          >
            Add exercise
          </Button>
        </Group>

        <Textarea
          label="Notes"
          autosize
          minRows={2}
          {...form.getInputProps("notes")}
        />

        {error && (
          <Alert color="red" title="Couldn't save" role="alert">
            {error}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onCancel ?? onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save workout
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
