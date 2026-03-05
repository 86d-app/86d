"use client";

import type { MDXComponents } from "mdx/types";
import { DistributionBars } from "./distribution-bars";
import { ProductReviews } from "./product-reviews";
import { ReviewCard } from "./review-card";
import { ReviewForm } from "./review-form";
import { ReviewsSummary } from "./reviews-summary";
import { StarDisplay } from "./star-display";
import { StarPicker } from "./star-picker";

export default {
	ReviewsSummary,
	ProductReviews,
	StarDisplay,
	StarPicker,
	ReviewCard,
	ReviewForm,
	DistributionBars,
} satisfies MDXComponents;
