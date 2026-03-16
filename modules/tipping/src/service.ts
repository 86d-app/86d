import type { ModuleController } from "@86d-app/core";

export interface Tip {
	id: string;
	orderId: string;
	amount: number;
	percentage?: number | undefined;
	type: "preset" | "custom";
	recipientType: "driver" | "server" | "staff" | "store";
	recipientId?: string | undefined;
	customerId?: string | undefined;
	status: "pending" | "paid" | "refunded";
	paidAt?: Date | undefined;
	metadata: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export interface TipPayout {
	id: string;
	recipientId: string;
	recipientType: string;
	amount: number;
	tipCount: number;
	periodStart: Date;
	periodEnd: Date;
	status: "pending" | "processing" | "paid" | "failed";
	paidAt?: Date | undefined;
	reference?: string | undefined;
	createdAt: Date;
	updatedAt: Date;
}

export interface TipSettings {
	id: string;
	presetPercents: number[];
	allowCustom: boolean;
	maxPercent: number;
	maxAmount: number;
	enableSplitting: boolean;
	defaultRecipientType: string;
	updatedAt: Date;
}

export interface AddTipParams {
	orderId: string;
	amount: number;
	percentage?: number | undefined;
	type: "preset" | "custom";
	recipientType?: "driver" | "server" | "staff" | "store" | undefined;
	recipientId?: string | undefined;
	customerId?: string | undefined;
	metadata?: Record<string, unknown> | undefined;
}

export interface UpdateTipParams {
	amount?: number | undefined;
	percentage?: number | undefined;
	recipientType?: "driver" | "server" | "staff" | "store" | undefined;
	recipientId?: string | undefined;
	status?: "pending" | "paid" | "refunded" | undefined;
}

export interface SplitEntry {
	recipientType: "driver" | "server" | "staff" | "store";
	recipientId?: string | undefined;
	amount: number;
}

export interface CreatePayoutParams {
	recipientId: string;
	recipientType: string;
	amount: number;
	tipCount: number;
	periodStart: Date;
	periodEnd: Date;
	reference?: string | undefined;
}

export interface TipStats {
	totalTips: number;
	totalAmount: number;
	totalPending: number;
	totalPaid: number;
	totalRefunded: number;
	averageTip: number;
	totalPayouts: number;
	totalPayoutAmount: number;
}

export interface TippingController extends ModuleController {
	addTip(params: AddTipParams): Promise<Tip>;

	updateTip(id: string, params: UpdateTipParams): Promise<Tip | null>;

	removeTip(id: string): Promise<boolean>;

	getTip(id: string): Promise<Tip | null>;

	listTips(params?: {
		orderId?: string | undefined;
		recipientId?: string | undefined;
		status?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<Tip[]>;

	splitTip(id: string, splits: SplitEntry[]): Promise<Tip[]>;

	getTipTotal(orderId: string): Promise<number>;

	createPayout(params: CreatePayoutParams): Promise<TipPayout>;

	getPayout(id: string): Promise<TipPayout | null>;

	listPayouts(params?: {
		recipientId?: string | undefined;
		status?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<TipPayout[]>;

	getSettings(): Promise<TipSettings>;

	updateSettings(
		params: Partial<
			Pick<
				TipSettings,
				| "presetPercents"
				| "allowCustom"
				| "maxPercent"
				| "maxAmount"
				| "enableSplitting"
				| "defaultRecipientType"
			>
		>,
	): Promise<TipSettings>;

	getTipStats(params?: {
		startDate?: Date | undefined;
		endDate?: Date | undefined;
	}): Promise<TipStats>;
}
