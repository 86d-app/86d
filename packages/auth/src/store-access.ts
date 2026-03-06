import { db } from "db";

interface StoreAccessResult {
	hasAccess: boolean;
	role?: string;
}

export async function verifyStoreAdminAccess(
	userId: string,
	storeId: string,
): Promise<StoreAccessResult> {
	const admin = await db.storeAdmin.findUnique({
		where: { userId_storeId: { userId, storeId } },
		select: { role: true },
	});

	if (!admin) {
		return { hasAccess: false };
	}

	return { hasAccess: true, role: admin.role };
}
