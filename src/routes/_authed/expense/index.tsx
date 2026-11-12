import { createFileRoute, linkOptions } from "@tanstack/react-router";
import { PageWrapper } from "#/components/page-wrapper";

export const Route = createFileRoute("/_authed/expense/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<PageWrapper
			title={`Expenses`}
			breadcrumbs={[
				{ label: "Home", link: linkOptions({ to: "/" }) },
				{ label: "Expenses" },
			]}
		>
			<div>Coming Soon (v0.2)</div>
		</PageWrapper>
	);
}
