import env from "#/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "#/db";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // baseURL is always trusted; these are extras (e.g. phone on the LAN in dev).
  trustedOrigins: env.TRUSTED_ORIGINS,
  // databaseHooks: {
  //   user: {
  //     create: {
  //       before: (user) => {
  //         return user;
  //       },
  //     },
  //   },
  // },
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    enabled: true,
    // Generous default so get-session polling from useSession() doesn't 429.
    window: 60,
    max: 100,
    // Strict limits only where brute-forcing matters.
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  plugins: [
    // Must stay last so it sees cookies set by other plugins' after-hooks.
    tanstackStartCookies(),
  ],
});
