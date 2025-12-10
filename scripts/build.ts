import * as builder from "@mcbe-toolbox-lc/builder";
import packageConfig from "../package.json" with { type: "json" };
import path from "node:path";

// Important environment variables

const isDev = Boolean(builder.getEnv("DEV"));

const version = builder.getEnvWithFallback("VERSION", "0.0.1");
const versionArray = builder.parseVersionString(version); // e.g., [0, 0, 1]
const versionLabel = "v" + versionArray.join("."); // e.g., "v0.0.1"

const shouldWatch = Boolean(builder.getEnv("WATCH")); // Whether to watch for file changes and rebuild

// Manifest is defined similarly to the traditional method:
// https://learn.microsoft.com/en-us/minecraft/creator/reference/content/addonsreference/packmanifest?view=minecraft-bedrock-stable
//
// Except that we have the power of scripting here!
// These manifest objects are later stringified to JSON.

const addonNameLabel = "Slasher Sword Add-on"; // Human-readable name
const addonNameSlug = "slasher-sword-addon"; // Directory name slug
const minEngineVersion = [1, 21, 130];
const minecraftPackageVersions = builder.getMinecraftPackageVersions(packageConfig);

// https://www.uuidgenerator.net/version4
const uuids = {
	bpHeader: "1befb50e-e7e6-4e57-a2a1-6fb02401b5b4",
	bpDataModule: "f5bb10a4-bb83-4a79-bdc2-5791f217db4e",
	bpScriptsModule: "50b1ef37-c8d5-4304-afac-626973037e7d", // Should match the "targetModuleUuid" field in .vscode/launch.json
	rpHeader: "391740f4-8b39-40c3-8785-3cda206c3b7d",
	rpResourcesModule: "52f43759-faa8-4afe-95dc-df46e11c0255",
} as const;

const bpManifest = {
	format_version: 2,
	header: {
		name: `${addonNameLabel} ${isDev ? "DEV" : versionLabel}`,
		description: "Extremely mobile chainsaw sword!",
		uuid: uuids.bpHeader,
		version: versionArray,
		min_engine_version: minEngineVersion,
	},
	modules: [
		{
			type: "data",
			uuid: uuids.bpDataModule,
			version: versionArray,
		},
		{
			language: "javascript",
			type: "script",
			uuid: uuids.bpScriptsModule,
			version: versionArray,
			entry: "scripts/index.js",
		},
	],
	dependencies: [
		{
			// Resource pack dependency
			uuid: uuids.rpHeader,
			version: versionArray,
		},
		{
			module_name: "@minecraft/server",
			version: minecraftPackageVersions["@minecraft/server"].replace("^", ""),
		},
	],
};

const rpManifest = {
	format_version: 2,
	header: {
		name: `${addonNameLabel} ${isDev ? "DEV" : versionLabel}`,
		description: "Extremely mobile chainsaw sword!",
		uuid: uuids.rpHeader,
		version: versionArray,
		min_engine_version: minEngineVersion,
	},
	modules: [
		{
			type: "resources",
			uuid: uuids.rpResourcesModule,
			version: versionArray,
		},
	],
	capabilities: ["pbr"],
};

// Define build target paths

const bpTargetDirs: string[] = [];
const rpTargetDirs: string[] = [];
const archiveOptions: builder.ArchiveOptions[] = [];

if (isDev) {
	const devBehaviorPacksDir = builder.getEnvRequired("DEV_BEHAVIOR_PACKS_DIR");
	const devResourcePacksDir = builder.getEnvRequired("DEV_RESOURCE_PACKS_DIR");

	bpTargetDirs.push("build/dev/bp");
	rpTargetDirs.push("build/dev/rp");
	bpTargetDirs.push(path.join(devBehaviorPacksDir!, `${addonNameSlug}-bp-dev`));
	rpTargetDirs.push(path.join(devResourcePacksDir!, `${addonNameSlug}-rp-dev`));
} else {
	const targetPathPrefix = `build/${versionLabel}`;

	bpTargetDirs.push(`${targetPathPrefix}/bp`);
	rpTargetDirs.push(`${targetPathPrefix}/rp`);

	const archivePath = path.join(targetPathPrefix, `${addonNameSlug}-${versionLabel}`);
	archiveOptions.push({ outFile: `${archivePath}.mcaddon` });
	archiveOptions.push({ outFile: `${archivePath}.zip` });
}

// Create a configuration object that will be passed to the build system

const config: builder.ConfigInput = {
	behaviorPack: {
		srcDir: "src/bp",
		targetDir: bpTargetDirs,
		manifest: bpManifest,
		scripts: {
			entry: "src/bp/scripts/index.ts",
			bundle: true,
			sourceMap: isDev,
		},
	},
	resourcePack: {
		srcDir: "src/rp",
		targetDir: rpTargetDirs,
		manifest: rpManifest,
		generateTextureList: true,
	},
	watch: shouldWatch,
	archive: archiveOptions,
	// logLevel: "debug",
};

// Build!

await builder.build(config);
