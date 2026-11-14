import { Button, Card, SimpleGrid, Stack, Text } from "@mantine/core";
import { createFileRoute, linkOptions, notFound } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { HealthEventCompact } from "#/components/health/health-event-compact";
import { HealthEventForm } from "#/components/health/health-event-form";
import { PageWrapper } from "#/components/page-wrapper";
import { formatIso } from "#/lib/dates";
import { isoDate } from "#/lib/zod-schemas/common";
import { getHealthEventRange } from "#/server/health-event.functions";

export const Route = createFileRoute("/_authed/health/$date")({
  component: RouteComponent,
  params: {
    parse: ({ date }) => {
      if (!isoDate.safeParse(date).success) throw notFound();
      return { date };
    },
  },
  loader: async ({ params, context }) => {
    const { healthEvents } = await getHealthEventRange({
      data: { from: params.date, to: params.date },
    });
    return { healthEvents, timeZone: context.timeZone };
  },
});

function RouteComponent() {
  const { date } = Route.useParams();
  const { healthEvents, timeZone } = Route.useLoaderData();
  // Open straight away on a day with nothing logged — that's why you came here.
  const [adding, setAdding] = useState(healthEvents.length === 0);

  return (
    <PageWrapper
      title="Health"
      size="sm"
      breadcrumbs={[
        { label: "Home", link: linkOptions({ to: "/" }) },
        { label: "Health", link: linkOptions({ to: "/health" }) },
        { label: formatIso(date) },
      ]}
      actions={
        !adding && (
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => setAdding(true)}
          >
            Add event
          </Button>
        )
      }
    >
      <Stack gap="md">
        {adding && (
          <Card withBorder radius="md" padding="md">
            {/* key: a fresh, empty form every time it opens. */}
            <HealthEventForm
              key={`${date}-${healthEvents.length}`}
              date={date}
              timeZone={timeZone}
              onDone={() => setAdding(false)}
            />
          </Card>
        )}

        {healthEvents.length > 0 ? (
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            {healthEvents.map((e) => (
              <HealthEventCompact
                key={e.id}
                event={e}
                timeZone={timeZone}
                linkToDay={false}
              />
            ))}
          </SimpleGrid>
        ) : (
          !adding && (
            <Text size="sm" c="dimmed">
              No health events on {formatIso(date)}.
            </Text>
          )
        )}
      </Stack>
    </PageWrapper>
  );
}
