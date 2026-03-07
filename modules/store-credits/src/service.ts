import type { ModuleController } from "@86d-app/core";

export type CreditTransactionType = "credit" | "debit";

export type CreditReason =
	| "return_refund"
	| "order_payment"
	| "admin_adjustment"
	| "referral_reward"
	| "gift_card_conversion"
	| "promotional"
	| "other";

export type AccountStatus = "active" | "frozen" | "closed";

export interface CreditAccount {
	id: string;
	customerId: string;
	balance: number;
	lifetimeCredited: number;
	lifetimeDebited: number;
	currency: string;
	status: AccountStatus;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreditTransaction {
	id: string;
	accountId: string;
	type: CreditTransactionType;
	amount: number;
	balanceAfter: number;
	reason: CreditReason;
	description: string;
	referenceType?: string | undefined;
	referenceId?: string | undefined;
	metadata?: Record<string, unknown> | undefined;
	createdAt: Date;
}

export interface CreditParams {
	customerId: string;
	amount: number;
	reason: CreditReason;
	description: string;
	referenceType?: string | undefined;
	referenceId?: string | undefined;
	metadata?: Record<string, unknown> | undefined;
}

export interface DebitParams {
	customerId: string;
	amount: number;
	reason: CreditReason;
	description: string;
	referenceType?: string | undefined;
	referenceId?: string | undefined;
	metadata?: Record<string, unknown> | undefined;
}

export interface CreditSummary {
	totalAccounts: number;
	totalOutstandingBalance: number;
	totalLifetimeCredited: number;
	totalLifetimeDebited: number;
}

export interface StoreCreditController extends ModuleController {
	// ── Account operations ────────────────────────────────────────────
	getOrCreateAccount(customerId: string): Promise<CreditAccount>;
	getAccount(customerId: string): Promise<CreditAccount | null>;
	getAccountById(id: string): Promise<CreditAccount | null>;
	freezeAccount(customerId: string): Promise<CreditAccount>;
	unfreezeAccount(customerId: string): Promise<CreditAccount>;

	// ── Credit / debit operations ────────────────────────────────────
	credit(params: CreditParams): Promise<CreditTransaction>;
	debit(params: DebitParams): Promise<CreditTransaction>;

	// ── Query operations ─────────────────────────────────────────────
	getBalance(customerId: string): Promise<number>;
	listTransactions(
		accountId: string,
		params?: {
			type?: CreditTransactionType | undefined;
			reason?: CreditReason | undefined;
			take?: number | undefined;
			skip?: number | undefined;
		},
	): Promise<CreditTransaction[]>;

	// ── Admin operations ─────────────────────────────────────────────
	listAccounts(params?: {
		status?: AccountStatus | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<CreditAccount[]>;
	getSummary(): Promise<CreditSummary>;
}
