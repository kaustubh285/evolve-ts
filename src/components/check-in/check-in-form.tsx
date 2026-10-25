import { useForm } from "@tanstack/react-form";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { addDays, timeInZone, zonedDateTime } from "#/lib/dates";
import { type AutosaveStatus, useAutosave } from "#/lib/use-autosave";
import { type CheckInInput, checkInInput } from "#/lib/zod-schemas/check-in";
import { cn } from "#/lib/utils";
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

function toInput(v: FormValues, date: string, timeZone: string): CheckInInput {
  // You wake up on `date`. Bedtime is the evening before — unless it's after
  // midnight (e.g. 00:40), which is still earlier than wake-up, so same day.
  const bedtimeDay =
    v.bedtime && (v.wakeTime ? v.bedtime > v.wakeTime : v.bedtime >= "12:00")
      ? addDays(date, -1)
      : date;

  return {
    date,
    sleepStart: v.bedtime ? zonedDateTime(bedtimeDay, v.bedtime, timeZone) : null,
    sleepEnd: v.wakeTime ? zonedDateTime(date, v.wakeTime, timeZone) : null,
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

  function trySave(values: FormValues) {
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

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-8">
      <SaveStatus status={autosave.status} error={autosave.error} />

      <Section title="Sleep">
        <div className="flex flex-wrap items-end gap-3">
          <form.Field
            name="bedtime"
            children={(field) => (
              <div className="grid gap-1.5">
                <Label htmlFor={field.name}>Bedtime</Label>
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
                <Label htmlFor={field.name}>Woke up</Label>
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b pb-1 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ChoiceButton({
  pressed,
  className,
  ...props
}: React.ComponentProps<"button"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "h-9 rounded-md border text-sm transition-colors hover:bg-accent",
        "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground",
        className,
      )}
      {...props}
    />
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
    <p
      role="status"
      className={cn(
        "-mt-4 h-5 text-sm text-muted-foreground",
        status === "error" && "text-destructive",
      )}
    >
      {text}
    </p>
  );
}
