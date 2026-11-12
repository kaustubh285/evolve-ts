import { Divider, Stack, Text } from "@mantine/core";
import { useMatchRoute, useRouteContext } from "@tanstack/react-router";
import { CalendarDays, Sun } from "lucide-react";
import { formatIso, todayIso } from "#/lib/dates";
import { useRecentCheckInDates } from "#/lib/nav-helpers";
import { LinkNavLink } from "./links";
import { NAV_ITEMS } from "./nav-items";

/** Side navigation inside the AppShell navbar. `onNavigate` runs after a link is picked. */
export function EvolveSideNav({ onNavigate }: { onNavigate?: () => void }) {
  const matchRoute = useMatchRoute();
  // timeZone comes from the _authed layout's beforeLoad (same zone as the server).
  const { timeZone } = useRouteContext({ from: "/_authed" });
  const today = todayIso(timeZone);
  // Today has its own section, so don't repeat it under "Recent days".
  const recentDates = useRecentCheckInDates().dates.filter((d) => d !== today);

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

      <Divider my="sm" />
      <LinkNavLink
        to="/check-in/$date"
        params={{ date: today }}
        label="Today"
        description={formatIso(today)}
        leftSection={<Sun size={18} />}
        active={
          !!matchRoute({ to: "/check-in/$date", params: { date: today } })
        }
        onClick={onNavigate}
      />

      {recentDates.length > 0 && (
        <>
          <Divider my="sm" />
          <Text size="xs" c="dimmed" fw={500} px="sm" id="recent-days-label">
            Recent days
          </Text>
          <Stack gap={2} role="group" aria-labelledby="recent-days-label">
            {recentDates.map((date) => (
              <LinkNavLink
                key={date}
                to="/check-in/$date"
                params={{ date }}
                label={formatIso(date)}
                leftSection={<CalendarDays size={16} />}
                active={
                  !!matchRoute({ to: "/check-in/$date", params: { date } })
                }
                onClick={onNavigate}
              />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
