import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { toNextJsHandler } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db } from "db";

export const auth = betterAuth({
	database: prismaAdapter(db, { provider: "postgresql" }),
	emailAndPassword: { enabled: true },
	session: {
		cookieCache: { enabled: true, maxAge: 60 * 5 },
	},
	plugins: [admin()],
});

export const handler = toNextJsHandler(auth);
export type Session = typeof auth.$Infer.Session;
