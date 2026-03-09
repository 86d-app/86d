import type { ModuleController } from "@86d-app/core";

// ── Entities ───────────────────────────────────────────────────────

export interface WrapOption {
	id: string;
	name: string;
	description?: string;
	priceInCents: number;
	imageUrl?: string;
	active: boolean;
	sortOrder: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface WrapSelection {
	id: string;
	orderId: string;
	orderItemId: string;
	wrapOptionId: string;
	wrapOptionName: string;
	priceInCents: number;
	recipientName?: string;
	giftMessage?: string;
	customerId?: string;
	createdAt: Date;
}

// ── Input params ───────────────────────────────────────────────────

export interface CreateWrapOptionParams {
	name: string;
	description?: string;
	priceInCents: number;
	imageUrl?: string;
	active?: boolean;
	sortOrder?: number;
}

export interface UpdateWrapOptionParams {
	name?: string;
	description?: string;
	priceInCents?: number;
	imageUrl?: string;
	active?: boolean;
	sortOrder?: number;
}

export interface SelectWrappingParams {
	orderId: string;
	orderItemId: string;
	wrapOptionId: string;
	recipientName?: string;
	giftMessage?: string;
	customerId?: string;
}

export interface ListOptionsParams {
	active?: boolean;
	take?: number;
	skip?: number;
}

// ── Results ────────────────────────────────────────────────────────

export interface WrapSummary {
	totalOptions: number;
	activeOptions: number;
	totalSelections: number;
	totalRevenue: number;
}

export interface OrderWrappingTotal {
	selections: WrapSelection[];
	totalInCents: number;
}

// ── Controller ─────────────────────────────────────────────────────

export interface GiftWrappingController extends ModuleController {
	// Wrap option CRUD
	createOption(params: CreateWrapOptionParams): Promise<WrapOption>;
	updateOption(
		id: string,
		params: UpdateWrapOptionParams,
	): Promise<WrapOption | null>;
	getOption(id: string): Promise<WrapOption | null>;
	listOptions(params?: ListOptionsParams): Promise<WrapOption[]>;
	deleteOption(id: string): Promise<boolean>;

	// Wrap selections
	selectWrapping(params: SelectWrappingParams): Promise<WrapSelection>;
	removeSelection(id: string): Promise<boolean>;
	getSelection(id: string): Promise<WrapSelection | null>;
	getOrderSelections(orderId: string): Promise<WrapSelection[]>;
	getOrderWrappingTotal(orderId: string): Promise<OrderWrappingTotal>;
	getItemSelection(orderItemId: string): Promise<WrapSelection | null>;

	// Analytics
	getWrapSummary(): Promise<WrapSummary>;
}
