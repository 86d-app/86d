import type { ModuleController } from "@86d-app/core";

export interface GiftCard {
	id: string;
	code: string;
	initialBalance: number;
	currentBalance: number;
	currency: string;
	status: "active" | "disabled" | "expired" | "depleted";
	expiresAt?: string | undefined;
	recipientEmail?: string | undefined;
	customerId?: string | undefined;
	purchaseOrderId?: string | undefined;
	note?: string | undefined;
	createdAt: Date;
	updatedAt: Date;
}

export interface GiftCardTransaction {
	id: string;
	giftCardId: string;
	type: "debit" | "credit";
	amount: number;
	balanceAfter: number;
	orderId?: string | undefined;
	note?: string | undefined;
	createdAt: Date;
}

export interface CreateGiftCardParams {
	initialBalance: number;
	currency?: string | undefined;
	expiresAt?: string | undefined;
	recipientEmail?: string | undefined;
	customerId?: string | undefined;
	purchaseOrderId?: string | undefined;
	note?: string | undefined;
}

export interface RedeemResult {
	transaction: GiftCardTransaction;
	giftCard: GiftCard;
}

export interface GiftCardController extends ModuleController {
	create(params: CreateGiftCardParams): Promise<GiftCard>;

	get(id: string): Promise<GiftCard | null>;

	getByCode(code: string): Promise<GiftCard | null>;

	list(params?: {
		status?: string | undefined;
		customerId?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<GiftCard[]>;

	update(
		id: string,
		data: Partial<
			Pick<GiftCard, "status" | "expiresAt" | "note" | "recipientEmail">
		>,
	): Promise<GiftCard | null>;

	delete(id: string): Promise<boolean>;

	checkBalance(code: string): Promise<{
		balance: number;
		currency: string;
		status: string;
	} | null>;

	redeem(
		code: string,
		amount: number,
		orderId?: string | undefined,
	): Promise<RedeemResult | null>;

	credit(
		id: string,
		amount: number,
		note?: string | undefined,
		orderId?: string | undefined,
	): Promise<RedeemResult | null>;

	listTransactions(
		giftCardId: string,
		params?: {
			take?: number | undefined;
			skip?: number | undefined;
		},
	): Promise<GiftCardTransaction[]>;

	countAll(): Promise<number>;
}
