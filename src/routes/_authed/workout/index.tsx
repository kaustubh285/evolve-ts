import { Button, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, linkOptions } from "@tanstack/react-router";
import { ClipboardPaste } from "lucide-react";
import { useState } from "react";
import { PageWrapper } from "#/components/page-wrapper";
import { RangeMiniCalendar } from "#/components/range-mini-calendar";
import { ImportWorkoutModal } from "#/components/workout/import-workout-modal";
import { WorkoutCompact } from "#/components/workout/workout-compact";
import { RANGE_DAYS, rangeSearch, resolveRange } from "#/lib/date-range";
import { addDays, formatIso, todayIso } from "#/lib/dates";
import { getWorkoutRange } from "#/server/workout.functions";

export const Route = createFileRoute("/_authed/workout/")({
  component: RouteComponent,
  // Same ?from= range as the check-in page.
  validateSearch: rangeSearch,
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ context, deps }) => {
    const { from, to } = resolveRange(todayIso(context.timeZone), deps.from);
    const { workouts } = await getWorkoutRange({ data: { from, to } });
    return { from, to, timeZone: context.timeZone, workouts };
  },
});

function RouteComponent() {
  const { from, to, timeZone, workouts } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const workoutDays = new Set(workouts.map((w) => w.date));
  // null = closed; a string = open with that clipboard text.
  const [importText, setImportText] = useState<string | null>(null);

  // Read in the click handler: browsers only allow clipboard reads right after a user
  // gesture, and only on https/localhost. Refused or unavailable → open with an empty box.
  async function openImport() {
    let text = "";
    try {
      text = (await navigator.clipboard?.readText()) ?? "";
    } catch {
      // permission denied / insecure origin — the modal asks to paste manually
    }
    setImportText(text);
  }

  return (
    <PageWrapper
      title="Workouts"
      breadcrumbs={[
        { label: "Home", link: linkOptions({ to: "/" }) },
        { label: "Workouts" },
      ]}
      actions={
        <Button leftSection={<ClipboardPaste size={16} />} onClick={openImport}>
          Import workout
        </Button>
      }
    >
      <ImportWorkoutModal
        opened={importText !== null}
        initialText={importText ?? ""}
        onClose={() => setImportText(null)}
        // Imports are often old (weeks ago). Page the list so the newest imported
        // workout's day is the last day shown — otherwise you'd import and see nothing.
        onImported={(dates) => {
          const newest = dates.reduce((a, b) => (a > b ? a : b)); // ISO sorts like dates
          navigate({
            search: { from: addDays(newest, -(RANGE_DAYS - 1)) },
            resetScroll: false,
          });
        }}
      />
      <Stack gap="sm">
        {/* wrap: on a phone the calendar drops under the title at full width. */}
        <Group justify="space-between" align="center" gap="xs">
          <Title order={2} size="h4">
            Recent
          </Title>
          <RangeMiniCalendar
            from={from}
            marked={workoutDays}
            markLabel="workout"
            onChange={(date) =>
              navigate({
                search: { from: date },
                replace: true, // paging days shouldn't fill the back-button history
                resetScroll: false,
              })
            }
          />
        </Group>

        {workouts.length > 0 ? (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
            {workouts.map((w) => (
              <WorkoutCompact key={w.id} workout={w} timeZone={timeZone} />
            ))}
          </SimpleGrid>
        ) : (
          <Text size="sm" c="dimmed">
            No workouts between {formatIso(from)} and {formatIso(to)}.
          </Text>
        )}
      </Stack>
    </PageWrapper>
  );
}
