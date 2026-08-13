import type { ModuleContext } from "@86d-app/core/types/module";
import type { CheckoutSession } from "../../service";

const PROOF_METADATA_KEY = "guestProofDigest";

type CheckoutAccessContext = {
	context: Pick<ModuleContext, "session">;
	getCookie: (key: string) => string | null;
	setCookie: (
		key: string,
		value: string,
		options?: Record<string, unknown>,
	) => string;
};

function cookieName(sessionId: string): string {
	return `checkout_guest_${sessionId}`;
}

function newProof(): string {
	return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

async function digest(proof: string): Promise<string> {
	const bytes = new TextEncoder().encode(proof);
	const hashed = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
	return [...hashed].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function matches(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) {
		difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return difference === 0;
}

export async function createGuestProofMetadata(): Promise<{
	proof: string;
	metadata: Record<string, string>;
}> {
	const proof = newProof();
	return {
		proof,
		metadata: { [PROOF_METADATA_KEY]: await digest(proof) },
	};
}

export function setGuestProofCookie(
	ctx: CheckoutAccessContext,
	session: CheckoutSession,
	proof: string,
): void {
	const maxAge = Math.max(
		1,
		Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
	);
	ctx.setCookie(cookieName(session.id), proof, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/api/checkout/sessions",
		maxAge,
	});
}

export async function canAccessCheckout(
	ctx: CheckoutAccessContext,
	session: CheckoutSession,
): Promise<boolean> {
	const userId = ctx.context.session?.user.id;
	if (session.customerId) return session.customerId === userId;

	const expected = session.metadata?.[PROOF_METADATA_KEY];
	if (typeof expected !== "string") return false;

	const presented = ctx.getCookie(cookieName(session.id));
	if (!presented) return false;
	return matches(await digest(presented), expected);
}
