import { useForm } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Section } from "#/components/check-in/section";
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
import type { getCheckIn } from "#/server/check-in.functions";
import {
  deleteTransaction,
  saveTransaction,
} from "#/server/transaction.functions";

type Transaction = Awaited<
  ReturnType<typeof getCheckIn>
>["transactions"][number];

const SYMBOLS: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

const isCategory = (c: string | null): c is TransactionCategory =>
  c !== null && c in TRANSACTION_CATEGORIES;

/** Label for display; rows saved before the list existed show their raw text. */
const categoryLabel = (c: string | null) =>
  isCategory(c) ? TRANSACTION_CATEGORIES[c] : c;

// Built by hand (not Intl) so server and browser render the exact same text.
function formatMoney(t: Pick<Transaction, "amount" | "currency" | "type">) {
  const symbol = SYMBOLS[t.currency] ?? `${t.currency} `;
  return `${t.type === "income" ? "+" : ""}${symbol}${t.amount.toFixed(2)}`;
}

type Props = { date: string; transactions: Transaction[] };

/**
 * The day's expenses/income. Each entry saves on its own (Add / Save / ×);
 * after any change we `router.invalidate()` so the loader refetches the day.
 */
export function TransactionsSection({ date, transactions }: Props) {
  const router = useRouter();
  const remove = useServerFn(deleteTransaction);
  // null = editor closed, "new" = adding, a row = editing that row.
  const [editing, setEditing] = useState<Transaction | "new" | null>(null);
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
      title="Expenses"
      action={
        editing === null && (
          <Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
            <Plus /> Add
          </Button>
        )
      }
    >
      {transactions.length === 0 && editing === null && (
        <p className="text-sm text-muted-foreground">Nothing spent.</p>
      )}

      {transactions.length > 0 && (
        <ul className="divide-y">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center gap-2 py-1.5">
              <button
                type="button"
                onClick={() => setEditing(t)}
                className="flex flex-1 items-baseline gap-2 text-left hover:text-primary"
              >
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    t.type === "income" && "text-money",
                  )}
                >
                  {formatMoney(t)}
                </span>
                {t.category && (
                  <span className="text-muted-foreground">
                    {categoryLabel(t.category)}
                  </span>
                )}
                {t.notes && (
                  <span className="truncate text-sm text-muted-foreground">
                    — {t.notes}
                  </span>
                )}
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete"
                onClick={() => handleDelete(t.id)}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <TransactionEditor
          // New key per target → the form's defaultValues reload when switching rows.
          key={editing === "new" ? "new" : editing.id}
          date={date}
          transaction={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </Section>
  );
}

function TransactionEditor({
  date,
  transaction,
  onClose,
}: {
  date: string;
  transaction: Transaction | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const save = useServerFn(saveTransaction);
  const [error, setError] = useState<string | null>(null);

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
      const input = {
        id: transaction?.id,
        date,
        occurredAt: transaction?.occurredAt ?? null,
        type: value.type,
        amount: Number(value.amount),
        currency: transaction?.currency ?? "GBP",
        category: value.category || undefined,
        notes: value.notes,
      };
      // Same schema as the server — show the message without a round trip.
      const parsed = transactionInput.safeParse(input);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid value");
        return;
      }
      try {
        // Send the parsed result: trimmed, rounded, category guaranteed valid.
        await save({ data: parsed.data });
        await router.invalidate();
        onClose();
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
      className="flex flex-col gap-3 rounded-md border bg-card p-3"
    >
      <form.Field
        name="type"
        children={(field) => (
          <div className="flex gap-1.5">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={field.state.value === t}
                onClick={() => field.handleChange(t)}
                className="h-8 rounded-md border px-3 text-sm capitalize hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      />

      <div className="flex flex-wrap gap-3">
        <form.Field
          name="amount"
          children={(field) => (
            <div className="grid gap-1.5">
              <Label htmlFor="tx-amount">Amount (£)</Label>
              <Input
                id="tx-amount"
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
              <Label htmlFor="tx-category">Category</Label>
              <Select
                value={field.state.value}
                onValueChange={(v) =>
                  field.handleChange(v as TransactionCategory)
                }
              >
                <SelectTrigger id="tx-category" className="w-full">
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
            <Label htmlFor="tx-notes">Notes</Label>
            <Input
              id="tx-notes"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
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
