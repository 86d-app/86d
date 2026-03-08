"use client";

import { useState } from "react";
import { useFaqApi } from "./_hooks";
import FaqAccordionTemplate from "./faq-accordion.mdx";

export function FaqAccordion({
	categorySlug,
	title,
}: {
	categorySlug?: string | undefined;
	title?: string | undefined;
}) {
	const api = useFaqApi();
	const [openId, setOpenId] = useState<string | null>(null);

	const { data: catData, isLoading: catLoading } = api.listCategories.useQuery(
		{},
	) as {
		data:
			| {
					categories: Array<{
						id: string;
						name: string;
						slug: string;
						description?: string;
						icon?: string;
					}>;
			  }
			| undefined;
		isLoading: boolean;
	};

	const { data: itemData, isLoading: itemLoading } = categorySlug
		? (api.getCategory.useQuery({ slug: categorySlug }) as {
				data:
					| {
							category: {
								id: string;
								name: string;
								slug: string;
								description?: string;
							};
							items: Array<{
								id: string;
								question: string;
								answer: string;
								slug: string;
								helpfulCount: number;
								notHelpfulCount: number;
							}>;
					  }
					| undefined;
				isLoading: boolean;
			})
		: { data: undefined, isLoading: false };

	const voteMutation = api.vote.useMutation({
		onSettled: () => {
			if (categorySlug) {
				void api.getCategory.invalidate();
			}
		},
	});

	const handleToggle = (id: string) => {
		setOpenId((prev) => (prev === id ? null : id));
	};

	const handleVote = (itemId: string, helpful: boolean) => {
		voteMutation.mutate({ id: itemId, helpful });
	};

	if (catLoading || itemLoading) return null;

	const categories = catData?.categories ?? [];
	const items = itemData?.items ?? [];
	const categoryName = itemData?.category?.name ?? title ?? "FAQ";

	return (
		<FaqAccordionTemplate
			title={categoryName}
			categories={categories}
			items={items}
			categorySlug={categorySlug}
			openId={openId}
			onToggle={handleToggle}
			onVote={handleVote}
			votePending={voteMutation.isPending}
		/>
	);
}
