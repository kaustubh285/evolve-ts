import { z } from "zod";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import type { ZodError } from "zod";

// .env.local wins over .env (dotenv keeps the first value it sees)
expand(config({ path: [".env.local", ".env"], quiet: true }));

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "debug", "info", "warn", "error"])
    .default("info"),
  VERSION: z.string().default("dev"),
  DATABASE_URL: z.url(),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  // Whose "today" the app uses (IANA name). Server runs in UTC; this keeps days aligned with you.
  APP_TIMEZONE: z.string().default("Europe/London"),
  ALLOWED_EMAILS: z
    .string()
    .transform((s) => s.split(",").map((e) => e.trim().toLowerCase())),
  // OPTIONAL
  ANTHROPIC_API_KEY: z.string().optional(),
  NOT_BULBUL: z.string().optional(),
  // Obscure secret segment for the unauthenticated /cron/:secret/* endpoints the rpi hits.
  CRON_SECRET: z.string().min(1).optional(),
  // NTFY server the cron endpoints publish to.
  NTFY_BASE_URL: z.url().default("https://ntfy.sh"),
});

export type Env = z.infer<typeof EnvSchema>;

let env: Env;
try {
  env = EnvSchema.parse(process.env);
} catch (e) {
  const error = e as ZodError;
  console.error("Invalid env");
  console.error(error.flatten().fieldErrors);
  process.exit(1);
}

export default env;
