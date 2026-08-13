import type { JsonValue } from "./commands";

/** Provider operations that may be granted to one immutable Payment Connection. */
export type PaymentConnectionCapability =
	| "intent"
	| "authorization"
	| "capture"
	| "refund"
	| "void";

export type PaymentConnectionMode = "test" | "live";

export type PaymentOperationPayload =
	| Readonly<{
			operation: "intent";
			amount: number;
			currency: string;
			metadata?: JsonValue | undefined;
	  }>
	| Readonly<{
			operation: "authorization";
			amount: number;
			currency: string;
			providerPaymentReference?: string | undefined;
			metadata?: JsonValue | undefined;
	  }>
	| Readonly<{
			operation: "capture";
			amount: number;
			currency: string;
			providerPaymentReference: string;
			metadata?: JsonValue | undefined;
	  }>
	| Readonly<{
			operation: "refund";
			amount: number;
			currency: string;
			providerPaymentReference: string;
			reason?: string | undefined;
			metadata?: JsonValue | undefined;
	  }>
	| Readonly<{
			operation: "void";
			providerPaymentReference: string;
			metadata?: JsonValue | undefined;
	  }>;

/**
 * Every provider call carries the durable owner record that makes a retry
 * unambiguous. An adapter must forward `idempotencyKey` unchanged when the
 * upstream API supports idempotency.
 */
export type PaymentProviderOperationRequest = Readonly<{
	operationId: string;
	connectionId: string;
	idempotencyKey: string;
	requestDigest: string;
	attempt: number;
	payload: PaymentOperationPayload;
}>;

export type PaymentProviderOperationOutcome = Readonly<{
	state: "succeeded" | "failed" | "ambiguous";
	providerReference?: string | undefined;
	/** Bounded normalized facts only; never credentials, client secrets, or raw payloads. */
	result?: JsonValue | undefined;
}>;

export type PaymentProviderReconciliationRequest = Readonly<{
	operationId: string;
	connectionId: string;
	operation: PaymentConnectionCapability;
	idempotencyKey: string;
	requestDigest: string;
	attempt: number;
	providerReference?: string | undefined;
}>;

/**
 * A server-created adapter bound to exactly one Payment Connection.
 *
 * Credentials stay inside the adapter closure. The Store Runtime passes only
 * the immutable Connection identity and durable operation envelope.
 */
export interface PaymentConnectionProvider {
	readonly connectionId: string;
	readonly provider: string;
	readonly mode: PaymentConnectionMode;
	readonly capabilities: readonly PaymentConnectionCapability[];

	execute(
		request: PaymentProviderOperationRequest,
	): Promise<PaymentProviderOperationOutcome>;

	reconcile(
		request: PaymentProviderReconciliationRequest,
	): Promise<PaymentProviderOperationOutcome>;
}
