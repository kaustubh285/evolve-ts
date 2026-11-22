import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "#/db";
import env from "#/env";

/** "kaustubh@gmail.com" → "k***h@gmail.com" — enough to spot a mismatch in logs. */
function maskEmail(email: string) {
	const [name = "", domain = ""] = email.split("@");
	const shown =
		name.length > 2 ? `${name[0]}***${name.at(-1)}` : `${name[0] ?? ""}***`;
	return `${shown}@${domain}`;
}

export const auth = betterAuth({
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	// baseURL is always trusted; these are extras (e.g. phone on the LAN in dev).
	trustedOrigins: env.TRUSTED_ORIGINS,
	databaseHooks: {
		user: {
			create: {
				// Runs before ANY user row is inserted (sign-up, or a future OAuth login),
				// so the allowlist can't be bypassed by picking a different sign-up path.
				before: async (user) => {
					const email = user.email.trim().toLowerCase();
					if (!env.ALLOWED_EMAILS.includes(email)) {
						// Server log only, masked: shows a typo/mismatch without leaking addresses.
						console.warn(
							`[auth] sign-up refused for ${maskEmail(email)}; allowed: ${
								env.ALLOWED_EMAILS.map(maskEmail).join(", ") || "(none set)"
							}`,
						);
						// Same message whether or not the email exists — doesn't confirm who's allowed.
						throw new APIError("FORBIDDEN", { message: "Sign-ups are closed" });
					}
					return { data: user };
				},
			},
		},
	},
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
		ipAddress: {
			// Rate limits are per client IP, read from X-Forwarded-For. A client can put
			// fake IPs at the start of that header; the proxy in front of us appends the
			// real one at the end. Listing our proxies here makes Better Auth walk the
			// header from the right and use the first IP that ISN'T one of them.
			trustedProxies: env.TRUSTED_PROXIES,
		},
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
