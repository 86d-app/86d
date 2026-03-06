"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import type { IconName } from "~/components/icon/icon";
import { Icon } from "~/components/icon/icon";
import type { AdminNavItem } from "~/lib/admin-registry";

const DASHBOARD_ITEM: AdminNavItem = {
	label: "Dashboard",
	href: "/admin",
	icon: "SquaresFour",
};

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

function Sidebar({
	navItems,
	onClose,
}: {
	navItems: AdminNavItem[];
	onClose?: () => void;
}) {
	const pathname = usePathname();

	// Group module items by group for section headers
	const moduleItems = navItems;
	const sections: Array<{ group?: string; items: AdminNavItem[] }> = [];
	let currentGroup: string | undefined;
	let currentItems: AdminNavItem[] = [];
	for (const item of moduleItems) {
		if (item.group !== currentGroup) {
			if (currentItems.length > 0) {
				sections.push({
					...(currentGroup !== undefined && { group: currentGroup }),
					items: currentItems,
				});
			}
			currentGroup = item.group;
			currentItems = [item];
		} else {
			currentItems.push(item);
		}
	}
	if (currentItems.length > 0) {
		sections.push({
			...(currentGroup !== undefined && { group: currentGroup }),
			items: currentItems,
		});
	}

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
				{sections.map((section) => (
					<div key={section.group ?? "_"} className="pt-1">
						{section.group ? (
							<div className="px-3 py-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
								{section.group}
							</div>
						) : null}
						{section.items.map((item) => {
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
				))}
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
	navItems,
	children,
}: {
	navItems: AdminNavItem[];
	children: React.ReactNode;
}) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="flex h-svh overflow-hidden bg-background">
			{/* Desktop sidebar */}
			<div className="hidden lg:flex lg:flex-shrink-0">
				<Sidebar navItems={navItems} />
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
							navItems={navItems}
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
