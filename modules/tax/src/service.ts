import type { ModuleController } from "@86d-app/core";

export type TaxRateType = "percentage" | "fixed";
export type TaxExemptionType = "full" | "category";

export interface TaxRate {
	id: string;
	name: string;
	country: string;
	state: string;
	city: string;
	postalCode: string;
	rate: number;
	type: TaxRateType;
	categoryId: string;
	enabled: boolean;
	priority: number;
	compound: boolean;
	inclusive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface TaxCategory {
	id: string;
	name: string;
	description?: string | undefined;
	createdAt: Date;
}

export interface TaxExemption {
	id: string;
	customerId: string;
	type: TaxExemptionType;
	categoryId?: string | undefined;
	taxIdNumber?: string | undefined;
	reason?: string | undefined;
	expiresAt?: Date | undefined;
	enabled: boolean;
	createdAt: Date;
}

/** Input for a single line item when calculating tax */
export interface TaxLineItem {
	productId: string;
	/** Tax category for this product (defaults to "default") */
	categoryId?: string | undefined;
	/** Line total before tax (price * quantity) */
	amount: number;
	quantity: number;
}

/** Shipping address used to determine tax jurisdiction */
export interface TaxAddress {
	country: string;
	state: string;
	city?: string | undefined;
	postalCode?: string | undefined;
}

/** Result of a tax calculation for a single line item */
export interface TaxLineResult {
	productId: string;
	taxableAmount: number;
	taxAmount: number;
	rate: number;
	rateNames: string[];
}

/** Result of a full tax calculation */
export interface TaxCalculation {
	/** Total tax amount (sum of all line item taxes + shipping tax) */
	totalTax: number;
	/** Tax on the shipping amount */
	shippingTax: number;
	/** Per-line-item tax breakdown */
	lines: TaxLineResult[];
	/** Effective combined rate */
	effectiveRate: number;
	/** Whether prices are tax-inclusive */
	inclusive: boolean;
	/** Jurisdiction that matched */
	jurisdiction: {
		country: string;
		state: string;
		city: string;
	};
}

export interface CreateTaxRateParams {
	name: string;
	country: string;
	state?: string | undefined;
	city?: string | undefined;
	postalCode?: string | undefined;
	rate: number;
	type?: TaxRateType | undefined;
	categoryId?: string | undefined;
	enabled?: boolean | undefined;
	priority?: number | undefined;
	compound?: boolean | undefined;
	inclusive?: boolean | undefined;
}

export interface UpdateTaxRateParams {
	name?: string | undefined;
	rate?: number | undefined;
	type?: TaxRateType | undefined;
	enabled?: boolean | undefined;
	priority?: number | undefined;
	compound?: boolean | undefined;
	inclusive?: boolean | undefined;
}

export interface CreateTaxCategoryParams {
	name: string;
	description?: string | undefined;
}

export interface CreateTaxExemptionParams {
	customerId: string;
	type?: TaxExemptionType | undefined;
	categoryId?: string | undefined;
	taxIdNumber?: string | undefined;
	reason?: string | undefined;
	expiresAt?: Date | undefined;
}

export interface TaxController extends ModuleController {
	// --- Tax Rates ---
	createRate(params: CreateTaxRateParams): Promise<TaxRate>;
	getRate(id: string): Promise<TaxRate | null>;
	listRates(params?: {
		country?: string | undefined;
		state?: string | undefined;
		enabled?: boolean | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<TaxRate[]>;
	updateRate(id: string, params: UpdateTaxRateParams): Promise<TaxRate | null>;
	deleteRate(id: string): Promise<boolean>;

	// --- Tax Categories ---
	createCategory(params: CreateTaxCategoryParams): Promise<TaxCategory>;
	getCategory(id: string): Promise<TaxCategory | null>;
	listCategories(): Promise<TaxCategory[]>;
	deleteCategory(id: string): Promise<boolean>;

	// --- Tax Exemptions ---
	createExemption(params: CreateTaxExemptionParams): Promise<TaxExemption>;
	getExemption(id: string): Promise<TaxExemption | null>;
	listExemptions(customerId: string): Promise<TaxExemption[]>;
	deleteExemption(id: string): Promise<boolean>;

	// --- Tax Calculation ---
	/**
	 * Calculate tax for a set of line items given a shipping address.
	 * This is the main calculation engine that:
	 * 1. Matches applicable tax rates by jurisdiction (country > state > city > postal)
	 * 2. Respects product-level tax categories
	 * 3. Applies customer exemptions
	 * 4. Handles compound rates and priority ordering
	 * 5. Optionally taxes shipping
	 */
	calculate(params: {
		address: TaxAddress;
		lineItems: TaxLineItem[];
		shippingAmount?: number | undefined;
		customerId?: string | undefined;
	}): Promise<TaxCalculation>;

	/**
	 * Look up applicable rates for a jurisdiction without performing a calculation.
	 * Useful for displaying "estimated tax" before full address is entered.
	 */
	getRatesForAddress(address: TaxAddress): Promise<TaxRate[]>;
}
