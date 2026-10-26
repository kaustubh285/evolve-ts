import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Section } from "#/components/check-in/section";
import { HealthEventEditor } from "#/components/entries/health-event-editor";
import {
  formatEventTime,
  HEALTH_EVENT_LABELS,
} from "#/components/entries/health-event-format";
import type { HealthEvent } from "#/components/entries/types";
import { Button } from "#/components/ui/button";
import { deleteHealthEvent } from "#/server/health-event.functions";

type Props = { date: string; timeZone: string; healthEvents: HealthEvent[] };

/** The day's health events. Same pattern as TransactionsSection. */
export function HealthEventsSection({ date, timeZone, healthEvents }: Props) {
  const router = useRouter();
  const remove = useServerFn(deleteHealthEvent);
  // null = editor closed, "new" = adding, a row = editing that row.
  const [editing, setEditing] = useState<HealthEvent | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setError(null);
    try {
      await remove({ data: { id } });
      await router.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete");
    }
  }

  return (
    <Section
      title="Health"
      action={
        editing === null && (
          <Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
            <Plus /> Add
          </Button>
        )
      }
    >
      {healthEvents.length === 0 && editing === null && (
        <p className="text-sm text-muted-foreground">Nothing to report.</p>
      )}

      {healthEvents.length > 0 && (
        <ul className="divide-y">
          {healthEvents.map((e) => {
            const time = formatEventTime(e, timeZone);
            return (
              <li key={e.id} className="flex items-center gap-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(e)}
                  className="flex flex-1 flex-wrap items-baseline gap-x-2 text-left hover:text-primary"
                >
                  <span className="font-medium">
                    {HEALTH_EVENT_LABELS[e.type]}
                  </span>
                  {time && (
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {time}
                    </span>
                  )}
                  {e.severity !== null && (
                    <span className="text-sm text-health">{e.severity}/10</span>
                  )}
                  {e.medication && (
                    <span className="truncate text-sm text-muted-foreground">
                      — {e.medication}
                    </span>
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete"
                  onClick={() => handleDelete(e.id)}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {editing !== null && (
        <HealthEventEditor
          key={editing === "new" ? "new" : editing.id}
          date={date}
          timeZone={timeZone}
          healthEvent={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
          onCancel={() => setEditing(null)}
          className="rounded-md border bg-card p-3"
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </Section>
  );
}
