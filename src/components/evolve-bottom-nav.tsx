import { Group, Text } from "@mantine/core";
import { useMatchRoute } from "@tanstack/react-router";
import { LinkAnchor } from "./links";
import { NAV_ITEMS } from "./nav-items";

// Phone order (thumb-reach): Check-in first, Home second.
const ORDER = ["/check-in", "/", "/workout", "/health"] as const;
const ITEMS = ORDER.flatMap((to) => NAV_ITEMS.filter((item) => item.to === to));

/** Phone navigation: icon + label tabs along the bottom (AppShell.Footer, hidden from `sm`). */
export function EvolveBottomNav() {
  const matchRoute = useMatchRoute();

  return (
    <Group
      component="nav"
      aria-label="Main"
      h="100%"
      gap={0}
      wrap="nowrap"
      grow
    >
      {ITEMS.map(({ label, to, icon: Icon }) => {
        // fuzzy: /check-in/2026-11-21 still highlights "Check-in". Home must be exact.
        const active = !!matchRoute({ to, fuzzy: to !== "/" });
        return (
          <LinkAnchor
            key={to}
            to={to}
            underline="never"
            aria-current={active ? "page" : undefined}
            c={active ? undefined : "dimmed"}
            h="100%"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
            <Text span size="xs" fw={active ? 600 : 400} inherit={false}>
              {label}
            </Text>
          </LinkAnchor>
        );
      })}
    </Group>
  );
}
