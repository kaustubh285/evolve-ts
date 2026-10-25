import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { base, day } from "../schema-helper";
import { TRANSACTION_TYPES } from "../../lib/zod-schemas/transaction";
import { user } from "./auth";

export const transactionType = pgEnum("transaction_type", TRANSACTION_TYPES);

export const transaction = pgTable(
  "transaction",
  {
    ...base(),
    date: day(),
    // When it happened, if known. `date` is what ties it to a check-in.
    occurredAt: timestamp({ withTimezone: true }),

    type: transactionType().notNull().default("expense"),
    // Always positive; `type` says which direction. Exact decimal, never float.
    amount: numeric({ precision: 12, scale: 2, mode: "number" }).notNull(),
    currency: text().notNull().default("GBP"), // ISO 4217
    category: text(),
    notes: text(),
  },
  (t) => [
    index("transaction_user_date_idx").on(t.userId, t.date),
    check("transaction_amount_positive", sql`${t.amount} > 0`),
  ],
);

export const transactionRelations = relations(transaction, ({ one }) => ({
  user: one(user, {
    fields: [transaction.userId],
    references: [user.id],
  }),
}));
