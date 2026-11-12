import { Badge, Group, Stack, Text, VisuallyHidden } from "@mantine/core";
import { Beef, Footprints, Moon } from "lucide-react";
import { LinkCard } from "#/components/links";
import { formatIso, timeInZone } from "#/lib/dates";
import type { CheckInRow } from "./form-context";

type CheckInCompactProps = {
  checkIn: CheckInRow;
  /** Zone to show times in (from router context), so server and browser render the same text. */
  timeZone: string;
  /** Small badge next to the date, e.g. "Today". Also highlights the card. */
  tag?: string;
};

/** 460 → "7h 40m" */
const formatMinutes = (mins: number) =>
  `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;

/** 8432 → "8,432". Built by hand: toLocaleString can differ between server and browser. */
const formatThousands = (n: number) =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

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

        {checkIn.meal && (
          <Text size="sm" c="dimmed" lineClamp={1}>
            {checkIn.meal}
          </Text>
        )}
      </Stack>
    </LinkCard>
  );
}
