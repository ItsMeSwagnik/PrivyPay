/**
 * Vendor @aztec/bb.js's browser build into public/vendor/bb/.
 * Run via `node scripts/vendor-bb.mjs` (called by predev/prebuild).
 *
 * bb.js spawns its wasm Web Worker with a webpackIgnore import.meta.url-
 * relative path. Bundling it breaks the worker resolution. Serving the intact
 * dest/browser/ at a stable public path lets it resolve correctly at runtime.
 */
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, "..");

function findBrowserDir() {
  const candidates = [];
  // pnpm store under frontend node_modules
  const pnpmDir = join(frontendRoot, "node_modules", ".pnpm");
  if (existsSync(pnpmDir)) {
    for (const name of readdirSync(pnpmDir)) {
      if (name.startsWith("@aztec+bb.js@")) {
        candidates.push(join(pnpmDir, name, "node_modules", "@aztec", "bb.js", "dest", "browser"));
      }
    }
  }
  // hoisted under frontend node_modules
  candidates.push(join(frontendRoot, "node_modules", "@aztec", "bb.js", "dest", "browser"));
  return candidates.find((d) => existsSync(join(d, "index.js")));
}

const destDir = resolve(frontendRoot, "public", "vendor", "bb");

// Already vendored — nothing to do.
if (existsSync(join(destDir, "index.js"))) {
  console.log("✓ @aztec/bb.js already vendored at public/vendor/bb — skipping");
  process.exit(0);
}

const srcDir = findBrowserDir();
if (!srcDir) {
  console.warn("⚠  could not locate @aztec/bb.js dest/browser — ZK proving will not work.");
  console.warn("   Run `pnpm install` in the stellar-confidential-token-demo-main workspace first,");
  console.warn("   then re-run this script.");
  process.exit(0);
}

await mkdir(destDir, { recursive: true });
await cp(srcDir, destDir, { recursive: true });

const files = await readdir(destDir);
console.log(`✓ vendored @aztec/bb.js browser build`);
console.log(`  from ${srcDir}`);
console.log(`  to   ${destDir}`);
console.log(`  files: ${files.join(", ")}`);
