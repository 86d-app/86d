"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useCallback, useState } from "react";
import InvoiceListTemplate from "./invoice-list.mdx";

interface InvoiceItem {
	id: string;
	invoiceNumber: string;
	customerName?: string;
	guestEmail?: string;
	status: string;
	total: number;
	amountDue: number;
	currency: string;
	dueDate?: string;
	createdAt: string;
}

function useInvoicesApi() {
	const client = useModuleClient();
	return {
		list: client.module("invoices").admin["/admin/invoices"],
		deleteInvoice:
			client.module("invoices").admin["/admin/invoices/:id/delete"],
		bulkAction: client.module("invoices").admin["/admin/invoices/bulk"],
	};
}

export function InvoiceList() {
	const api = useInvoicesApi();
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("");

	const queryInput: Record<string, string | number> = {
		page,
		limit: 20,
	};
	if (search) queryInput.search = search;
	if (status) queryInput.status = status;

	const {
		data,
		isLoading: loading,
		refetch,
	} = api.list.useQuery(queryInput) as {
		data: { invoices: InvoiceItem[]; total: number; pages: number } | undefined;
		isLoading: boolean;
		refetch: () => void;
	};

	const handleDelete = useCallback(
		async (id: string) => {
			if (!confirm("Delete this invoice?")) return;
			await (
				api.deleteInvoice as {
					useMutation: () => {
						mutateAsync: (p: { id: string }) => Promise<void>;
					};
				}
			)
				.useMutation()
				.mutateAsync({ id });
			refetch();
		},
		[api.deleteInvoice, refetch],
	);

	return (
		<InvoiceListTemplate
			invoices={data?.invoices ?? []}
			total={data?.total ?? 0}
			pages={data?.pages ?? 1}
			page={page}
			loading={loading}
			search={search}
			status={status}
			onPageChange={setPage}
			onSearchChange={setSearch}
			onStatusChange={setStatus}
			onDelete={handleDelete}
		/>
	);
}
