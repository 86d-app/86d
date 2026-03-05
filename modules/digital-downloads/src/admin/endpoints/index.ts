import { createFile } from "./create-file";
import { createToken } from "./create-token";
import { deleteFile } from "./delete-file";
import { listFiles } from "./list-files";
import { listTokens } from "./list-tokens";

export const adminEndpoints = {
	"/admin/downloads/files": listFiles,
	"/admin/downloads/files/create": createFile,
	"/admin/downloads/files/:id/delete": deleteFile,
	"/admin/downloads/tokens": listTokens,
	"/admin/downloads/tokens/create": createToken,
};
