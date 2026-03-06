import { z } from "zod";
import type { Config } from "./types";
import { DEFAULT_CONFIG } from "./types";

const iconLogoVariantSchema = z.object({
	light: z.string(),
	dark: z.string(),
});

const themeVariablesSchema = z.object({
	radius: z.string().optional(),
	background: z.string(),
	foreground: z.string(),
	card: z.string(),
	"card-foreground": z.string(),
	popover: z.string(),
	"popover-foreground": z.string(),
	primary: z.string(),
	"primary-foreground": z.string(),
	secondary: z.string(),
	"secondary-foreground": z.string(),
	muted: z.string(),
	"muted-foreground": z.string(),
	accent: z.string(),
	"accent-foreground": z.string(),
	destructive: z.string(),
	border: z.string(),
	input: z.string(),
	ring: z.string(),
	"chart-1": z.string(),
	"chart-2": z.string(),
	"chart-3": z.string(),
	"chart-4": z.string(),
	"chart-5": z.string(),
	sidebar: z.string(),
	"sidebar-foreground": z.string(),
	"sidebar-primary": z.string(),
	"sidebar-primary-foreground": z.string(),
	"sidebar-accent": z.string(),
	"sidebar-accent-foreground": z.string(),
	"sidebar-border": z.string(),
	"sidebar-ring": z.string(),
});

const notificationSettingsSchema = z
	.object({
		fromAddress: z.string().optional(),
		adminEmail: z.string().optional(),
		events: z.record(z.string(), z.boolean()).optional(),
	})
	.optional();

const configSchema = z.object({
	$schema: z.string().optional(),
	theme: z.string(),
	name: z.string(),
	favicon: z.string(),
	icon: iconLogoVariantSchema,
	logo: iconLogoVariantSchema,
	modules: z.array(z.string()).optional(),
	moduleOptions: z.record(z.string(), z.unknown()).optional(),
	notificationSettings: notificationSettingsSchema,
	variables: z.object({
		light: themeVariablesSchema,
		dark: themeVariablesSchema,
	}),
});

/**
 * Fetch store config from the 86d hosted API.
 * Used when STORE_ID is set and valid.
 */
export async function fetchFromApi(
	storeId: string,
	apiBaseUrl: string,
	apiKey?: string,
): Promise<Config> {
	const url = `${apiBaseUrl.replace(/\/$/, "")}/v1/stores/${storeId}`;
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	const res = await fetch(url, { headers });

	if (!res.ok) {
		throw new Error(
			`86d API request failed: ${res.status} ${res.statusText} (${url})`,
		);
	}

	const json = (await res.json()) as unknown;
	const parsed = configSchema.safeParse(json);

	if (!parsed.success) {
		throw new Error(
			`Invalid store config from 86d API: ${parsed.error.message}`,
		);
	}

	return mergeWithDefaults(parsed.data as Record<string, unknown>);
}

function mergeWithDefaults(parsed: Record<string, unknown>): Config {
	const vars = parsed.variables as
		| { light?: Record<string, unknown>; dark?: Record<string, unknown> }
		| undefined;
	return {
		...DEFAULT_CONFIG,
		...parsed,
		icon: { ...DEFAULT_CONFIG.icon, ...(parsed.icon as object) },
		logo: { ...DEFAULT_CONFIG.logo, ...(parsed.logo as object) },
		variables: {
			light: { ...DEFAULT_CONFIG.variables.light, ...vars?.light },
			dark: { ...DEFAULT_CONFIG.variables.dark, ...vars?.dark },
		},
	} as Config;
}
