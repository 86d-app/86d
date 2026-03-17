export default function AdminNotFound() {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
			<p className="font-bold font-mono text-7xl text-muted-foreground">404</p>
			<h1 className="mt-4 font-semibold text-foreground text-xl tracking-tight">
				Page not found
			</h1>
			<p className="mt-2 max-w-md text-muted-foreground text-sm">
				This admin page doesn&apos;t exist or has been removed.
			</p>
			<a
				href="/admin"
				className="mt-6 rounded-md bg-foreground px-4 py-2 font-medium text-background text-sm transition-colors hover:bg-foreground/90"
			>
				Back to dashboard
			</a>
		</div>
	);
}
