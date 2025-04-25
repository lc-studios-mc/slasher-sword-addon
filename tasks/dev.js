import { async as syncdir } from "sync-directory";
import { getOutputTargetDirs } from "./utils.js";

const { bpTarget, rpTarget } = getOutputTargetDirs();

const chokidarWatchOptions = {
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100,
  },
  atomic: 100,
};

// @ts-ignore
const afterEachSync = (info) => {
  console.log(`${info?.eventType}: ${info?.srcPath}`);
};

console.clear();

await Promise.all([
  syncdir("src/bp", bpTarget, {
    watch: true,
    deleteOrphaned: true,
    chokidarWatchOptions,
    afterEachSync,
  }),
  syncdir("src/rp", rpTarget, {
    watch: true,
    deleteOrphaned: true,
    chokidarWatchOptions,
    afterEachSync,
  }),
]);

process.once("SIGINT", () => {
  console.clear();
  console.log("Stopped watching");
  process.exit(0);
});
