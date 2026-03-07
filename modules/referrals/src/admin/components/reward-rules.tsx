"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import RewardRulesTemplate from "./reward-rules.mdx";

interface RewardRule {
	id: string;
	name: string;
	referrerRewardType: string;
	referrerRewardValue: number;
	refereeRewardType: string;
	refereeRewardValue: number;
	minOrderAmount: number;
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

function formatReward(type: string, value: number): string {
	if (type === "percentage_discount") return `${value}% off`;
	if (type === "fixed_discount") return `$${value.toFixed(2)} off`;
	return `$${value.toFixed(2)} credit`;
}

function useRewardRulesApi() {
	const client = useModuleClient();
	return {
		list: client.module("referrals").admin["/admin/referrals/rules"],
		create: client.module("referrals").admin["/admin/referrals/rules/create"],
		update:
			client.module("referrals").admin["/admin/referrals/rules/:id/update"],
		delete:
			client.module("referrals").admin["/admin/referrals/rules/:id/delete"],
	};
}

export function RewardRules() {
	const api = useRewardRulesApi();
	const [showForm, setShowForm] = useState(false);
	const [name, setName] = useState("");
	const [referrerType, setReferrerType] = useState("percentage_discount");
	const [referrerValue, setReferrerValue] = useState("10");
	const [refereeType, setRefereeType] = useState("percentage_discount");
	const [refereeValue, setRefereeValue] = useState("10");
	const [minOrderAmount, setMinOrderAmount] = useState("0");

	const { data, isLoading: loading } = api.list.useQuery({}) as {
		data: { rules: RewardRule[] } | undefined;
		isLoading: boolean;
	};

	const createMutation = api.create.useMutation({
		onSuccess: () => {
			void api.list.invalidate();
			setShowForm(false);
			setName("");
			setReferrerValue("10");
			setRefereeValue("10");
			setMinOrderAmount("0");
		},
	});

	const deleteMutation = api.delete.useMutation({
		onSuccess: () => void api.list.invalidate(),
	});

	const toggleMutation = api.update.useMutation({
		onSuccess: () => void api.list.invalidate(),
	});

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		createMutation.mutate({
			name,
			referrerRewardType: referrerType,
			referrerRewardValue: Number.parseFloat(referrerValue),
			refereeRewardType: refereeType,
			refereeRewardValue: Number.parseFloat(refereeValue),
			minOrderAmount: Number.parseFloat(minOrderAmount),
		});
	};

	const rules = data?.rules ?? [];

	return (
		<RewardRulesTemplate
			rules={rules}
			loading={loading}
			showForm={showForm}
			onToggleForm={() => setShowForm(!showForm)}
			name={name}
			onNameChange={setName}
			referrerType={referrerType}
			onReferrerTypeChange={setReferrerType}
			referrerValue={referrerValue}
			onReferrerValueChange={setReferrerValue}
			refereeType={refereeType}
			onRefereeTypeChange={setRefereeType}
			refereeValue={refereeValue}
			onRefereeValueChange={setRefereeValue}
			minOrderAmount={minOrderAmount}
			onMinOrderAmountChange={setMinOrderAmount}
			onSubmit={handleCreate}
			isCreating={createMutation.isPending}
			formatReward={formatReward}
			onDelete={(id: string) => deleteMutation.mutate({ id })}
			onToggleActive={(id: string, active: boolean) =>
				toggleMutation.mutate({ id, active })
			}
		/>
	);
}
