import { Card, Group, Stack, Text } from "@mantine/core";
import { Pill } from "lucide-react";
import { LinkCard } from "#/components/links";
import type { healthEvent } from "#/db/schema";
import { dateInZone, formatIso, timeInZone } from "#/lib/dates";
import { healthEventLabel } from "#/lib/zod-schemas/health-event";
import { severityBand } from "./severity-picker";

export type HealthEventRow = typeof healthEvent.$inferSelect;

type HealthEventCompactProps = {
  event: HealthEventRow;
  /** Zone to show times in (from router context). */
  timeZone: string;
  /** Card links to its day's page. Off on that page itself. Default true. */
  linkToDay?: boolean;
};

/**
 * "14:00 – 16:30", "22:00 – Sun 16 Nov 08:00" (spans days), "From 14:00" (ongoing), or null.
 * The start is always on the event's own day (the server sets `date` from it), so only the
 * end needs a date — and only when it's on a different day.
 */
export function healthTimeRange(e: HealthEventRow, timeZone: string) {
  const start = e.startedAt && timeInZone(e.startedAt, timeZone);
  let end = e.endedAt && timeInZone(e.endedAt, timeZone);
  if (e.endedAt && end) {
    const endDay = dateInZone(e.endedAt, timeZone);
    if (endDay !== e.date) end = `${formatIso(endDay)} ${end}`;
  }
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return null;
}

/** One health event at a glance: what, when, how bad, what you took. */
export function HealthEventCompact({
  event: e,
  timeZone,
  linkToDay = true,
}: HealthEventCompactProps) {
  const when = healthTimeRange(e, timeZone);

  const body = (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text fw={600} lineClamp={1}>
          {healthEventLabel(e.type)}
        </Text>
        {e.severity != null && (
          <Text
            size="sm"
            fw={500}
            // -text variant: readable contrast in light and dark mode (plain yellow isn't).
            style={{
              whiteSpace: "nowrap",
              color: `var(--mantine-color-${severityBand(e.severity).color}-text)`,
            }}
          >
            {e.severity}/10 · {severityBand(e.severity).label}
          </Text>
        )}
      </Group>
      <Text size="sm" c="dimmed">
        {formatIso(e.date)}
        {when && ` · ${when}`}
      </Text>
      {e.medication && (
        <Group gap={6} wrap="nowrap">
          <Text c="dimmed" display="flex" aria-hidden>
            <Pill size={16} />
          </Text>
          <Text size="sm" lineClamp={1}>
            <Text span size="sm" c="dimmed">
              Took{" "}
            </Text>
            {e.medication}
          </Text>
        </Group>
      )}
      {e.notes && (
        <Text size="sm" c="dimmed" lineClamp={2}>
          {e.notes}
        </Text>
      )}
    </Stack>
  );

  return linkToDay ? (
    <LinkCard
      to="/health/$date"
      params={{ date: e.date }}
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
