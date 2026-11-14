ALTER TABLE "workout" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "workout" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "workout_set" ADD COLUMN "distance_m" integer;--> statement-breakpoint
ALTER TABLE "workout_set" ADD COLUMN "duration_sec" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "workout_user_source_url_uq" ON "workout" USING btree ("user_id","source_url") WHERE "workout"."deleted_at" is null and "workout"."source_url" is not null;--> statement-breakpoint
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_distance_positive" CHECK ("workout_set"."distance_m" >= 0);--> statement-breakpoint
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_duration_positive" CHECK ("workout_set"."duration_sec" > 0);