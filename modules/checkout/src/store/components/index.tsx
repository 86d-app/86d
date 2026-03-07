"use client";

import type { MDXComponents } from "mdx/types";
import { CheckoutForm } from "./checkout-form";
import { CheckoutInformation } from "./checkout-information";
import { CheckoutPayment } from "./checkout-payment";
import { CheckoutReview } from "./checkout-review";
import { CheckoutShipping } from "./checkout-shipping";
import { CheckoutSummary } from "./checkout-summary";

export default {
	CheckoutForm,
	CheckoutInformation,
	CheckoutShipping,
	CheckoutPayment,
	CheckoutReview,
	CheckoutSummary,
} satisfies MDXComponents;
