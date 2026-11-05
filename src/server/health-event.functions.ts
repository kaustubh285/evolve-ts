import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db";
import { healthEvent } from "#/db/schema";
import { idInput } from "#/lib/zod-schemas/common";
import { healthEventInput } from "#/lib/zod-schemas/health-event";
import { authMiddleware } from "./middleware";

export const saveHealthEvent = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(healthEventInput)
	.handler(async ({ data, context: { userId } }) => {
		const { id, ...fields } = data;

		return db.transaction(async (tx) => {
			let saved: typeof healthEvent.$inferSelect | undefined;

			if (id) {
				[saved] = await tx
					.update(healthEvent)
					.set(fields) // updatedAt is bumped by $onUpdate here (plain update)
					.where(
						and(
							eq(healthEvent.id, id),
							eq(healthEvent.userId, userId),
							isNull(healthEvent.deletedAt),
						),
					)
					.returning();

				if (!saved) throw new Error("HealthEvent not found");
			} else {
				[saved] = await tx
					.insert(healthEvent)
					.values({ ...fields, userId })
					.returning();
			}
			return saved;
		});
	});

/** Soft delete: sets deletedAt, so every read (which filters deletedAt IS NULL) stops seeing it. */
export const deleteHealthEvent = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(idInput)
	.handler(async ({ data: { id }, context: { userId } }) => {
		const [deleted] = await db
			.update(healthEvent)
			.set({ deletedAt: new Date() })
			.where(
				and(
					eq(healthEvent.id, id),
					eq(healthEvent.userId, userId),
					isNull(healthEvent.deletedAt),
				),
			)
			.returning({ id: healthEvent.id });

		if (!deleted) throw new Error("Health event not found");
		return deleted;
	});
