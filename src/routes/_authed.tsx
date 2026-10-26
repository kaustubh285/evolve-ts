import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { EvolveHeader } from "#/components/header";
import { QuickAdd } from "#/components/quick-add/quick-add";
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
  const { user, timeZone } = Route.useRouteContext();

  return (
    <>
      <EvolveHeader user={user} />
      {/* pb-28: room so the floating + never covers the end of a page */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-28">
        <Outlet />
      </main>
      <QuickAdd timeZone={timeZone} />
    </>
  );
}
