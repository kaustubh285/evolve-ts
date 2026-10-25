import { getMultipleCheckIn } from "#/server/check-in.functions";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/check-in/")({
  loader: ({ params }) => getMultipleCheckIn({ data: { count: 10 } }),
  component: Home,
});

// Will become the check-in history (date list + grid) — see .local/plan-v1.md.
function Home() {
  const data = Route.useLoaderData();
  console.log(data);
  const navigate = useNavigate();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Check-ins</h1>
      <p className="mt-2 text-muted-foreground">No check-ins yet.</p>
      <h2 className="text-xl font-semibold">Past 10 checkins</h2>

      <div>
        {data.checkIn.map((checkins) => (
          <div onClick={() => navigate({ to: `/check-in/${checkins.date}` })}>
            {checkins.date}
          </div>
        ))}
      </div>
    </div>
  );
}
