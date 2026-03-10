"use client";

import { useModuleClient } from "@86d-app/core/client";
import OverdueListTemplate from "./overdue-list.mdx";

interface OverdueInvoice {
	id: string;
	invoiceNumber: string;
	customerName?: string;
	guestEmail?: string;
	total: number;
	amountDue: number;
	currency: string;
	dueDate?: string;
}

function useOverdueApi() {
	const client = useModuleClient();
	return {
		overdue: client.module("invoices").admin["/admin/invoices/overdue"],
	};
}

export function OverdueList() {
	const api = useOverdueApi();

	const { data, isLoading: loading } = api.overdue.useQuery({}) as {
		data: { invoices: OverdueInvoice[]; total: number } | undefined;
		isLoading: boolean;
	};

	return (
		<OverdueListTemplate
			invoices={data?.invoices ?? []}
			total={data?.total ?? 0}
			loading={loading}
		/>
	);
}
