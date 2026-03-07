"use client";

import { useAbandonedCartApi } from "./_hooks";
import { formatCurrency } from "./_utils";
import CartRecoveryTemplate from "./cart-recovery.mdx";

interface CartItemSnapshot {
	productId: string;
	variantId?: string;
	name: string;
	price: number;
	quantity: number;
	imageUrl?: string;
}

interface AbandonedCart {
	id: string;
	cartId: string;
	email?: string;
	items: CartItemSnapshot[];
	cartTotal: number;
	currency: string;
	status: string;
	recoveryToken: string;
}

export function CartRecovery({ token }: { token: string }) {
	const api = useAbandonedCartApi();
	const { data, isLoading } = api.recover.useQuery({
		params: { token },
	}) as {
		data: { cart: AbandonedCart } | { error: string } | undefined;
		isLoading: boolean;
	};

	if (isLoading) {
		return (
			<div className="py-12 text-center">
				<div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100" />
			</div>
		);
	}

	if (!data || "error" in data) {
		return (
			<CartRecoveryTemplate
				expired
				items={[]}
				cartTotal=""
				formatCurrency={formatCurrency}
			/>
		);
	}

	const { cart } = data;

	return (
		<CartRecoveryTemplate
			expired={false}
			items={cart.items}
			cartTotal={formatCurrency(cart.cartTotal, cart.currency)}
			cartId={cart.cartId}
			formatCurrency={formatCurrency}
		/>
	);
}
