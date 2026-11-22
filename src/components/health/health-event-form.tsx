import {
  Alert,
  Button,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { fromDateTimeLocal, toDateTimeLocal } from "#/lib/dates";
import {
  HEALTH_EVENT_TYPES,
  type HealthEventInput,
  type HealthEventType,
  healthEventInput,
  healthEventLabel,
} from "#/lib/zod-schemas/health-event";
import { saveHealthEvent } from "#/server/health-event.functions";
import type { HealthEventRow } from "./health-event-compact";
import { SeverityPicker } from "./severity-picker";

// What the inputs hold ("" = empty). Converted to the server shape on save.
type HealthEventFormValues = {
  type: HealthEventType | "";
  // "2026-11-14T22:00" (datetime-local). Events can span days, so date AND time.
  start: string;
  end: string; // "" = ongoing / unknown
  severity: number | string;
  medication: string;
  notes: string;
};

const TYPE_OPTIONS = HEALTH_EVENT_TYPES.map((t) => ({
  value: t,
  label: healthEventLabel(t),
}));

const text = (v: string) => (v.trim() ? v.trim() : null);

/**
 * Form → what saveHealthEvent expects. The server sets `date` to the start's day
 * (that's what links it to a check-in); `date` here only matters when there's no start.
 */
function toHealthEventInput(
  v: HealthEventFormValues,
  date: string,
  timeZone: string,
  id?: string,
): HealthEventInput {
  return {
    id, // set → update that event
    date,
    type: v.type as HealthEventType, // "" is caught by zod ("Pick what happened")
    startedAt: fromDateTimeLocal(v.start, timeZone),
    endedAt: fromDateTimeLocal(v.end, timeZone),
    severity: typeof v.severity === "number" ? v.severity : null,
    medication: text(v.medication),
    notes: text(v.notes),
  };
}

/** Saved event → form values (for editing). */
function fromHealthEvent(
  e: HealthEventRow,
  timeZone: string,
): HealthEventFormValues {
  return {
    type: e.type,
    start: e.startedAt ? toDateTimeLocal(e.startedAt, timeZone) : "",
    end: e.endedAt ? toDateTimeLocal(e.endedAt, timeZone) : "",
    severity: e.severity ?? "",
    medication: e.medication ?? "",
    notes: e.notes ?? "",
  };
}

type HealthEventFormProps = {
  date: string;
  timeZone: string;
  /** Edit this event instead of creating a new one. */
  event?: HealthEventRow;
  /** Saved (or cancelled, when there's no onCancel) — the parent closes the form. */
  onDone: () => void;
  /** Cancel does something else than close, e.g. back to the read-only view. */
  onCancel?: () => void;
};

/** Log a health event for one day. Standalone (date + onDone) so it also fits a drawer later. */
export function HealthEventForm({
  date,
  timeZone,
  event,
  onDone,
  onCancel,
}: HealthEventFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<HealthEventFormValues>({
    initialValues: event
      ? fromHealthEvent(event, timeZone)
      : {
          type: "",
          start: "",
          end: "",
          severity: "",
          medication: "",
          notes: "",
        },
  });

  async function handleSubmit(values: HealthEventFormValues) {
    // Same zod schema as the server; its paths (type, endedAt, …) → form fields.
    const parsed = healthEventInput.safeParse(
      toHealthEventInput(values, date, timeZone, event?.id),
    );
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        // Server names → form names where they differ.
        const formField =
          field === "startedAt" ? "start" : field === "endedAt" ? "end" : field;
        form.setFieldError(formField, issue.message);
      }
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveHealthEvent({ data: parsed.data });
      await router.invalidate(); // the day's list picks up the new event
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
      <Stack gap="md">
        <Select
          label="What happened"
          placeholder="Pick one"
          data={TYPE_OPTIONS}
          allowDeselect={false}
          withAsterisk
          {...form.getInputProps("type")}
        />

        {/* Date + time: a migraine can start Friday night and end Sunday. Stacked on
            phones — datetime pickers are too wide for two columns there. */}
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <TextInput
            type="datetime-local"
            label="Started"
            {...form.getInputProps("start")}
          />
          <TextInput
            type="datetime-local"
            label="Ended"
            description="Leave empty if ongoing"
            inputWrapperOrder={["label", "input", "description", "error"]}
            // The picker won't offer anything before the start.
            min={form.getValues().start || undefined}
            {...form.getInputProps("end")}
          />
        </SimpleGrid>

        <SeverityPicker {...form.getInputProps("severity")} />

        <TextInput
          label="Medication"
          placeholder="e.g. Ibuprofen 400mg"
          {...form.getInputProps("medication")}
        />

        <Textarea
          label="Notes"
          autosize
          minRows={2}
          {...form.getInputProps("notes")}
        />

        {error && (
          <Alert color="red" title="Couldn't save" role="alert">
            {error}
          </Alert>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onCancel ?? onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
