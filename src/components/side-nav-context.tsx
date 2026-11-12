import { createContext, useContext } from "react";

type SideNav = { opened: boolean; toggle: () => void };

// _authed.tsx owns the open/closed state; PageWrapper (deep inside the page) shows the toggle.
export const SideNavContext = createContext<SideNav | null>(null);

/** null outside the signed-in layout (e.g. /login), so callers can skip the toggle. */
export const useSideNav = () => useContext(SideNavContext);
