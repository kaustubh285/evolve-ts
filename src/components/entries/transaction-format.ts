import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "#/lib/zod-schemas/transaction";
import type { Transaction } from "./types";

const SYMBOLS: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };

export const isCategory = (c: string | null): c is TransactionCategory =>
  c !== null && c in TRANSACTION_CATEGORIES;

/** Label for display; rows saved before the list existed show their raw text. */
export const categoryLabel = (c: string | null) =>
  isCategory(c) ? TRANSACTION_CATEGORIES[c] : c;

// Built by hand (not Intl) so server and browser render the exact same text.
export function formatMoney(
  t: Pick<Transaction, "amount" | "currency" | "type">,
) {
  const symbol = SYMBOLS[t.currency] ?? `${t.currency} `;
  return `${t.type === "income" ? "+" : ""}${symbol}${t.amount.toFixed(2)}`;
}
