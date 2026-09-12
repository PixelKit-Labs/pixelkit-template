#!/usr/bin/env node
/**
 * @file check-deps.mjs
 * @description Validates that @pixelkit-labs dependencies in package.json:
 * 1. Match the locked versions in package-lock.json.
 * 2. Actually exist and are published on the npm registry.
 * 3. Pass npm ci --dry-run with zero errors.
 *
 * Prevents premature version bumps and lockfile desynchronization from breaking CI.
 *
 * Run: node scripts/check-deps.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const pkgPath = path.join(ROOT, 'package.json');
const lockPath = path.join(ROOT, 'package-lock.json');

if (!fs.existsSync(pkgPath) || !fs.existsSync(lockPath)) {
  console.error('[check-deps] Error: package.json or package-lock.json not found in root.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

const deps = pkg.dependencies || {};
const pixelkitDeps = Object.entries(deps).filter(([name]) => name.startsWith('@pixelkit-labs/'));

console.log(`[check-deps] Checking ${pixelkitDeps.length} @pixelkit-labs dependencies...`);

let hasError = false;

// 1. Verify existence on npm registry
for (const [name, versionRange] of pixelkitDeps) {
  try {
    const encodedName = encodeURIComponent(name).replace('%40', '@');
    const res = await fetch(`https://registry.npmjs.org/${encodedName}`, {
      headers: { Accept: 'application/vnd.npm.install-v1+json, application/json' },
    });

    if (!res.ok) {
      console.error(`[check-deps] ❌ Package '${name}' not found on npm registry (HTTP ${res.status}).`);
      hasError = true;
      continue;
    }

    const data = await res.json();
    const publishedVersions = Object.keys(data.versions || {});

    // Clean version string: remove ^, ~, >=, etc. to get target version
    const cleanVersion = versionRange.replace(/^[\^~>=< ]+/, '');

    if (!publishedVersions.includes(cleanVersion)) {
      console.error(`\n[check-deps] ❌ ERROR: '${name}@${versionRange}' is not yet available on npm!`);
      console.error(`  - Requested version: ${cleanVersion}`);
      console.error(`  - Published versions on npm: ${publishedVersions.slice(-5).join(', ')}`);
      console.error(`  - Latest published tag: ${data['dist-tags']?.latest ?? 'unknown'}\n`);
      console.error(`  ROOT CAUSE:`);
      console.error(`    The SDK release has either not been published or npm CDN replication is still in progress.`);
      console.error(`  ACTION REQUIRED:`);
      console.error(`    1. Ensure the release workflow succeeded in PixelKit-Labs/pixelkit-sdk.`);
      console.error(`    2. Wait for 'npm view ${name}@${cleanVersion} version' to return.`);
      console.error(`    3. Run 'npm install ${name}@^${cleanVersion}' to update package-lock.json.`);
      console.error(`    4. Re-run 'npm run verify'.\n`);
      hasError = true;
    } else {
      console.log(`[check-deps] ✓ ${name}@${versionRange} verified on npm (latest: ${data['dist-tags']?.latest})`);
    }
  } catch (err) {
    console.warn(`[check-deps] ⚠️ Could not query npm registry for ${name}: ${err.message}. Proceeding with local checks.`);
  }
}

if (hasError) {
  process.exit(1);
}

// 2. Verify lockfile synchronization with npm ci --dry-run
console.log('[check-deps] Verifying package-lock.json consistency (npm ci --dry-run)...');
try {
  execSync('npm ci --dry-run', { cwd: ROOT, stdio: 'pipe' });
  console.log('[check-deps] ✓ package-lock.json is fully synchronized with package.json.');
} catch (err) {
  console.error('\n[check-deps] ❌ ERROR: package-lock.json does not match package.json!');
  console.error(err.stderr ? err.stderr.toString() : err.message);
  console.error('\n  ACTION REQUIRED:');
  console.error("    Run 'npm install' to update package-lock.json, then commit both files together.\n");
  process.exit(1);
}

console.log('[check-deps] All dependency checks passed.');
