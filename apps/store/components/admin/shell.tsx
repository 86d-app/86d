"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { IconName } from "~/components/icon/icon";
import { Icon } from "~/components/icon/icon";
import type { AdminNavGroup, AdminNavItem } from "~/lib/admin-registry";

const DASHBOARD_ITEM: AdminNavItem = {
	label: "Dashboard",
	href: "/admin",
	icon: "SquaresFour",
};

const STORAGE_KEY = "86d-admin-sidebar-collapsed";

function loadCollapsedGroups(): Set<string> {
	if (typeof window === "undefined") return new Set();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return new Set(JSON.parse(raw) as string[]);
	} catch {
		// ignore
	}
	return new Set();
}

function saveCollapsedGroups(collapsed: Set<string>) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
	} catch {
		// ignore
	}
}

function NavLink({
	item,
	isActive,
	onClose,
}: {
	item: AdminNavItem;
	isActive: boolean;
	onClose?: (() => void) | undefined;
}) {
	return (
		<a
			href={item.href}
			onClick={onClose}
			className={`flex items-center gap-2.5 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
				isActive
					? "bg-muted text-foreground"
					: "text-muted-foreground hover:bg-muted hover:text-foreground"
			}`}
		>
			{item.icon ? (
				<Icon name={item.icon as IconName} className="size-4 shrink-0" />
			) : null}
			{item.label}
		</a>
	);
}

function CollapsibleGroup({
	group,
	pathname,
	collapsed,
	onToggle,
	onClose,
}: {
	group: AdminNavGroup;
	pathname: string;
	collapsed: boolean;
	onToggle: () => void;
	onClose?: () => void;
}) {
	const hasActiveItem = group.items.some((item) =>
		item.href === "/admin"
			? pathname === "/admin"
			: pathname.startsWith(item.href),
	);

	// Auto-expand if an item in this group is active
	const isOpen = hasActiveItem || !collapsed;

	return (
		<div className="pt-1">
			<button
				type="button"
				onClick={onToggle}
				className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-muted"
			>
				{group.icon ? (
					<Icon
						name={group.icon as IconName}
						className="size-3.5 shrink-0 text-muted-foreground"
					/>
				) : null}
				<span className="flex-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
					{group.label}
				</span>
				<Icon
					name="chevron-right"
					className={`size-3 shrink-0 text-muted-foreground transition-transform duration-200 ${
						isOpen ? "rotate-90" : ""
					}`}
				/>
			</button>
			{isOpen ? (
				<div className="mt-0.5">
					{group.items.map((item) => {
						const isActive =
							item.href === "/admin"
								? pathname === "/admin"
								: pathname.startsWith(item.href);
						return (
							<NavLink
								key={item.href + item.label}
								item={item}
								isActive={isActive}
								{...(onClose !== undefined ? { onClose } : {})}
							/>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

function Sidebar({
	navGroups,
	onClose,
}: {
	navGroups: AdminNavGroup[];
	onClose?: () => void;
}) {
	const pathname = usePathname();
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		() => new Set(),
	);

	// Load persisted state on mount
	useEffect(() => {
		setCollapsedGroups(loadCollapsedGroups());
	}, []);

	const toggleGroup = useCallback((label: string) => {
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(label)) {
				next.delete(label);
			} else {
				next.add(label);
			}
			saveCollapsedGroups(next);
			return next;
		});
	}, []);

	return (
		<aside className="flex h-full w-60 flex-col border-border border-r bg-background">
			{/* Logo */}
			<div className="flex h-14 items-center border-border border-b px-4">
				<a href="/" className="flex items-center gap-2">
					<img
						src="/assets/icon/light.svg"
						alt="Store"
						className="h-6 w-auto dark:hidden"
					/>
					<img
						src="/assets/icon/dark.svg"
						alt="Store"
						className="hidden h-6 w-auto dark:block"
					/>
					<span className="font-semibold text-foreground text-sm">Admin</span>
				</a>
			</div>

			{/* Nav */}
			<nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
				{/* Dashboard */}
				<NavLink
					item={DASHBOARD_ITEM}
					isActive={pathname === "/admin"}
					{...(onClose !== undefined ? { onClose } : {})}
				/>
				{/* Module items by group */}
				{navGroups.map((group) =>
					group.label ? (
						<CollapsibleGroup
							key={group.label}
							group={group}
							pathname={pathname}
							collapsed={collapsedGroups.has(group.label)}
							onToggle={() => toggleGroup(group.label)}
							{...(onClose !== undefined ? { onClose } : {})}
						/>
					) : (
						// Ungrouped items rendered directly
						group.items.map((item) => {
							const isActive =
								item.href === "/admin"
									? pathname === "/admin"
									: pathname.startsWith(item.href);
							return (
								<NavLink
									key={item.href + item.label}
									item={item}
									isActive={isActive}
									{...(onClose !== undefined ? { onClose } : {})}
								/>
							);
						})
					),
				)}
			</nav>

			{/* Footer */}
			<div className="space-y-1 border-border border-t p-3">
				<a
					href="/"
					className="flex items-center gap-2.5 rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
				>
					<Icon name="House" className="size-4 shrink-0" />
					View store
				</a>
				<a
					href="/signout"
					className="flex items-center gap-2.5 rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
				>
					<Icon name="SignOut" className="size-4 shrink-0" />
					Sign out
				</a>
			</div>
		</aside>
	);
}

export function AdminShell({
	navGroups,
	children,
}: {
	navGroups: AdminNavGroup[];
	children: React.ReactNode;
}) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="flex h-svh overflow-hidden bg-background">
			{/* Desktop sidebar */}
			<div className="hidden lg:flex lg:flex-shrink-0">
				<Sidebar navGroups={navGroups} />
			</div>

			{/* Mobile sidebar */}
			{sidebarOpen && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/50 lg:hidden"
						onClick={() => setSidebarOpen(false)}
						aria-hidden="true"
					/>
					<div className="fixed inset-y-0 left-0 z-50 lg:hidden">
						<Sidebar
							navGroups={navGroups}
							onClose={() => setSidebarOpen(false)}
						/>
					</div>
				</>
			)}

			{/* Main content */}
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				{/* Mobile top bar */}
				<div className="flex h-14 items-center border-border border-b px-4 lg:hidden">
					<button
						type="button"
						onClick={() => setSidebarOpen(true)}
						className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
						aria-label="Open sidebar"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<line x1="4" x2="20" y1="12" y2="12" />
							<line x1="4" x2="20" y1="6" y2="6" />
							<line x1="4" x2="20" y1="18" y2="18" />
						</svg>
					</button>
					<span className="ml-3 font-semibold text-foreground text-sm">
						Admin
					</span>
				</div>

				<main className="flex-1 overflow-y-auto p-6">{children}</main>
			</div>
		</div>
	);
}
