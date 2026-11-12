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
import { Calendar, MiniCalendar } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { createFileRoute, linkOptions } from "@tanstack/react-router";
import { z } from "zod";
import { Calendar1Icon } from "lucide-react";
import { CheckInCompact } from "#/components/check-in/check-in-compact";
import { LinkButton } from "#/components/links";
import { PageWrapper } from "#/components/page-wrapper";
import { addDays, formatIso, todayIso } from "#/lib/dates";
import { isoDate } from "#/lib/zod-schemas/common";
import { getCheckInRange } from "#/server/check-in.functions";

/** How many days the mini-calendar shows (= how many days "Recent" covers). */
const RANGE_DAYS = 7;

export const Route = createFileRoute("/_authed/check-in/")({
	component: RouteComponent,
	// ?from=2026-11-06 → first day the mini-calendar shows. In the URL so back/refresh/share keep it.
	// Missing or invalid → undefined → defaults to the last RANGE_DAYS days.
	validateSearch: z.object({ from: isoDate.optional().catch(undefined) }),
	// Loader re-runs whenever `from` changes.
	loaderDeps: ({ search }) => ({ from: search.from }),
	loader: async ({ context, deps }) => {
		const today = todayIso(context.timeZone);
		const from = deps.from ?? addDays(today, -(RANGE_DAYS - 1));
		const to = addDays(from, RANGE_DAYS - 1);
		const todayInRange = from <= today && today <= to; // ISO strings compare like dates

		// Today's box doesn't depend on the range. Usually today IS in the range, so one call;
		// only when you've paged elsewhere do we fetch today on its own (in parallel).
		const [range, todayOnly] = await Promise.all([
			getCheckInRange({ data: { from, to } }),
			todayInRange
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
					<MiniCalendar
						size="md"
						numberOfDays={RANGE_DAYS}
						// Shrink to the space available instead of fit-content (which overflowed
						// phones): the strip grows up to 460px and the 7 days share it evenly.
						style={{ flex: "1 1 280px", maxWidth: 460 }}
						styles={{
							root: { width: "100%" },
							days: { flex: 1 },
							day: { flex: 1, minWidth: 0, paddingInline: 0 },
						}}
						// Small accent dot under days that have a check-in.
						getDayProps={(day) =>
							checkedIn.has(day)
								? {
										style: {
											backgroundImage:
												"radial-gradient(circle, var(--mantine-primary-color-filled) 2px, transparent 2.5px)",
											backgroundSize: "6px 6px",
											backgroundPosition: "center bottom 4px",
											backgroundRepeat: "no-repeat",
										},
										// Mantine labels days "2026-11-10"; keep that format, add the status.
										"aria-label": `${day}, checked in`,
									}
								: {}
						}
						// Controlled by the URL: arrows → new ?from → loader fetches that range.
						date={from}
						onDateChange={(date) =>
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
