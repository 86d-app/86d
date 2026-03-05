"use client";

import { makeAutoObservable } from "mobx";
import { createContext, useContext } from "react";
import config from "template/config.json";
import type { Config } from "~/config";
import packageJson from "../package.json";

export function createAppState() {
	return makeAutoObservable({
		package: packageJson,
		config: config as Config,
	});
}

export type AppState = ReturnType<typeof createAppState>;

const AppStateContext = createContext<AppState | null>(null);

const appState = createAppState();

export function AppStateProvider({ children }: { children: React.ReactNode }) {
	return (
		<AppStateContext.Provider value={appState}>
			{children}
		</AppStateContext.Provider>
	);
}

export function useAppState() {
	const context = useContext(AppStateContext);
	if (!context) {
		throw new Error("useAppState must be used within an AppStateProvider");
	}
	return context;
}
