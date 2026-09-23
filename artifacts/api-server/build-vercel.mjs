import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { mkdir, rm } from "node:fs/promises";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const apiDir = path.resolve(artifactDir, "api");
  await rm(apiDir, { recursive: true, force: true });
  await mkdir(apiDir, { recursive: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "cjs",
    outfile: path.join(apiDir, "index.js"),
    logLevel: "info",
    // Keep native/optional deps external; rest is bundled so workspace packages resolve
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "pg-native",
      "fsevents",
    ],
    sourcemap: false,
  });

  console.log("Vercel serverless bundle written to api/index.js");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
