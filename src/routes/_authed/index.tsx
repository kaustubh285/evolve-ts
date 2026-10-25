import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/")({ component: Home });

// Will become the check-in history (date list + grid) — see .local/plan-v1.md.
function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Check-ins</h1>
      <p className="mt-2 text-muted-foreground">No check-ins yet.</p>
    </div>
  );
}
