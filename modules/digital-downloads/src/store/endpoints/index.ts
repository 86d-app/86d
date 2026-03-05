import { listMyDownloads } from "./list-my-downloads";
import { storeSearch } from "./store-search";
import { useDownload } from "./use-download";

export const storeEndpoints = {
	"/digital-downloads/store-search": storeSearch,
	"/downloads/:token": useDownload,
	"/downloads/me": listMyDownloads,
};
