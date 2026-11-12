import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "#/components/page-wrapper";

export const Route = createFileRoute("/_authed/workout/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<PageWrapper title={`Workouts`}>
			<div>Coming Soon (v0.2)</div>
		</PageWrapper>
	);
}
