import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

const variantStyles: Record<StatusVariant, string> = {
	success: "bg-status-success-bg text-status-success",
	warning: "bg-status-warning-bg text-status-warning",
	danger: "bg-status-danger-bg text-status-danger",
	info: "bg-status-info-bg text-status-info",
	neutral: "bg-secondary text-secondary-foreground",
};

const defaultStatusMap: Record<string, StatusVariant> = {
	// Success
	completed: "success",
	paid: "success",
	approved: "success",
	active: "success",
	delivered: "success",
	// Warning
	pending: "warning",
	past_due: "warning",
	partially_paid: "warning",
	on_hold: "warning",
	limit_reached: "warning",
	requested: "warning",
	paused: "warning",
	expired: "warning",
	// Danger
	cancelled: "danger",
	rejected: "danger",
	revoked: "danger",
	unpaid: "danger",
	voided: "danger",
	failed: "danger",
	// Info
	processing: "info",
	trialing: "info",
	shipped: "info",
	in_transit: "info",
	shipped_back: "info",
	received: "info",
	refunded: "info",
};

function StatusBadge({
	status,
	label,
	variant: overrideVariant,
	className,
}: {
	status: string;
	label?: string;
	variant?: StatusVariant;
	className?: string;
}) {
	const variant = overrideVariant ?? defaultStatusMap[status] ?? "neutral";
	return (
		<Badge
			variant="secondary"
			className={cn(variantStyles[variant], className)}
		>
			{label ?? status.replace(/_/g, " ")}
		</Badge>
	);
}

export { StatusBadge, type StatusVariant };
