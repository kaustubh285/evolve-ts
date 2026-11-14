import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

/**
 * Is anyone signed in? Returns only a boolean: the full session includes the
 * session token, which must never reach browser JS (the cookie is httpOnly for a reason).
 * Need user details? Use getViewer.
 */
export const hasSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    return session !== null;
  },
);
