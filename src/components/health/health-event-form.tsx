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
import { addDays, zonedDateTime } from "#/lib/dates";
import {
  HEALTH_EVENT_TYPES,
  type HealthEventInput,
  type HealthEventType,
  healthEventInput,
  healthEventLabel,
} from "#/lib/zod-schemas/health-event";
import { saveHealthEvent } from "#/server/health-event.functions";
import { SeverityPicker } from "./severity-picker";

// What the inputs hold ("" = empty). Converted to the server shape on save.
type HealthEventFormValues = {
  type: HealthEventType | "";
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"; earlier than start = the next day
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
 * Form → what saveHealthEvent expects. The event belongs to `date` (the day it started).
 * An end time earlier than the start (migraine 22:00 → 03:00) is on the next day.
 */
function toHealthEventInput(
  v: HealthEventFormValues,
  date: string,
  timeZone: string,
): HealthEventInput {
  const endDate =
    v.startTime && v.endTime && v.endTime < v.startTime
      ? addDays(date, 1)
      : date;
  return {
    date,
    type: v.type as HealthEventType, // "" is caught by zod ("Pick what happened")
    startedAt: v.startTime ? zonedDateTime(date, v.startTime, timeZone) : null,
    endedAt: v.endTime ? zonedDateTime(endDate, v.endTime, timeZone) : null,
    severity: typeof v.severity === "number" ? v.severity : null,
    medication: text(v.medication),
    notes: text(v.notes),
  };
}

type HealthEventFormProps = {
  date: string;
  timeZone: string;
  /** Saved or cancelled — the parent closes the form. */
  onDone: () => void;
};

/** Log a health event for one day. Standalone (date + onDone) so it also fits a drawer later. */
export function HealthEventForm({
  date,
  timeZone,
  onDone,
}: HealthEventFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<HealthEventFormValues>({
    initialValues: {
      type: "",
      startTime: "",
      endTime: "",
      severity: "",
      medication: "",
      notes: "",
    },
  });

  async function handleSubmit(values: HealthEventFormValues) {
    // Same zod schema as the server; its paths (type, endedAt, …) → form fields.
    const parsed = healthEventInput.safeParse(
      toHealthEventInput(values, date, timeZone),
    );
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        // Server names → form names where they differ.
        const formField =
          field === "startedAt"
            ? "startTime"
            : field === "endedAt"
              ? "endTime"
              : field;
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

        <SimpleGrid cols={2} spacing="sm">
          <TextInput
            type="time"
            label="Started"
            {...form.getInputProps("startTime")}
          />
          <TextInput
            type="time"
            label="Ended"
            description="Leave empty if ongoing"
            inputWrapperOrder={["label", "input", "description", "error"]}
            {...form.getInputProps("endTime")}
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
          <Button variant="subtle" onClick={onDone}>
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
