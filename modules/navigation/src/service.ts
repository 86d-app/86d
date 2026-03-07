import type { ModuleController } from "@86d-app/core";

export type MenuLocation =
	| "header"
	| "footer"
	| "sidebar"
	| "mobile"
	| "custom";

export type MenuItemType =
	| "link"
	| "category"
	| "collection"
	| "page"
	| "product";

export interface Menu {
	id: string;
	name: string;
	slug: string;
	location: MenuLocation;
	isActive: boolean;
	metadata: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

export interface MenuItem {
	id: string;
	menuId: string;
	parentId?: string | undefined;
	label: string;
	type: MenuItemType;
	url?: string | undefined;
	resourceId?: string | undefined;
	openInNewTab: boolean;
	cssClass?: string | undefined;
	position: number;
	isVisible: boolean;
	metadata: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

/** A menu item with its nested children resolved. */
export interface MenuItemTree extends MenuItem {
	children: MenuItemTree[];
}

/** A menu with its items pre-resolved as a tree. */
export interface MenuWithItems extends Menu {
	items: MenuItemTree[];
}

export interface CreateMenuParams {
	name: string;
	slug?: string | undefined;
	location: MenuLocation;
	isActive?: boolean | undefined;
}

export interface UpdateMenuParams {
	name?: string | undefined;
	slug?: string | undefined;
	location?: MenuLocation | undefined;
	isActive?: boolean | undefined;
}

export interface CreateMenuItemParams {
	menuId: string;
	parentId?: string | undefined;
	label: string;
	type?: MenuItemType | undefined;
	url?: string | undefined;
	resourceId?: string | undefined;
	openInNewTab?: boolean | undefined;
	cssClass?: string | undefined;
	position?: number | undefined;
	isVisible?: boolean | undefined;
}

export interface UpdateMenuItemParams {
	label?: string | undefined;
	parentId?: string | undefined;
	type?: MenuItemType | undefined;
	url?: string | undefined;
	resourceId?: string | undefined;
	openInNewTab?: boolean | undefined;
	cssClass?: string | undefined;
	position?: number | undefined;
	isVisible?: boolean | undefined;
}

export interface NavigationController extends ModuleController {
	// ── Menu CRUD ────────────────────────────────────────────────
	createMenu(params: CreateMenuParams): Promise<Menu>;
	updateMenu(id: string, params: UpdateMenuParams): Promise<Menu | null>;
	deleteMenu(id: string): Promise<boolean>;
	getMenu(id: string): Promise<Menu | null>;
	getMenuBySlug(slug: string): Promise<Menu | null>;
	listMenus(params?: {
		location?: MenuLocation | undefined;
		isActive?: boolean | undefined;
	}): Promise<Menu[]>;

	// ── Menu Item CRUD ───────────────────────────────────────────
	createItem(params: CreateMenuItemParams): Promise<MenuItem>;
	updateItem(
		id: string,
		params: UpdateMenuItemParams,
	): Promise<MenuItem | null>;
	deleteItem(id: string): Promise<boolean>;
	getItem(id: string): Promise<MenuItem | null>;
	listItems(
		menuId: string,
		params?: { parentId?: string | undefined },
	): Promise<MenuItem[]>;

	// ── Tree resolution ──────────────────────────────────────────
	/** Get a menu with its items organized as a nested tree. */
	getMenuWithItems(id: string): Promise<MenuWithItems | null>;
	/** Get the active menu for a given location with items as a tree. */
	getMenuByLocation(location: MenuLocation): Promise<MenuWithItems | null>;
	/** Reorder items within a parent (menu root or parent item). */
	reorderItems(
		menuId: string,
		itemIds: string[],
		parentId?: string | undefined,
	): Promise<void>;
}
