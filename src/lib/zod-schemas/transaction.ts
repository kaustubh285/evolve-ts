import { z } from "zod";
import { isoDate, optionalText } from "./common";

// Also used by the DB enum in db/schema/expense.ts — one list, no drift.
export const TRANSACTION_TYPES = ["income", "expense"] as const;

export const transactionInput = z.object({
  id: z.uuid().optional(),
  date: isoDate,
  occurredAt: z.date().nullable(),

  type: z.enum(TRANSACTION_TYPES).default("expense"),
  // Positive; `type` gives the direction. Rounded to pennies to dodge float noise (12.499999 → 12.5).
  amount: z
    .number()
    .positive("Amount must be more than 0")
    .max(9_999_999_999)
    .transform((n) => Math.round(n * 100) / 100),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter code, e.g. GBP")
    .default("GBP"),

  category: optionalText(50),
  notes: optionalText(2000),
});

export type TransactionInput = z.input<typeof transactionInput>;
