"use client";

import { useModuleClient } from "@86d-app/core/client";
import InvoiceDetailTemplate from "./invoice-detail.mdx";

interface InvoiceDetail {
	id: string;
	invoiceNumber: string;
	customerName?: string;
	guestEmail?: string;
	status: string;
	paymentTerms: string;
	issuedAt?: string;
	dueDate?: string;
	subtotal: number;
	taxAmount: number;
	shippingAmount: number;
	discountAmount: number;
	total: number;
	amountPaid: number;
	amountDue: number;
	currency: string;
	notes?: string;
	lineItems: Array<{
		id: string;
		description: string;
		quantity: number;
		unitPrice: number;
		amount: number;
		sku?: string;
	}>;
	payments: Array<{
		id: string;
		amount: number;
		method: string;
		reference?: string;
		paidAt: string;
	}>;
	creditNotes: Array<{
		id: string;
		creditNoteNumber: string;
		status: string;
		amount: number;
	}>;
	createdAt: string;
}

function useInvoiceDetailApi() {
	const client = useModuleClient();
	return {
		getInvoice: client.module("invoices").admin["/admin/invoices/:id"],
	};
}

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
	const api = useInvoiceDetailApi();

	const { data, isLoading: loading } = api.getInvoice.useQuery({
		id: invoiceId,
	}) as {
		data: { invoice: InvoiceDetail } | undefined;
		isLoading: boolean;
	};

	const invoice = data?.invoice;

	return <InvoiceDetailTemplate invoice={invoice} loading={loading} />;
}
