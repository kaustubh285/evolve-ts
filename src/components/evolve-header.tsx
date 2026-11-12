import { Group, Title } from "@mantine/core";
import { useMatchRoute } from "@tanstack/react-router";
import { LinkAnchor } from "./links";
import { NAV_ITEMS } from "./nav-items";

export function EvolveHeader() {
  const matchRoute = useMatchRoute();

  return (
    <Group w="100%" justify="space-between" wrap="nowrap">
      <LinkAnchor to="/" underline="never" c="inherit">
        <Title order={2} fw={700}>
          Evolve
        </Title>
      </LinkAnchor>

      <Group component="nav" gap="lg" visibleFrom="sm">
        {NAV_ITEMS.map((item) => {
          // fuzzy: /check-in/2026-11-12 still highlights "Check-in". Home must be exact.
          const active = !!matchRoute({ to: item.to, fuzzy: item.to !== "/" });
          return (
            <LinkAnchor
              key={item.to}
              to={item.to}
              underline="never"
              fw={active ? 600 : 500}
              c={active ? undefined : "dimmed"}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </LinkAnchor>
          );
        })}
      </Group>
    </Group>
  );
}
