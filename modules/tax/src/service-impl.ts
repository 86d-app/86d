import type { ModuleDataService } from "@86d-app/core";
import type {
	CreateTaxCategoryParams,
	CreateTaxExemptionParams,
	CreateTaxRateParams,
	TaxAddress,
	TaxCalculation,
	TaxCategory,
	TaxController,
	TaxExemption,
	TaxLineItem,
	TaxLineResult,
	TaxRate,
	UpdateTaxRateParams,
} from "./service";

/**
 * Score how specifically a rate matches a given address.
 * Higher score = more specific match = higher priority when multiple rates exist.
 * Returns -1 if the rate does not match at all.
 */
function matchScore(rate: TaxRate, address: TaxAddress): number {
	if (rate.country !== address.country) return -1;

	let score = 1; // country match

	if (rate.state !== "*") {
		if (rate.state !== address.state) return -1;
		score += 10;
	}

	if (rate.city !== "*") {
		if (!address.city || rate.city.toLowerCase() !== address.city.toLowerCase())
			return -1;
		score += 100;
	}

	if (rate.postalCode !== "*") {
		if (!address.postalCode || rate.postalCode !== address.postalCode)
			return -1;
		score += 1000;
	}

	return score;
}

/**
 * Find the best matching rates for a given address and category.
 * More specific jurisdictions take precedence over broader ones.
 */
function findMatchingRates(
	allRates: TaxRate[],
	address: TaxAddress,
	categoryId: string,
): TaxRate[] {
	const scored = allRates
		.filter((r) => r.enabled)
		.filter((r) => r.categoryId === categoryId || r.categoryId === "default")
		.map((r) => ({ rate: r, score: matchScore(r, address) }))
		.filter((r) => r.score > 0)
		.sort((a, b) => b.score - a.score || b.rate.priority - a.rate.priority);

	if (scored.length === 0) return [];

	// If we have category-specific rates that match, prefer those over "default"
	const categorySpecific = scored.filter(
		(s) => s.rate.categoryId === categoryId,
	);
	if (categorySpecific.length > 0 && categoryId !== "default") {
		return categorySpecific.map((s) => s.rate);
	}

	return scored.map((s) => s.rate);
}

/**
 * Apply tax rates to an amount, respecting compound and priority settings.
 * Non-compound rates at the same priority are additive.
 * Compound rates at higher priority apply to (amount + previously computed tax).
 */
function applyRates(
	amount: number,
	rates: TaxRate[],
): { tax: number; effectiveRate: number } {
	if (rates.length === 0) return { tax: 0, effectiveRate: 0 };

	// Group by priority
	const byPriority = new Map<number, TaxRate[]>();
	for (const r of rates) {
		const existing = byPriority.get(r.priority) ?? [];
		existing.push(r);
		byPriority.set(r.priority, existing);
	}

	const priorities = [...byPriority.keys()].sort((a, b) => a - b);

	let cumulativeTax = 0;

	for (const priority of priorities) {
		const group = byPriority.get(priority) ?? [];
		let groupTax = 0;

		for (const rate of group) {
			const base = rate.compound ? amount + cumulativeTax : amount;
			if (rate.type === "percentage") {
				groupTax += base * rate.rate;
			} else {
				groupTax += rate.rate;
			}
		}

		cumulativeTax += groupTax;
	}

	const effectiveRate = amount > 0 ? cumulativeTax / amount : 0;
	return { tax: roundCurrency(cumulativeTax), effectiveRate };
}

/** Round to 2 decimal places using banker's rounding */
function roundCurrency(value: number): number {
	return Math.round(value * 100) / 100;
}

export function createTaxController(data: ModuleDataService): TaxController {
	return {
		// --- Tax Rates ---
		async createRate(params: CreateTaxRateParams): Promise<TaxRate> {
			const id = crypto.randomUUID();
			const now = new Date();

			const rate: TaxRate = {
				id,
				name: params.name,
				country: params.country,
				state: params.state ?? "*",
				city: params.city ?? "*",
				postalCode: params.postalCode ?? "*",
				rate: params.rate,
				type: params.type ?? "percentage",
				categoryId: params.categoryId ?? "default",
				enabled: params.enabled ?? true,
				priority: params.priority ?? 0,
				compound: params.compound ?? false,
				inclusive: params.inclusive ?? false,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("taxRate", id, rate as Record<string, any>);
			return rate;
		},

		async getRate(id: string): Promise<TaxRate | null> {
			return (await data.get("taxRate", id)) as TaxRate | null;
		},

		async listRates(params): Promise<TaxRate[]> {
			// biome-ignore lint/suspicious/noExplicitAny: dynamic where clause
			const where: Record<string, any> = {};
			if (params?.country) where.country = params.country;
			if (params?.state) where.state = params.state;
			if (params?.enabled !== undefined) where.enabled = params.enabled;

			return (await data.findMany("taxRate", {
				where,
				take: params?.take ?? 200,
				skip: params?.skip ?? 0,
			})) as TaxRate[];
		},

		async updateRate(
			id: string,
			params: UpdateTaxRateParams,
		): Promise<TaxRate | null> {
			const existing = (await data.get("taxRate", id)) as TaxRate | null;
			if (!existing) return null;

			const updated: TaxRate = {
				...existing,
				...(params.name !== undefined ? { name: params.name } : {}),
				...(params.rate !== undefined ? { rate: params.rate } : {}),
				...(params.type !== undefined ? { type: params.type } : {}),
				...(params.enabled !== undefined ? { enabled: params.enabled } : {}),
				...(params.priority !== undefined ? { priority: params.priority } : {}),
				...(params.compound !== undefined ? { compound: params.compound } : {}),
				...(params.inclusive !== undefined
					? { inclusive: params.inclusive }
					: {}),
				updatedAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("taxRate", id, updated as Record<string, any>);
			return updated;
		},

		async deleteRate(id: string): Promise<boolean> {
			const existing = (await data.get("taxRate", id)) as TaxRate | null;
			if (!existing) return false;
			await data.delete("taxRate", id);
			return true;
		},

		// --- Tax Categories ---
		async createCategory(
			params: CreateTaxCategoryParams,
		): Promise<TaxCategory> {
			const id = crypto.randomUUID();
			const category: TaxCategory = {
				id,
				name: params.name,
				description: params.description,
				createdAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("taxCategory", id, category as Record<string, any>);
			return category;
		},

		async getCategory(id: string): Promise<TaxCategory | null> {
			return (await data.get("taxCategory", id)) as TaxCategory | null;
		},

		async listCategories(): Promise<TaxCategory[]> {
			return (await data.findMany("taxCategory", {})) as TaxCategory[];
		},

		async deleteCategory(id: string): Promise<boolean> {
			const existing = (await data.get(
				"taxCategory",
				id,
			)) as TaxCategory | null;
			if (!existing) return false;
			await data.delete("taxCategory", id);
			return true;
		},

		// --- Tax Exemptions ---
		async createExemption(
			params: CreateTaxExemptionParams,
		): Promise<TaxExemption> {
			const id = crypto.randomUUID();
			const exemption: TaxExemption = {
				id,
				customerId: params.customerId,
				type: params.type ?? "full",
				categoryId: params.categoryId,
				taxIdNumber: params.taxIdNumber,
				reason: params.reason,
				expiresAt: params.expiresAt,
				enabled: true,
				createdAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("taxExemption", id, exemption as Record<string, any>);
			return exemption;
		},

		async getExemption(id: string): Promise<TaxExemption | null> {
			return (await data.get("taxExemption", id)) as TaxExemption | null;
		},

		async listExemptions(customerId: string): Promise<TaxExemption[]> {
			return (await data.findMany("taxExemption", {
				where: { customerId },
			})) as TaxExemption[];
		},

		async deleteExemption(id: string): Promise<boolean> {
			const existing = (await data.get(
				"taxExemption",
				id,
			)) as TaxExemption | null;
			if (!existing) return false;
			await data.delete("taxExemption", id);
			return true;
		},

		// --- Tax Calculation ---
		async calculate(params: {
			address: TaxAddress;
			lineItems: TaxLineItem[];
			shippingAmount?: number | undefined;
			customerId?: string | undefined;
		}): Promise<TaxCalculation> {
			// Fetch all enabled rates
			const allRates = (await data.findMany("taxRate", {
				where: { enabled: true },
			})) as TaxRate[];

			// Check customer exemptions
			let exemptions: TaxExemption[] = [];
			if (params.customerId) {
				exemptions = (
					(await data.findMany("taxExemption", {
						where: { customerId: params.customerId, enabled: true },
					})) as TaxExemption[]
				).filter((e) => !e.expiresAt || new Date(e.expiresAt) > new Date());
			}

			const isFullyExempt = exemptions.some((e) => e.type === "full");
			const exemptCategories = new Set(
				exemptions
					.filter((e) => e.type === "category" && e.categoryId)
					.map((e) => e.categoryId as string),
			);

			const lines: TaxLineResult[] = [];
			let totalItemTax = 0;
			let totalTaxableAmount = 0;

			for (const item of params.lineItems) {
				const categoryId = item.categoryId ?? "default";

				// Check exemptions
				if (isFullyExempt || exemptCategories.has(categoryId)) {
					lines.push({
						productId: item.productId,
						taxableAmount: item.amount,
						taxAmount: 0,
						rate: 0,
						rateNames: [],
					});
					continue;
				}

				const matchingRates = findMatchingRates(
					allRates,
					params.address,
					categoryId,
				);
				const { tax, effectiveRate } = applyRates(item.amount, matchingRates);

				lines.push({
					productId: item.productId,
					taxableAmount: item.amount,
					taxAmount: tax,
					rate: effectiveRate,
					rateNames: matchingRates.map((r) => r.name),
				});

				totalItemTax += tax;
				totalTaxableAmount += item.amount;
			}

			// Calculate shipping tax (use "default" category for shipping)
			let shippingTax = 0;
			if (
				params.shippingAmount &&
				params.shippingAmount > 0 &&
				!isFullyExempt
			) {
				const shippingRates = findMatchingRates(
					allRates,
					params.address,
					"default",
				);
				shippingTax = applyRates(params.shippingAmount, shippingRates).tax;
			}

			const totalTax = roundCurrency(totalItemTax + shippingTax);
			const effectiveRate =
				totalTaxableAmount > 0 ? totalItemTax / totalTaxableAmount : 0;

			// Determine if rates are inclusive
			const matchedRates = findMatchingRates(
				allRates,
				params.address,
				"default",
			);
			const inclusive =
				matchedRates.length > 0 ? matchedRates[0].inclusive : false;

			return {
				totalTax,
				shippingTax,
				lines,
				effectiveRate,
				inclusive,
				jurisdiction: {
					country: params.address.country,
					state: params.address.state,
					city: params.address.city ?? "*",
				},
			};
		},

		async getRatesForAddress(address: TaxAddress): Promise<TaxRate[]> {
			const allRates = (await data.findMany("taxRate", {
				where: { enabled: true },
			})) as TaxRate[];

			return allRates
				.filter((r) => matchScore(r, address) > 0)
				.sort(
					(a, b) =>
						matchScore(b, address) - matchScore(a, address) ||
						b.priority - a.priority,
				);
		},
	};
}
