import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	STORE_ID: z.string().optional(),
	"86D_API_URL": z.string().url().optional(),
	"86D_API_KEY": z.string().optional(),
	DATABASE_URL: z.string().optional(),
	NEXT_PUBLIC_STORE_URL: z.string().url().optional(),
	NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID: z.string().optional(),
	VERCEL_BLOB_STORAGE_HOSTNAME: z.string().optional(),
	RESEND_API_KEY: z.string().optional(),
	BETTER_AUTH_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	console.error(
		"Invalid environment variables:",
		parsed.error.flatten().fieldErrors,
	);
	throw new Error("Invalid environment variables");
}

const env = parsed.data;

export default env;
export type Env = z.infer<typeof envSchema>;
