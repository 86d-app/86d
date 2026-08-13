import { createAdminEndpoint } from "@86d-app/core/api";
import type { ActorReference, AuthoritySnapshot } from "@86d-app/core/commands";
import type { ModuleTransactionRunner } from "@86d-app/core/durable-events";
import type { Session } from "@86d-app/core/types/module";
import { z } from "@86d-app/core/zod";
import {
	applyCatalogRevisionOperation,
	type CatalogRevisionOperationInput,
	type CatalogRevisionOperationResult,
	type CatalogRevisionRecord,
	catalogRevisionContentSchema,
	catalogRevisionRecordSchema,
	catalogRevisionStateSchema,
} from "../../catalog-revisions";

const resourceIdentifierSchema = z
	.string()
	.min(1)
	.max(200)
	.regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const operationIdentifierSchema = z
	.string()
	.min(8)
	.max(180)
	.regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const contentDigestSchema = z.string().regex(/^[a-f0-9]{64}$/);

const createDraftBodySchema = z
	.object({
		operationId: operationIdentifierSchema,
		revisionId: resourceIdentifierSchema,
		baseRevisionId: resourceIdentifierSchema.optional(),
		content: catalogRevisionContentSchema,
	})
	.strict();

const transitionBodySchema = z
	.object({
		operationId: operationIdentifierSchema,
		expectedContentDigest: contentDigestSchema,
	})
	.strict();

type CatalogAdminWriteContext = Readonly<{
	transactions?: ModuleTransactionRunner | undefined;
	session: Session;
	storeId: string;
}>;

type CatalogRevisionFailure = Extract<
	CatalogRevisionOperationResult,
	{ ok: false }
>;

function failureStatus(code: CatalogRevisionFailure["failure"]["code"]) {
	switch (code) {
		case "invalid_request":
			return 400;
		case "revision_not_found":
		case "base_revision_not_found":
			return 404;
		case "locking_unavailable":
			return 503;
		case "invalid_stored_state":
			return 500;
		default:
			return 409;
	}
}

function failureResponse(result: CatalogRevisionFailure) {
	return {
		code: result.failure.code.toUpperCase(),
		error: result.failure.message,
		status: failureStatus(result.failure.code),
	};
}

function unavailableResponse() {
	return {
		code: "CATALOG_REVISION_UNAVAILABLE",
		error:
			"Catalog revision writes require owner-local locking and durable-event storage.",
		status: 503,
	};
}

async function executeWrite(
	context: CatalogAdminWriteContext,
	input: CatalogRevisionOperationInput,
): Promise<CatalogRevisionOperationResult | null> {
	if (!context.transactions || context.session.user.role !== "admin")
		return null;
	const actor = {
		type: "account",
		id: context.session.user.id,
	} satisfies ActorReference;
	const authority = {
		id: `store-admin:${context.storeId}:${context.session.user.id}`,
		type: "custom_role",
		role: "admin",
		permissions: ["catalog:write"],
		storeId: context.storeId,
	} satisfies AuthoritySnapshot;

	try {
		return await context.transactions.transaction((transaction) =>
			applyCatalogRevisionOperation(transaction, input, {
				actor,
				authority,
				occurredAt: new Date(),
			}),
		);
	} catch {
		return null;
	}
}

function revisionSummary(revision: CatalogRevisionRecord) {
	return {
		id: revision.id,
		sequence: revision.sequence,
		state: revision.state,
		...(revision.baseRevisionId === undefined
			? {}
			: { baseRevisionId: revision.baseRevisionId }),
		contentVersion: revision.contentVersion,
		contentDigest: revision.contentDigest,
		currency: revision.content.currency,
		productCount: revision.content.products.length,
		variantCount: revision.content.variants.length,
		categoryCount: revision.content.categories.length,
		createdAt: revision.createdAt,
		...(revision.reviewedAt === undefined
			? {}
			: { reviewedAt: revision.reviewedAt }),
		...(revision.publishedAt === undefined
			? {}
			: { publishedAt: revision.publishedAt }),
		...(revision.supersededAt === undefined
			? {}
			: { supersededAt: revision.supersededAt }),
		...(revision.failedAt === undefined ? {} : { failedAt: revision.failedAt }),
	};
}

export const createCatalogRevisionDraft = createAdminEndpoint(
	"/admin/catalog/revisions/create",
	{ method: "POST", body: createDraftBodySchema },
	async (ctx) => {
		const result = await executeWrite(ctx.context, {
			action: "create_draft",
			operationId: ctx.body.operationId,
			revisionId: ctx.body.revisionId,
			...(ctx.body.baseRevisionId === undefined
				? {}
				: { baseRevisionId: ctx.body.baseRevisionId }),
			content: ctx.body.content,
		});
		if (!result) return unavailableResponse();
		if (!result.ok) return failureResponse(result);
		return {
			revision: result.decision,
			status: result.decision.replayed ? 200 : 201,
		};
	},
);

export const reviewCatalogRevision = createAdminEndpoint(
	"/admin/catalog/revisions/:id/review",
	{
		method: "POST",
		params: z.object({ id: resourceIdentifierSchema }).strict(),
		body: transitionBodySchema,
	},
	async (ctx) => {
		const result = await executeWrite(ctx.context, {
			action: "review",
			operationId: ctx.body.operationId,
			revisionId: ctx.params.id,
			expectedContentDigest: ctx.body.expectedContentDigest,
		});
		if (!result) return unavailableResponse();
		if (!result.ok) return failureResponse(result);
		return { revision: result.decision };
	},
);

export const publishCatalogRevision = createAdminEndpoint(
	"/admin/catalog/revisions/:id/publish",
	{
		method: "POST",
		params: z.object({ id: resourceIdentifierSchema }).strict(),
		body: transitionBodySchema,
	},
	async (ctx) => {
		const result = await executeWrite(ctx.context, {
			action: "publish",
			operationId: ctx.body.operationId,
			revisionId: ctx.params.id,
			expectedContentDigest: ctx.body.expectedContentDigest,
		});
		if (!result) return unavailableResponse();
		if (!result.ok) return failureResponse(result);
		return { revision: result.decision };
	},
);

export const getCatalogRevision = createAdminEndpoint(
	"/admin/catalog/revisions/:id",
	{
		method: "GET",
		params: z.object({ id: resourceIdentifierSchema }).strict(),
	},
	async (ctx) => {
		const stored = await ctx.context.data.get("catalogRevision", ctx.params.id);
		if (!stored) {
			return {
				code: "CATALOG_REVISION_NOT_FOUND",
				error: "The Catalog revision was not found.",
				status: 404,
			};
		}
		const revision = catalogRevisionRecordSchema.safeParse(stored);
		if (!revision.success) {
			return {
				code: "INVALID_CATALOG_REVISION",
				error: "The stored Catalog revision is malformed.",
				status: 500,
			};
		}
		return { revision: revision.data };
	},
);

export const listCatalogRevisions = createAdminEndpoint(
	"/admin/catalog/revisions/list",
	{
		method: "GET",
		query: z
			.object({
				state: catalogRevisionStateSchema.optional(),
				limit: z.coerce.number().int().min(1).max(100).default(25),
				offset: z.coerce.number().int().min(0).default(0),
			})
			.strict(),
	},
	async (ctx) => {
		const stored = await ctx.context.data.findMany("catalogRevision", {
			...(ctx.query.state === undefined
				? {}
				: { where: { state: ctx.query.state } }),
			orderBy: { createdAt: "desc" },
			take: ctx.query.limit,
			skip: ctx.query.offset,
		});
		const revisions: CatalogRevisionRecord[] = [];
		for (const row of stored) {
			const revision = catalogRevisionRecordSchema.safeParse(row);
			if (!revision.success) {
				return {
					code: "INVALID_CATALOG_REVISION",
					error: "A stored Catalog revision is malformed.",
					status: 500,
				};
			}
			revisions.push(revision.data);
		}
		return {
			revisions: revisions.map(revisionSummary),
			pagination: {
				limit: ctx.query.limit,
				offset: ctx.query.offset,
				nextOffset:
					revisions.length < ctx.query.limit
						? null
						: ctx.query.offset + revisions.length,
			},
		};
	},
);
