"use client";

import { useStoreContext } from "@86d-app/core/client";
import { useEffect, useRef, useState } from "react";
import {
	useCartMutation,
	useProductsApi,
	useReviewsApi,
	useTrack,
} from "./_hooks";
import type {
	ProductVariant,
	ProductWithVariants,
	ReviewsResponse,
} from "./_types";
import { formatPrice } from "./_utils";
import { BackInStockNotify } from "./back-in-stock-notify";
import ProductDetailTemplate from "./product-detail.mdx";
import { ProductReviewsSection } from "./product-reviews-section";
import { RecentlyViewedProducts } from "./recently-viewed";
import { RelatedProducts } from "./related-products";
import { StarDisplay } from "./star-display";
import { StockBadge } from "./stock-badge";

export interface ProductDetailProps {
	slug?: string;
	params?: Record<string, string>;
}

export function ProductDetail(props: ProductDetailProps) {
	const slug = props.slug ?? props.params?.slug;
	const api = useProductsApi();
	const cartApi = useCartMutation();
	const reviewsApi = useReviewsApi();
	const track = useTrack();
	// biome-ignore lint/suspicious/noExplicitAny: store context shape varies per app
	const store = useStoreContext<{ cart: any }>();

	const { data, isLoading } = api.getProduct.useQuery(
		{ params: { id: slug ?? "" } },
		{ enabled: !!slug },
	) as {
		data: { product: ProductWithVariants } | undefined;
		isLoading: boolean;
	};

	const product = data?.product ?? null;

	const { data: reviewsSummaryData } = reviewsApi.listProductReviews.useQuery(
		product
			? {
					params: { productId: product.id },
					take: "1",
				}
			: undefined,
	) as { data: ReviewsResponse | undefined };
	const reviewSummary = reviewsSummaryData?.summary;

	const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
		null,
	);
	const [selectedImage, setSelectedImage] = useState(0);
	const [qty, setQty] = useState(1);
	const [added, setAdded] = useState(false);

	const trackedRef = useRef<string | null>(null);
	useEffect(() => {
		if (product && trackedRef.current !== product.id) {
			trackedRef.current = product.id;
			track({
				type: "productView",
				productId: product.id,
				data: {
					name: product.name,
					slug: product.slug,
					price: product.price,
					image: product.images[0],
				},
			});
		}
	}, [product, track]);

	const firstVariant = product?.variants?.[0] ?? null;
	useEffect(() => {
		if (product && firstVariant) {
			setSelectedVariant(firstVariant);
		}
	}, [product?.id]);

	const addToCartMutation = cartApi.addToCart.useMutation({
		onSuccess: () => {
			void cartApi.getCart.invalidate();
			store.cart.openDrawer();
			setAdded(true);
			setTimeout(() => setAdded(false), 2000);
			if (product) {
				track({
					type: "addToCart",
					productId: product.id,
					value: selectedVariant?.price ?? product.price,
					data: {
						name: product.name,
						quantity: qty,
						variantId: selectedVariant?.id,
					},
				});
			}
		},
	});

	if (!slug) {
		return (
			<div className="rounded-md border border-border bg-muted/30 p-4 text-muted-foreground">
				<p className="font-medium">Product not found</p>
				<p className="mt-1 text-sm">No product was specified.</p>
				<a href="/products" className="mt-3 inline-block text-sm underline">
					Back to products
				</a>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="py-6">
				<div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
					<div className="aspect-square animate-pulse rounded-lg bg-muted" />
					<div className="space-y-4 py-2">
						<div className="h-3 w-20 animate-pulse rounded bg-muted" />
						<div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
						<div className="h-6 w-24 animate-pulse rounded bg-muted" />
						<div className="h-20 animate-pulse rounded bg-muted" />
					</div>
				</div>
			</div>
		);
	}

	if (!product) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<p className="font-medium text-foreground text-sm">Product not found</p>
				<a
					href="/products"
					className="mt-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					Back to products
				</a>
			</div>
		);
	}

	const optionKeys: string[] = [];
	const optionValues: Record<string, string[]> = {};
	for (const v of product.variants) {
		for (const [key, value] of Object.entries(v.options)) {
			if (!optionValues[key]) {
				optionKeys.push(key);
				optionValues[key] = [];
			}
			if (!optionValues[key].includes(value)) {
				optionValues[key].push(value);
			}
		}
	}

	const selectedOptions: Record<string, string> = {};
	if (selectedVariant) {
		for (const [key, value] of Object.entries(selectedVariant.options)) {
			selectedOptions[key] = value;
		}
	}

	const handleOptionChange = (key: string, value: string) => {
		const newOptions = { ...selectedOptions, [key]: value };
		const match = product.variants.find((v) =>
			Object.entries(newOptions).every(([k, val]) => v.options[k] === val),
		);
		if (match) {
			setSelectedVariant(match);
		}
	};

	const displayPrice = selectedVariant?.price ?? product.price;
	const comparePrice =
		selectedVariant?.compareAtPrice ?? product.compareAtPrice;
	const hasDiscount = comparePrice != null && comparePrice > displayPrice;
	const inStock = (selectedVariant?.inventory ?? product.inventory) > 0;

	const handleAddToCart = () => {
		addToCartMutation.mutate({
			productId: product.id,
			variantId: selectedVariant?.id ?? undefined,
			quantity: qty,
			price: displayPrice,
			productName: product.name,
			productSlug: product.slug,
			productImage: product.images[0],
			variantName: selectedVariant?.name,
			variantOptions: selectedVariant?.options,
		});
	};

	// --- Pre-computed JSX blocks for template ---

	const breadcrumbs = (
		<nav className="mb-6 flex items-center gap-1.5 text-muted-foreground text-xs">
			<a href="/" className="transition-colors hover:text-foreground">
				Home
			</a>
			<span className="text-border">/</span>
			<a href="/products" className="transition-colors hover:text-foreground">
				Products
			</a>
			<span className="text-border">/</span>
			<span className="truncate text-foreground">{product.name}</span>
		</nav>
	);

	const imageGallery = (
		<div className="space-y-2.5">
			<div className="aspect-square overflow-hidden rounded-lg bg-muted">
				{product.images[selectedImage] ? (
					<img
						src={product.images[selectedImage]}
						alt={product.name}
						className="h-full w-full object-cover object-center"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="40"
							height="40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<rect width="18" height="18" x="3" y="3" rx="2" />
							<circle cx="9" cy="9" r="2" />
							<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
						</svg>
					</div>
				)}
			</div>
			{product.images.length > 1 && (
				<div className="flex gap-1.5">
					{product.images.map((img, i) => (
						<button
							key={i}
							type="button"
							onClick={() => setSelectedImage(i)}
							className={`h-14 w-14 overflow-hidden rounded-md transition-all ${
								i === selectedImage
									? "ring-1.5 ring-foreground ring-offset-1 ring-offset-background"
									: "opacity-50 hover:opacity-80"
							}`}
						>
							<img
								src={img}
								alt={`${product.name} view ${i + 1}`}
								className="h-full w-full object-cover"
							/>
						</button>
					))}
				</div>
			)}
		</div>
	);

	const categoryLink = product.category ? (
		<a
			href={`/products?category=${product.category.id}`}
			className="w-fit text-muted-foreground text-xs transition-colors hover:text-foreground"
		>
			{product.category.name}
		</a>
	) : null;

	const reviewSummaryLink =
		reviewSummary && reviewSummary.count > 0 ? (
			<a
				href="#reviews"
				className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
			>
				<StarDisplay rating={reviewSummary.average} size="sm" />
				<span className="text-muted-foreground text-sm">
					{reviewSummary.average.toFixed(1)} ({reviewSummary.count})
				</span>
			</a>
		) : null;

	const priceBlock = (
		<div className="flex items-center gap-2.5">
			<span className="font-display text-foreground text-xl tabular-nums sm:text-2xl">
				{formatPrice(displayPrice)}
			</span>
			{hasDiscount && (
				<>
					<span className="text-muted-foreground text-sm tabular-nums line-through">
						{formatPrice(comparePrice as number)}
					</span>
					<span className="rounded-full bg-foreground px-2 py-0.5 font-medium text-2xs text-background tabular-nums">
						−{Math.round((1 - displayPrice / (comparePrice as number)) * 100)}%
					</span>
				</>
			)}
		</div>
	);

	const stockBadge = (
		<StockBadge inventory={selectedVariant?.inventory ?? product.inventory} />
	);

	const shortDescription = product.shortDescription ? (
		<p className="text-muted-foreground text-sm leading-relaxed">
			{product.shortDescription}
		</p>
	) : null;

	let variantSelector: React.ReactNode = null;
	if (product.variants.length > 0 && optionKeys.length > 0) {
		variantSelector = (
			<div className="space-y-3.5">
				{optionKeys.map((key) => (
					<div key={key} className="space-y-1.5">
						<p className="text-foreground text-xs">
							{key}
							{selectedOptions[key] && (
								<span className="ml-1.5 text-muted-foreground">
									{selectedOptions[key]}
								</span>
							)}
						</p>
						<div className="flex flex-wrap gap-1.5">
							{(optionValues[key] ?? []).map((value) => {
								const isSelected = selectedOptions[key] === value;
								const wouldMatch = product.variants.some(
									(v) =>
										v.options[key] === value &&
										Object.entries(selectedOptions).every(
											([k, val]) => k === key || v.options[k] === val,
										),
								);
								return (
									<button
										key={value}
										type="button"
										onClick={() => handleOptionChange(key, value)}
										disabled={!wouldMatch}
										className={`rounded-md border px-3 py-1.5 text-sm transition-all ${
											isSelected
												? "border-foreground bg-foreground text-background"
												: wouldMatch
													? "border-border text-foreground hover:border-foreground/40"
													: "border-border/40 text-muted-foreground/30 line-through"
										}`}
									>
										{value}
									</button>
								);
							})}
						</div>
					</div>
				))}
			</div>
		);
	} else if (product.variants.length > 0 && optionKeys.length === 0) {
		variantSelector = (
			<div className="space-y-1.5">
				<p className="text-foreground text-xs">
					{selectedVariant ? selectedVariant.name : "Select option"}
				</p>
				<div className="flex flex-wrap gap-1.5">
					{product.variants.map((v) => (
						<button
							key={v.id}
							type="button"
							onClick={() => setSelectedVariant(v)}
							className={`rounded-md border px-3 py-1.5 text-sm transition-all ${
								selectedVariant?.id === v.id
									? "border-foreground bg-foreground text-background"
									: "border-border text-foreground hover:border-foreground/40"
							}`}
						>
							{v.name}
						</button>
					))}
				</div>
			</div>
		);
	}

	const addToCartBlock = (
		<div className="mt-1 flex items-center gap-2.5">
			<div className="flex items-center rounded-md border border-border">
				<button
					type="button"
					onClick={() => setQty((q) => Math.max(1, q - 1))}
					className="flex h-10 w-10 items-center justify-center text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					−
				</button>
				<span className="min-w-8 text-center text-foreground text-sm tabular-nums">
					{qty}
				</span>
				<button
					type="button"
					onClick={() => setQty((q) => q + 1)}
					className="flex h-10 w-10 items-center justify-center text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					+
				</button>
			</div>
			<button
				type="button"
				onClick={handleAddToCart}
				disabled={addToCartMutation.isPending || !inStock}
				className="flex-1 rounded-md bg-foreground py-2.5 font-medium text-background text-sm transition-opacity hover:opacity-85 active:opacity-75 disabled:opacity-40"
			>
				{!inStock
					? "Sold out"
					: added
						? "Added!"
						: addToCartMutation.isPending
							? "Adding…"
							: "Add to cart"}
			</button>
		</div>
	);

	const outOfStockNotice = !inStock ? (
		<BackInStockNotify
			productId={product.id}
			variantId={selectedVariant?.id}
			productName={product.name}
		/>
	) : null;

	const descriptionBlock = product.description ? (
		<div className="mt-2 border-border/50 border-t pt-5">
			<p className="mb-2 font-medium text-foreground text-xs">Description</p>
			<p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
				{product.description}
			</p>
		</div>
	) : null;

	const tagsBlock =
		product.tags.length > 0 ? (
			<div className="flex flex-wrap gap-1">
				{product.tags.map((t) => (
					<a
						key={t}
						href={`/products?tag=${encodeURIComponent(t)}`}
						className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
					>
						{t}
					</a>
				))}
			</div>
		) : null;

	return (
		<ProductDetailTemplate
			breadcrumbs={breadcrumbs}
			imageGallery={imageGallery}
			categoryLink={categoryLink}
			name={product.name}
			reviewSummaryLink={reviewSummaryLink}
			priceBlock={priceBlock}
			stockBadge={stockBadge}
			shortDescription={shortDescription}
			variantSelector={variantSelector}
			addToCartBlock={addToCartBlock}
			outOfStockNotice={outOfStockNotice}
			descriptionBlock={descriptionBlock}
			tagsBlock={tagsBlock}
			reviewsSection={<ProductReviewsSection productId={product.id} />}
			relatedProducts={<RelatedProducts productId={product.id} />}
			recentlyViewed={<RecentlyViewedProducts excludeProductId={product.id} />}
		/>
	);
}
