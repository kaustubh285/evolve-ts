import {
	ActionIcon,
	Burger,
	Container,
	type ContainerProps,
	Flex,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { SidebarCloseIcon, SidebarOpenIcon } from "lucide-react";
import { type Crumb, EvolveBreadcrumbs } from "./breadcrumbs";
import { useSideNav } from "./side-nav-context";

type PageWrapperProps = {
	/** Page heading. Omit for pages that draw their own. */
	title?: React.ReactNode;
	/** Smaller line under the title. */
	description?: React.ReactNode;
	/** Shown on the right of the title (e.g. a button). */
	actions?: React.ReactNode;
	/** Max content width. "md" ≈ 960px; use "sm" for forms, "lg" for wide grids. */
	size?: ContainerProps["size"];
	/** Trail above the title, e.g. Check-in / Thu 12 Nov. Last item = this page (no link). */
	breadcrumbs?: Crumb[];
	children: React.ReactNode;
};

/**
 * The frame every signed-in page renders inside: consistent width, padding,
 * and an optional title row. Lives inside AppShell.Main (see _authed.tsx).
 */
export function PageWrapper({
	title,
	description,
	actions,
	size = "md",
	breadcrumbs,
	children,
}: PageWrapperProps) {
	const sideNav = useSideNav();
	// The side-nav toggle lives here, so every signed-in page gets a title row.
	const hasHeader = title || description || actions || sideNav;
	return (
		<Container
			size={size}
			py="lg"
			style={{
				position: "relative",
			}}
		>
			<Stack gap="lg">
				{hasHeader && (
					<Group justify="space-between" align="flex-start" wrap="nowrap">
						<div>
							<Group justify="center" align="center" my={"md"}>
								{sideNav && (
									<ActionIcon
										variant={"subtle"}
										onClick={sideNav.toggle}
										mb={"2px"}
									>
										{sideNav.opened ? (
											<SidebarCloseIcon />
										) : (
											<SidebarOpenIcon />
										)}
									</ActionIcon>
								)}
								{breadcrumbs && breadcrumbs.length > 0 && (
									<EvolveBreadcrumbs items={breadcrumbs} />
								)}
							</Group>
							{(title || sideNav) && (
								<Flex align={"center"} gap="sm">
									{/*{sideNav && (
										<Burger
											opened={sideNav.opened}
											onClick={sideNav.toggle}
											size="sm"
											aria-label={
												sideNav.opened ? "Close navigation" : "Open navigation"
											}
										/>
									)}*/}
									{title && (
										<Title order={1} size="h2">
											{title}
										</Title>
									)}
								</Flex>
							)}
							{description && (
								<Text c="dimmed" size="sm">
									{description}
								</Text>
							)}
						</div>
						{actions}
					</Group>
				)}

				{children}
			</Stack>
		</Container>
	);
}
