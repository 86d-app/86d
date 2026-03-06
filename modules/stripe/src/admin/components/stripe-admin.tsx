"use client";

import { useModuleClient } from "@86d-app/core/client";
import StripeAdminTemplate from "./stripe-admin.mdx";

interface StripeSettings {
	configured: boolean;
	apiKeyMasked: string | null;
	apiKeyMode: "live" | "test" | "unknown";
	webhookSecretConfigured: boolean;
	webhookSecretMasked: string | null;
}

function useStripeAdminApi() {
	const client = useModuleClient();
	return {
		getSettings: client.module("stripe").admin["/admin/stripe/settings"],
	};
}

const MODE_COLORS: Record<string, string> = {
	live: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	test: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	unknown: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

function SettingsCard({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border border-border bg-card p-5">
			<h3 className="mb-3 font-semibold text-foreground text-sm">{label}</h3>
			{children}
		</div>
	);
}

function StatusRow({
	label,
	value,
	mono,
	badge,
	badgeClass,
}: {
	label: string;
	value: string;
	mono?: boolean;
	badge?: string;
	badgeClass?: string;
}) {
	return (
		<div className="flex items-center justify-between py-2">
			<span className="text-muted-foreground text-sm">{label}</span>
			<div className="flex items-center gap-2">
				{badge && (
					<span
						className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${badgeClass ?? "bg-muted text-muted-foreground"}`}
					>
						{badge}
					</span>
				)}
				<span
					className={`text-foreground text-sm ${mono ? "font-mono text-xs" : ""}`}
				>
					{value}
				</span>
			</div>
		</div>
	);
}

export function StripeAdmin() {
	const api = useStripeAdminApi();
	const { data, isLoading } = api.getSettings.useQuery({}) as {
		data: StripeSettings | undefined;
		isLoading: boolean;
	};

	if (isLoading) {
		return (
			<StripeAdminTemplate
				content={
					<div className="space-y-4">
						{Array.from({ length: 2 }).map((_, i) => (
							<div
								key={`skeleton-${i}`}
								className="h-40 animate-pulse rounded-lg border border-border bg-muted/30"
							/>
						))}
					</div>
				}
			/>
		);
	}

	const settings = data;

	return (
		<StripeAdminTemplate
			content={
				<div className="space-y-4">
					<SettingsCard label="Connection">
						<div className="divide-y divide-border">
							<StatusRow
								label="Status"
								value={settings?.configured ? "Connected" : "Not configured"}
								badge={settings?.configured ? "active" : "inactive"}
								badgeClass={
									settings?.configured
										? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
										: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
								}
							/>
							{settings?.apiKeyMasked && (
								<StatusRow
									label="API key"
									value={settings.apiKeyMasked}
									mono
									badge={settings.apiKeyMode}
									badgeClass={MODE_COLORS[settings.apiKeyMode]}
								/>
							)}
						</div>

						{!settings?.configured && (
							<div className="mt-3 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
								Add your Stripe secret key to the module configuration to enable
								payment processing.
							</div>
						)}
					</SettingsCard>

					<SettingsCard label="Webhooks">
						<div className="divide-y divide-border">
							<StatusRow
								label="Signature verification"
								value={
									settings?.webhookSecretConfigured ? "Enabled" : "Disabled"
								}
								badge={
									settings?.webhookSecretConfigured ? "secure" : "unverified"
								}
								badgeClass={
									settings?.webhookSecretConfigured
										? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
										: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
								}
							/>
							{settings?.webhookSecretMasked && (
								<StatusRow
									label="Signing secret"
									value={settings.webhookSecretMasked}
									mono
								/>
							)}
							<StatusRow
								label="Endpoint path"
								value="/api/store/stripe/webhook"
								mono
							/>
						</div>

						{!settings?.webhookSecretConfigured && (
							<div className="mt-3 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
								Configure a webhook signing secret to verify incoming Stripe
								events. Without it, all requests to the webhook endpoint are
								accepted.
							</div>
						)}
					</SettingsCard>

					<SettingsCard label="Supported Events">
						<div className="flex flex-wrap gap-2">
							{[
								"payment_intent.succeeded",
								"payment_intent.payment_failed",
								"payment_intent.canceled",
								"charge.succeeded",
								"charge.failed",
								"charge.refunded",
								"charge.dispute.funds_withdrawn",
							].map((event) => (
								<span
									key={event}
									className="rounded-md bg-muted px-2 py-1 font-mono text-muted-foreground text-xs"
								>
									{event}
								</span>
							))}
						</div>
					</SettingsCard>
				</div>
			}
		/>
	);
}
