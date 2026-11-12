import { createFileRoute, linkOptions, notFound } from "@tanstack/react-router";
import { CheckInForm } from "#/components/check-in/check-in-form";
import { PageWrapper } from "#/components/page-wrapper";
import { formatIso } from "#/lib/dates";
import { isoDate } from "#/lib/zod-schemas/common";
import { getCheckIn } from "#/server/check-in.functions";

export const Route = createFileRoute("/_authed/check-in/$date")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const day = await getCheckIn({ data: { date: params.date } });
		return { checkIn: day.checkIn, timeZone: day.timeZone };
	},
	params: {
		parse: ({ date }) => {
			if (!isoDate.safeParse(date).success) throw notFound();
			return { date };
		},
	},
});

function RouteComponent() {
	const { date } = Route.useParams();
	const { checkIn, timeZone } = Route.useLoaderData();
	return (
		<PageWrapper
			title={`Check-in`}
			breadcrumbs={[
				{ label: "Home", link: linkOptions({ to: "/" }) },
				{ label: "Check-in", link: linkOptions({ to: "/check-in" }) },
				{ label: formatIso(date) },
			]}
		>
			{/* key: a new date → fresh form, otherwise it keeps the previous day's values */}
			<CheckInForm
				key={date}
				date={date}
				checkIn={checkIn}
				timeZone={timeZone}
			/>
		</PageWrapper>
	);
}
