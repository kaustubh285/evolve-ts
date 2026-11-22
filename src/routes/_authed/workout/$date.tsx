import { Button, Card, Stack, Text } from "@mantine/core";
import { createFileRoute, linkOptions, notFound } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PageWrapper } from "#/components/page-wrapper";
import { WorkoutDetail } from "#/components/workout/workout-detail";
import { WorkoutForm } from "#/components/workout/workout-form";
import { formatIso } from "#/lib/dates";
import { isoDate } from "#/lib/zod-schemas/common";
import { getWorkoutRange } from "#/server/workout.functions";

export const Route = createFileRoute("/_authed/workout/$date")({
  component: RouteComponent,
  params: {
    parse: ({ date }) => {
      if (!isoDate.safeParse(date).success) throw notFound();
      return { date };
    },
  },
  loader: async ({ params, context }) => {
    const { workouts } = await getWorkoutRange({
      data: { from: params.date, to: params.date },
    });
    return { workouts, timeZone: context.timeZone };
  },
});

function RouteComponent() {
  const { date } = Route.useParams();
  const { workouts, timeZone } = Route.useLoaderData();
  // Open straight away on a day with nothing logged — that's why you came here.
  const [adding, setAdding] = useState(workouts.length === 0);

  return (
    <PageWrapper
      title="Workouts"
      size="sm"
      breadcrumbs={[
        { label: "Home", link: linkOptions({ to: "/" }) },
        { label: "Workouts", link: linkOptions({ to: "/workout" }) },
        { label: formatIso(date) },
      ]}
      actions={
        !adding && (
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => setAdding(true)}
          >
            Add workout
          </Button>
        )
      }
    >
      <Stack gap="md">
        {adding && (
          <Card withBorder radius="md" padding="md">
            {/* key: a fresh, empty form every time it opens. */}
            <WorkoutForm
              key={`${date}-${workouts.length}`}
              date={date}
              timeZone={timeZone}
              onDone={() => setAdding(false)}
            />
          </Card>
        )}

        {workouts.length > 0 ? (
          // Each entry shown in full with Edit / Delete right there — no modal, fewer taps.
          // One column: Edit swaps the card for the form in place, which needs the width.
          <Stack gap="md">
            {workouts.map((w) => (
              <WorkoutDetail key={w.id} workout={w} timeZone={timeZone} />
            ))}
          </Stack>
        ) : (
          !adding && (
            <Text size="sm" c="dimmed">
              No workouts on {formatIso(date)}.
            </Text>
          )
        )}
      </Stack>
    </PageWrapper>
  );
}
