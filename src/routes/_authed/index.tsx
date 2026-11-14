import { SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "#/components/page-wrapper";
import { StatTile } from "#/components/stat-tile";
import { addDays, formatIso, todayIso } from "#/lib/dates";
import { formatMinutes, formatThousands } from "#/lib/format";
import { delta, weekStats } from "#/lib/insights";
import { getCheckInRange } from "#/server/check-in.functions";

const WEEK = 7;

export const Route = createFileRoute("/_authed/")({
  component: Home,
  loader: async ({ context }) => {
    const today = todayIso(context.timeZone);
    const weekStart = addDays(today, -(WEEK - 1)); // last 7 days, today included
    const prevStart = addDays(weekStart, -WEEK); // the 7 days before that

    // One call for both weeks, split here.
    const { checkIns } = await getCheckInRange({
      data: { from: prevStart, to: today },
    });
    return {
      today,
      weekStart,
      thisWeek: weekStats(checkIns.filter((c) => c.date >= weekStart)),
      lastWeek: weekStats(checkIns.filter((c) => c.date < weekStart)),
    };
  },
});

const VS = "vs previous 7 days";

function Home() {
  const { today, weekStart, thisWeek, lastWeek } = Route.useLoaderData();

  return (
    <PageWrapper title="Evolve">
      <Stack gap="sm">
        <div>
          <Title order={2} size="h4">
            Last 7 days
          </Title>
          <Text size="sm" c="dimmed">
            {formatIso(weekStart)} – {formatIso(today)}
          </Text>
        </div>

        {/* 2 per row on phones, 4 in a row from sm up. */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <StatTile
            label="Avg sleep"
            value={
              thisWeek.avgSleepMin != null
                ? formatMinutes(thisWeek.avgSleepMin)
                : "–"
            }
            delta={withDelta(
              delta(thisWeek.avgSleepMin, lastWeek.avgSleepMin),
              formatMinutes,
            )}
          />
          <StatTile
            label="Avg steps"
            value={
              thisWeek.avgSteps != null
                ? formatThousands(thisWeek.avgSteps)
                : "–"
            }
            delta={withDelta(
              delta(thisWeek.avgSteps, lastWeek.avgSteps),
              formatThousands,
            )}
          />
          <StatTile
            label="Protein meals"
            value={String(thisWeek.proteinMeals)}
            unit={`of ${WEEK * 3}`}
            delta={withDelta(
              thisWeek.proteinMeals - lastWeek.proteinMeals,
              String,
            )}
          />
          <StatTile
            label="Days checked in"
            value={String(thisWeek.daysCheckedIn)}
            unit={`of ${WEEK}`}
            delta={withDelta(
              thisWeek.daysCheckedIn - lastWeek.daysCheckedIn,
              String,
            )}
          />
        </SimpleGrid>
      </Stack>
    </PageWrapper>
  );
}

/** null (nothing to compare) → no delta line. */
function withDelta(value: number | null, format: (n: number) => string) {
  return value == null ? undefined : { value, format, vs: VS };
}
