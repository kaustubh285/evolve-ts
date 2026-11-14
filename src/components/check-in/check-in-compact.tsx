import { Badge, Group, Stack, Text, VisuallyHidden } from "@mantine/core";
import { Beef, Dumbbell, Footprints, HeartPulse, Moon } from "lucide-react";
import type { HealthEventRow } from "#/components/health/health-event-compact";
import { severityBand } from "#/components/health/severity-picker";
import { LinkCard } from "#/components/links";
import { formatIso, timeInZone } from "#/lib/dates";
import { formatMinutes, formatThousands } from "#/lib/format";
import { healthEventLabel } from "#/lib/zod-schemas/health-event";
import type { CheckInRow } from "./form-context";

type CheckInCompactProps = {
  /** Workouts / health events are attached by getCheckInRange (linked by date). Optional so a bare row works too. */
  checkIn: CheckInRow & {
    workouts?: unknown[];
    healthEvents?: HealthEventRow[];
  };
  /** Zone to show times in (from router context), so server and browser render the same text. */
  timeZone: string;
  /** Small badge next to the date, e.g. "Today". Also highlights the card. */
  tag?: string;
};

function Stat({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text c="dimmed" display="flex">
        {icon}
      </Text>
      <Text size="sm">{children}</Text>
    </Group>
  );
}

/** One day at a glance. The whole card links to that day's check-in form. */
export function CheckInCompact({
  checkIn,
  timeZone,
  tag,
}: CheckInCompactProps) {
  const { sleepStart, sleepEnd } = checkIn;
  // sleepStart is already a Date — React can't render a Date, so format it to "HH:MM".
  const bed = sleepStart ? timeInZone(sleepStart, timeZone) : "–";
  const wake = sleepEnd ? timeInZone(sleepEnd, timeZone) : "–";
  const slept =
    sleepStart && sleepEnd
      ? formatMinutes(
          Math.round((sleepEnd.getTime() - sleepStart.getTime()) / 60_000),
        )
      : null;

  const protein = [
    { name: "Breakfast", had: checkIn.proteinAtBreakfast },
    { name: "Lunch", had: checkIn.proteinAtLunch },
    { name: "Dinner", had: checkIn.proteinAtDinner },
  ];

  return (
    <LinkCard
      to="/check-in/$date"
      params={{ date: checkIn.date }}
      withBorder
      padding="md"
      radius="md"
      // Tagged card (today) gets the accent border so it stands out from the list.
      style={
        tag ? { borderColor: "var(--mantine-primary-color-filled)" } : undefined
      }
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600}>{formatIso(checkIn.date)}</Text>
          {tag && (
            <Badge size="sm" variant="light">
              {tag}
            </Badge>
          )}
        </Group>

        <Stat icon={<Moon size={16} />}>
          {bed} → {wake}
          {slept && (
            <Text span c="dimmed" size="sm">
              {" "}
              · {slept}
            </Text>
          )}
        </Stat>

        <Group gap="lg">
          <Stat icon={<Beef size={16} />}>
            {/* B L D: bold = had protein, dimmed = didn't. */}
            {protein.map(({ name, had }) => (
              <Text
                key={name}
                span
                size="sm"
                fw={had ? 700 : 400}
                c={had ? undefined : "dimmed"}
                mr={4}
              >
                <span aria-hidden>{name[0]}</span>
                {/* Screen readers get words instead of bold/dimmed letters. */}
                <VisuallyHidden component="span">
                  {name}: {had ? "protein" : "no protein"}
                </VisuallyHidden>
              </Text>
            ))}
          </Stat>
          <Stat icon={<Footprints size={16} />}>
            {checkIn.steps != null ? formatThousands(checkIn.steps) : "–"}
          </Stat>
        </Group>

        <DayEntriesLine
          workouts={checkIn.workouts?.length ?? 0}
          healthEvents={checkIn.healthEvents ?? []}
        />

        {checkIn.meal && (
          <Text size="sm" c="dimmed" lineClamp={1}>
            {checkIn.meal}
          </Text>
        )}
      </Stack>
    </LinkCard>
  );
}

/** "🏋 1 workout · 🩺 Migraine 7/10" — what else happened that day. Nothing → nothing. */
function DayEntriesLine({
  workouts,
  healthEvents,
}: {
  workouts: number;
  healthEvents: HealthEventRow[];
}) {
  if (workouts === 0 && healthEvents.length === 0) return null;
  const [first, ...more] = healthEvents;

  return (
    <Group gap="md" wrap="nowrap">
      {workouts > 0 && (
        <Stat icon={<Dumbbell size={16} />}>
          {workouts} {workouts === 1 ? "workout" : "workouts"}
        </Stat>
      )}
      {first && (
        <Stat icon={<HeartPulse size={16} />}>
          <Text span size="sm" lineClamp={1}>
            {healthEventLabel(first.type)}
            {first.severity != null && (
              <Text
                span
                size="sm"
                fw={500}
                style={{
                  color: `var(--mantine-color-${severityBand(first.severity).color}-text)`,
                }}
              >
                {" "}
                {first.severity}/10
              </Text>
            )}
            {more.length > 0 && ` +${more.length}`}
          </Text>
        </Stat>
      )}
    </Group>
  );
}
