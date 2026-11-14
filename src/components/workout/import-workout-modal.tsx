import {
  Alert,
  Button,
  Card,
  Group,
  List,
  Modal,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { formatIso } from "#/lib/dates";
import { parseStrongExport } from "#/lib/strong-import";
import { importStrongWorkouts } from "#/server/workout.functions";

type ImportResult = Awaited<ReturnType<typeof importStrongWorkouts>>;

type ImportWorkoutModalProps = {
  opened: boolean;
  onClose: () => void;
  /** Clipboard text read when the button was clicked ("" if the browser refused). */
  initialText: string;
  /** After a successful import, with the dates of workouts that were saved. */
  onImported?: (dates: string[]) => void;
};

/**
 * Paste Strong export → preview → import.
 * The preview uses the same parser the server runs, so what you see is what gets saved
 * (except "already imported", which only the server knows).
 */
export function ImportWorkoutModal({
  opened,
  onClose,
  initialText,
  onImported,
}: ImportWorkoutModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Import workouts" size="lg">
      {/* key: reopening with new clipboard text starts fresh. */}
      {opened && (
        <ImportBody
          key={initialText}
          initialText={initialText}
          onClose={onClose}
          onImported={onImported}
        />
      )}
    </Modal>
  );
}

function ImportBody({
  initialText,
  onClose,
  onImported,
}: Pick<ImportWorkoutModalProps, "initialText" | "onClose" | "onImported">) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const { workouts, warnings } = useMemo(() => parseStrongExport(text), [text]);

  async function handleImport() {
    setBusy(true);
    setError(null);
    try {
      const res = await importStrongWorkouts({ data: { text } });
      setResult(res);
      if (res.imported.length > 0)
        onImported?.(res.imported.map((w) => w.date));
      router.invalidate(); // refresh the workout list behind the modal
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  if (result) return <ImportSummary result={result} onClose={onClose} />;

  return (
    <Stack gap="md">
      <Textarea
        label="Strong export"
        description={
          initialText
            ? "Pasted from your clipboard. Edit if needed."
            : "Couldn't read the clipboard — paste the text from Strong here."
        }
        placeholder={
          "Early Morning Workout\nTuesday, 6 October 2026 at 07:27\n…"
        }
        autosize
        minRows={4}
        maxRows={10}
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        styles={{
          input: {
            fontFamily: "var(--mantine-font-family-monospace)",
            fontSize: 12,
          },
        }}
      />

      {text.trim() && workouts.length === 0 && (
        <Alert color="red" title="No workouts found">
          This doesn't look like a Strong export. It should start with the
          workout name and a line like “Tuesday, 6 October 2026 at 07:27”.
        </Alert>
      )}

      {workouts.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {workouts.length === 1
              ? "1 workout"
              : `${workouts.length} workouts`}{" "}
            found
          </Text>
          {workouts.map((w) => {
            const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
            return (
              <Card
                key={`${w.date}-${w.time}-${w.title}`}
                withBorder
                padding="sm"
                radius="md"
              >
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <Text fw={600} lineClamp={1}>
                    {w.title}
                  </Text>
                  <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                    {formatIso(w.date)} · {w.time}
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {w.exercises.length} exercises · {sets} sets
                </Text>
                <Text size="sm" lineClamp={2}>
                  {w.exercises.map((e) => e.exercise).join(", ")}
                </Text>
              </Card>
            );
          })}
        </Stack>
      )}

      {warnings.length > 0 && (
        <Alert color="yellow" title="Some lines were skipped">
          <List size="sm">
            {warnings.map((w) => (
              <List.Item key={w}>{w}</List.Item>
            ))}
          </List>
        </Alert>
      )}

      {error && (
        <Alert color="red" title="Import failed">
          {error}
        </Alert>
      )}

      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          loading={busy}
          disabled={workouts.length === 0}
        >
          {workouts.length > 1
            ? `Import ${workouts.length} workouts`
            : "Import workout"}
        </Button>
      </Group>
    </Stack>
  );
}

function ImportSummary({
  result,
  onClose,
}: {
  result: ImportResult;
  onClose: () => void;
}) {
  const { imported, skipped, failed } = result;
  const label = (w: { date: string; title: string | null }) =>
    `${w.title ?? "Workout"} · ${formatIso(w.date)}`;

  return (
    <Stack gap="md">
      {/* role=status: screen readers announce the outcome. */}
      <Text role="status" fw={500}>
        Imported {imported.length}
        {skipped.length > 0 && `, skipped ${skipped.length} already imported`}
        {failed.length > 0 && `, ${failed.length} failed`}.
      </Text>

      {imported.length > 0 && (
        <List size="sm">
          {imported.map((w) => (
            <List.Item key={w.id}>{label(w)}</List.Item>
          ))}
        </List>
      )}
      {skipped.length > 0 && (
        <Alert color="gray" title="Already imported">
          <List size="sm">
            {skipped.map((w) => (
              <List.Item key={`${w.date}-${w.title}`}>{label(w)}</List.Item>
            ))}
          </List>
        </Alert>
      )}
      {failed.length > 0 && (
        <Alert color="red" title="Not imported">
          <List size="sm">
            {failed.map((w) => (
              <List.Item key={`${w.date}-${w.title}`}>
                {label(w)}: {w.reason}
              </List.Item>
            ))}
          </List>
        </Alert>
      )}

      <Group justify="flex-end">
        <Button onClick={onClose}>Done</Button>
      </Group>
    </Stack>
  );
}
