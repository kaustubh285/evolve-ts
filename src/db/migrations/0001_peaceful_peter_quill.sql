CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."health_event_type" AS ENUM('migraine', 'acid_reflux', 'sinusitis', 'sore_throat', 'stomach_ache', 'back_pain', 'headache');--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"date" date NOT NULL,
	"occurred_at" timestamp with time zone,
	"type" "transaction_type" DEFAULT 'expense' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"category" text,
	"notes" text,
	CONSTRAINT "transaction_amount_positive" CHECK ("transaction"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "check_in" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"date" date NOT NULL,
	"sleep_start" timestamp with time zone,
	"sleep_end" timestamp with time zone,
	"sleep_quality" integer,
	"meal" text,
	"protein_at_breakfast" boolean,
	"protein_at_lunch" boolean,
	"protein_at_dinner" boolean,
	"steps" integer,
	"notes" text,
	CONSTRAINT "check_in_sleep_quality_range" CHECK ("check_in"."sleep_quality" between 1 and 5),
	CONSTRAINT "check_in_sleep_order" CHECK ("check_in"."sleep_end" > "check_in"."sleep_start"),
	CONSTRAINT "check_in_steps_positive" CHECK ("check_in"."steps" >= 0)
);
--> statement-breakpoint
CREATE TABLE "workout" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"date" date NOT NULL,
	"started_at" timestamp with time zone,
	"duration_min" integer,
	"quality" integer,
	"cardio_type" text,
	"cardio_duration_min" integer,
	"cardio_distance_m" integer,
	"notes" text,
	CONSTRAINT "workout_quality_range" CHECK ("workout"."quality" between 1 and 5),
	CONSTRAINT "workout_duration_positive" CHECK ("workout"."duration_min" > 0)
);
--> statement-breakpoint
CREATE TABLE "workout_set" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"workout_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"exercise" text NOT NULL,
	"equipment" text,
	"weight_kg" numeric(6, 2),
	"reps" integer,
	"rpe" integer,
	CONSTRAINT "workout_set_rpe_range" CHECK ("workout_set"."rpe" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "health_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"date" date NOT NULL,
	"type" "health_event_type" NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"severity" integer,
	"medication" text,
	"notes" text,
	CONSTRAINT "health_event_severity_range" CHECK ("health_event"."severity" between 1 and 10),
	CONSTRAINT "health_event_time_order" CHECK ("health_event"."ended_at" >= "health_event"."started_at")
);
--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout" ADD CONSTRAINT "workout_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_workout_id_workout_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_event" ADD CONSTRAINT "health_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transaction_user_date_idx" ON "transaction" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "check_in_user_date_uq" ON "check_in" USING btree ("user_id","date") WHERE "check_in"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "workout_user_date_idx" ON "workout" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "workout_set_workout_idx" ON "workout_set" USING btree ("workout_id","position");--> statement-breakpoint
CREATE INDEX "health_event_user_date_idx" ON "health_event" USING btree ("user_id","date");