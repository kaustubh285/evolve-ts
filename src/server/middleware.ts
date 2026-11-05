import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";

export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    // A redirect (not a plain Error): loaders and useServerFn callers both
    // follow it, so an expired session lands on /login instead of failing.
    if (!session) throw redirect({ to: "/login" });
    return next({ context: { userId: session.user.id } });
  },
);
