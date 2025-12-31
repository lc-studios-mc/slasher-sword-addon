import * as builder from "@mcbe-toolbox-lc/builder";
import path from "node:path";

// ===========================================================================
// ENVIRONMENT VARIABLES & SETUP
// ===========================================================================

// This script relies on environment variables injected by `dotenv-cli`.
// In your package.json, the build commands should look like:
// "build:dev": "dotenv -v DEV=1 -- tsx scripts/build.ts"
//
// This reads the `.env` file and makes variables (like DEV_BEHAVIOR_PACKS_DIR)

const isDev = Boolean(builder.getEnv("DEV"));
const shouldWatch = Boolean(builder.getEnv("WATCH")); // If true, rebuilds on file changes

// ===========================================================================
// PROJECT CONFIGURATION
// ===========================================================================

const addonConfig = {
	name: "Slasher Sword",
	description: "Powerful chainsaw-like sword!",
	slug: "slasher-sword-addon", // Used for file names
	minEngineVersion: [1, 21, 130], // Minimum Minecraft version required
} as const;

// Version handling: Default to 0.0.1 if VERSION env var is missing
const versionRaw = builder.getEnvWithFallback("VERSION", "0.0.1");
const versionArray = builder.parseVersionString(versionRaw); // [0, 0, 1]
const versionLabel = "v" + versionArray.join("."); // "v0.0.1"

// Dynamic Label: Adds "DEV" to the name in-game when in development mode
const displayName = `${addonConfig.name} ${isDev ? "DEV" : versionLabel}`;

// Unique identifiers for the pack modules.
// Generate new ones for every new project: https://www.uuidgenerator.net/version4
const uuids = {
	bpHeader: "fca3b80a-18ec-42f4-abe6-931892aa703e",
	bpDataModule: "f552d8b0-5f97-4443-bbe4-42eb85300423",
	bpScriptsModule: "511e48b8-500d-4a99-a66a-5b4ec0160461", // Matches "targetModuleUuid" in .vscode/launch.json
	rpHeader: "1182dd2e-8bfc-4b0e-a3b4-402e0e5b8c00",
	rpResourcesModule: "8346e1cb-0901-43ac-b822-5dc75bb826d5",
} as const;

// ===========================================================================
// MANIFEST DEFINITIONS
// ===========================================================================

// Manifests are defined similarly to the traditional method.
// Except that we have the power of scripting!

const bpManifest = {
	format_version: 2,
	header: {
		name: displayName,
		description: addonConfig.description,
		uuid: uuids.bpHeader,
		version: versionArray,
		min_engine_version: addonConfig.minEngineVersion,
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
			entry: "scripts/index.js", // The file result of the bundle process
		},
	],
	dependencies: [
		{
			uuid: uuids.rpHeader, // Depend on the resource pack
			version: versionArray,
		},

		// Scripting API dependencies.
		// UPDATE THESE when you update the corresponding npm packages!
		{
			module_name: "@minecraft/server",
			version: "2.4.0",
		},
	],
	metadata: {
		authors: ["LC Studios MC"],
		license: "CC0 1.0",
		product_type: "addon",
		url: "https://github.com/lc-studios-mc/slasher-sword-addon",
	},
};

const rpManifest = {
	format_version: 2,
	header: {
		name: displayName,
		description: addonConfig.description,
		uuid: uuids.rpHeader,
		version: versionArray,
		min_engine_version: addonConfig.minEngineVersion,
	},
	modules: [
		{
			type: "resources",
			uuid: uuids.rpResourcesModule,
			version: versionArray,
		},
	],
	// "pbr" enables Physically Based Rendering support (texture sets)
	// https://learn.microsoft.com/en-us/minecraft/creator/documents/vibrantvisuals/pbroverview?view=minecraft-bedrock-stable
	capabilities: ["pbr"],
	metadata: {
		authors: ["LC Studios MC"],
		license: "CC0 1.0",
		product_type: "addon",
		url: "https://github.com/lc-studios-mc/slasher-sword-addon",
	},
};

// ===========================================================================
// BUILD OUTPUT PATHS
// ===========================================================================

const bpTargetDirs: string[] = [];
const rpTargetDirs: string[] = [];
const archiveOptions: builder.ArchiveOptions[] = [];

if (isDev) {
	// DEVELOPMENT BUILD MODE
	// 1. Output to a local 'build' folder for inspection
	bpTargetDirs.push("build/dev/bp");
	rpTargetDirs.push("build/dev/rp");

	// 2. Output directly to the Minecraft's development pack folders (defined in .env)
	const devBpDir = builder.getEnvRequired("DEV_BEHAVIOR_PACKS_DIR");
	const devRpDir = builder.getEnvRequired("DEV_RESOURCE_PACKS_DIR");

	bpTargetDirs.push(path.join(devBpDir!, `${addonConfig.slug}-bp-dev`));
	rpTargetDirs.push(path.join(devRpDir!, `${addonConfig.slug}-rp-dev`));
} else {
	// RELEASE BUILD MODE
	// 1. Output to a versioned build folder
	const targetPathPrefix = `build/${versionLabel}`;
	bpTargetDirs.push(`${targetPathPrefix}/bp`);
	rpTargetDirs.push(`${targetPathPrefix}/rp`);

	// 2. Create .mcaddon and .zip archives for distribution
	const archivePath = path.join(targetPathPrefix, `${addonConfig.slug}-${versionLabel}`);
	archiveOptions.push({ outFile: `${archivePath}.mcaddon` });
	archiveOptions.push({ outFile: `${archivePath}.zip` });
}

// ===========================================================================
// EXECUTION
// ===========================================================================

const config: builder.ConfigInput = {
	behaviorPack: {
		srcDir: "src/bp",
		targetDir: bpTargetDirs,
		manifest: bpManifest,
		scripts: {
			entry: "src/bp/scripts/index.ts", // Your main TypeScript file
			bundle: true, // Bundles all imports into a single file
			sourceMap: isDev, // Generates .map files for debugging in VS Code
		},
	},
	resourcePack: {
		srcDir: "src/rp",
		targetDir: rpTargetDirs,
		manifest: rpManifest,
		generateTextureList: true, // Automatically updates texture_list.json
	},
	watch: shouldWatch,
	archive: archiveOptions,
	// logLevel: "debug", // Uncomment if you need more logs
};

await builder.build(config);
