import type { Prisma } from "@prisma/client";

export interface DataServiceConfig {
	// biome-ignore lint/suspicious/noExplicitAny: PrismaClient at runtime
	db: any;
	storeId: string;
	moduleId: string;
}

/**
 * Build a Prisma-compatible JSONB where clause from a flat key-value filter.
 * Single-key uses direct `data.path.equals`; multi-key uses AND.
 */
function buildJsonWhereFilters(
	// biome-ignore lint/suspicious/noExplicitAny: JSONB filter values can be any JSON-serializable type
	where: Record<string, any>,
	// biome-ignore lint/suspicious/noExplicitAny: returns Prisma where clause fragment
): Record<string, any> {
	const entries = Object.entries(where);
	if (entries.length === 0) return {};
	if (entries.length === 1) {
		return { data: { path: [entries[0][0]], equals: entries[0][1] } };
	}
	return {
		AND: entries.map(([key, val]) => ({
			data: { path: [key], equals: val },
		})),
	};
}

/**
 * Secure data access layer for modules
 * Only allows access to module's own data within a specific store
 */
export class UniversalDataService {
	private config: DataServiceConfig;

	constructor(config: DataServiceConfig) {
		this.config = config;
	}

	/**
	 * Create or update an entity
	 */
	async upsert(
		entityType: string,
		entityId: string,
		// biome-ignore lint/suspicious/noExplicitAny: JSONB data accepts arbitrary values
		data: Record<string, any>,
		parentId?: string,
	) {
		const args = {
			where: {
				module_entity_unique: {
					moduleId: this.config.moduleId,
					entityType,
					entityId,
				},
			},
			create: {
				moduleId: this.config.moduleId,
				entityType,
				entityId,
				data,
				parentId: parentId ?? null,
			},
			update: {
				data,
				updatedAt: new Date(),
			},
		} satisfies Prisma.ModuleDataUpsertArgs;

		return this.config.db.moduleData.upsert(args);
	}

	/**
	 * Get a single entity
	 */
	async get(entityType: string, entityId: string) {
		const args = {
			where: {
				module_entity_unique: {
					moduleId: this.config.moduleId,
					entityType,
					entityId,
				},
			},
		} satisfies Prisma.ModuleDataFindUniqueArgs;
		const result = await this.config.db.moduleData.findUnique(args);
		// biome-ignore lint/suspicious/noExplicitAny: Prisma JSONB data field
		return (result?.data as Record<string, any>) ?? null;
	}

	/**
	 * Find entities by type with optional JSONB filtering, pagination, and ordering.
	 *
	 * - `where`: filter by JSONB data fields (exact equality, multi-key AND)
	 * - `take`/`skip`: Prisma-style pagination
	 * - `orderBy`: supports `createdAt` and `updatedAt` (DB columns); defaults to `createdAt: desc`
	 */
	async findMany(
		entityType: string,
		options?: {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB filter values
			where?: Record<string, any>;
			orderBy?: Record<string, "asc" | "desc">;
			take?: number;
			skip?: number;
		},
	) {
		// biome-ignore lint/suspicious/noExplicitAny: Prisma where clause built dynamically
		const whereClause: Record<string, any> = {
			moduleId: this.config.moduleId,
			entityType,
		};

		if (options?.where) {
			Object.assign(whereClause, buildJsonWhereFilters(options.where));
		}

		// Support ordering by DB columns; default to createdAt desc
		const dbColumns = new Set(["createdAt", "updatedAt"]);
		// biome-ignore lint/suspicious/noExplicitAny: Prisma orderBy clause
		let orderBy: Record<string, any> = { createdAt: "desc" };
		if (options?.orderBy) {
			const supported = Object.entries(options.orderBy).filter(([k]) =>
				dbColumns.has(k),
			);
			if (supported.length > 0) {
				orderBy = Object.fromEntries(supported);
			}
		}

		const args = {
			where: whereClause,
			...(options?.take !== undefined ? { take: options.take } : {}),
			...(options?.skip !== undefined ? { skip: options.skip } : {}),
			orderBy,
		};

		const results = await this.config.db.moduleData.findMany(args);
		// biome-ignore lint/suspicious/noExplicitAny: Prisma result contains JSONB data field
		return results.map((r: any) => r.data as Record<string, any>);
	}

	/**
	 * Get children of an entity
	 */
	async getChildren(parentInternalId: string) {
		const args = {
			where: {
				moduleId: this.config.moduleId,
				parentId: parentInternalId,
			},
		} satisfies Prisma.ModuleDataFindManyArgs;
		const results = await this.config.db.moduleData.findMany(args);
		// biome-ignore lint/suspicious/noExplicitAny: Prisma result row
		return results.map((r: any) => ({
			id: r.id,
			entityType: r.entityType,
			entityId: r.entityId,
			// biome-ignore lint/suspicious/noExplicitAny: Prisma JSONB data field
			data: r.data as Record<string, any>,
		}));
	}

	/**
	 * Delete an entity
	 */
	async delete(entityType: string, entityId: string) {
		const args = {
			where: {
				module_entity_unique: {
					moduleId: this.config.moduleId,
					entityType,
					entityId,
				},
			},
		} satisfies Prisma.ModuleDataDeleteArgs;
		return this.config.db.moduleData.delete(args);
	}

	/**
	 * Count entities by type with optional JSONB filtering.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: JSONB filter values
	async count(entityType: string, where?: Record<string, any>) {
		// biome-ignore lint/suspicious/noExplicitAny: Prisma where clause built dynamically
		const whereClause: Record<string, any> = {
			moduleId: this.config.moduleId,
			entityType,
		};

		if (where) {
			Object.assign(whereClause, buildJsonWhereFilters(where));
		}

		return this.config.db.moduleData.count({ where: whereClause });
	}

	/**
	 * Batch operations
	 */
	async upsertMany(
		entities: Array<{
			entityType: string;
			entityId: string;
			// biome-ignore lint/suspicious/noExplicitAny: JSONB data accepts arbitrary values
			data: Record<string, any>;
		}>,
	) {
		const args = (entity: {
			entityType: string;
			entityId: string;
			// biome-ignore lint/suspicious/noExplicitAny: JSONB data accepts arbitrary values
			data: Record<string, any>;
		}) =>
			({
				where: {
					module_entity_unique: {
						moduleId: this.config.moduleId,
						entityType: entity.entityType,
						entityId: entity.entityId,
					},
				},
				create: {
					moduleId: this.config.moduleId,
					entityType: entity.entityType,
					entityId: entity.entityId,
					data: entity.data,
				},
				update: {
					data: entity.data,
					updatedAt: new Date(),
				},
			}) satisfies Prisma.ModuleDataUpsertArgs;

		const operations = entities.map((entity) =>
			this.config.db.moduleData.upsert(args(entity)),
		);

		return this.config.db.$transaction(operations);
	}
}
