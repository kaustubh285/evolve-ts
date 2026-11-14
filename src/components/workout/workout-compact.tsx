import { Card, Group, Stack, Text } from "@mantine/core";
import { LinkCard } from "#/components/links";
import type { workout, workoutSet } from "#/db/schema";
import { formatIso, timeInZone } from "#/lib/dates";
import { formatMinutes } from "#/lib/format";

type WorkoutRow = typeof workout.$inferSelect;
type SetRow = typeof workoutSet.$inferSelect;
export type WorkoutWithSets = WorkoutRow & { sets: SetRow[] };

type ExerciseSummary = {
  key: string;
  name: string; // "Lat Pulldown (Cable)"
  sets: SetRow[];
};

/** Flat ordered sets → one entry per exercise (consecutive sets of the same exercise). */
export function groupSets(sets: SetRow[]): ExerciseSummary[] {
  const groups: ExerciseSummary[] = [];
  for (const set of sets) {
    const name = set.equipment
      ? `${set.exercise} (${set.equipment})`
      : set.exercise;
    const last = groups.at(-1);
    if (last?.name === name) last.sets.push(set);
    else groups.push({ key: `${set.position}`, name, sets: [set] });
  }
  return groups;
}

/** "0.72 km · 9:45" for cardio; "3 sets · top 25 kg" for lifting. */
export function describeSets(sets: SetRow[]): string {
  const distanceM = sets.reduce((t, s) => t + (s.distanceM ?? 0), 0);
  const durationSec = sets.reduce((t, s) => t + (s.durationSec ?? 0), 0);
  if (distanceM || durationSec) {
    const parts = [];
    if (distanceM) parts.push(`${Math.round(distanceM / 10) / 100} km`);
    if (durationSec) {
      const m = Math.floor(durationSec / 60);
      parts.push(
        m >= 60
          ? formatMinutes(m)
          : `${m}:${String(durationSec % 60).padStart(2, "0")}`,
      );
    }
    return parts.join(" · ");
  }

  const count = `${sets.length} ${sets.length === 1 ? "set" : "sets"}`;
  const weights = sets.flatMap((s) => (s.weightKg != null ? [s.weightKg] : []));
  return weights.length ? `${count} · top ${Math.max(...weights)} kg` : count;
}

const MAX_LINES = 4;

type WorkoutCompactProps = {
  workout: WorkoutWithSets;
  /** Zone to show the start time in (from router context). */
  timeZone: string;
  /** Card links to its day's page. Off on that page itself. Default true. */
  linkToDay?: boolean;
  /** How many exercises before "+N more". Default 4; Infinity in a detail view. */
  maxExercises?: number;
};

/** One workout at a glance: title, when, and a line per exercise. */
export function WorkoutCompact({
  workout: w,
  timeZone,
  linkToDay = true,
  maxExercises = MAX_LINES,
}: WorkoutCompactProps) {
  const exercises = groupSets(w.sets);
  const hidden = exercises.length - maxExercises;

  const body = (
    <Stack gap="xs">
      <div>
        <Text fw={600} lineClamp={1}>
          {w.title ?? "Workout"}
        </Text>
        <Text size="sm" c="dimmed">
          {formatIso(w.date)}
          {w.startedAt && ` · ${timeInZone(w.startedAt, timeZone)}`}
        </Text>
      </div>

      {exercises.length > 0 ? (
        <Stack gap={2}>
          {exercises.slice(0, maxExercises).map((e) => (
            <Group key={e.key} justify="space-between" wrap="nowrap" gap="xs">
              <Text size="sm" lineClamp={1}>
                {e.name}
              </Text>
              <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {describeSets(e.sets)}
              </Text>
            </Group>
          ))}
          {hidden > 0 && (
            <Text size="xs" c="dimmed">
              +{hidden} more
            </Text>
          )}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          No exercises
        </Text>
      )}
    </Stack>
  );

  return linkToDay ? (
    <LinkCard
      to="/workout/$date"
      params={{ date: w.date }}
      withBorder
      padding="md"
      radius="md"
    >
      {body}
    </LinkCard>
  ) : (
    <Card withBorder padding="md" radius="md">
      {body}
    </Card>
  );
}
