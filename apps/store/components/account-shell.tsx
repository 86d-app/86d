"use client";

import { usePathname } from "next/navigation";

interface AccountNavItem {
	label: string;
	href: string;
	icon: React.ReactNode;
}

const NAV_ITEMS: AccountNavItem[] = [
	{
		label: "Overview",
		href: "/account",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<rect width="7" height="9" x="3" y="3" rx="1" />
				<rect width="7" height="5" x="14" y="3" rx="1" />
				<rect width="7" height="9" x="14" y="12" rx="1" />
				<rect width="7" height="5" x="3" y="16" rx="1" />
			</svg>
		),
	},
	{
		label: "Orders",
		href: "/account/orders",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M16 16h6" />
				<path d="M16 20h6" />
				<path d="M16 12h6" />
				<path d="M10 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
				<path d="M10 4V2" />
				<path d="M10 4a2 2 0 0 1 0 4H4" />
			</svg>
		),
	},
	{
		label: "Returns",
		href: "/account/returns",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M9 14 4 9l5-5" />
				<path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
			</svg>
		),
	},
	{
		label: "Reviews",
		href: "/account/reviews",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
			</svg>
		),
	},
	{
		label: "Profile",
		href: "/account/profile",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
				<circle cx="12" cy="7" r="4" />
			</svg>
		),
	},
	{
		label: "Addresses",
		href: "/account/addresses",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
				<circle cx="12" cy="10" r="3" />
			</svg>
		),
	},
	{
		label: "Wishlist",
		href: "/account/wishlist",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
			</svg>
		),
	},
	{
		label: "Loyalty",
		href: "/account/loyalty",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
			</svg>
		),
	},
	{
		label: "Subscriptions",
		href: "/account/subscriptions",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
				<path d="m9 12 2 2 4-4" />
			</svg>
		),
	},
	{
		label: "Downloads",
		href: "/account/downloads",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
		),
	},
];

function NavItem({
	item,
	isActive,
}: {
	item: AccountNavItem;
	isActive: boolean;
}) {
	return (
		<a
			href={item.href}
			className={`flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium text-sm transition-colors ${
				isActive
					? "bg-foreground text-background"
					: "text-muted-foreground hover:bg-muted hover:text-foreground"
			}`}
		>
			{item.icon}
			{item.label}
		</a>
	);
}

export function AccountShell({
	userName,
	userEmail,
	children,
}: {
	userName: string;
	userEmail: string;
	children: React.ReactNode;
}) {
	const pathname = usePathname();

	return (
		<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
			{/* Mobile nav — horizontal scrollable */}
			<div className="mb-6 lg:hidden">
				<div className="mb-4">
					<h1 className="font-bold font-display text-foreground text-xl tracking-tight">
						My Account
					</h1>
					<p className="mt-0.5 text-muted-foreground text-sm">{userEmail}</p>
				</div>
				<nav
					className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 pb-2"
					aria-label="Account navigation"
				>
					{NAV_ITEMS.map((item) => {
						const isActive =
							item.href === "/account"
								? pathname === "/account"
								: pathname.startsWith(item.href);
						return (
							<a
								key={item.href}
								href={item.href}
								className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium text-sm transition-colors ${
									isActive
										? "border-foreground bg-foreground text-background"
										: "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
								}`}
							>
								{item.label}
							</a>
						);
					})}
				</nav>
			</div>

			<div className="flex gap-8 lg:gap-12">
				{/* Desktop sidebar */}
				<aside className="hidden w-52 shrink-0 lg:block">
					<div className="mb-6">
						<h1 className="font-bold font-display text-foreground text-xl tracking-tight">
							My Account
						</h1>
						<p className="mt-0.5 truncate text-muted-foreground text-sm">
							{userName}
						</p>
					</div>
					<nav
						className="flex flex-col gap-0.5"
						aria-label="Account navigation"
					>
						{NAV_ITEMS.map((item) => {
							const isActive =
								item.href === "/account"
									? pathname === "/account"
									: pathname.startsWith(item.href);
							return (
								<NavItem key={item.href} item={item} isActive={isActive} />
							);
						})}
					</nav>
					<div className="mt-6 border-border border-t pt-4">
						<a
							href="/signout"
							className="flex items-center gap-2.5 rounded-lg px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
								<polyline points="16 17 21 12 16 7" />
								<line x1="21" y1="12" x2="9" y2="12" />
							</svg>
							Sign out
						</a>
					</div>
				</aside>

				{/* Main content */}
				<div className="min-w-0 flex-1">{children}</div>
			</div>
		</div>
	);
}
