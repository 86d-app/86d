import type { ModuleSchema } from "@86d-app/core";

export const taxSchema = {
	/**
	 * Tax rates by jurisdiction.
	 * A jurisdiction is a combination of country + state/province + optional city/postal.
	 * Rates are stored as decimals (e.g. 0.0825 for 8.25%).
	 */
	taxRate: {
		fields: {
			id: { type: "string", required: true },
			/** Human-readable name, e.g. "California Sales Tax" */
			name: { type: "string", required: true },
			/** Two-letter ISO country code (e.g. "US", "GB", "DE") */
			country: { type: "string", required: true },
			/** State/province code (e.g. "CA", "NY") or "*" for country-wide */
			state: { type: "string", required: true, defaultValue: "*" },
			/** City name or "*" for state-wide */
			city: { type: "string", required: true, defaultValue: "*" },
			/** Postal/ZIP code pattern or "*" for all */
			postalCode: { type: "string", required: true, defaultValue: "*" },
			/** Tax rate as a decimal (e.g. 0.0825 for 8.25%) */
			rate: { type: "number", required: true },
			/** Rate type: "percentage" (of subtotal) or "fixed" (per-item flat) */
			type: {
				type: ["percentage", "fixed"],
				required: true,
				defaultValue: "percentage",
			},
			/** Tax category this rate applies to, or "default" for all */
			categoryId: {
				type: "string",
				required: true,
				defaultValue: "default",
			},
			/** Whether this rate is currently active */
			enabled: { type: "boolean", required: true, defaultValue: true },
			/** Priority for rate stacking (higher = applied first) */
			priority: { type: "number", required: true, defaultValue: 0 },
			/** Whether this rate compounds on top of lower-priority rates */
			compound: { type: "boolean", required: true, defaultValue: false },
			/** Whether to include tax in the displayed product price */
			inclusive: { type: "boolean", required: true, defaultValue: false },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
			updatedAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
				onUpdate: () => new Date(),
			},
		},
	},

	/**
	 * Tax categories for product classification.
	 * Products can be assigned a category to use different tax rates
	 * (e.g. "clothing" may be tax-exempt in some jurisdictions).
	 */
	taxCategory: {
		fields: {
			id: { type: "string", required: true },
			/** Name like "default", "clothing", "food", "digital", "services" */
			name: { type: "string", required: true },
			description: { type: "string", required: false },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
		},
	},

	/**
	 * Tax exemptions for specific customers.
	 * Allows B2B or government customers to be exempt from tax.
	 */
	taxExemption: {
		fields: {
			id: { type: "string", required: true },
			/** Customer ID that is exempt */
			customerId: { type: "string", required: true },
			/** Exemption type: "full" (no tax), "category" (exempt from specific category) */
			type: {
				type: ["full", "category"],
				required: true,
				defaultValue: "full",
			},
			/** For category exemptions, which category is exempt */
			categoryId: { type: "string", required: false },
			/** Tax ID / VAT number for verification */
			taxIdNumber: { type: "string", required: false },
			/** Reason for exemption */
			reason: { type: "string", required: false },
			/** Expiration date for the exemption */
			expiresAt: { type: "date", required: false },
			enabled: { type: "boolean", required: true, defaultValue: true },
			createdAt: {
				type: "date",
				required: true,
				defaultValue: () => new Date(),
			},
		},
	},
} satisfies ModuleSchema;
