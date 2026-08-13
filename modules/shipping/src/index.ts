import { acceptCapability } from "@86d-app/core/capabilities";
import { orderCustomerAuthorizeCapability } from "@86d-app/core/commerce-capabilities";
import type {
	Module,
	ModuleConfig,
	ModuleContext,
} from "@86d-app/core/types/module";
import { createGetSettingsEndpoint } from "./admin/endpoints/get-settings";
import { createAdminEndpointsWithSettings } from "./admin/endpoints/routes";
import { createShippingQuoteProvider } from "./capabilities";
import {
	createEasyPostShippingConnectionProvider,
	createShippingConnectionInputSchema,
	createShippingFoundationController,
	createShippingQuoteInputSchema,
	recordShippingLabelInputSchema,
	recordShippingLabelRefundInputSchema,
	recordShippingPostageAdjustmentInputSchema,
	recordShippingTrackingInputSchema,
	shippingAddressSchema,
	shippingConnectionCapabilitySchema,
	shippingConnectionHealthSchema,
	shippingConnectionLifecycleSchema,
	shippingConnectionModeSchema,
	shippingConnectionSchema,
	shippingLabelRefundSchema,
	shippingLabelSchema,
	shippingOptionSchema,
	shippingParcelPlanSchema,
	shippingParcelSchema,
	shippingPostageAdjustmentSchema,
	shippingQuoteSchema,
	shippingTrackingSchema,
} from "./foundation-v2";
import { shippingSchema } from "./schema";
import { createShippingController } from "./service-impl";
import {
	createStoreEndpointsWithRates,
	storeEndpoints,
} from "./store/endpoints/routes";

export type {
	CreateShippingConnectionInput,
	CreateShippingQuoteInput,
	RecordShippingLabelInput,
	RecordShippingLabelRefundInput,
	RecordShippingPostageAdjustmentInput,
	RecordShippingTrackingInput,
	ShippingAddress,
	ShippingConnection,
	ShippingConnectionCapability,
	ShippingConnectionProvider,
	ShippingFoundationController,
	ShippingLabel,
	ShippingLabelRefund,
	ShippingOption,
	ShippingParcel,
	ShippingPostageAdjustment,
	ShippingQuote,
	ShippingTracking,
} from "./foundation-v2";
export type {
	CalculatedRate,
	LiveRate,
	LiveRateAddress,
	LiveRateParcel,
	Shipment,
	ShipmentStatus,
	ShippingCarrier,
	ShippingController,
	ShippingMethod,
	ShippingRate,
	ShippingZone,
} from "./service";
export {
	createEasyPostShippingConnectionProvider,
	createShippingConnectionInputSchema,
	createShippingFoundationController,
	createShippingQuoteInputSchema,
	recordShippingLabelInputSchema,
	recordShippingLabelRefundInputSchema,
	recordShippingPostageAdjustmentInputSchema,
	recordShippingTrackingInputSchema,
	shippingAddressSchema,
	shippingConnectionCapabilitySchema,
	shippingConnectionHealthSchema,
	shippingConnectionLifecycleSchema,
	shippingConnectionModeSchema,
	shippingConnectionSchema,
	shippingLabelRefundSchema,
	shippingLabelSchema,
	shippingOptionSchema,
	shippingParcelPlanSchema,
	shippingParcelSchema,
	shippingPostageAdjustmentSchema,
	shippingQuoteSchema,
	shippingTrackingSchema,
};

export interface ShippingOptions extends ModuleConfig {
	/** Default currency for shipping prices */
	currency?: string;
	/** EasyPost API key (test or production) */
	easypostApiKey?: string | undefined;
	/** Use EasyPost test mode (default: true) */
	easypostTestMode?: boolean | undefined;
	/** EasyPost webhook signing secret — enables signature verification on
	 *  incoming tracker webhook events */
	easypostWebhookSecret?: string | undefined;
	/** Stable identity for the configured EasyPost Shipping Connection. */
	easypostConnectionId?: string | undefined;
	/** Merchant-visible name for the configured EasyPost Shipping Connection. */
	easypostConnectionName?: string | undefined;
	/** Server-owned Shipping origin. The complete set is required for v2 quotes. */
	easypostOriginName?: string | undefined;
	easypostOriginCompany?: string | undefined;
	easypostOriginStreet1?: string | undefined;
	easypostOriginStreet2?: string | undefined;
	easypostOriginCity?: string | undefined;
	easypostOriginState?: string | undefined;
	easypostOriginPostalCode?: string | undefined;
	easypostOriginCountry?: string | undefined;
	easypostOriginPhone?: string | undefined;
	/** Local quote validity, from 60 to 3,600 seconds. */
	quoteTtlSeconds?: number | undefined;
}

function configuredEasyPostOrigin(options?: ShippingOptions) {
	const values = [
		options?.easypostOriginName,
		options?.easypostOriginCompany,
		options?.easypostOriginStreet1,
		options?.easypostOriginStreet2,
		options?.easypostOriginCity,
		options?.easypostOriginState,
		options?.easypostOriginPostalCode,
		options?.easypostOriginCountry,
		options?.easypostOriginPhone,
	];
	if (!values.some((value) => value !== undefined)) return null;
	if (
		!options?.easypostOriginStreet1 ||
		!options.easypostOriginCity ||
		!options.easypostOriginState ||
		!options.easypostOriginPostalCode ||
		!options.easypostOriginCountry
	) {
		throw new Error(
			"EasyPost v2 origin requires street, city, state, postal code, and country.",
		);
	}
	return shippingAddressSchema.parse({
		...(options.easypostOriginName ? { name: options.easypostOriginName } : {}),
		...(options.easypostOriginCompany
			? { company: options.easypostOriginCompany }
			: {}),
		street1: options.easypostOriginStreet1,
		...(options.easypostOriginStreet2
			? { street2: options.easypostOriginStreet2 }
			: {}),
		city: options.easypostOriginCity,
		state: options.easypostOriginState,
		postalCode: options.easypostOriginPostalCode,
		country: options.easypostOriginCountry,
		...(options.easypostOriginPhone
			? { phone: options.easypostOriginPhone }
			: {}),
	});
}

export default function shipping(options?: ShippingOptions): Module {
	const hasEasyPost = Boolean(
		options?.easypostApiKey && options?.easypostWebhookSecret,
	);

	const settingsEndpoint = createGetSettingsEndpoint({
		easypostApiKey: options?.easypostApiKey,
		easypostTestMode: options?.easypostTestMode,
		easypostWebhookSecret: options?.easypostWebhookSecret,
	});
	const easypostConnectionId =
		options?.easypostConnectionId ?? "shipping_easypost_default";
	const easypostOrigin = configuredEasyPostOrigin(options);

	return {
		id: "shipping",
		version: "0.1.0",
		schema: shippingSchema,
		capabilities: {
			provides: [createShippingQuoteProvider()],
			accepts: [
				acceptCapability(orderCustomerAuthorizeCapability, { optional: true }),
			],
		},
		exports: {
			read: [
				"shippingRates",
				"shippingZones",
				"shippingMethods",
				"shippingCarriers",
				"shipments",
				"shippingConnectionsV2",
				"shippingQuotesV2",
				"shippingLabelsV2",
			],
		},
		events: {
			emits: [
				"shipment.created",
				"shipment.shipped",
				"shipment.in_transit",
				"shipment.delivered",
				"shipment.returned",
				"shipment.failed",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createShippingController(ctx.data, ctx.events);
			const providers = options?.easypostApiKey
				? [
						createEasyPostShippingConnectionProvider({
							connectionId: easypostConnectionId,
							apiKey: options.easypostApiKey,
							testMode: options.easypostTestMode ?? true,
						}),
					]
				: [];
			const foundation = createShippingFoundationController(
				ctx.data,
				ctx.transactions,
				providers,
				{ quoteTtlSeconds: options?.quoteTtlSeconds },
			);
			if (options?.easypostApiKey && easypostOrigin && ctx.transactions) {
				await foundation.ensureConnection({
					id: easypostConnectionId,
					name: options.easypostConnectionName ?? "EasyPost",
					provider: "easypost",
					mode: options.easypostTestMode === false ? "live" : "test",
					capabilities: ["quote"],
					secretReference: "module-option:easypostApiKey",
					originAddress: easypostOrigin,
				});
			}
			return {
				controllers: { shipping: controller, shippingV2: foundation },
			};
		},
		endpoints: {
			store: hasEasyPost
				? createStoreEndpointsWithRates({
						webhookSecret: options?.easypostWebhookSecret,
					})
				: storeEndpoints,
			admin: createAdminEndpointsWithSettings(settingsEndpoint),
		},
		admin: {
			pages: [
				{
					path: "/admin/shipping",
					component: "ShippingAdmin",
					label: "Shipping",
					icon: "Truck",
					group: "Fulfillment",
				},
				{
					path: "/admin/shipping/carriers",
					component: "ShippingCarriersAdmin",
					label: "Carriers",
					icon: "Building2",
					group: "Fulfillment",
				},
				{
					path: "/admin/shipping/shipments",
					component: "ShipmentsAdmin",
					label: "Shipments",
					icon: "Package",
					group: "Fulfillment",
				},
			],
		},
		options,
	};
}
