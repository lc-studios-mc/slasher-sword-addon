import path from "node:path";
import { homedir } from "node:os";

/**
 * @returns {{bpTarget: string, rpTarget: string}}
 */
export function getOutputTargetDirs() {
  const comMojang = path.join(
    homedir(),
    "AppData/Local/Packages",
    "Microsoft.MinecraftUWP_8wekyb3d8bbwe",
    "LocalState/games/com.mojang",
  );

  const devBehaviorPacks = path.join(comMojang, "development_behavior_packs");
  const devResourcePacks = path.join(comMojang, "development_resource_packs");

  const bpTarget = path.join(devBehaviorPacks, "Slasher_BP");
  const rpTarget = path.join(devResourcePacks, "Slasher_RP");

  return {
    bpTarget,
    rpTarget,
  };
}
