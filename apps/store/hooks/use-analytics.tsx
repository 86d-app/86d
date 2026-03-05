"use client";

import { useApi } from "generated/hooks";
import { useCallback, useRef } from "react";

/**
 * Supported event types for the analytics tracker.
 * Any string is also valid for custom events.
 */
export type AnalyticsEventType =
	| "pageView"
	| "productView"
	| "addToCart"
	| "removeFromCart"
	| "checkout"
	| "purchase"
	| "search"
	| (string & {});

interface TrackParams {
	type: AnalyticsEventType;
	productId?: string | undefined;
	orderId?: string | undefined;
	value?: number | undefined;
	data?: Record<string, unknown> | undefined;
}

/**
 * Fire-and-forget analytics tracker.
 *
 * Returns a stable `track` function that sends events to `POST /analytics/events`.
 * Failures are silently swallowed — analytics should never break the UI.
 *
 * @example
 * ```tsx
 * const { track } = useAnalytics();
 * track({ type: "productView", productId: "abc" });
 * track({ type: "purchase", orderId: "ORD-123", value: 4999 });
 * ```
 */
export function useAnalytics() {
	const api = useApi();
	const mutationRef = useRef(api.analytics.trackEventEndpoint);
	mutationRef.current = api.analytics.trackEventEndpoint;

	const track = useCallback((params: TrackParams) => {
		try {
			void mutationRef.current.mutate({
				type: params.type,
				...(params.productId !== undefined
					? { productId: params.productId }
					: {}),
				...(params.orderId !== undefined ? { orderId: params.orderId } : {}),
				...(params.value !== undefined ? { value: params.value } : {}),
				...(params.data !== undefined ? { data: params.data } : {}),
			});
		} catch {
			// Swallow — analytics is best-effort
		}
	}, []);

	return { track };
}
