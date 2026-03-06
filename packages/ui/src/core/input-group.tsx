import type React from "react";

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
	children?: React.ReactNode;
	className?: string;
}

export function InputGroup({ children, className, ...props }: InputGroupProps) {
	return (
		<div
			className={`group/input-group flex h-9 items-center gap-1 rounded-lg border border-input bg-background px-2.5 text-muted-foreground text-sm ring-ring transition-colors focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background ${className ?? ""}`}
			{...props}
		>
			{children}
		</div>
	);
}

interface InputGroupAddonProps {
	children?: React.ReactNode;
	className?: string;
	align?: string;
}

export function InputGroupAddon({ children, className }: InputGroupAddonProps) {
	return (
		<span
			className={`flex shrink-0 items-center text-muted-foreground ${className ?? ""}`}
		>
			{children}
		</span>
	);
}

interface InputGroupInputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	className?: string;
}

export function InputGroupInput({ className, ...props }: InputGroupInputProps) {
	return (
		<input
			className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground ${className ?? ""}`}
			{...props}
		/>
	);
}
