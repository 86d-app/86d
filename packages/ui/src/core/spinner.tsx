interface SpinnerProps {
	className?: string;
	size?: "sm" | "md" | "lg";
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
	const sizeMap = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
	return (
		<output
			className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeMap[size]} ${className ?? ""}`}
		>
			<span className="sr-only">Loading...</span>
		</output>
	);
}
