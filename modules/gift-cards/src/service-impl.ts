import type { ModuleDataService } from "@86d-app/core";
import type {
	CreateGiftCardParams,
	GiftCard,
	GiftCardController,
	GiftCardTransaction,
	RedeemResult,
} from "./service";

/**
 * Generate a unique gift card code in the format GIFT-XXXX-XXXX-XXXX
 * Uses uppercase alphanumeric characters (no ambiguous chars like 0/O, 1/I/L)
 */
function generateCode(): string {
	const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
	const segment = () => {
		let s = "";
		for (let i = 0; i < 4; i++) {
			s += chars[Math.floor(Math.random() * chars.length)];
		}
		return s;
	};
	return `GIFT-${segment()}-${segment()}-${segment()}`;
}

export function createGiftCardController(
	data: ModuleDataService,
): GiftCardController {
	return {
		async create(params: CreateGiftCardParams): Promise<GiftCard> {
			const id = crypto.randomUUID();
			const code = generateCode();
			const now = new Date();

			const card: GiftCard = {
				id,
				code,
				initialBalance: params.initialBalance,
				currentBalance: params.initialBalance,
				currency: params.currency ?? "USD",
				status: "active",
				expiresAt: params.expiresAt,
				recipientEmail: params.recipientEmail,
				customerId: params.customerId,
				purchaseOrderId: params.purchaseOrderId,
				note: params.note,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any for JSONB
			await data.upsert("giftCard", id, card as Record<string, any>);
			return card;
		},

		async get(id: string): Promise<GiftCard | null> {
			const raw = await data.get("giftCard", id);
			if (!raw) return null;
			return raw as unknown as GiftCard;
		},

		async getByCode(code: string): Promise<GiftCard | null> {
			const results = await data.findMany("giftCard", {
				where: { code: code.toUpperCase() },
				take: 1,
			});
			const cards = results as unknown as GiftCard[];
			return cards.length > 0 ? cards[0] : null;
		},

		async list(params): Promise<GiftCard[]> {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;
			if (params?.customerId) where.customerId = params.customerId;

			const results = await data.findMany("giftCard", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return results as unknown as GiftCard[];
		},

		async update(id, updates): Promise<GiftCard | null> {
			const existing = await data.get("giftCard", id);
			if (!existing) return null;

			const card = existing as unknown as GiftCard;
			const updated: GiftCard = {
				...card,
				...(updates.status !== undefined ? { status: updates.status } : {}),
				...(updates.expiresAt !== undefined
					? { expiresAt: updates.expiresAt }
					: {}),
				...(updates.note !== undefined ? { note: updates.note } : {}),
				...(updates.recipientEmail !== undefined
					? { recipientEmail: updates.recipientEmail }
					: {}),
				updatedAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("giftCard", id, updated as Record<string, any>);
			return updated;
		},

		async delete(id: string): Promise<boolean> {
			const existing = await data.get("giftCard", id);
			if (!existing) return false;

			// Delete associated transactions first
			const txns = await data.findMany("giftCardTransaction", {
				where: { giftCardId: id },
			});
			for (const txn of txns as unknown as GiftCardTransaction[]) {
				await data.delete("giftCardTransaction", txn.id);
			}

			await data.delete("giftCard", id);
			return true;
		},

		async checkBalance(code: string): Promise<{
			balance: number;
			currency: string;
			status: string;
		} | null> {
			const results = await data.findMany("giftCard", {
				where: { code: code.toUpperCase() },
				take: 1,
			});
			const cards = results as unknown as GiftCard[];
			if (cards.length === 0) return null;

			const card = cards[0];

			// Check expiration
			if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
				return {
					balance: 0,
					currency: card.currency,
					status: "expired",
				};
			}

			return {
				balance: card.currentBalance,
				currency: card.currency,
				status: card.status,
			};
		},

		async redeem(
			code: string,
			amount: number,
			orderId?: string | undefined,
		): Promise<RedeemResult | null> {
			const results = await data.findMany("giftCard", {
				where: { code: code.toUpperCase() },
				take: 1,
			});
			const cards = results as unknown as GiftCard[];
			if (cards.length === 0) return null;

			const card = cards[0];

			// Validate card can be redeemed
			if (card.status !== "active") return null;
			if (card.expiresAt && new Date(card.expiresAt) < new Date()) return null;
			if (card.currentBalance <= 0) return null;
			if (amount <= 0) return null;

			// Cap redemption to available balance
			const debitAmount = Math.min(amount, card.currentBalance);
			const newBalance = card.currentBalance - debitAmount;

			// Update card balance
			const updatedCard: GiftCard = {
				...card,
				currentBalance: newBalance,
				status: newBalance === 0 ? "depleted" : "active",
				updatedAt: new Date(),
			};

			await data.upsert(
				"giftCard",
				card.id,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				updatedCard as Record<string, any>,
			);

			// Record transaction
			const txnId = crypto.randomUUID();
			const txn: GiftCardTransaction = {
				id: txnId,
				giftCardId: card.id,
				type: "debit",
				amount: debitAmount,
				balanceAfter: newBalance,
				orderId,
				note: orderId ? `Redeemed for order ${orderId}` : "Redeemed",
				createdAt: new Date(),
			};

			await data.upsert(
				"giftCardTransaction",
				txnId,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				txn as Record<string, any>,
			);

			return { transaction: txn, giftCard: updatedCard };
		},

		async credit(
			id: string,
			amount: number,
			note?: string | undefined,
			orderId?: string | undefined,
		): Promise<RedeemResult | null> {
			const existing = await data.get("giftCard", id);
			if (!existing) return null;
			if (amount <= 0) return null;

			const card = existing as unknown as GiftCard;
			const newBalance = card.currentBalance + amount;

			const updatedCard: GiftCard = {
				...card,
				currentBalance: newBalance,
				status: newBalance > 0 ? "active" : card.status,
				updatedAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("giftCard", id, updatedCard as Record<string, any>);

			const txnId = crypto.randomUUID();
			const txn: GiftCardTransaction = {
				id: txnId,
				giftCardId: id,
				type: "credit",
				amount,
				balanceAfter: newBalance,
				orderId,
				note: note ?? "Credit applied",
				createdAt: new Date(),
			};

			await data.upsert(
				"giftCardTransaction",
				txnId,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				txn as Record<string, any>,
			);

			return { transaction: txn, giftCard: updatedCard };
		},

		async listTransactions(giftCardId, params): Promise<GiftCardTransaction[]> {
			const results = await data.findMany("giftCardTransaction", {
				where: { giftCardId },
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return results as unknown as GiftCardTransaction[];
		},

		async countAll(): Promise<number> {
			const all = await data.findMany("giftCard", {});
			return (all as unknown as GiftCard[]).length;
		},
	};
}
