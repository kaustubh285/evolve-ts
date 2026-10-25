import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { CheckInForm } from "#/components/check-in/check-in-form";
import { TransactionsSection } from "#/components/check-in/transactions-section";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { formatIso } from "#/lib/dates";
import { isoDate } from "#/lib/zod-schemas/common";
import { getCheckIn, getMultipleCheckIn } from "#/server/check-in.functions";

// ?date=2026-10-25 → that day's modal is open. A bad value just means "closed".
const searchSchema = z.object({
  date: isoDate.optional().catch(undefined),
});

export const Route = createFileRoute("/_authed/check-in/")({
  validateSearch: searchSchema,

  // Which search params the loader depends on. When `date` changes, the
  // loader re-runs; other search changes wouldn't.
  loaderDeps: ({ search }) => ({ date: search.date }),

  loader: async ({ deps }) => {
    const [list, day] = await Promise.all([
      getMultipleCheckIn({ data: { count: 10 } }),
      // Same server fn as the full page — the modal shows the same data.
      deps.date ? getCheckIn({ data: { date: deps.date } }) : null,
    ]);
    return { checkIns: list.checkIns, day };
  },

  component: CheckInsPage,
});

function CheckInsPage() {
  const { checkIns, day } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });

  const closeModal = () =>
    navigate({ search: (prev) => ({ ...prev, date: undefined }) });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Check-ins</h1>

      {checkIns.length === 0 ? (
        <p className="mt-2 text-muted-foreground">No check-ins yet.</p>
      ) : (
        <>
          <h2 className="mt-6 text-sm font-medium text-muted-foreground">
            Last {checkIns.length}
          </h2>
          <ul className="mt-2 divide-y border-y">
            {checkIns.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between py-2.5"
              >
                <Link
                  to="/check-in"
                  search={{ date: c.date }}
                  className="font-medium hover:text-primary"
                >
                  {formatIso(c.date)}
                </Link>
                <Link
                  to="/check-in/$date"
                  params={{ date: c.date }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Full view →
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog
        open={day !== null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        {day && (
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{formatIso(day.date)}</DialogTitle>
            </DialogHeader>

            <CheckInForm
              key={day.date}
              date={day.date}
              timeZone={day.timeZone}
              checkIn={day.checkIn}
            />

            <TransactionsSection
              date={day.date}
              transactions={day.transactions}
            />

            <DialogFooter>
              <Link
                to="/check-in/$date"
                params={{ date: day.date }}
                className="text-sm font-medium text-primary hover:underline"
              >
                See full view →
              </Link>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
