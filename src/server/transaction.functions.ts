import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./middleware";
import { transactionInput } from "#/lib/zod-schemas/transaction";
import { transaction } from "#/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";

export const saveTransaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(transactionInput)
  .handler(async ({ data, context: { userId } }) => {
    const { id, ...fields } = data;

    return db.transaction(async (tx) => {
      let saved: typeof transaction.$inferSelect | undefined;

      if (id) {
        [saved] = await tx
          .update(transaction)
          .set(fields) // updatedAt is bumped by $onUpdate here (plain update)
          .where(
            and(
              eq(transaction.id, id),
              eq(transaction.userId, userId),
              isNull(transaction.deletedAt),
            ),
          )
          .returning();

        if (!saved) throw new Error("Transaction not found");
      } else {
        [saved] = await tx
          .insert(transaction)
          .values({ ...fields, userId })
          .returning();
      }
      return saved;
    });
  });
