import { z } from "zod";
import type {
	RemoteStoreConfig,
	RemoteStoreConfigV1,
	RemoteStoreConfigV2,
	ThemeVariables,
} from "./types";
import { DEFAULT_CONFIG } from "./types";

export const STORE_RUNTIME_CONFIG_V2_MEDIA_TYPE =
	"application/vnd.86d.store-runtime-config.v2+json";

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
	.strict();

const entitlementSchema = z
	.object({
		version: z.literal(1),
		catalogVersion: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
		plan: z.enum(["launch", "premium", "enterprise"]),
		lifecycle: z.enum(["trialing", "active", "suspended", "destroyed"]),
		trialEndsAt: z.iso.datetime().optional(),
		premiumTransitionAt: z.iso.datetime().optional(),
		currentPeriodEndsAt: z.iso.datetime().optional(),
		suspendAt: z.iso.datetime().optional(),
		destroyAt: z.iso.datetime().optional(),
	})
	.strict();

const availableCommerceSchema = z
	.object({
		version: z.literal(1),
		available: z.literal(true),
		reason: z.enum(["entitlement_trialing", "entitlement_active"]),
		evaluatedAt: z.iso.datetime(),
		recheckAt: z.iso.datetime().optional(),
	})
	.strict();

const unavailableCommerceSchema = z
	.object({
		version: z.literal(1),
		available: z.literal(false),
		reason: z.enum([
			"entitlement_suspended",
			"entitlement_destroyed",
			"entitlement_missing",
			"entitlement_invalid",
			"entitlement_reconciliation_required",
		]),
		evaluatedAt: z.iso.datetime(),
		recheckAt: z.iso.datetime().optional(),
	})
	.strict();

const commerceAvailabilitySchema = z.discriminatedUnion("available", [
	availableCommerceSchema,
	unavailableCommerceSchema,
]);

const remoteVariablesSchema = z
	.object({
		light: themeVariablesSchema.partial().strict(),
		dark: themeVariablesSchema.partial().strict(),
	})
	.strict()
	.optional();

const remoteStoreConfigBaseShape = {
	theme: z.string().min(1).max(64),
	name: z.string().min(1).max(200),
	favicon: z.string().min(1).max(2048),
	icon: iconLogoVariantSchema,
	logo: iconLogoVariantSchema,
	modules: z.array(z.string().min(1).max(128)).max(100).optional(),
	variables: remoteVariablesSchema,
};

const remoteStoreConfigV1DtoSchema = z
	.object({
		...remoteStoreConfigBaseShape,
		billing: billingInfoSchema.optional(),
		contractVersion: z.never().optional(),
		entitlement: z.never().optional(),
		commerceAvailability: z.never().optional(),
	})
	.strict();

const remoteStoreConfigV2DtoSchema = z
	.object({
		...remoteStoreConfigBaseShape,
		theme: z.literal("brisa"),
		favicon: z.literal("/assets/favicon.svg"),
		modules: z.array(z.string().min(1).max(128)).max(100),
		variables: z.never().optional(),
		contractVersion: z.literal(2),
		entitlement: entitlementSchema.nullable(),
		commerceAvailability: commerceAvailabilitySchema,
		billing: z.never().optional(),
	})
	.strict();

const remoteStoreConfigDtoSchema = z.union([
	remoteStoreConfigV2DtoSchema,
	remoteStoreConfigV1DtoSchema,
]);

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
		Accept: STORE_RUNTIME_CONFIG_V2_MEDIA_TYPE,
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

	const json: unknown = await res.json();
	const parsed = remoteStoreConfigDtoSchema.safeParse(json);

	if (!parsed.success) {
		throw new Error(
			`Invalid store config from 86d API: ${parsed.error.message}`,
		);
	}

	return mergeWithDefaults(parsed.data);
}

function mergeWithDefaults(parsed: RemoteStoreConfigDto): RemoteStoreConfig {
	const base = {
		...(DEFAULT_CONFIG.$schema ? { $schema: DEFAULT_CONFIG.$schema } : {}),
		theme: parsed.theme,
		name: parsed.name,
		favicon: parsed.favicon,
		icon: { ...parsed.icon },
		logo: { ...parsed.logo },
		...(parsed.modules ? { modules: [...parsed.modules] } : {}),
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

	if (parsed.contractVersion === 2) {
		return {
			...(DEFAULT_CONFIG.$schema ? { $schema: DEFAULT_CONFIG.$schema } : {}),
			theme: parsed.theme,
			name: parsed.name,
			favicon: parsed.favicon,
			icon: { ...parsed.icon },
			logo: { ...parsed.logo },
			modules: [...parsed.modules],
			variables: {
				light: { ...DEFAULT_CONFIG.variables.light },
				dark: { ...DEFAULT_CONFIG.variables.dark },
			},
			contractVersion: 2,
			entitlement: parsed.entitlement ? { ...parsed.entitlement } : null,
			commerceAvailability: { ...parsed.commerceAvailability },
		} satisfies RemoteStoreConfigV2;
	}

	return {
		...base,
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
	} satisfies RemoteStoreConfigV1;
}
