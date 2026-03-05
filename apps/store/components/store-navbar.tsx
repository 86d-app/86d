"use client";

import { useTheme } from "next-themes";
import type React from "react";
import { useCallback, useState } from "react";
import {
	useEffectOnce,
	useKeyPressEvent,
	useLockBodyScroll,
	useWindowScroll,
} from "react-use";
import NavbarTemplate from "template/navbar.mdx";

interface NavItem {
	label: string;
	href: string;
}

interface StoreNavbarProps {
	config: {
		name: string;
		logo: { light: string; dark: string };
	};
	navItems: NavItem[];
	actions?: React.ReactNode;
}

export function StoreNavbar({ config, navItems, actions }: StoreNavbarProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const { y } = useWindowScroll();
	const { resolvedTheme, setTheme } = useTheme();

	useEffectOnce(() => setMounted(true));

	useLockBodyScroll(isOpen);

	useKeyPressEvent("Escape", () => setIsOpen(false));

	const scrolled = y > 8;
	const logo =
		mounted && resolvedTheme === "dark" ? config.logo.dark : config.logo.light;

	const handleNavClick = useCallback(() => setIsOpen(false), []);

	const toggleTheme = useCallback(() => {
		setTheme(resolvedTheme === "dark" ? "light" : "dark");
	}, [resolvedTheme, setTheme]);

	const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);

	return (
		<NavbarTemplate
			logo={logo}
			storeName={config.name}
			navItems={navItems}
			actions={actions}
			scrolled={scrolled}
			isOpen={isOpen}
			handleNavClick={handleNavClick}
			toggleMenu={toggleMenu}
			mounted={mounted}
			resolvedTheme={resolvedTheme ?? "light"}
			toggleTheme={toggleTheme}
		/>
	);
}
