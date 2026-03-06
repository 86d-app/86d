"use client";

import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { createPortal } from "react-dom";

/* ── Command (root) ─────────────────────────────────────────────────────────── */

interface CommandProps {
	children?: ReactNode;
	className?: string;
	shouldFilter?: boolean;
	filter?: (value: string, search: string) => number;
}

export function Command({ children, className }: CommandProps) {
	const ref = useRef<HTMLDivElement>(null);

	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		const el = ref.current;
		if (!el) return;

		const items = Array.from(
			el.querySelectorAll<HTMLElement>("[data-cmdk-item]"),
		);
		if (!items.length) return;

		const current = el.querySelector<HTMLElement>(
			'[data-cmdk-item][data-active="true"]',
		);
		let idx = current ? items.indexOf(current) : -1;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			idx = idx < items.length - 1 ? idx + 1 : 0;
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			idx = idx > 0 ? idx - 1 : items.length - 1;
		} else if (e.key === "Enter" && current) {
			e.preventDefault();
			current.click();
			return;
		} else {
			return;
		}

		for (const [i, item] of items.entries()) {
			item.setAttribute("data-active", String(i === idx));
		}
		items[idx]?.scrollIntoView({ block: "nearest" });
	}, []);

	return (
		<div
			ref={ref}
			role="listbox"
			className={className}
			onKeyDown={handleKeyDown}
		>
			{children}
		</div>
	);
}

/* ── CommandDialog ──────────────────────────────────────────────────────────── */

interface CommandDialogProps {
	children?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	title?: string;
	description?: string;
	showCloseButton?: boolean;
}

export function CommandDialog({
	children,
	open,
	onOpenChange,
	title,
	description,
}: CommandDialogProps) {
	useEffect(() => {
		if (!open) return;
		const onEscape = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onOpenChange?.(false);
			}
		};
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		document.addEventListener("keydown", onEscape);
		return () => {
			document.body.style.overflow = prev;
			document.removeEventListener("keydown", onEscape);
		};
	}, [open, onOpenChange]);

	if (!open || typeof document === "undefined") return null;

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50"
				onClick={() => onOpenChange?.(false)}
				aria-hidden
			/>
			{/* Dialog */}
			<div
				role="dialog"
				aria-label={title}
				aria-describedby={description ? "cmdk-desc" : undefined}
				className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
			>
				{description ? (
					<p id="cmdk-desc" className="sr-only">
						{description}
					</p>
				) : null}
				{children}
			</div>
		</div>,
		document.body,
	);
}

/* ── CommandInput ───────────────────────────────────────────────────────────── */

interface CommandInputProps {
	placeholder?: string;
	value?: string;
	onValueChange?: (value: string) => void;
	className?: string;
}

export function CommandInput({
	placeholder,
	value,
	onValueChange,
	className,
}: CommandInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	return (
		<div className="flex items-center border-border border-b px-3">
			{/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative search icon */}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="mr-2 shrink-0 opacity-50"
				aria-hidden
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			<input
				ref={inputRef}
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onValueChange?.(e.target.value)}
				className={`flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground ${className ?? ""}`}
			/>
		</div>
	);
}

/* ── CommandList ────────────────────────────────────────────────────────────── */

interface CommandListProps {
	children?: ReactNode;
	className?: string;
}

export function CommandList({ children, className }: CommandListProps) {
	return (
		<div
			className={`max-h-[300px] overflow-y-auto overscroll-contain p-1 ${className ?? ""}`}
		>
			{children}
		</div>
	);
}

/* ── CommandEmpty ───────────────────────────────────────────────────────────── */

interface CommandEmptyProps {
	children?: ReactNode;
}

export function CommandEmpty({ children }: CommandEmptyProps) {
	return (
		<div className="py-6 text-center text-muted-foreground text-sm">
			{children}
		</div>
	);
}

/* ── CommandGroup ───────────────────────────────────────────────────────────── */

interface CommandGroupProps {
	heading?: string;
	children?: ReactNode;
}

export function CommandGroup({ heading, children }: CommandGroupProps) {
	return (
		<div className="overflow-hidden p-1">
			{heading ? (
				<div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
					{heading}
				</div>
			) : null}
			{children}
		</div>
	);
}

/* ── CommandItem ────────────────────────────────────────────────────────────── */

interface CommandItemProps {
	children?: ReactNode;
	value?: string;
	onSelect?: (value: string) => void;
	className?: string;
}

export function CommandItem({
	children,
	value,
	onSelect,
	className,
}: CommandItemProps) {
	return (
		<div
			data-cmdk-item=""
			data-active="false"
			role="option"
			tabIndex={-1}
			className={`relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground ${className ?? ""}`}
			onClick={() => onSelect?.(value ?? "")}
			onKeyDown={(e) => {
				if (e.key === "Enter") onSelect?.(value ?? "");
			}}
			onMouseMove={(e) => {
				const root = e.currentTarget
					.closest("[data-cmdk-item]")
					?.parentElement?.closest("div");
				const container = e.currentTarget.parentElement?.closest("div") ?? root;
				if (container) {
					for (const item of container.querySelectorAll("[data-cmdk-item]")) {
						(item as HTMLElement).setAttribute("data-active", "false");
					}
				}
				e.currentTarget.setAttribute("data-active", "true");
			}}
		>
			{children}
		</div>
	);
}

/* ── CommandLoading ─────────────────────────────────────────────────────────── */

interface CommandLoadingProps {
	children?: ReactNode;
}

export function CommandLoading({ children }: CommandLoadingProps) {
	return <div className="py-6 text-center text-sm">{children}</div>;
}
