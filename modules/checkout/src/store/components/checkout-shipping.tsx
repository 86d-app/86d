"use client";

import { observer } from "@86d-app/core/state";
import { type FormEvent, useState } from "react";
import type { CheckoutAddress } from "../../service";
import { checkoutState } from "../../state";
import { useCheckoutApi } from "./_hooks";
import CheckoutShippingTemplate from "./checkout-shipping.mdx";

const emptyAddress: CheckoutAddress = {
	firstName: "",
	lastName: "",
	line1: "",
	city: "",
	state: "",
	postalCode: "",
	country: "US",
};

/** Step 2: Collect shipping address. */
export const CheckoutShipping = observer(() => {
	const api = useCheckoutApi();
	const sessionId = checkoutState.sessionId;

	const { data } = api.getSession.useQuery(
		sessionId ? { params: { id: sessionId } } : undefined,
		{ enabled: !!sessionId },
	) as {
		data: { session: { shippingAddress?: CheckoutAddress | null } } | undefined;
	};

	const initial = data?.session?.shippingAddress ?? emptyAddress;
	const [address, setAddress] = useState<CheckoutAddress>(initial);
	const [error, setError] = useState("");

	const updateMutation = api.updateSession.useMutation({
		onSuccess: () => {
			checkoutState.setStep("payment");
		},
		onError: () => {
			setError("Failed to save shipping address. Please try again.");
		},
	});

	const updateField = (field: keyof CheckoutAddress, value: string) => {
		setAddress((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		setError("");

		if (
			!address.firstName.trim() ||
			!address.lastName.trim() ||
			!address.line1.trim() ||
			!address.city.trim() ||
			!address.state.trim() ||
			!address.postalCode.trim() ||
			!address.country.trim()
		) {
			setError("Please fill in all required fields.");
			return;
		}

		if (!sessionId) {
			setError("No checkout session found.");
			return;
		}

		updateMutation.mutate({
			params: { id: sessionId },
			shippingAddress: {
				firstName: address.firstName.trim(),
				lastName: address.lastName.trim(),
				company: address.company?.trim() || undefined,
				line1: address.line1.trim(),
				line2: address.line2?.trim() || undefined,
				city: address.city.trim(),
				state: address.state.trim(),
				postalCode: address.postalCode.trim(),
				country: address.country.trim(),
				phone: address.phone?.trim() || undefined,
			},
		});
	};

	const handleBack = () => {
		checkoutState.setStep("information");
	};

	return (
		<CheckoutShippingTemplate
			address={address}
			error={error}
			loading={updateMutation.isPending}
			onFieldChange={updateField}
			onSubmit={handleSubmit}
			onBack={handleBack}
		/>
	);
});
