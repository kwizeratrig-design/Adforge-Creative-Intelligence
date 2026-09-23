import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { mkdir, rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

const external = [
  "*.node",
  "sharp",
  "better-sqlite3",
  "sqlite3",
  "canvas",
  "bcrypt",
  "argon2",
  "fsevents",
  "pg-native",
  "pg",
  "pg-pool",
];

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  const apiDir = path.resolve(artifactDir, "api");
  await rm(distDir, { recursive: true, force: true });
  await rm(apiDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await mkdir(apiDir, { recursive: true });

  // Local/long-running server (ESM)
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: path.join(distDir, "index.mjs"),
    logLevel: "info",
    external,
    sourcemap: "linked",
    plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
    },
  });

  // Vercel serverless: CJS handler at api/index.js (discovered after build)
  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.join(apiDir, "index.js"),
    logLevel: "info",
    external,
    sourcemap: false,
    plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
