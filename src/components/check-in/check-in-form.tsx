import { useForm } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { Section } from "#/components/check-in/section";
import { ChoiceButton } from "#/components/choice-button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { addDays, formatIso, timeInZone, zonedDateTime } from "#/lib/dates";
import { type AutosaveStatus, useAutosave } from "#/lib/use-autosave";
import { cn } from "#/lib/utils";
import { type CheckInInput, checkInInput } from "#/lib/zod-schemas/check-in";
import { type getCheckIn, saveCheckIn } from "#/server/check-in.functions";

// The row type straight from the server function's return type — no DB import needed.
type CheckInRow = Awaited<ReturnType<typeof getCheckIn>>["checkIn"];

// What the inputs hold. Inputs speak strings ("23:30", "8200", ""), the
// schema speaks Dates / numbers / null — toValues/toInput translate.
type FormValues = {
  bedtime: string;
  wakeTime: string;
  sleepQuality: number | null;
  meal: string;
  proteinAtBreakfast: boolean;
  proteinAtLunch: boolean;
  proteinAtDinner: boolean;
  steps: string;
  notes: string;
};

function toValues(row: CheckInRow, timeZone: string): FormValues {
  return {
    bedtime: row?.sleepStart ? timeInZone(row.sleepStart, timeZone) : "",
    wakeTime: row?.sleepEnd ? timeInZone(row.sleepEnd, timeZone) : "",
    sleepQuality: row?.sleepQuality ?? null,
    meal: row?.meal ?? "",
    proteinAtBreakfast: row?.proteinAtBreakfast ?? false,
    proteinAtLunch: row?.proteinAtLunch ?? false,
    proteinAtDinner: row?.proteinAtDinner ?? false,
    steps: row?.steps?.toString() ?? "",
    notes: row?.notes ?? "",
  };
}

/**
 * The check-in for `date` covers the night of date-1 → morning of `date`.
 * Wake-up is on `date`. Bedtime is on date-1, unless it's after midnight
 * (e.g. 00:40 — earlier than wake-up), which is the real moment on `date`.
 */
function sleepTimes(
  bedtime: string,
  wakeTime: string,
  date: string,
  timeZone: string,
) {
  const bedtimeDay =
    bedtime && (wakeTime ? bedtime > wakeTime : bedtime >= "12:00")
      ? addDays(date, -1)
      : date;
  return {
    start: bedtime ? zonedDateTime(bedtimeDay, bedtime, timeZone) : null,
    end: wakeTime ? zonedDateTime(date, wakeTime, timeZone) : null,
  };
}

/** 7h 40m. Real timestamps, so a clock-change night comes out right. */
function formatDuration(start: Date, end: Date) {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function toInput(v: FormValues, date: string, timeZone: string): CheckInInput {
  const sleep = sleepTimes(v.bedtime, v.wakeTime, date, timeZone);

  return {
    date,
    sleepStart: sleep.start,
    sleepEnd: sleep.end,
    sleepQuality: v.sleepQuality,
    meal: v.meal,
    proteinAtBreakfast: v.proteinAtBreakfast,
    proteinAtLunch: v.proteinAtLunch,
    proteinAtDinner: v.proteinAtDinner,
    steps: v.steps === "" ? null : Number(v.steps),
    notes: v.notes,
  };
}

type Props = { date: string; timeZone: string; checkIn: CheckInRow };

export function CheckInForm({ date, timeZone, checkIn }: Props) {
  // useServerFn: same call as saveCheckIn(...), but also handles redirects/
  // notFound thrown by the server fn (e.g. session expired → /login).
  const saveFn = useServerFn(saveCheckIn);
  const autosave = useAutosave((data: CheckInInput) => saveFn({ data }));

  // What we last handed to the server (as JSON) — lets `flush` skip no-ops.
  const lastSent = useRef(JSON.stringify(toValues(checkIn, timeZone)));

  function trySave(values: FormValues) {
    lastSent.current = JSON.stringify(values);
    // Same schema the server uses — catch mistakes before the round trip.
    const parsed = checkInInput.safeParse(toInput(values, date, timeZone));
    if (!parsed.success) {
      autosave.fail(parsed.error.issues[0]?.message ?? "Invalid value");
      return;
    }
    autosave.save(toInput(values, date, timeZone));
  }

  const form = useForm({
    defaultValues: toValues(checkIn, timeZone),
    listeners: {
      // Typing: save 700ms after the last keystroke.
      onChangeDebounceMs: 700,
      onChange: ({ formApi }) => trySave(formApi.state.values),
      // Leaving a field (or clicking a link): save right away.
      onBlur: ({ formApi }) => {
        if (formApi.state.isDirty) trySave(formApi.state.values);
      },
    },
  });

  // Save now if there's a change the debounce hasn't sent yet.
  const flush = useRef(() => {});
  flush.current = () => {
    if (JSON.stringify(form.state.values) !== lastSent.current) {
      trySave(form.state.values);
    }
  };

  // Without this, an edit made <700ms before leaving is lost: closing the
  // modal, Prev/Next (key change) or navigating unmounts the form first.
  // Also flush when the app is backgrounded (phone/PWA app switch).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush.current();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush.current();
    };
  }, []);

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-8">
      <SaveStatus status={autosave.status} error={autosave.error} />

      <Section title="Sleep">
        <div className="flex flex-wrap items-end gap-3">
          <form.Field
            name="bedtime"
            children={(field) => (
              <div className="grid gap-1.5">
                <Label htmlFor={field.name}>
                  Bedtime
                  <span className="font-normal text-muted-foreground">
                    · night of {formatIso(addDays(date, -1))}
                  </span>
                </Label>
                <Input
                  id={field.name}
                  type="time"
                  className="w-32"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
          <span className="pb-2 text-muted-foreground">→</span>
          <form.Field
            name="wakeTime"
            children={(field) => (
              <div className="grid gap-1.5">
                <Label htmlFor={field.name}>
                  Woke up
                  <span className="font-normal text-muted-foreground">
                    · {formatIso(date)}
                  </span>
                </Label>
                <Input
                  id={field.name}
                  type="time"
                  className="w-32"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
          <form.Subscribe
            selector={(s) => [s.values.bedtime, s.values.wakeTime] as const}
            children={([bedtime, wakeTime]) => {
              const { start, end } = sleepTimes(
                bedtime,
                wakeTime,
                date,
                timeZone,
              );
              if (!start || !end || end <= start) return null;
              return (
                <p className="pb-2 text-sm text-muted-foreground">
                  {formatDuration(start, end)} asleep
                </p>
              );
            }}
          />
        </div>

        <form.Field
          name="sleepQuality"
          children={(field) => (
            <div className="grid gap-1.5">
              <Label>Quality</Label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <ChoiceButton
                    key={n}
                    pressed={field.state.value === n}
                    // Clicking the selected value clears it.
                    onClick={() =>
                      field.handleChange(field.state.value === n ? null : n)
                    }
                    className="size-9"
                  >
                    {n}
                  </ChoiceButton>
                ))}
              </div>
            </div>
          )}
        />
      </Section>

      <Section title="Food">
        <form.Field
          name="meal"
          children={(field) => (
            <div className="grid gap-1.5">
              <Label htmlFor={field.name}>What did you eat?</Label>
              <Textarea
                id={field.name}
                rows={3}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        />

        <div className="grid gap-1.5">
          <Label>Protein at</Label>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["proteinAtBreakfast", "Breakfast"],
                ["proteinAtLunch", "Lunch"],
                ["proteinAtDinner", "Dinner"],
              ] as const
            ).map(([name, label]) => (
              <form.Field
                key={name}
                name={name}
                children={(field) => (
                  <ChoiceButton
                    pressed={field.state.value}
                    onClick={() => field.handleChange(!field.state.value)}
                    className="px-3"
                  >
                    {label}
                  </ChoiceButton>
                )}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Activity">
        <form.Field
          name="steps"
          children={(field) => (
            <div className="grid gap-1.5">
              <Label htmlFor={field.name}>Steps</Label>
              <Input
                id={field.name}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                className="w-40"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        />
      </Section>

      <Section title="Notes">
        <form.Field
          name="notes"
          children={(field) => (
            <Textarea
              id={field.name}
              aria-label="Notes"
              rows={4}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        />
      </Section>
    </form>
  );
}

function SaveStatus({
  status,
  error,
}: {
  status: AutosaveStatus;
  error: string | null;
}) {
  const text = {
    idle: "",
    saving: "Saving…",
    saved: "Saved",
    error: `Not saved — ${error}`,
  }[status];

  return (
    <output
      className={cn(
        "-mt-4 block h-5 text-sm text-muted-foreground",
        status === "error" && "text-destructive",
      )}
    >
      {text}
    </output>
  );
}
