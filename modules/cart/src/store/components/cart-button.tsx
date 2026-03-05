"use client";

import { observer } from "@86d-app/core/state";
import { useEffect } from "react";
import { cartState } from "../../state";
import { useCartApi } from "./_hooks";
import CartButtonTemplate from "./cart-button.mdx";

interface CartData {
	id: string;
	items: unknown[];
	subtotal: number;
	itemCount: number;
}

export const CartButton = observer(() => {
	const api = useCartApi();
	const { data } = api.getCart.useQuery() as { data: CartData | undefined };
	const count = data?.itemCount ?? 0;

	useEffect(() => {
		cartState.setItemCount(count);
	}, [count]);

	return (
		<CartButtonTemplate
			onClick={() => cartState.toggleDrawer()}
			ariaLabel={`Cart${count > 0 ? ` (${count} items)` : ""}`}
			count={count}
		/>
	);
});
