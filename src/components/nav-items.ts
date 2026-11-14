import {
  CalendarCheck,
  Dumbbell,
  HeartPulse,
  House,
  type LucideIcon,
  Wallet,
} from "lucide-react";

type NavItem = {
  label: string;
  to: "/" | "/check-in" | "/workout" | "/health" | "/expense";
  icon: LucideIcon;
};

/** The app's top-level pages. Header links and side nav both render this. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/", icon: House },
  { label: "Check-in", to: "/check-in", icon: CalendarCheck },
  { label: "Workouts", to: "/workout", icon: Dumbbell },
  { label: "Health", to: "/health", icon: HeartPulse },
  { label: "Expenses", to: "/expense", icon: Wallet },
];
