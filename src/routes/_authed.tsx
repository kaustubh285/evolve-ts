import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { EvolveHeader } from "#/components/header";
import { getSession } from "#/lib/auth.functions";

// Pathless layout: every route under src/routes/_authed/ requires a session.
export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    // Merged into router context for all child routes (context.user).
    return { user: session.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();

  return (
    <>
      <EvolveHeader user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </>
  );
}
