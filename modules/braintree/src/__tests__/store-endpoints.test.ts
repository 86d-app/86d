import { describe, expect, it } from "vitest";
import { createStoreEndpoints } from "../store/endpoints/index";

// ── Helpers ───────────────────────────────────────────────────────────────────
// Braintree sends application/x-www-form-urlencoded with bt_signature + bt_payload

function makeFormRequest(fields: Record<string, string>): Request {
	return new Request("https://example.com/api/braintree/webhook", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(fields).toString(),
	});
}

async function callEndpoint(
	endpoints: ReturnType<typeof createStoreEndpoints>,
	path: keyof ReturnType<typeof createStoreEndpoints>,
	request: Request,
	context?: Record<string, unknown>,
): Promise<Response> {
	const handler = endpoints[path] as unknown as Record<string, unknown>;
	const fn = typeof handler.handler === "function" ? handler.handler : handler;
	return (fn as CallableFunction)({ request, context }) as Promise<Response>;
}

// ── Factory ───────────────────────────────────────────────────────────────────

describe("createStoreEndpoints — braintree", () => {
	it("returns an endpoint map with the /braintree/webhook path", () => {
		const endpoints = createStoreEndpoints({
			publicKey: "test-public-key",
			privateKey: "test-private-key",
		});
		expect(endpoints).toHaveProperty("/braintree/webhook");
		expect(endpoints["/braintree/webhook"]).toBeDefined();
	});

	it("endpoint returns 400 for missing bt_signature or bt_payload", async () => {
		const endpoints = createStoreEndpoints({
			publicKey: "pk",
			privateKey: "sk",
		});
		// Empty body — no bt_signature or bt_payload
		const req = makeFormRequest({});
		const res = await callEndpoint(endpoints, "/braintree/webhook", req);
		expect(res.status).toBe(400);
		const json = (await res.json()) as { error: string };
		expect(json.error).toContain("bt_signature");
	});

	it("endpoint returns 401 for an invalid signature", async () => {
		const endpoints = createStoreEndpoints({
			publicKey: "pk",
			privateKey: "sk",
		});
		// btPayload is valid base64 XML; btSignature has wrong HMAC
		const btPayload = btoa("<notification><kind>check</kind></notification>");
		const req = makeFormRequest({
			bt_signature: "pk|invalidsignature",
			bt_payload: btPayload,
		});
		const res = await callEndpoint(endpoints, "/braintree/webhook", req);
		expect(res.status).toBe(401);
	});

	it("endpoint returns 200 for a check notification with valid signature", async () => {
		// Build a real HMAC-SHA1 signature using Web Crypto
		const privateKey = "test-private-key";
		const publicKey = "test-public-key";
		const btPayload = btoa("<notification><kind>check</kind></notification>");

		const enc = new TextEncoder();
		const key = await crypto.subtle.importKey(
			"raw",
			enc.encode(privateKey),
			{ name: "HMAC", hash: "SHA-1" },
			false,
			["sign"],
		);
		const sig = await crypto.subtle.sign("HMAC", key, enc.encode(btPayload));
		const hexSig = Array.from(new Uint8Array(sig))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");

		const endpoints = createStoreEndpoints({ publicKey, privateKey });
		const req = makeFormRequest({
			bt_signature: `${publicKey}|${hexSig}`,
			bt_payload: btPayload,
		});
		const res = await callEndpoint(endpoints, "/braintree/webhook", req);
		expect(res.status).toBe(200);
		const json = (await res.json()) as { received: boolean };
		expect(json.received).toBe(true);
	});
});
