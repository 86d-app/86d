import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
	FetchResult,
	ModuleSpecifier,
	RegistryManifest,
} from "./types.js";

/**
 * Fetch a module from its remote source and install it into `modules/`.
 *
 * Returns the local path where the module was installed.
 */
export async function fetchModule(
	spec: ModuleSpecifier,
	root: string,
	manifest?: RegistryManifest,
): Promise<FetchResult> {
	switch (spec.source) {
		case "local":
			return {
				success: true,
				localPath: join(root, "modules", spec.name),
			};

		case "registry":
			return fetchFromRegistry(spec, root, manifest);

		case "github":
			return fetchFromGitHub(spec, root);

		case "npm":
			return fetchFromNpm(spec, root);
	}
}

/**
 * Fetch a module from the 86d registry (downloads from GitHub).
 */
async function fetchFromRegistry(
	spec: ModuleSpecifier,
	root: string,
	manifest?: RegistryManifest,
): Promise<FetchResult> {
	if (!manifest) {
		return {
			success: false,
			error: `No registry manifest available to resolve "${spec.name}"`,
		};
	}

	const entry = manifest.modules[spec.name];
	if (!entry) {
		return {
			success: false,
			error: `Module "${spec.name}" not found in registry`,
		};
	}

	// Parse baseUrl to get owner/repo
	const repoMatch = manifest.baseUrl.match(/github\.com\/([^/]+\/[^/]+)/);
	if (!repoMatch) {
		return {
			success: false,
			error: `Invalid registry baseUrl: ${manifest.baseUrl}`,
		};
	}

	const ghSpec: ModuleSpecifier = {
		...spec,
		source: "github",
		repo: repoMatch[1],
		path: entry.path,
		ref: manifest.defaultRef,
	};

	return fetchFromGitHub(ghSpec, root);
}

/**
 * Fetch a module from a GitHub repository using the GitHub API.
 *
 * Downloads the directory contents via the GitHub tarball API,
 * extracts the module path, and writes it to `modules/{name}/`.
 */
async function fetchFromGitHub(
	spec: ModuleSpecifier,
	root: string,
): Promise<FetchResult> {
	const { repo, path, ref = "main", name } = spec;
	if (!repo) {
		return {
			success: false,
			error: `GitHub specifier "${spec.raw}" missing repo`,
		};
	}

	const targetDir = join(root, "modules", name);

	// If already exists, skip
	if (existsSync(targetDir) && existsSync(join(targetDir, "package.json"))) {
		return { success: true, localPath: targetDir };
	}

	try {
		// Download tarball via GitHub API
		const tarballUrl = `https://api.github.com/repos/${repo}/tarball/${ref}`;
		const tmpDir = join(root, ".86d", "tmp", `${name}-${Date.now()}`);
		mkdirSync(tmpDir, { recursive: true });

		const tarballPath = join(tmpDir, "archive.tar.gz");

		// Fetch the tarball
		const response = await fetch(tarballUrl, {
			headers: {
				Accept: "application/vnd.github+json",
				"User-Agent": "86d-registry",
				...(process.env.GITHUB_TOKEN
					? {
							Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
						}
					: {}),
			},
			redirect: "follow",
		});

		if (!response.ok) {
			rmSync(tmpDir, { recursive: true, force: true });
			return {
				success: false,
				error: `GitHub API returned ${response.status} for ${repo}@${ref}`,
			};
		}

		// Write tarball to disk
		const buffer = Buffer.from(await response.arrayBuffer());
		writeFileSync(tarballPath, buffer);

		// Extract the specific path from the tarball
		const subpath = path ?? "";
		const extractDir = join(tmpDir, "extracted");
		mkdirSync(extractDir, { recursive: true });

		// Extract tarball
		execSync(`tar xzf "${tarballPath}" -C "${extractDir}"`, {
			stdio: "pipe",
		});

		// Find the extracted root directory (GitHub tarballs have a prefix dir)
		const { readdirSync } = await import("node:fs");
		const extractedDirs = readdirSync(extractDir);
		if (extractedDirs.length === 0) {
			rmSync(tmpDir, { recursive: true, force: true });
			return {
				success: false,
				error: "Tarball extraction produced no files",
			};
		}

		const extractedRoot = join(extractDir, extractedDirs[0]);
		const sourcePath = subpath ? join(extractedRoot, subpath) : extractedRoot;

		if (!existsSync(sourcePath)) {
			rmSync(tmpDir, { recursive: true, force: true });
			return {
				success: false,
				error: `Path "${subpath}" not found in ${repo}@${ref}`,
			};
		}

		// Copy to target
		mkdirSync(targetDir, { recursive: true });
		execSync(`cp -R "${sourcePath}/"* "${targetDir}/"`, {
			stdio: "pipe",
		});

		// Clean up temp files
		rmSync(tmpDir, { recursive: true, force: true });

		return { success: true, localPath: targetDir };
	} catch (err) {
		return {
			success: false,
			error: `Failed to fetch from GitHub: ${err instanceof Error ? err.message : String(err)}`,
		};
	}
}

/**
 * Install a module from npm into `node_modules/`.
 *
 * Uses `bun add` (preferred) or `npm install` to add the package.
 * For npm modules, the code stays in node_modules rather than modules/.
 */
async function fetchFromNpm(
	spec: ModuleSpecifier,
	root: string,
): Promise<FetchResult> {
	const storeDir = join(root, "apps", "store");
	const versionSuffix =
		spec.version && spec.version !== "latest" ? `@${spec.version}` : "";
	const installTarget = `${spec.packageName}${versionSuffix}`;

	try {
		// Try bun first, fall back to npm
		try {
			execSync(`bun add "${installTarget}"`, {
				cwd: storeDir,
				stdio: "pipe",
			});
		} catch {
			execSync(`npm install "${installTarget}"`, {
				cwd: storeDir,
				stdio: "pipe",
			});
		}

		const localPath = join(root, "node_modules", spec.packageName);
		if (existsSync(localPath)) {
			return { success: true, localPath };
		}

		return {
			success: false,
			error: `Package "${spec.packageName}" was installed but not found in node_modules`,
		};
	} catch (err) {
		return {
			success: false,
			error: `Failed to install from npm: ${err instanceof Error ? err.message : String(err)}`,
		};
	}
}

/**
 * Ensure the `.86d/` cache directory exists.
 */
export function ensureCacheDir(root: string): string {
	const cacheDir = join(root, ".86d");
	mkdirSync(cacheDir, { recursive: true });
	return cacheDir;
}
