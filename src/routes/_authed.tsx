import { AppShell, Group } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { EvolveHeader } from "#/components/evolve-header";
import { EvolveSideNav } from "#/components/evolve-side-nav";
import { SideNavContext } from "#/components/side-nav-context";
import { getViewer } from "#/server/viewer.functions";

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
  const [opened, { toggle, close }] = useDisclosure();
  // Below "sm" the navbar covers the page, so close it after picking a link.
  // On desktop it sits beside the page and stays open.
  const isMobile = useMediaQuery("(max-width: 48em)");

  return (
    <SideNavContext.Provider value={{ opened, toggle }}>
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
            <EvolveHeader />
          </Group>
        </AppShell.Header>
        <AppShell.Navbar p="md">
          <EvolveSideNav onNavigate={isMobile ? close : undefined} />
        </AppShell.Navbar>
        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </SideNavContext.Provider>
  );
}
