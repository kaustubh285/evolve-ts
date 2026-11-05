import { Box } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "#/components/page-wrapper";

export const Route = createFileRoute("/_authed/check-in/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<PageWrapper title="Check-in" description="Where you tell us what's done">
			<Box>Hello "/check-in/"!</Box>
			<Box>Doesn't look like you've checked-in today</Box>
		</PageWrapper>
	);
}
