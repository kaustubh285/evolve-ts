import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { ChoiceButton } from "#/components/choice-button";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { addDays, timeInZone, zonedDateTime } from "#/lib/dates";
import { cn } from "#/lib/utils";
import { healthEventInput } from "#/lib/zod-schemas/health-event";
import { saveHealthEvent } from "#/server/health-event.functions";
import {
  HEALTH_EVENT_LABELS,
  type HealthEventType,
} from "./health-event-format";
import type { HealthEvent } from "./types";

type Props = {
  /** Day the event belongs to (ISO). */
  date: string;
  /** Start/end are entered as clock times in this zone (see lib/dates.ts). */
  timeZone: string;
  /** Existing row → edit it. Omit → create a new one. */
  healthEvent?: HealthEvent | null;
  /** Called after a successful save (data already refreshed). */
  onDone: (saved: HealthEvent) => void;
  /** Shows a Cancel button when provided. */
  onCancel?: () => void;
  className?: string;
};

/**
 * Started on `date` at the given time. An end time earlier than the start
 * means it ran past midnight (e.g. migraine 22:00 → 03:00 next day).
 */
function eventTimes(
  start: string,
  end: string,
  date: string,
  timeZone: string,
) {
  const endDay = start && end && end < start ? addDays(date, 1) : date;
  return {
    startedAt: start ? zonedDateTime(date, start, timeZone) : null,
    endedAt: end ? zonedDateTime(endDay, end, timeZone) : null,
  };
}

/**
 * Add or edit one health event. Self-contained like TransactionEditor, so it
 * works inline on the check-in page or in the quick-add drawer.
 */
export function HealthEventEditor({
  date,
  timeZone,
  healthEvent = null,
  onDone,
  onCancel,
  className,
}: Props) {
  const router = useRouter();
  const save = useServerFn(saveHealthEvent);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const form = useForm({
    defaultValues: {
      // "" = nothing picked yet (shows the placeholder).
      type: (healthEvent?.type ?? "") as HealthEventType | "",
      start: healthEvent?.startedAt
        ? timeInZone(healthEvent.startedAt, timeZone)
        : "",
      end: healthEvent?.endedAt
        ? timeInZone(healthEvent.endedAt, timeZone)
        : "",
      severity: healthEvent?.severity ?? null,
      medication: healthEvent?.medication ?? "",
      notes: healthEvent?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const parsed = healthEventInput.safeParse({
        id: healthEvent?.id,
        date,
        type: value.type || undefined,
        ...eventTimes(value.start, value.end, date, timeZone),
        severity: value.severity,
        medication: value.medication,
        notes: value.notes,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid value");
        return;
      }
      try {
        const saved = await save({ data: parsed.data });
        await router.invalidate();
        onDone(saved);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save");
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className={cn("flex flex-col gap-3", className)}
    >
      <form.Field
        name="type"
        children={(field) => (
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-type`}>What happened?</Label>
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v as HealthEventType)}
            >
              <SelectTrigger id={`${id}-type`} className="w-full">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(HEALTH_EVENT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <div className="flex flex-wrap items-end gap-3">
        <form.Field
          name="start"
          children={(field) => (
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-start`}>Started</Label>
              <Input
                id={`${id}-start`}
                type="time"
                className="w-32"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        />
        <span className="pb-2 text-muted-foreground">→</span>
        <form.Field
          name="end"
          children={(field) => (
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-end`}>
                Ended
                <span className="font-normal text-muted-foreground">
                  · empty if ongoing
                </span>
              </Label>
              <Input
                id={`${id}-end`}
                type="time"
                className="w-32"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        />
      </div>

      <form.Field
        name="severity"
        children={(field) => (
          <div className="grid gap-1.5">
            <Label>Severity</Label>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <ChoiceButton
                  key={n}
                  pressed={field.state.value === n}
                  // Clicking the selected value clears it.
                  onClick={() =>
                    field.handleChange(field.state.value === n ? null : n)
                  }
                  className="size-8"
                >
                  {n}
                </ChoiceButton>
              ))}
            </div>
          </div>
        )}
      />

      <form.Field
        name="medication"
        children={(field) => (
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-medication`}>Medication</Label>
            <Input
              id={`${id}-medication`}
              placeholder="e.g. ibuprofen 400mg"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      />

      <form.Field
        name="notes"
        children={(field) => (
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-notes`}>Notes</Label>
            <Input
              id={`${id}-notes`}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <form.Subscribe
          selector={(s) => s.isSubmitting}
          children={(isSubmitting) => (
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : healthEvent ? "Save" : "Add"}
            </Button>
          )}
        />
      </div>
    </form>
  );
}
