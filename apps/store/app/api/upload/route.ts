import { put } from "@vercel/blob";
import { getSession } from "auth/actions";
import { verifyStoreAdminAccess } from "auth/store-access";
import env from "env";
import { NextResponse } from "next/server";
import { logger } from "utils/logger";

const ALLOWED_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/jpg",
	"image/webp",
]);
const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5 MB

/** Magic-byte signatures for allowed image types (detect spoofed MIME). */
const JPEG_SIG = new Uint8Array([0xff, 0xd8, 0xff]);
const PNG_SIG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const WEBP_RIFF = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // RIFF
const WEBP_WEBP = new Uint8Array([0x57, 0x45, 0x42, 0x50]); // WEBP at bytes 8–11

function matchesMagicBytes(buffer: ArrayBuffer, mime: string): boolean {
	const bytes = new Uint8Array(buffer);
	if (bytes.length < 12) return false;
	if (mime === "image/jpeg" || mime === "image/jpg") {
		return (
			bytes[0] === JPEG_SIG[0] &&
			bytes[1] === JPEG_SIG[1] &&
			bytes[2] === JPEG_SIG[2]
		);
	}
	if (mime === "image/png") {
		return PNG_SIG.every((b, i) => bytes[i] === b);
	}
	if (mime === "image/webp") {
		const riff = WEBP_RIFF.every((b, i) => bytes[i] === b);
		const webp = WEBP_WEBP.every((b, i) => bytes[i + 8] === b);
		return riff && webp;
	}
	return false;
}

export async function POST(request: Request) {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const storeId = env.STORE_ID;
	if (!storeId) {
		return NextResponse.json(
			{ error: "Store not configured" },
			{ status: 500 },
		);
	}

	try {
		await verifyStoreAdminAccess(session.user.id, storeId);
	} catch {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		if (!ALLOWED_TYPES.has(file.type)) {
			return NextResponse.json(
				{ error: "File type must be JPEG, PNG, or WebP" },
				{ status: 400 },
			);
		}

		if (file.size > MAX_SIZE) {
			return NextResponse.json(
				{ error: "File size must be less than 4.5 MB" },
				{ status: 400 },
			);
		}

		const buffer = await file.arrayBuffer();
		if (!matchesMagicBytes(buffer, file.type)) {
			return NextResponse.json(
				{ error: "File content does not match declared image type" },
				{ status: 400 },
			);
		}

		const blob = await put(`stores/${storeId}/${crypto.randomUUID()}`, buffer, {
			access: "public",
			contentType: file.type,
		});

		return NextResponse.json({ url: blob.url });
	} catch (error) {
		logger.error("Upload failed", { error: String(error) });
		return NextResponse.json({ error: "Upload failed" }, { status: 500 });
	}
}
