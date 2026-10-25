import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { CheckInForm } from "#/components/check-in/check-in-form";
import { addDays, formatIso } from "#/lib/dates";
import { isoDate } from "#/lib/zod-schemas/common";
import { getCheckIn } from "#/server/check-in.functions";

export const Route = createFileRoute("/_authed/check-in/$date")({
  // Runs before anything else for this URL. `/check-in/2026-02-30` or
  // `/check-in/hello` never reach the loader — they become a 404.
  params: {
    parse: ({ date }) => {
      if (!isoDate.safeParse(date).success) throw notFound();
      return { date };
    },
  },

  // Server on first load, browser on client-side navigation — either way it
  // just calls the server function. The result is typed end to end.
  loader: ({ params }) => getCheckIn({ data: { date: params.date } }),

  component: CheckInPage,
});

function CheckInPage() {
  const data = Route.useLoaderData();
  const { date } = Route.useParams();

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{formatIso(date)}</h1>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link
            to="/check-in/$date"
            params={{ date: addDays(date, -1) }}
            className="hover:text-foreground"
          >
            ‹ Prev
          </Link>
          <Link
            to="/check-in/$date"
            params={{ date: addDays(date, 1) }}
            className="hover:text-foreground"
          >
            Next ›
          </Link>
        </nav>
      </div>

      <div className="mt-6">
        {/* key={date}: Prev/Next keeps this same component mounted, and a form
            only reads defaultValues once — a new key remounts it with fresh data. */}
        <CheckInForm
          key={date}
          date={date}
          timeZone={data.timeZone}
          checkIn={data.checkIn}
        />
      </div>
    </div>
  );
}
