import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import fs from "node:fs/promises";
import JSONC from "jsonc-parser";
import { async as syncdir } from "sync-directory";

async function main() {
  const args = parseArgs({
    args: process.argv.slice(2),
    options: {
      version: {
        type: "string",
        default: "0.0.1",
        short: "v",
      },
    },
  });

  const ver = args.values.version.split(".").map(Number);

  if (ver.length !== 3) {
    console.error("The version must be 3 digits separated with dot (.)!");
    return;
  }

  await Promise.all([
    syncdir("src/bp", "dist/bp", { deleteOrphaned: true }),
    syncdir("src/rp", "dist/rp", { deleteOrphaned: true }),
  ]);

  // Modify behavior pack manifest

  const bpManifestText = await fs.readFile("dist/bp/manifest.json", {
    encoding: "utf8",
  });
  const bpManifestObj = JSONC.parse(bpManifestText);
  bpManifestObj.header.name = `Slasher Sword ${ver[0]}.${ver[1]}.${ver[2]} [BP]`;
  bpManifestObj.header.version = ver;
  bpManifestObj.dependencies[0].version = ver;

  await fs.writeFile(
    "dist/bp/manifest.json",
    JSON.stringify(bpManifestObj, null, 2),
    {
      encoding: "utf8",
    },
  );

  // Modify resource pack manifest

  const rpManifestText = await fs.readFile("dist/rp/manifest.json", {
    encoding: "utf8",
  });
  const rpManifestObj = JSONC.parse(rpManifestText);
  rpManifestObj.header.name = `Slasher Sword ${ver[0]}.${ver[1]}.${ver[2]} [RP]`;
  rpManifestObj.header.version = ver;

  await fs.writeFile(
    "dist/rp/manifest.json",
    JSON.stringify(rpManifestObj, null, 2),
    {
      encoding: "utf8",
    },
  );

  console.log("Generated packs in dist/");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
