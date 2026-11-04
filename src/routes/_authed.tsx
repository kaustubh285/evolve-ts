import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getViewer } from "#/server/viewer.functions";
import { AppShell, Burger, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { EvolveSideNav } from "#/components/evolve-side-nav";
import { EvolveHeader } from "#/components/evolve-header";

// Pathless layout: every route under src/routes/_authed/ requires a session.
export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const viewer = await getViewer();
    if (!viewer) {
      throw redirect({ to: "/login" });
    }
    // Merged into router context for all child routes (context.user, context.timeZone).
    return viewer;
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const [opened, { toggle }] = useDisclosure();
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { desktop: !opened, mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <EvolveHeader opened={opened} toggle={toggle} />
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <EvolveSideNav />
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
