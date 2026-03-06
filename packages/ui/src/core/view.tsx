import type React from "react";

interface ViewProps {
	children?: React.ReactNode;
	className?: string;
	as?: keyof React.JSX.IntrinsicElements;
}

export function View({
	children,
	className,
	as: Component = "div",
}: ViewProps) {
	return <Component className={className}>{children}</Component>;
}
