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
import { cn } from "#/lib/utils";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
  transactionInput,
} from "#/lib/zod-schemas/transaction";
import { saveTransaction } from "#/server/transaction.functions";
import { isCategory } from "./transaction-format";
import type { Transaction } from "./types";

type Props = {
  /** Day the entry belongs to (ISO). Quick-add will pass today. */
  date: string;
  /** Existing row → edit it. Omit → create a new one. */
  transaction?: Transaction | null;
  /** Called after a successful save (data already refreshed). */
  onDone: (saved: Transaction) => void;
  /** Shows a Cancel button when provided. */
  onCancel?: () => void;
  className?: string;
};

/**
 * Add or edit one expense/income. Self-contained: knows nothing about the
 * check-in page, so the same component works inline or in the quick-add drawer.
 */
export function TransactionEditor({
  date,
  transaction = null,
  onDone,
  onCancel,
  className,
}: Props) {
  const router = useRouter();
  const save = useServerFn(saveTransaction);
  const [error, setError] = useState<string | null>(null);
  // Unique ids per instance — two editors on screen (page + drawer) must not clash.
  const id = useId();

  const form = useForm({
    defaultValues: {
      type: transaction?.type ?? "expense",
      amount: transaction?.amount.toString() ?? "",
      // "" = nothing picked yet (shows the placeholder).
      category: (isCategory(transaction?.category ?? null)
        ? transaction?.category
        : "") as TransactionCategory | "",
      notes: transaction?.notes ?? "",
    },
    onSubmit: async ({ value }) => {
      setError(null);
      // Same schema as the server — show the message without a round trip.
      const parsed = transactionInput.safeParse({
        id: transaction?.id,
        date,
        occurredAt: transaction?.occurredAt ?? null,
        type: value.type,
        amount: Number(value.amount),
        currency: transaction?.currency ?? "GBP",
        category: value.category || undefined,
        notes: value.notes,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid value");
        return;
      }
      try {
        // Send the parsed result: trimmed, rounded, category guaranteed valid.
        const saved = await save({ data: parsed.data });
        // Refresh whatever page is open (check-in day, list, …).
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
          <div className="flex gap-1.5">
            {(["expense", "income"] as const).map((t) => (
              <ChoiceButton
                key={t}
                pressed={field.state.value === t}
                onClick={() => field.handleChange(t)}
                className="h-8 px-3 capitalize"
              >
                {t}
              </ChoiceButton>
            ))}
          </div>
        )}
      />

      <div className="flex flex-wrap gap-3">
        <form.Field
          name="amount"
          children={(field) => (
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-amount`}>Amount (£)</Label>
              <Input
                id={`${id}-amount`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                autoFocus
                className="w-32"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        />
        <form.Field
          name="category"
          children={(field) => (
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor={`${id}-category`}>Category</Label>
              <Select
                value={field.state.value}
                onValueChange={(v) =>
                  field.handleChange(v as TransactionCategory)
                }
              >
                <SelectTrigger id={`${id}-category`} className="w-full">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSACTION_CATEGORIES).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        />
      </div>

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
              {isSubmitting ? "Saving…" : transaction ? "Save" : "Add"}
            </Button>
          )}
        />
      </div>
    </form>
  );
}
