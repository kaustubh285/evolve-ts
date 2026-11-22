import { Alert, Button, Card, Group, Stack, Text } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

type EntryDetailProps = {
  /** "workout", "health event" — used in the buttons and the delete prompt. */
  noun: string;
  /** The read-only view (a card). */
  view: React.ReactNode;
  /** The edit form. Call `done` when it saved; `cancel` to go back to the view. */
  renderEdit: (handlers: {
    done: () => void;
    cancel: () => void;
  }) => React.ReactNode;
  /** Deletes the entry on the server. */
  onDelete: () => Promise<unknown>;
  /**
   * Saved or deleted → e.g. a modal closes. Optional: inline (day pages) there's
   * nothing to close — after saving it's back to the card, after deleting it's gone.
   */
  onDone?: () => void;
  /** Extra buttons on the left of the action row, e.g. "Open day page". */
  extraActions?: React.ReactNode;
};

/** View → Edit / Delete (with a confirm step) for any saved entry. */
export function EntryDetail({
  noun,
  view,
  renderEdit,
  onDelete,
  onDone,
  extraActions,
}: EntryDetailProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (mode === "edit") {
    // Bordered like the read-only card it replaces, so the page doesn't jump around.
    return (
      <Card withBorder radius="md" padding="md">
        {renderEdit({
          done: () => {
            setMode("view"); // inline: show the updated card again
            onDone?.();
          },
          cancel: () => setMode("view"),
        })}
      </Card>
    );
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
      await router.invalidate(); // lists showing it refresh (it drops out of them)
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete");
      setDeleting(false);
    }
  }

  return (
    <Stack gap="md">
      {view}

      {mode === "confirm-delete" ? (
        // Inline confirm instead of a second modal on top of this one.
        <Alert color="red" title={`Delete this ${noun}?`} role="alertdialog">
          <Stack gap="sm">
            <Text size="sm">
              It disappears from every list. This can't be undone here.
            </Text>
            {error && (
              <Text size="sm" c="red">
                {error}
              </Text>
            )}
            <Group justify="flex-end" gap="xs">
              <Button
                variant="subtle"
                color="gray"
                onClick={() => setMode("view")}
              >
                Keep it
              </Button>
              <Button
                color="red"
                loading={deleting}
                onClick={handleDelete}
                data-autofocus
              >
                Delete
              </Button>
            </Group>
          </Stack>
        </Alert>
      ) : (
        <Group justify="space-between" gap="xs">
          <Group gap="xs">{extraActions}</Group>
          <Group gap="xs">
            <Button
              variant="subtle"
              color="red"
              leftSection={<Trash2 size={16} />}
              onClick={() => setMode("confirm-delete")}
            >
              Delete
            </Button>
            <Button
              leftSection={<Pencil size={16} />}
              onClick={() => setMode("edit")}
            >
              Edit
            </Button>
          </Group>
        </Group>
      )}
    </Stack>
  );
}
