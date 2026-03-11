"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Currency {
	id: string;
	code: string;
	name: string;
	symbol: string;
	decimalPlaces: number;
	exchangeRate: number;
	isBase: boolean;
	isActive: boolean;
	symbolPosition: string;
	thousandsSeparator?: string;
	decimalSeparator?: string;
	roundingMode: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

// ---------------------------------------------------------------------------
// API hook
// ---------------------------------------------------------------------------

function useCurrencyApi() {
	const client = useModuleClient();
	return {
		listCurrencies: client.module("multi-currency").admin["/admin/currencies"],
		getCurrency: client.module("multi-currency").admin["/admin/currencies/:id"],
		createCurrency:
			client.module("multi-currency").admin["/admin/currencies/create"],
		updateCurrency:
			client.module("multi-currency").admin["/admin/currencies/:id/update"],
		deleteCurrency:
			client.module("multi-currency").admin["/admin/currencies/:id/delete"],
		setBase:
			client.module("multi-currency").admin["/admin/currencies/:id/set-base"],
		updateRate:
			client.module("multi-currency").admin["/admin/currencies/update-rate"],
		rateHistory:
			client.module("multi-currency").admin["/admin/currencies/rate-history"],
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function extractError(err: unknown): string {
	if (err && typeof err === "object" && "message" in err) {
		return String((err as { message: string }).message);
	}
	return "An unexpected error occurred";
}

// ---------------------------------------------------------------------------
// CurrencyList — main currency list
// ---------------------------------------------------------------------------

export function CurrencyList() {
	const api = useCurrencyApi();

	const { data, isLoading } = api.listCurrencies.useQuery({}) as {
		data: { currencies?: Currency[] } | undefined;
		isLoading: boolean;
	};

	const deleteMutation = api.deleteCurrency.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};
	const setBaseMutation = api.setBase.useMutation() as {
		mutateAsync: (opts: { params: { id: string } }) => Promise<unknown>;
		isPending: boolean;
	};

	const currencies = data?.currencies ?? [];

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this currency? This cannot be undone.")) return;
		try {
			await deleteMutation.mutateAsync({ params: { id } });
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	const handleSetBase = async (id: string) => {
		if (!confirm("Set this currency as the base currency?")) return;
		try {
			await setBaseMutation.mutateAsync({ params: { id } });
			window.location.reload();
		} catch {
			// silently handled
		}
	};

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">Currencies</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage store currencies and exchange rates
					</p>
				</div>
				<a
					href="/admin/currencies/new"
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90"
				>
					Add Currency
				</a>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-16 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : currencies.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No currencies configured. Add your base currency to get started.
					</p>
				</div>
			) : (
				<div className="overflow-x-auto rounded-md border border-border">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-border border-b bg-muted">
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Currency
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Code
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Symbol
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Rate
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Status
								</th>
								<th className="px-4 py-2 font-medium text-muted-foreground">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{currencies.map((c) => (
								<tr key={c.id} className="transition-colors hover:bg-muted/50">
									<td className="px-4 py-2 text-foreground">
										<div className="flex items-center gap-2">
											{c.name}
											{c.isBase ? (
												<span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-800 text-xs dark:bg-indigo-900/30 dark:text-indigo-400">
													Base
												</span>
											) : null}
										</div>
									</td>
									<td className="px-4 py-2 font-mono text-foreground text-xs">
										{c.code}
									</td>
									<td className="px-4 py-2 text-foreground">{c.symbol}</td>
									<td className="px-4 py-2 font-mono text-foreground text-xs">
										{c.isBase ? "1.000000" : c.exchangeRate.toFixed(6)}
									</td>
									<td className="px-4 py-2">
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
												c.isActive
													? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
													: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
											}`}
										>
											{c.isActive ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-4 py-2">
										<div className="flex gap-1">
											<a
												href={`/admin/currencies/${c.id}`}
												className="rounded px-2 py-1 text-xs hover:bg-muted"
											>
												View
											</a>
											<a
												href={`/admin/currencies/${c.id}/edit`}
												className="rounded px-2 py-1 text-xs hover:bg-muted"
											>
												Edit
											</a>
											{!c.isBase ? (
												<>
													<button
														type="button"
														onClick={() => handleSetBase(c.id)}
														className="rounded px-2 py-1 text-xs hover:bg-muted"
													>
														Set Base
													</button>
													<button
														type="button"
														onClick={() => handleDelete(c.id)}
														className="rounded px-2 py-1 text-red-600 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
													>
														Delete
													</button>
												</>
											) : null}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// CurrencyForm — create / edit a currency
// ---------------------------------------------------------------------------

export function CurrencyForm({ params }: { params?: { id?: string } } = {}) {
	const api = useCurrencyApi();
	const isEdit = Boolean(params?.id);
	const [code, setCode] = useState("");
	const [name, setName] = useState("");
	const [symbol, setSymbol] = useState("");
	const [decimalPlaces, setDecimalPlaces] = useState(2);
	const [exchangeRate, setExchangeRate] = useState(1);
	const [isActive, setIsActive] = useState(true);
	const [symbolPosition, setSymbolPosition] = useState("before");
	const [roundingMode, setRoundingMode] = useState("round");
	const [initialized, setInitialized] = useState(false);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);

	const { data: currencyData, isLoading } = isEdit
		? (api.getCurrency.useQuery({ params: { id: params?.id ?? "" } }) as {
				data: { currency?: Currency } | undefined;
				isLoading: boolean;
			})
		: { data: undefined, isLoading: false };

	const currency = currencyData?.currency;

	if (currency && !initialized) {
		setCode(currency.code);
		setName(currency.name);
		setSymbol(currency.symbol);
		setDecimalPlaces(currency.decimalPlaces);
		setExchangeRate(currency.exchangeRate);
		setIsActive(currency.isActive);
		setSymbolPosition(currency.symbolPosition);
		setRoundingMode(currency.roundingMode);
		setInitialized(true);
	}

	const createMutation = api.createCurrency.useMutation() as {
		mutateAsync: (opts: { body: Record<string, unknown> }) => Promise<unknown>;
		isPending: boolean;
	};
	const updateMutation = api.updateCurrency.useMutation() as {
		mutateAsync: (opts: {
			params: { id: string };
			body: Record<string, unknown>;
		}) => Promise<unknown>;
		isPending: boolean;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSaved(false);

		if (!code.trim() || !name.trim() || !symbol.trim()) {
			setError("Code, name, and symbol are required.");
			return;
		}

		try {
			if (isEdit && params?.id) {
				await updateMutation.mutateAsync({
					params: { id: params.id },
					body: {
						name: name.trim(),
						symbol: symbol.trim(),
						decimalPlaces,
						exchangeRate,
						isActive,
						symbolPosition,
						roundingMode,
					},
				});
				setSaved(true);
			} else {
				await createMutation.mutateAsync({
					body: {
						code: code.trim().toUpperCase(),
						name: name.trim(),
						symbol: symbol.trim(),
						decimalPlaces,
						exchangeRate,
						isActive,
						symbolPosition,
						roundingMode,
					},
				});
				window.location.href = "/admin/currencies";
			}
		} catch (err) {
			setError(extractError(err));
		}
	};

	if (isEdit && isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-muted/30" />
				<div className="h-64 animate-pulse rounded-lg border border-border bg-muted/30" />
			</div>
		);
	}

	if (isEdit && !currency && !isLoading) {
		return (
			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">Currency not found.</p>
				<a
					href="/admin/currencies"
					className="mt-2 inline-block text-sm underline"
				>
					Back to currencies
				</a>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/currencies"
					className="text-muted-foreground text-sm hover:underline"
				>
					&larr; Back to currencies
				</a>
				<h1 className="mt-2 font-bold text-2xl text-foreground">
					{isEdit ? "Edit Currency" : "Add Currency"}
				</h1>
			</div>

			{error ? (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
					{error}
				</div>
			) : null}
			{saved ? (
				<div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
					Currency saved successfully.
				</div>
			) : null}

			<form
				onSubmit={handleSubmit}
				className="max-w-2xl space-y-4 rounded-lg border border-border bg-card p-5"
			>
				<div className="grid gap-4 sm:grid-cols-3">
					<label className="block">
						<span className="mb-1 block font-medium text-sm">
							Code (ISO 4217)
						</span>
						<input
							type="text"
							value={code}
							onChange={(e) => setCode(e.target.value)}
							placeholder="USD"
							maxLength={3}
							disabled={isEdit}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm uppercase disabled:opacity-50"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Name</span>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="US Dollar"
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">Symbol</span>
						<input
							type="text"
							value={symbol}
							onChange={(e) => setSymbol(e.target.value)}
							placeholder="$"
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
				</div>

				<div className="grid gap-4 sm:grid-cols-3">
					<label className="block">
						<span className="mb-1 block font-medium text-sm">
							Decimal Places
						</span>
						<input
							type="number"
							value={decimalPlaces}
							onChange={(e) =>
								setDecimalPlaces(Number.parseInt(e.target.value, 10) || 0)
							}
							min={0}
							max={8}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">
							Exchange Rate
						</span>
						<input
							type="number"
							value={exchangeRate}
							onChange={(e) =>
								setExchangeRate(Number.parseFloat(e.target.value) || 0)
							}
							step="0.000001"
							min={0}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						/>
					</label>
					<label className="block">
						<span className="mb-1 block font-medium text-sm">
							Symbol Position
						</span>
						<select
							value={symbolPosition}
							onChange={(e) => setSymbolPosition(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						>
							<option value="before">Before ($100)</option>
							<option value="after">After (100$)</option>
						</select>
					</label>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<label className="block">
						<span className="mb-1 block font-medium text-sm">
							Rounding Mode
						</span>
						<select
							value={roundingMode}
							onChange={(e) => setRoundingMode(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
						>
							<option value="round">Round</option>
							<option value="ceil">Ceil</option>
							<option value="floor">Floor</option>
						</select>
					</label>
					<label className="flex items-center gap-2 self-end pb-2">
						<input
							type="checkbox"
							checked={isActive}
							onChange={(e) => setIsActive(e.target.checked)}
							className="rounded border-border"
						/>
						<span className="font-medium text-sm">Active</span>
					</label>
				</div>

				<button
					type="submit"
					disabled={createMutation.isPending || updateMutation.isPending}
					className="rounded-lg bg-foreground px-4 py-2 font-medium text-background text-sm hover:opacity-90 disabled:opacity-50"
				>
					{createMutation.isPending || updateMutation.isPending
						? "Saving..."
						: isEdit
							? "Save Changes"
							: "Create Currency"}
				</button>
			</form>
		</div>
	);
}

// ---------------------------------------------------------------------------
// CurrencyDetail — view currency details + rate history
// ---------------------------------------------------------------------------

export function CurrencyDetail({ params }: { params: { id: string } }) {
	const api = useCurrencyApi();

	const { data, isLoading } = api.getCurrency.useQuery({
		params: { id: params.id },
	}) as {
		data: { currency?: Currency; error?: string } | undefined;
		isLoading: boolean;
	};

	const currency = data?.currency;

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="h-8 w-48 animate-pulse rounded bg-muted/30" />
				<div className="h-48 animate-pulse rounded-lg border border-border bg-muted/30" />
			</div>
		);
	}

	if (!currency) {
		return (
			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">Currency not found.</p>
				<a
					href="/admin/currencies"
					className="mt-2 inline-block text-sm underline"
				>
					Back to currencies
				</a>
			</div>
		);
	}

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/currencies"
					className="text-muted-foreground text-sm hover:underline"
				>
					&larr; Back to currencies
				</a>
				<div className="mt-2 flex items-center gap-3">
					<h1 className="font-bold text-2xl text-foreground">
						{currency.name} ({currency.code})
					</h1>
					{currency.isBase ? (
						<span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-800 text-xs dark:bg-indigo-900/30 dark:text-indigo-400">
							Base Currency
						</span>
					) : null}
					<span
						className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
							currency.isActive
								? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
								: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
						}`}
					>
						{currency.isActive ? "Active" : "Inactive"}
					</span>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						Details
					</h2>
					<dl className="space-y-3 text-sm">
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Symbol</dt>
							<dd className="font-medium text-foreground">{currency.symbol}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Exchange Rate</dt>
							<dd className="font-mono text-foreground">
								{currency.exchangeRate.toFixed(6)}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Decimal Places</dt>
							<dd className="text-foreground">{currency.decimalPlaces}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Symbol Position</dt>
							<dd className="text-foreground">{currency.symbolPosition}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Rounding</dt>
							<dd className="text-foreground">{currency.roundingMode}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Sort Order</dt>
							<dd className="text-foreground">{currency.sortOrder}</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-muted-foreground">Created</dt>
							<dd className="text-foreground">
								{formatDate(currency.createdAt)}
							</dd>
						</div>
					</dl>
				</div>

				<div className="rounded-lg border border-border bg-card p-5">
					<h2 className="mb-4 font-semibold text-foreground text-sm">
						Actions
					</h2>
					<div className="space-y-2">
						<a
							href={`/admin/currencies/${params.id}/edit`}
							className="block rounded-lg border border-border px-4 py-2 text-center text-sm hover:bg-muted"
						>
							Edit Currency
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
