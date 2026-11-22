import { AppShell, Group } from "@mantine/core";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { EvolveBottomNav } from "#/components/evolve-bottom-nav";
import { EvolveHeader } from "#/components/evolve-header";
import { EvolveSideNav } from "#/components/evolve-side-nav";
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
  // Pure CSS, no JS screen-size check (so no flash on load):
  //  - desktop (sm and up): side nav always shown, no bottom bar (footer height 0)
  //  - phone: no side nav, bottom tab bar instead
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: true, desktop: false },
      }}
      footer={{ height: { base: 64, sm: 0 } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <EvolveHeader />
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <EvolveSideNav />
      </AppShell.Navbar>
      <AppShell.Main
        // Mantine's bottom padding = footer height only. Add the iPhone home-bar inset
        // so the last content isn't hidden behind the taller footer (inset is 0 elsewhere).
        style={{
          paddingBottom:
            "calc(var(--app-shell-footer-offset, 0rem) + var(--app-shell-padding) + env(safe-area-inset-bottom))",
        }}
      >
        <Outlet />
      </AppShell.Main>
      {/* Mantine already grows the footer by the iPhone home-bar inset (and pads it). */}
      <AppShell.Footer hiddenFrom="sm">
        <EvolveBottomNav />
      </AppShell.Footer>
    </AppShell>
  );
}
