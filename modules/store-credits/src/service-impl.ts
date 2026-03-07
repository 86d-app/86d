import type { ModuleDataService } from "@86d-app/core";
import type {
	CreditAccount,
	CreditTransaction,
	StoreCreditController,
} from "./service";

export function createStoreCreditController(
	data: ModuleDataService,
): StoreCreditController {
	return {
		// ── Account operations ────────────────────────────────────────

		async getOrCreateAccount(customerId) {
			const existing = await data.findMany("creditAccount", {
				where: { customerId },
				take: 1,
			});
			const accounts = existing as unknown as CreditAccount[];
			if (accounts.length > 0) return accounts[0];

			const id = crypto.randomUUID();
			const account: CreditAccount = {
				id,
				customerId,
				balance: 0,
				lifetimeCredited: 0,
				lifetimeDebited: 0,
				currency: "USD",
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			await data.upsert(
				"creditAccount",
				id,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				account as Record<string, any>,
			);
			return account;
		},

		async getAccount(customerId) {
			const existing = await data.findMany("creditAccount", {
				where: { customerId },
				take: 1,
			});
			const accounts = existing as unknown as CreditAccount[];
			return accounts.length > 0 ? accounts[0] : null;
		},

		async getAccountById(id) {
			const raw = await data.get("creditAccount", id);
			if (!raw) return null;
			return raw as unknown as CreditAccount;
		},

		async freezeAccount(customerId) {
			const account = await this.getOrCreateAccount(customerId);
			if (account.status === "closed") {
				throw new Error("Cannot freeze a closed account");
			}
			const updated = {
				...account,
				status: "frozen" as const,
				updatedAt: new Date(),
			};
			await data.upsert(
				"creditAccount",
				account.id,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				updated as Record<string, any>,
			);
			return updated;
		},

		async unfreezeAccount(customerId) {
			const account = await this.getOrCreateAccount(customerId);
			if (account.status !== "frozen") {
				throw new Error("Account is not frozen");
			}
			const updated = {
				...account,
				status: "active" as const,
				updatedAt: new Date(),
			};
			await data.upsert(
				"creditAccount",
				account.id,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				updated as Record<string, any>,
			);
			return updated;
		},

		// ── Credit / debit operations ────────────────────────────────

		async credit(params) {
			if (params.amount <= 0) {
				throw new Error("Credit amount must be positive");
			}

			const account = await this.getOrCreateAccount(params.customerId);
			if (account.status === "closed") {
				throw new Error("Cannot credit a closed account");
			}

			const newBalance = account.balance + params.amount;
			const updated: CreditAccount = {
				...account,
				balance: newBalance,
				lifetimeCredited: account.lifetimeCredited + params.amount,
				updatedAt: new Date(),
			};
			await data.upsert(
				"creditAccount",
				account.id,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				updated as Record<string, any>,
			);

			const txnId = crypto.randomUUID();
			const txn: CreditTransaction = {
				id: txnId,
				accountId: account.id,
				type: "credit",
				amount: params.amount,
				balanceAfter: newBalance,
				reason: params.reason,
				description: params.description,
				referenceType: params.referenceType,
				referenceId: params.referenceId,
				metadata: params.metadata,
				createdAt: new Date(),
			};
			await data.upsert(
				"creditTransaction",
				txnId,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				txn as Record<string, any>,
			);

			return txn;
		},

		async debit(params) {
			if (params.amount <= 0) {
				throw new Error("Debit amount must be positive");
			}

			const account = await this.getOrCreateAccount(params.customerId);
			if (account.status !== "active") {
				throw new Error("Cannot debit a non-active account");
			}
			if (account.balance < params.amount) {
				throw new Error("Insufficient store credit balance");
			}

			const newBalance = account.balance - params.amount;
			const updated: CreditAccount = {
				...account,
				balance: newBalance,
				lifetimeDebited: account.lifetimeDebited + params.amount,
				updatedAt: new Date(),
			};
			await data.upsert(
				"creditAccount",
				account.id,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				updated as Record<string, any>,
			);

			const txnId = crypto.randomUUID();
			const txn: CreditTransaction = {
				id: txnId,
				accountId: account.id,
				type: "debit",
				amount: params.amount,
				balanceAfter: newBalance,
				reason: params.reason,
				description: params.description,
				referenceType: params.referenceType,
				referenceId: params.referenceId,
				metadata: params.metadata,
				createdAt: new Date(),
			};
			await data.upsert(
				"creditTransaction",
				txnId,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				txn as Record<string, any>,
			);

			return txn;
		},

		// ── Query operations ─────────────────────────────────────────

		async getBalance(customerId) {
			const account = await this.getAccount(customerId);
			return account?.balance ?? 0;
		},

		async listTransactions(accountId, params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = { accountId };
			if (params?.type) where.type = params.type;
			if (params?.reason) where.reason = params.reason;

			const all = await data.findMany("creditTransaction", {
				where,
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as CreditTransaction[];
		},

		// ── Admin operations ─────────────────────────────────────────

		async listAccounts(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("creditAccount", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as CreditAccount[];
		},

		async getSummary() {
			const all = await data.findMany("creditAccount", {});
			const accounts = all as unknown as CreditAccount[];

			let totalOutstanding = 0;
			let totalCredited = 0;
			let totalDebited = 0;

			for (const account of accounts) {
				totalOutstanding += account.balance;
				totalCredited += account.lifetimeCredited;
				totalDebited += account.lifetimeDebited;
			}

			return {
				totalAccounts: accounts.length,
				totalOutstandingBalance: totalOutstanding,
				totalLifetimeCredited: totalCredited,
				totalLifetimeDebited: totalDebited,
			};
		},
	};
}
