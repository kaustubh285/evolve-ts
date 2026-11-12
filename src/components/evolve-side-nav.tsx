import { Stack } from "@mantine/core";
import { useMatchRoute } from "@tanstack/react-router";
import { LinkNavLink } from "./links";
import { NAV_ITEMS } from "./nav-items";

/** Side navigation inside the AppShell navbar. `onNavigate` runs after a link is picked. */
export function EvolveSideNav({ onNavigate }: { onNavigate?: () => void }) {
  const matchRoute = useMatchRoute();

  return (
    <Stack component="nav" gap={4}>
      {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
        <LinkNavLink
          key={to}
          to={to}
          label={label}
          leftSection={<Icon size={18} />}
          active={!!matchRoute({ to, fuzzy: to !== "/" })}
          onClick={onNavigate}
        />
      ))}
    </Stack>
  );
}
