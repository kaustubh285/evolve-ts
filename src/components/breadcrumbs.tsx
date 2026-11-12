import { Breadcrumbs, Text } from "@mantine/core";
import type { LinkOptions } from "@tanstack/react-router";
import { LinkAnchor } from "./links";

export type Crumb = {
	label: React.ReactNode;
	/** Where it goes. Build with linkOptions({ to, params }) so the route is type-checked. */
	link?: LinkOptions;
};

/** Small trail above a page title, e.g. Check-in / Thu 12 Nov. Last item = current page. */
export function EvolveBreadcrumbs({ items }: { items: Crumb[] }) {
	return (
		<Breadcrumbs
			component="nav"
			aria-label="Breadcrumb"
			separatorMargin={6}
			mb={4}
		>
			{items.map((crumb, i) => {
				const key = `crumb-${i}`; // fixed order, never reordered → position is a stable key
				return crumb.link ? (
					<LinkAnchor key={key} size="sm" c="dimmed" {...crumb.link}>
						{crumb.label}
					</LinkAnchor>
				) : (
					<Text key={key} size="sm" aria-current="page">
						{crumb.label}
					</Text>
				);
			})}
		</Breadcrumbs>
	);
}
