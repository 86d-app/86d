"use client";

import { useState } from "react";
import { useAppointmentsStoreApi } from "./_hooks";
import {
	extractError,
	formatCurrency,
	formatDateTime,
	STATUS_COLORS,
	STATUS_LABELS,
} from "./_utils";
import MyAppointmentsTemplate from "./my-appointments.mdx";

// ── Types ────────────────────────────────────────────────────────────────────

interface Appointment {
	id: string;
	serviceId: string;
	staffId: string;
	customerName: string;
	customerEmail: string;
	startsAt: string;
	endsAt: string;
	status: string;
	notes?: string | undefined;
	price: number;
	currency: string;
}

// ── MyAppointments ───────────────────────────────────────────────────────────

export function MyAppointments({ appointmentId }: { appointmentId?: string }) {
	const api = useAppointmentsStoreApi();

	const [cancelError, setCancelError] = useState<string | null>(null);
	const [cancelledId, setCancelledId] = useState<string | null>(null);

	const query = api.getAppointment.useQuery(
		{ params: { id: appointmentId ?? "" } },
		{ enabled: Boolean(appointmentId) },
	) as {
		data: { appointment?: Appointment; error?: string } | undefined;
		isLoading: boolean;
		error: Error | null;
	};

	const cancelMutation = api.cancel.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, never>;
		}) => Promise<{ appointment?: Appointment; error?: string }>;
		isPending: boolean;
	};

	const appointment = query.data?.appointment ?? null;
	const isCancellable =
		appointment &&
		(appointment.status === "pending" || appointment.status === "confirmed");

	async function handleCancel() {
		if (!appointment) return;
		setCancelError(null);
		try {
			const result = await cancelMutation.mutateAsync({
				params: { id: appointment.id },
				body: {},
			});
			if (result.appointment) {
				setCancelledId(result.appointment.id);
			} else {
				setCancelError(result.error ?? "Could not cancel appointment.");
			}
		} catch (err) {
			setCancelError(extractError(err, "Could not cancel appointment."));
		}
	}

	const isCancelled =
		cancelledId === appointment?.id || appointment?.status === "cancelled";

	return (
		<MyAppointmentsTemplate
			isLoading={query.isLoading}
			appointment={appointment}
			fetchError={
				query.error
					? extractError(query.error, "Failed to load appointment")
					: (query.data?.error ?? null)
			}
			isCancellable={Boolean(isCancellable) && !isCancelled}
			isCancelling={cancelMutation.isPending}
			cancelError={cancelError}
			isCancelled={isCancelled}
			onCancel={handleCancel}
			formatDateTime={formatDateTime}
			formatCurrency={formatCurrency}
			statusColors={STATUS_COLORS}
			statusLabels={STATUS_LABELS}
			appointmentId={appointmentId}
		/>
	);
}
