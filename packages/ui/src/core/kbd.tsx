import type React from "react";

interface KbdProps {
	children?: React.ReactNode;
	className?: string;
}

export function Kbd({ children, className }: KbdProps) {
	return (
		<kbd
			className={`inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-medium font-mono text-[0.625rem] text-muted-foreground ${className ?? ""}`}
		>
			{children}
		</kbd>
	);
}
