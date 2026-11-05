import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { transaction } from "#/db/schema";
import { idInput } from "#/lib/zod-schemas/common";
import { transactionInput } from "#/lib/zod-schemas/transaction";
import { authMiddleware } from "./middleware";

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

/** Soft delete: sets deletedAt, so every read (which filters deletedAt IS NULL) stops seeing it. */
export const deleteTransaction = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(idInput)
	.handler(async ({ data: { id }, context: { userId } }) => {
		const [deleted] = await db
			.update(transaction)
			.set({ deletedAt: new Date() })
			.where(
				and(
					eq(transaction.id, id),
					eq(transaction.userId, userId),
					isNull(transaction.deletedAt),
				),
			)
			.returning({ id: transaction.id });

		if (!deleted) throw new Error("Transaction not found");
		return deleted;
	});
