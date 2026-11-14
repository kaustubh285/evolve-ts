import {
  ActionIcon,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { createFileRoute, linkOptions } from "@tanstack/react-router";
import { Calendar1Icon } from "lucide-react";
import { CheckInCompact } from "#/components/check-in/check-in-compact";
import { LinkButton } from "#/components/links";
import { PageWrapper } from "#/components/page-wrapper";
import { RangeMiniCalendar } from "#/components/range-mini-calendar";
import { RANGE_DAYS, rangeSearch, resolveRange } from "#/lib/date-range";
import { addDays, formatIso, todayIso } from "#/lib/dates";
import { getCheckInRange } from "#/server/check-in.functions";

export const Route = createFileRoute("/_authed/check-in/")({
  component: RouteComponent,
  validateSearch: rangeSearch,
  // Loader re-runs whenever `from` changes.
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ context, deps }) => {
    const today = todayIso(context.timeZone);
    const { from, to, includesToday } = resolveRange(today, deps.from);

    // Today's box doesn't depend on the range. Usually today IS in the range, so one call;
    // only when you've paged elsewhere do we fetch today on its own (in parallel).
    const [range, todayOnly] = await Promise.all([
      getCheckInRange({ data: { from, to } }),
      includesToday
        ? null
        : getCheckInRange({ data: { from: today, to: today } }),
    ]);
    const todayCheckIn =
      (todayOnly ?? range).checkIns.find((c) => c.date === today) ?? null;

    return {
      today,
      from,
      timeZone: context.timeZone,
      todayCheckIn,
      // Today has its own box above, so leave it out of the list.
      recent: range.checkIns.filter((c) => c.date !== today),
    };
  },
});

function RouteComponent() {
  const { today, from, timeZone, todayCheckIn, recent } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  // Days in the visible range that have a check-in (today lives outside `recent`).
  const checkedIn = new Set(recent.map((c) => c.date));
  if (todayCheckIn) checkedIn.add(todayCheckIn.date);
  const [calOpened, { open: calOpen, close: calClose }] = useDisclosure(false);
  return (
    <PageWrapper
      title={`Check-in`}
      breadcrumbs={[
        { label: "Home", link: linkOptions({ to: "/" }) },
        { label: "Check-in" },
      ]}
      actions={
        <ActionIcon onClick={calOpen}>
          <Calendar1Icon />
        </ActionIcon>
      }
    >
      <Modal opened={calOpened} onClose={calClose} withCloseButton={false}>
        <Calendar
          withCellSpacing
          withWeekNumbers
          fullWidth
          withNativeLevelSelect
        />
      </Modal>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
        {todayCheckIn ? (
          <CheckInCompact
            checkIn={todayCheckIn}
            timeZone={timeZone}
            tag="Today"
          />
        ) : (
          // Same footprint as a card, dashed so it reads as "not filled yet".
          <Card
            withBorder
            radius="md"
            padding="md"
            style={{ borderStyle: "dashed" }}
          >
            <Stack gap="xs" h="100%" justify="space-between">
              <div>
                <Text fw={600}>{formatIso(today)}</Text>
                <Text size="sm" c="dimmed">
                  Not checked in yet today
                </Text>
              </div>
              <Group>
                <LinkButton
                  to="/check-in/$date"
                  params={{ date: today }}
                  size="xs"
                >
                  Check in
                </LinkButton>
              </Group>
            </Stack>
          </Card>
        )}
      </SimpleGrid>

      <Stack gap="sm">
        {/* wrap: on a phone the calendar drops under the title at full width. */}
        <Group justify="space-between" align="center" gap="xs">
          <Title order={2} size="h4">
            Recent
          </Title>
          <RangeMiniCalendar
            from={from}
            marked={checkedIn}
            markLabel="checked in"
            // Controlled by the URL: arrows → new ?from → loader fetches that range.
            onChange={(date) =>
              navigate({
                search: { from: date },
                replace: true, // paging days shouldn't fill the back-button history
                resetScroll: false,
              })
            }
          />
        </Group>
        {recent.length > 0 ? (
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
            {recent.map((checkIn) => (
              <CheckInCompact
                key={checkIn.id}
                checkIn={checkIn}
                timeZone={timeZone}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Text size="sm" c="dimmed">
            No check-ins between {formatIso(from)} and{" "}
            {formatIso(addDays(from, RANGE_DAYS - 1))}.
          </Text>
        )}
      </Stack>
    </PageWrapper>
  );
}
