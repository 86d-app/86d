/**
 * Admin registry: builds nav items and route table from module admin.pages.
 * Used by AdminShell (sidebar) and the catch-all admin route (resolve path → component).
 */

import type { AdminPage } from "@86d-app/core";
import { modules } from "generated/api";

export interface AdminNavItem {
	label: string;
	href: string;
	icon?: string;
	group?: string;
}

export interface AdminRouteMatch {
	moduleId: string;
	component: string;
	params: Record<string, string>;
}

/** Stable order for sidebar groups. Ungrouped items appear first, then by this order. */
const GROUP_ORDER = [
	"Catalog",
	"Sales",
	"Customers",
	"Settings",
	"Marketing",
] as const;

function buildRouteTable(): Array<{
	pattern: string;
	moduleId: string;
	component: string;
}> {
	const rows: Array<{ pattern: string; moduleId: string; component: string }> =
		[];
	for (const mod of modules) {
		const moduleId = mod.id;
		const pages = mod.admin?.pages ?? [];
		for (const page of pages) {
			rows.push({
				pattern: page.path,
				moduleId,
				component: page.component,
			});
		}
	}
	// Most specific (longer) patterns first so /admin/products/:id/edit wins over /admin/products/:id
	rows.sort((a, b) => b.pattern.length - a.pattern.length);
	return rows;
}

function matchPath(
	pattern: string,
	path: string,
): Record<string, string> | null {
	const patternSegments = pattern.replace(/^\//, "").split("/").filter(Boolean);
	const pathSegments = path.replace(/^\//, "").split("/").filter(Boolean);
	if (patternSegments.length !== pathSegments.length) return null;
	const params: Record<string, string> = {};
	for (let i = 0; i < patternSegments.length; i++) {
		const p = patternSegments[i];
		const v = pathSegments[i];
		if (!v) return null;
		if (p.startsWith(":")) {
			params[p.slice(1)] = v;
		} else if (p !== v) {
			return null;
		}
	}
	return params;
}

let routeTable: ReturnType<typeof buildRouteTable> | null = null;

function getRouteTable() {
	if (!routeTable) routeTable = buildRouteTable();
	return routeTable;
}

/**
 * Resolve an admin path to the owning module, component, and extracted params.
 */
export function getAdminRoute(path: string): AdminRouteMatch | null {
	const table = getRouteTable();
	const normalized = path.replace(/\/$/, "") || "/";
	for (const row of table) {
		const params = matchPath(row.pattern, normalized);
		if (params !== null) {
			return {
				moduleId: row.moduleId,
				component: row.component,
				params,
			};
		}
	}
	return null;
}

/**
 * Nav items for the admin sidebar: only pages with a label, with optional group and icon.
 * Order: Dashboard (built-in), then by group (Catalog, Sales, …), then ungrouped; within group by label.
 */
export function getAdminNavItems(): AdminNavItem[] {
	const withLabel: Array<AdminNavItem & { sortGroup: string }> = [];
	for (const mod of modules) {
		const pages = (mod.admin?.pages ?? []) as AdminPage[];
		for (const page of pages) {
			if (!page.label) continue;
			withLabel.push({
				label: page.label,
				href: page.path,
				...(page.icon !== undefined && page.icon !== "" && { icon: page.icon }),
				...(page.group !== undefined &&
					page.group !== "" && { group: page.group }),
				sortGroup: page.group ?? "\uFFFF", // ungrouped last when sorted
			});
		}
	}

	const orderIdx = (g: string) => {
		const i = GROUP_ORDER.indexOf(g as (typeof GROUP_ORDER)[number]);
		return i >= 0 ? i : GROUP_ORDER.length;
	};
	withLabel.sort((a, b) => {
		const oa = orderIdx(a.sortGroup);
		const ob = orderIdx(b.sortGroup);
		if (oa !== ob) return oa - ob;
		return a.label.localeCompare(b.label);
	});

	return withLabel.map(({ sortGroup: _, ...item }) => item);
}
