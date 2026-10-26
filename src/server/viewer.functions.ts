import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import env from "#/env";
import { auth } from "#/lib/auth";

/**
 * Who's looking + app settings the client needs. Used by the _authed layout,
 * so everything under it gets `context.user` and `context.timeZone`.
 * Returns null when signed out (the layout turns that into a redirect).
 */
export const getViewer = createServerFn({ method: "GET" }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) return null;
  return { user: session.user, timeZone: env.APP_TIMEZONE };
});
