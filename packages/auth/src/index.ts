import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { toNextJsHandler } from "better-auth/next-js";
import { admin, genericOAuth } from "better-auth/plugins";
import { db } from "db";

const apiUrl = process.env["86D_API_URL"] ?? "https://api.86d.app";
const apiKey = process.env["86D_API_KEY"];

/**
 * Map an IdP profile to a local user record.
 * Grants "admin" role only when the IdP explicitly provided store:admin scope
 * or set the profile role to "admin".
 */
export function mapSsoProfileToUser(
	profile: Record<string, unknown>,
): Record<string, string> {
	const grantedScopes =
		typeof profile.scope === "string"
			? profile.scope.split(" ")
			: Array.isArray(profile.scope)
				? (profile.scope as string[])
				: [];
	const hasAdminRole =
		profile.role === "admin" || grantedScopes.includes("store:admin");

	const user: Record<string, string> = {
		name: profile.name as string,
		email: profile.email as string,
		role: hasAdminRole ? "admin" : "user",
	};
	if (profile.picture) {
		user.image = profile.picture as string;
	}
	return user;
}

/**
 * When 86D_API_KEY is set, enable 86d.app SSO as a social login provider.
 * This allows store owners to sign in with their 86d.app account
 * and automatically get admin access.
 */
const socialProviders = apiKey
	? [
			genericOAuth({
				config: [
					{
						providerId: "86d",
						discoveryUrl: `${apiUrl}/.well-known/openid-configuration`,
						clientId: apiKey,
						clientSecret: apiKey,
						scopes: ["openid", "profile", "email", "store:admin"],
						mapProfileToUser: mapSsoProfileToUser,
					},
				],
			}),
		]
	: [];

export const auth = betterAuth({
	database: prismaAdapter(db, { provider: "postgresql" }),
	emailAndPassword: { enabled: true },
	session: {
		cookieCache: { enabled: true, maxAge: 60 * 5 },
	},
	advanced: {
		database: {
			generateId: () => randomUUID(),
		},
	},
	plugins: [admin(), ...socialProviders],
});

export const handler = toNextJsHandler(auth);
export type Session = typeof auth.$Infer.Session;
