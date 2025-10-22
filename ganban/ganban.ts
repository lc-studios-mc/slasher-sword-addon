import {
	build,
	getMinecraftPackageVersions,
	getRequiredEnv,
	getRequiredEnvWithFallback,
	parseVersionString,
	type BuildConfig,
} from "ganban";
import packageConfig from "../package.json" with { type: "json" };
import path from "node:path";

const isDevBuild = Boolean(getRequiredEnvWithFallback("DEV", ""));
const addonVersionArray = parseVersionString(getRequiredEnvWithFallback("ADDON_VERSION", "0.0.1"));
const addonVersionForHumans = "v" + addonVersionArray.join(".");

const minEngineVersion = [1, 21, 111];
const behaviorPackUuid = "804a9368-2712-41a1-bc5c-88f4c6b7ca2f";
const resourcePackUuid = "f3f3e039-7194-44d8-aefb-162db7966fa4";

const minecraftPackageVersions = getMinecraftPackageVersions(packageConfig);

const behaviorPackManifest = {
	format_version: 2,
	header: {
		description: "Extremely mobile chainsaw-sword for Minecraft Bedrock!",
		name: isDevBuild ? `Slasher Sword BP - DEV` : `Slasher Sword BP - ${addonVersionForHumans}`,
		uuid: behaviorPackUuid,
		version: addonVersionArray,
		min_engine_version: minEngineVersion,
	},
	modules: [
		{
			type: "data",
			uuid: "dda3f2d4-6940-4abd-b88b-78c67d58cca7",
			version: addonVersionArray,
		},
		{
			language: "javascript",
			type: "script",
			uuid: "3bde57e8-c9e6-4c5d-921b-d6c25d908c3a",
			version: addonVersionArray,
			entry: "scripts/main.js",
		},
	],
	dependencies: [
		{
			// Resource pack dependency
			uuid: resourcePackUuid,
			version: addonVersionArray,
		},
		{
			module_name: "@minecraft/server",
			version: minecraftPackageVersions["@minecraft/server"],
		},
	],
};

const resourcePackManifest = {
	format_version: 2,
	header: {
		description: "Extremely mobile chainsaw-sword for Minecraft Bedrock!",
		name: isDevBuild ? `Slasher Sword RP - DEV` : `Slasher Sword RP - ${addonVersionForHumans}`,
		uuid: resourcePackUuid,
		version: addonVersionArray,
		min_engine_version: minEngineVersion,
	},
	modules: [
		{
			type: "resources",
			uuid: "8bfcb130-10b0-463c-ba06-ac545bc76493",
			version: addonVersionArray,
		},
	],
	capabilities: ["pbr"],
};

const buildConfigRaw = {
	behaviorPack: {
		type: "behavior",
		srcDir: "src/bp",
		outDir: isDevBuild ? "build/dev/bp" : `build/${addonVersionForHumans}/bp`,
		targetDirs: [] as string[],
		manifest: behaviorPackManifest,
		scripts: {
			entry: "src/bp/scripts/main.ts",
			bundle: true,
			minify: false,
			sourceMap: isDevBuild,
			tsconfig: "tsconfig.json",
		},
	},
	resourcePack: {
		type: "resource",
		srcDir: "src/rp",
		outDir: isDevBuild ? "build/dev/rp" : `build/${addonVersionForHumans}/rp`,
		targetDirs: [] as string[],
		manifest: resourcePackManifest,
		generateTextureList: true,
	},
	watch: Boolean(getRequiredEnvWithFallback("WATCH", "")),
} satisfies BuildConfig;

const buildConfig: BuildConfig = buildConfigRaw;

if (isDevBuild) {
	const devBehaviorPacksDir = getRequiredEnv("DEV_BEHAVIOR_PACKS_DIR");
	const devResourcePacksDir = getRequiredEnv("DEV_RESOURCE_PACKS_DIR");

	buildConfigRaw.behaviorPack.targetDirs = [
		path.join(devBehaviorPacksDir, "slasher-sword-addon-bp-dev"),
	];
	buildConfigRaw.resourcePack.targetDirs = [
		path.join(devResourcePacksDir, "slasher-sword-addon-rp-dev"),
	];
}

// Create archive for release builds
if (!isDevBuild) {
	const archiveName = `build/${addonVersionForHumans}/slasher-sword-addon-${addonVersionForHumans}`;
	buildConfig.archives = [
		{
			outFile: `${archiveName}.mcaddon`,
		},
		{
			outFile: `${archiveName}.zip`,
		},
	];
}

await build(buildConfig);
