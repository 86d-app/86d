import { z } from "zod";
import type { RemoteStoreConfig, ThemeVariables } from "./types";
import { DEFAULT_CONFIG } from "./types";

const iconLogoVariantSchema = z
	.object({
		light: z.string().min(1).max(2048),
		dark: z.string().min(1).max(2048),
	})
	.strict();

const themeValueSchema = z.string().min(1).max(256);
const themeVariablesSchema = z
	.object({
		radius: themeValueSchema.optional(),
		background: themeValueSchema,
		foreground: themeValueSchema,
		card: themeValueSchema,
		"card-foreground": themeValueSchema,
		popover: themeValueSchema,
		"popover-foreground": themeValueSchema,
		primary: themeValueSchema,
		"primary-foreground": themeValueSchema,
		secondary: themeValueSchema,
		"secondary-foreground": themeValueSchema,
		muted: themeValueSchema,
		"muted-foreground": themeValueSchema,
		accent: themeValueSchema,
		"accent-foreground": themeValueSchema,
		destructive: themeValueSchema,
		border: themeValueSchema,
		input: themeValueSchema,
		ring: themeValueSchema,
		"chart-1": themeValueSchema,
		"chart-2": themeValueSchema,
		"chart-3": themeValueSchema,
		"chart-4": themeValueSchema,
		"chart-5": themeValueSchema,
		sidebar: themeValueSchema,
		"sidebar-foreground": themeValueSchema,
		"sidebar-primary": themeValueSchema,
		"sidebar-primary-foreground": themeValueSchema,
		"sidebar-accent": themeValueSchema,
		"sidebar-accent-foreground": themeValueSchema,
		"sidebar-border": themeValueSchema,
		"sidebar-ring": themeValueSchema,
	})
	.strict();

const billingInfoSchema = z
	.object({
		plan: z.string().min(1).max(64),
		status: z.enum([
			"active",
			"trialing",
			"past_due",
			"canceled",
			"incomplete",
			"incomplete_expired",
			"unpaid",
			"paused",
		]),
		isActive: z.boolean(),
		periodEnd: z.iso.datetime().optional(),
	})
	.strict()
	.optional();

const remoteStoreConfigDtoSchema = z
	.object({
		theme: z.string().min(1).max(64),
		name: z.string().min(1).max(200),
		favicon: z.string().min(1).max(2048),
		icon: iconLogoVariantSchema,
		logo: iconLogoVariantSchema,
		modules: z.array(z.string().min(1).max(128)).max(100).optional(),
		billing: billingInfoSchema,
		variables: z
			.object({
				light: themeVariablesSchema.partial().strict(),
				dark: themeVariablesSchema.partial().strict(),
			})
			.strict()
			.optional(),
	})
	.strict();

type RemoteStoreConfigDto = z.infer<typeof remoteStoreConfigDtoSchema>;

function mergeThemeVariables(
	defaults: ThemeVariables,
	overrides:
		| Partial<Record<keyof ThemeVariables, string | undefined>>
		| undefined,
): ThemeVariables {
	const definedOverrides = Object.fromEntries(
		Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined),
	);
	return Object.assign({ ...defaults }, definedOverrides);
}

/**
 * Fetch store config from the 86d hosted API.
 * Used when STORE_ID is set and valid.
 */
export async function fetchFromApi(
	storeId: string,
	apiBaseUrl: string,
	apiKey?: string,
	fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<RemoteStoreConfig> {
	const normalizedBase = apiBaseUrl.replace(/\/$/, "");
	const apiRoot = normalizedBase.endsWith("/api")
		? normalizedBase
		: `${normalizedBase}/api`;
	const url = `${apiRoot}/v1/stores/${storeId}`;
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	const res = await fetcher(url, { headers });

	if (!res.ok) {
		throw new Error(
			`86d API request failed: ${res.status} ${res.statusText} (${url})`,
		);
	}

	const json = (await res.json()) as unknown;
	const parsed = remoteStoreConfigDtoSchema.safeParse(json);

	if (!parsed.success) {
		throw new Error(
			`Invalid store config from 86d API: ${parsed.error.message}`,
		);
	}

	return mergeWithDefaults(parsed.data);
}

function mergeWithDefaults(parsed: RemoteStoreConfigDto): RemoteStoreConfig {
	return {
		...(DEFAULT_CONFIG.$schema ? { $schema: DEFAULT_CONFIG.$schema } : {}),
		theme: parsed.theme,
		name: parsed.name,
		favicon: parsed.favicon,
		icon: { ...parsed.icon },
		logo: { ...parsed.logo },
		...(parsed.modules ? { modules: [...parsed.modules] } : {}),
		...(parsed.billing
			? {
					billing: {
						plan: parsed.billing.plan,
						status: parsed.billing.status,
						isActive: parsed.billing.isActive,
						...(parsed.billing.periodEnd
							? { periodEnd: parsed.billing.periodEnd }
							: {}),
					},
				}
			: {}),
		variables: {
			light: mergeThemeVariables(
				DEFAULT_CONFIG.variables.light,
				parsed.variables?.light,
			),
			dark: mergeThemeVariables(
				DEFAULT_CONFIG.variables.dark,
				parsed.variables?.dark,
			),
		},
	};
}
