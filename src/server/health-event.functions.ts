import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "#/db";
import { healthEvent } from "#/db/schema";
import env from "#/env";
import { dateInZone } from "#/lib/dates";
import { idInput, isoDate } from "#/lib/zod-schemas/common";
import { healthEventInput } from "#/lib/zod-schemas/health-event";
import { authMiddleware } from "./middleware";

export const saveHealthEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(healthEventInput)
  .handler(async ({ data, context: { userId } }) => {
    const { id, ...rest } = data;
    // A health event belongs to the day it STARTED — that's how it links to a check-in.
    // Derived here from startedAt (in the app's zone) so the client can't get it wrong.
    // No start time → keep the date the user picked.
    const fields = {
      ...rest,
      date: rest.startedAt
        ? dateInZone(rest.startedAt, env.APP_TIMEZONE)
        : rest.date,
    };

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

/** Health events between two dates (inclusive). Newest day first, then by start time. */
export const getHealthEventRange = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    z.object({ from: isoDate, to: isoDate }).refine((v) => v.from <= v.to, {
      message: "`from` must be on or before `to`",
    }),
  )
  .handler(async ({ data: { from, to }, context: { userId } }) => {
    const healthEvents = await db.query.healthEvent.findMany({
      where: (h, { and, eq, gte, lte, isNull }) =>
        and(
          eq(h.userId, userId),
          gte(h.date, from),
          lte(h.date, to),
          isNull(h.deletedAt),
        ),
      orderBy: (h, { asc, desc }) => [desc(h.date), asc(h.startedAt)],
    });
    return { healthEvents };
  });
