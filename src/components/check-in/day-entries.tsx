import {
  Button,
  Group,
  Input,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { Dumbbell, HeartPulse, Plus } from "lucide-react";
import type { HealthEventRow } from "#/components/health/health-event-compact";
import { severityBand } from "#/components/health/severity-picker";
import {
  describeSets,
  groupSets,
  type WorkoutWithSets,
} from "#/components/workout/workout-compact";
import { timeInZone } from "#/lib/dates";
import { healthEventLabel } from "#/lib/zod-schemas/health-event";

/** What the check-in form should open in its modal. */
export type DayEntryModal =
  | { kind: "workout"; workout: WorkoutWithSets }
  | { kind: "health"; event: HealthEventRow }
  | { kind: "add-workout" }
  | { kind: "add-health" };

type DayEntriesProps = {
  workouts: WorkoutWithSets[];
  healthEvents: HealthEventRow[];
  timeZone: string;
  /** Rows and buttons don't navigate — they ask the parent to open a modal. */
  onOpen: (modal: DayEntryModal) => void;
};

/** One tappable row: icon, a bold first line, a dimmed second line. */
function EntryRow({
  icon,
  title,
  detail,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  detail: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-label={label}
      p="xs"
      style={{
        borderRadius: "var(--mantine-radius-md)",
        border: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Text c="dimmed" display="flex" mt={2} aria-hidden>
          {icon}
        </Text>
        <div style={{ minWidth: 0 }}>
          <Text size="sm" fw={500} lineClamp={1}>
            {title}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {detail}
          </Text>
        </div>
      </Group>
    </UnstyledButton>
  );
}

/**
 * The day's workouts and health events (linked by date), with enough detail to
 * read at a glance. Tapping one opens it in a modal; the buttons open the forms.
 */
export function DayEntries({
  workouts,
  healthEvents,
  timeZone,
  onOpen,
}: DayEntriesProps) {
  return (
    <Input.Wrapper label="Workouts & health" description="Logged for this day">
      <Stack gap="xs" mt={6}>
        {workouts.map((w) => {
          const time = w.startedAt && timeInZone(w.startedAt, timeZone);
          // "Running 0.72 km · 9:45, Chest Fly 2 sets · top 32 kg, …"
          const detail =
            groupSets(w.sets)
              .map(
                (e) =>
                  `${e.name.replace(/ \(.*\)$/, "")} ${describeSets(e.sets)}`,
              )
              .join(", ") || "No exercises";
          const title = `${w.title ?? "Workout"}${time ? ` · ${time}` : ""}`;
          return (
            <EntryRow
              key={w.id}
              icon={<Dumbbell size={16} />}
              title={title}
              detail={detail}
              label={`Open workout: ${title}`}
              onClick={() => onOpen({ kind: "workout", workout: w })}
            />
          );
        })}

        {healthEvents.map((h) => {
          const band = h.severity != null ? severityBand(h.severity) : null;
          const start = h.startedAt && timeInZone(h.startedAt, timeZone);
          const end = h.endedAt && timeInZone(h.endedAt, timeZone);
          const detail = [
            start && (end ? `${start} – ${end}` : `From ${start}`),
            h.medication && `Took ${h.medication}`,
            h.notes,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <EntryRow
              key={h.id}
              icon={<HeartPulse size={16} />}
              title={
                <>
                  {healthEventLabel(h.type)}
                  {band && (
                    <Text
                      span
                      size="sm"
                      fw={500}
                      style={{
                        color: `var(--mantine-color-${band.color}-text)`,
                      }}
                    >
                      {" "}
                      · {h.severity}/10 {band.label.toLowerCase()}
                    </Text>
                  )}
                </>
              }
              detail={detail || "No details"}
              label={`Open health event: ${healthEventLabel(h.type)}`}
              onClick={() => onOpen({ kind: "health", event: h })}
            />
          );
        })}

        <Group gap="xs">
          <Button
            variant="light"
            size="xs"
            leftSection={<Plus size={14} />}
            onClick={() => onOpen({ kind: "add-workout" })}
          >
            Add workout
          </Button>
          <Button
            variant="light"
            size="xs"
            leftSection={<Plus size={14} />}
            onClick={() => onOpen({ kind: "add-health" })}
          >
            Log health event
          </Button>
        </Group>
      </Stack>
    </Input.Wrapper>
  );
}
