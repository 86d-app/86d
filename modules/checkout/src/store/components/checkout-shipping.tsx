"use client";

import { observer } from "@86d-app/core/state";
import { type FormEvent, useEffect, useState } from "react";
import type { CheckoutAddress } from "../../service";
import { checkoutState } from "../../state";
import { useCheckoutApi } from "./_hooks";
import { formatPrice } from "./_utils";
import CheckoutShippingTemplate from "./checkout-shipping.mdx";

interface ShippingRate {
	id: string;
	name: string;
	zoneName: string;
	price: number;
}

const emptyAddress: CheckoutAddress = {
	firstName: "",
	lastName: "",
	line1: "",
	city: "",
	state: "",
	postalCode: "",
	country: "US",
};

/** Step 2: Collect shipping address and select shipping method. */
export const CheckoutShipping = observer(() => {
	const api = useCheckoutApi();
	const sessionId = checkoutState.sessionId;

	const { data } = api.getSession.useQuery(
		sessionId ? { params: { id: sessionId } } : undefined,
		{ enabled: !!sessionId },
	) as {
		data:
			| {
					session: {
						shippingAddress?: CheckoutAddress | null;
						shippingAmount?: number;
						shippingMethodName?: string | null;
					};
			  }
			| undefined;
	};

	const initial = data?.session?.shippingAddress ?? emptyAddress;
	const [address, setAddress] = useState<CheckoutAddress>(initial);
	const [error, setError] = useState("");

	// Shipping rate selection state
	const [phase, setPhase] = useState<"address" | "rates">("address");
	const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
	const [ratesError, setRatesError] = useState("");

	// If session already has a shipping address, start on rates phase
	useEffect(() => {
		if (data?.session?.shippingAddress) {
			setAddress(data.session.shippingAddress);
			setPhase("rates");
		}
	}, [data?.session?.shippingAddress]);

	// Fetch shipping rates when in rates phase
	const {
		data: ratesData,
		isLoading: loadingRates,
		isError: ratesFetchError,
	} = api.getShippingRates.useQuery(
		sessionId ? { params: { id: sessionId } } : undefined,
		{ enabled: !!sessionId && phase === "rates" },
	) as {
		data: { rates: ShippingRate[] } | undefined;
		isLoading: boolean;
		isError: boolean;
	};

	const rates = ratesData?.rates ?? [];

	// Pre-select first rate or previously selected rate when rates load
	useEffect(() => {
		if (rates.length > 0 && selectedRateId === null) {
			const previousName = data?.session?.shippingMethodName;
			const match = previousName
				? rates.find((r) => r.name === previousName)
				: null;
			setSelectedRateId(match?.id ?? rates[0].id);
		}
	}, [rates, selectedRateId, data?.session?.shippingMethodName]);

	useEffect(() => {
		if (ratesFetchError) {
			setRatesError("Could not load shipping rates. Please try again.");
		}
	}, [ratesFetchError]);

	const updateMutation = api.updateSession.useMutation({
		onError: () => {
			setError("Failed to save shipping address. Please try again.");
		},
	});

	const selectMethodMutation = api.updateSession.useMutation({
		onSuccess: () => {
			checkoutState.setStep("payment");
		},
		onError: () => {
			setRatesError("Failed to save shipping method. Please try again.");
		},
	});

	const updateField = (field: keyof CheckoutAddress, value: string) => {
		setAddress((prev) => ({ ...prev, [field]: value }));
	};

	const handleAddressSubmit = (e: FormEvent) => {
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

		updateMutation.mutate(
			{
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
			},
			{
				onSuccess: () => {
					setSelectedRateId(null);
					setPhase("rates");
				},
			},
		);
	};

	const handleRateSelect = (rateId: string) => {
		setSelectedRateId(rateId);
	};

	const handleRateSubmit = (e: FormEvent) => {
		e.preventDefault();
		setRatesError("");

		if (!sessionId) return;

		// If no rates available (shipping module not installed), proceed with $0 shipping
		if (rates.length === 0) {
			selectMethodMutation.mutate({
				params: { id: sessionId },
				shippingAmount: 0,
				shippingMethodName: "Free Shipping",
			});
			return;
		}

		const selected = rates.find((r) => r.id === selectedRateId);
		if (!selected) {
			setRatesError("Please select a shipping method.");
			return;
		}

		selectMethodMutation.mutate({
			params: { id: sessionId },
			shippingAmount: selected.price,
			shippingMethodName: selected.name,
		});
	};

	const handleBack = () => {
		if (phase === "rates") {
			setPhase("address");
		} else {
			checkoutState.setStep("information");
		}
	};

	return (
		<CheckoutShippingTemplate
			phase={phase}
			address={address}
			error={error}
			loading={updateMutation.isPending}
			rates={rates}
			selectedRateId={selectedRateId}
			loadingRates={loadingRates}
			ratesError={ratesError}
			selectingRate={selectMethodMutation.isPending}
			formatPrice={formatPrice}
			onFieldChange={updateField}
			onSubmit={phase === "address" ? handleAddressSubmit : handleRateSubmit}
			onRateSelect={handleRateSelect}
			onBack={handleBack}
			onEditAddress={() => setPhase("address")}
		/>
	);
});
