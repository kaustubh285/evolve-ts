import { Button, Group, Stack, Text } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { FormSection } from "#/components/form-section";
import { LinkActionIcon } from "#/components/links";
import { addDays, formatIso, todayIso } from "#/lib/dates";
import { checkInInput } from "#/lib/zod-schemas/check-in";
import { saveCheckIn } from "#/server/check-in.functions";
import { FoodFields } from "./food-fields";
import {
  CheckInFormProvider,
  type CheckInFormValues,
  type CheckInRow,
  toFormValues,
  toServerValues,
  useCheckInForm,
} from "./form-context";
import { HealthFields } from "./health-fields";
import { SleepFields } from "./sleep-fields";

type CheckInFormProps = {
  date: string;
  checkIn: CheckInRow | null;
  /** Zone the sleep times are shown in (from getCheckIn). */
  timeZone: string;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function CheckInForm({ date, checkIn, timeZone }: CheckInFormProps) {
  const router = useRouter();
  const navigate = useNavigate();
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const form = useCheckInForm({
    initialValues: toFormValues(checkIn, timeZone),
    // Editing after a save clears "Saved" so the status never lies.
    onValuesChange: () =>
      setSave((s) => (s.kind === "saved" ? { kind: "idle" } : s)),
  });

  /** Validates and saves. Resolves true when the check-in is safely stored. */
  async function handleSubmit(values: CheckInFormValues): Promise<boolean> {
    // Same zod schema as the server; its paths (sleepStart, sleepEnd, …)
    // match the form's field names, so errors land on the right input.
    const parsed = checkInInput.safeParse(
      toServerValues(values, date, timeZone),
    );
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        form.setFieldError(String(issue.path[0]), issue.message);
      }
      setSave({ kind: "error", message: "Fix the highlighted fields" });
      return false;
    }

    setSave({ kind: "saving" });
    try {
      await saveCheckIn({ data: parsed.data });
      form.resetDirty(values);
      setSave({ kind: "saved" });
      router.invalidate(); // refresh loaders that show this check-in
      return true;
    } catch (e) {
      setSave({
        kind: "error",
        message: e instanceof Error ? e.message : "Couldn't save",
      });
      return false;
    }
  }

  // Cmd/Ctrl+S saves. Allowed while typing in inputs (empty ignore list).
  useHotkeys([["mod+S", () => handleSubmit(form.getValues())]], []);

  // Arrows are links. With unsaved edits, hold the navigation, save first,
  // and only move on if it worked — invalid fields keep you on this day.
  async function goToDay(e: React.MouseEvent, offset: number) {
    if (!form.isDirty()) return; // nothing to save → plain link
    e.preventDefault();
    if (await handleSubmit(form.getValues())) {
      navigate({
        to: "/check-in/$date",
        params: { date: addDays(date, offset) },
      });
    }
  }

  const isFuture = date > todayIso(timeZone); // ISO strings sort by date

  return (
    <CheckInFormProvider form={form}>
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="xl">
          <Group justify="space-between" wrap="nowrap">
            <Group gap={4} wrap="nowrap">
              <LinkActionIcon
                to="/check-in/$date"
                params={{ date: addDays(date, -1) }}
                variant="subtle"
                color="gray"
                aria-label="Previous day"
                onClick={(e) => goToDay(e, -1)}
              >
                <ChevronLeft size={18} />
              </LinkActionIcon>
              <Stack gap={0} miw={96} align="center">
                <Text fw={600} c={isFuture ? "rust" : undefined}>
                  {formatIso(date)}
                </Text>
                {isFuture && (
                  <Text size="xs" c="rust" lh={1}>
                    Future
                  </Text>
                )}
              </Stack>
              <LinkActionIcon
                to="/check-in/$date"
                params={{ date: addDays(date, 1) }}
                variant="subtle"
                color="gray"
                aria-label="Next day"
                onClick={(e) => goToDay(e, 1)}
              >
                <ChevronRight size={18} />
              </LinkActionIcon>
            </Group>
            <Group gap="sm" wrap="nowrap">
              {/* Read out by screen readers when it changes. */}
              <Text
                size="sm"
                c={save.kind === "error" ? "red" : "dimmed"}
                role="status"
                aria-live="polite"
              >
                {save.kind === "saving" && "Saving…"}
                {save.kind === "saved" && "Saved"}
                {save.kind === "error" && save.message}
              </Text>
              <Button
                type="submit"
                loading={save.kind === "saving"}
                aria-keyshortcuts="Control+S Meta+S"
              >
                Save
              </Button>
            </Group>
          </Group>

          <FormSection
            title="Sleep"
            description="Last night, ending this morning"
          >
            <SleepFields />
          </FormSection>
          <FormSection title="Food">
            <FoodFields />
          </FormSection>
          <FormSection title="Health & others">
            <HealthFields />
          </FormSection>
        </Stack>
      </form>
    </CheckInFormProvider>
  );
}
