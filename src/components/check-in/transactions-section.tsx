import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Section } from "#/components/check-in/section";
import { TransactionEditor } from "#/components/entries/transaction-editor";
import {
  categoryLabel,
  formatMoney,
} from "#/components/entries/transaction-format";
import type { Transaction } from "#/components/entries/types";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { deleteTransaction } from "#/server/transaction.functions";

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
          onDone={() => setEditing(null)}
          onCancel={() => setEditing(null)}
          className="rounded-md border bg-card p-3"
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </Section>
  );
}
