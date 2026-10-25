import { z } from "zod";
import { isoDate, optionalText } from "./common";

// Also used by the DB enum in db/schema/expense.ts — one list, no drift.
export const TRANSACTION_TYPES = ["income", "expense"] as const;

// Stored key → label shown in the UI. Rename labels freely; never change a key
// once rows use it. The DB column is plain text, so adding one needs no migration.
export const TRANSACTION_CATEGORIES = {
  restaurant_food: "Restaurant & Food",
  travel: "Travel",
  savings: "Savings",
  subscriptions: "Subscriptions",
  rent_bills: "Rent & Bills",
  family: "Family",
  shopping: "Shopping",
  other: "Other",
} as const;

export type TransactionCategory = keyof typeof TRANSACTION_CATEGORIES;

const CATEGORY_KEYS = Object.keys(TRANSACTION_CATEGORIES) as [
  TransactionCategory,
  ...TransactionCategory[],
];

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

  category: z.enum(CATEGORY_KEYS, "Pick a category"),
  notes: optionalText(2000),
});

export type TransactionInput = z.input<typeof transactionInput>;
