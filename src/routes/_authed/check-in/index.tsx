import { Box, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { CheckInCompact } from "#/components/check-in/check-in-compact";
import { LinkAnchor } from "#/components/links";
import { PageWrapper } from "#/components/page-wrapper";
import { todayIso } from "#/lib/dates";
import { getCheckIn } from "#/server/check-in.functions";

export const Route = createFileRoute("/_authed/check-in/")({
	component: RouteComponent,
	loader: async ({ context }) => {
		const today = todayIso(context.timeZone);
		const day = await getCheckIn({ data: { date: today } });
		return { date: today, checkIn: day.checkIn, timeZone: day.timeZone };
	},
});

function RouteComponent() {
	const { date, checkIn, timeZone } = Route.useLoaderData();
	return (
		<PageWrapper title={`Check-in`} titleBackNav={false}>
			<Text>{date}</Text>
			{JSON.stringify(checkIn)}
			<CheckInCompact checkIn={checkIn} timeZone={timeZone} />
			{!checkIn && <Box>Doesn't look like you've checked-in today</Box>}
			<LinkAnchor to="/check-in/$date" params={{ date }}>
				Open today
			</LinkAnchor>
		</PageWrapper>
	);
}
