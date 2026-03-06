import { Prisma, PrismaClient } from "@86d-app/core/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClientInstance | undefined;
};

function createClient(): PrismaClientInstance {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL environment variable is required");
	}
	const adapter = new PrismaPg({ connectionString });
	return new PrismaClient({ adapter });
}

export const db: PrismaClientInstance =
	globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = db;
}

export { Prisma };
