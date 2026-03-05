"use client";

import { useStoreContext } from "@86d-app/core/client";
import { memo } from "react";
import { useCartMutation, useTrack } from "./_hooks";
import type { Product } from "./_types";
import { formatPrice } from "./_utils";
import ProductCardTemplate from "./product-card.mdx";

export interface ProductCardProps {
	product: Product;
	showAddToCart?: boolean;
}

export const ProductCard = memo(function ProductCard({
	product,
	showAddToCart = true,
}: ProductCardProps) {
	const cartApi = useCartMutation();
	const track = useTrack();
	// biome-ignore lint/suspicious/noExplicitAny: store context shape varies per app
	const store = useStoreContext<{ cart: any }>();

	const addToCartMutation = cartApi.addToCart.useMutation({
		onSuccess: () => {
			void cartApi.getCart.invalidate();
			store.cart.openDrawer();
			track({
				type: "addToCart",
				productId: product.id,
				value: product.price,
				data: { name: product.name, quantity: 1 },
			});
		},
	});

	const image = product.images[0];
	const hasDiscount =
		product.compareAtPrice != null && product.compareAtPrice > product.price;
	const discountPct = hasDiscount
		? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100)
		: 0;

	const handleAddToCart = (e: React.MouseEvent) => {
		e.preventDefault();
		addToCartMutation.mutate({
			productId: product.id,
			quantity: 1,
			price: product.price,
			productName: product.name,
			productSlug: product.slug,
			productImage: image,
		});
	};

	return (
		<ProductCardTemplate
			product={product}
			image={image}
			showAddToCart={showAddToCart && product.inventory > 0}
			hasDiscount={hasDiscount}
			discountPct={discountPct}
			priceFormatted={formatPrice(product.price)}
			compareAtPriceFormatted={
				hasDiscount ? formatPrice(product.compareAtPrice as number) : null
			}
			isAddingToCart={addToCartMutation.isPending}
			onAddToCart={handleAddToCart}
		/>
	);
});
