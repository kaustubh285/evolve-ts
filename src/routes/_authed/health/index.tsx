import { Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { createFileRoute, linkOptions } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { HealthEventCompact } from "#/components/health/health-event-compact";
import { LinkButton } from "#/components/links";
import { PageWrapper } from "#/components/page-wrapper";
import { RangeMiniCalendar } from "#/components/range-mini-calendar";
import { rangeSearch, resolveRange } from "#/lib/date-range";
import { formatIso, todayIso } from "#/lib/dates";
import { getHealthEventRange } from "#/server/health-event.functions";

export const Route = createFileRoute("/_authed/health/")({
  component: RouteComponent,
  // Same ?from= range as the check-in and workout pages.
  validateSearch: rangeSearch,
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ context, deps }) => {
    const today = todayIso(context.timeZone);
    const { from, to } = resolveRange(today, deps.from);
    const { healthEvents } = await getHealthEventRange({ data: { from, to } });
    return { today, from, to, timeZone: context.timeZone, healthEvents };
  },
});

function RouteComponent() {
  const { today, from, to, timeZone, healthEvents } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const eventDays = new Set(healthEvents.map((e) => e.date));

  return (
    <PageWrapper
      title="Health"
      breadcrumbs={[
        { label: "Home", link: linkOptions({ to: "/" }) },
        { label: "Health" },
      ]}
      actions={
        // No import here: health events are only entered by hand, on the day's page.
        <LinkButton
          to="/health/$date"
          params={{ date: today }}
          leftSection={<Plus size={16} />}
        >
          Log for today
        </LinkButton>
      }
    >
      <Stack gap="sm">
        {/* wrap: on a phone the calendar drops under the title at full width. */}
        <Group justify="space-between" align="center" gap="xs">
          <Title order={2} size="h4">
            Recent
          </Title>
          <RangeMiniCalendar
            from={from}
            marked={eventDays}
            markLabel="health event"
            onChange={(date) =>
              navigate({
                search: { from: date },
                replace: true, // paging days shouldn't fill the back-button history
                resetScroll: false,
              })
            }
          />
        </Group>

        {healthEvents.length > 0 ? (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
            {healthEvents.map((e) => (
              <HealthEventCompact key={e.id} event={e} timeZone={timeZone} />
            ))}
          </SimpleGrid>
        ) : (
          <Text size="sm" c="dimmed">
            No health events between {formatIso(from)} and {formatIso(to)}.
          </Text>
        )}
      </Stack>
    </PageWrapper>
  );
}
