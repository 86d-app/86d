import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { NextResponse } from "next/server";

const MIME_TYPES: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".pdf": "application/pdf",
};

const UPLOADS_DIR = resolve(process.env.STORAGE_LOCAL_DIR ?? "./uploads");

/**
 * Serve locally-stored files when STORAGE_PROVIDER=local.
 * Only serves files from the uploads directory — rejects path traversal.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	if (process.env.STORAGE_PROVIDER !== "local") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const { path } = await params;
	const filePath = resolve(join(UPLOADS_DIR, ...path));

	// Prevent path traversal
	if (!filePath.startsWith(UPLOADS_DIR)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	if (!existsSync(filePath)) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const ext = extname(filePath).toLowerCase();
	const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
	const content = readFileSync(filePath);

	return new NextResponse(content, {
		status: 200,
		headers: {
			"Content-Type": contentType,
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
