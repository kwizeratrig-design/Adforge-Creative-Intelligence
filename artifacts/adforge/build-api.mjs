import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const adforgeDir = path.dirname(fileURLToPath(import.meta.url));
const apiServerSrc = path.resolve(adforgeDir, "../api-server/src/index.ts");
const outfile = path.resolve(adforgeDir, "api/index.js");

await esbuild({
  entryPoints: [apiServerSrc],
  platform: "node",
  target: "node20",
  bundle: true,
  format: "cjs",
  outfile,
  logLevel: "info",
  external: ["*.node", "sharp", "better-sqlite3", "sqlite3", "pg-native", "fsevents"],
  sourcemap: false,
});

console.log("API serverless bundle ->", outfile);
