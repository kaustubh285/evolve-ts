import { Card, Group, Text } from "@mantine/core";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

type StatTileProps = {
  /** Sentence case, no colon: "Avg sleep". */
  label: string;
  /** Already formatted: "7h 12m", "8,940". */
  value: string;
  /** Small dimmed text after the value: "of 21", "/ 7 days". */
  unit?: string;
  /** Signed change vs the previous period. Omit when there's nothing to compare. */
  delta?: {
    value: number;
    /** Formats the size of the change (sign and arrow are added here). */
    format: (abs: number) => string;
    /** Name of the comparison period, read after the change: "vs last week". */
    vs: string;
    /** Is going up a good thing? Picks green/red. Default true. */
    upIsGood?: boolean;
  };
};

/** One number at a glance, with an optional "+18m vs last week" line. */
export function StatTile({ label, value, unit, delta }: StatTileProps) {
  return (
    <Card withBorder radius="md" padding="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Group gap={4} align="baseline" wrap="nowrap">
        <Text fz={28} fw={600} lh={1.2}>
          {value}
        </Text>
        {unit && (
          <Text size="sm" c="dimmed">
            {unit}
          </Text>
        )}
      </Group>
      {delta && <Delta {...delta} />}
    </Card>
  );
}

function Delta({
  value,
  format,
  vs,
  upIsGood = true,
}: NonNullable<StatTileProps["delta"]>) {
  if (value === 0) {
    return (
      <Group gap={4} wrap="wrap">
        <Minus size={14} aria-hidden />
        <Text size="xs" c="dimmed">
          Same as {vs.replace(/^vs /, "")}
        </Text>
      </Group>
    );
  }

  const up = value > 0;
  const good = up === upIsGood;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const color = good ? "teal" : "red";

  // Arrow + sign carry direction; color only adds good/bad on top (never color alone).
  return (
    <Group gap={4} wrap="wrap">
      <Text c={color} display="flex" aria-hidden>
        <Icon size={14} />
      </Text>
      <Text size="xs" c={color} fw={500}>
        {up ? "+" : "−"}
        {format(Math.abs(value))}
      </Text>
      <Text size="xs" c="dimmed">
        {vs}
      </Text>
    </Group>
  );
}
