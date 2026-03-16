import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	STORE_ID: z
		.string()
		.optional()
		.default("demo5b9d-c517-4c65-896e-8edef5cf5a94"),
	"86D_API_URL": z.url().optional().default("https://dashboard.86d.app/api"),
	"86D_API_KEY": z.string().optional(),
	DATABASE_URL: z.string().optional(),
	NEXT_PUBLIC_STORE_URL: z.url().optional(),
	NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID: z.string().optional(),
	VERCEL_BLOB_STORAGE_HOSTNAME: z.string().optional(),
	STORAGE_PROVIDER: z
		.enum(["local", "vercel", "s3"])
		.optional()
		.default("local"),
	STORAGE_LOCAL_DIR: z.string().optional(),
	STORAGE_LOCAL_BASE_URL: z.string().optional(),
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
