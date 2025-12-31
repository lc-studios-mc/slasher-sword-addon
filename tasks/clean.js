import { getOutputTargetDirs } from "./utils.js";
import { rm } from "fs/promises";

const { bpTarget, rpTarget } = getOutputTargetDirs();

try {
  await rm(bpTarget, { recursive: true });
  console.error("Successfully removed BP output");
} catch {
  console.error("Failed to remove BP output");
}

try {
  await rm(rpTarget, { recursive: true });
  console.error("Successfully removed RP output");
} catch {
  console.error("Failed to remove RP output");
}
