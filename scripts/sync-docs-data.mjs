#!/usr/bin/env node
/**
 * @file sync-docs-data.mjs
 * @description Generates the in-app Docs tab content from the documentation repository.
 *
 * The 32 hook entries used to be written by hand here, in `src/screens/docs/*.ts`, and again as
 * prose in the documentation. Two copies of the same 460 fields, kept in step by discipline alone.
 * PixelKit-Labs/pixelkit-docs is the contract now - the SDK's CI fails if its `data/hooks/*.json`
 * disagrees with the code - so this app reads that same data rather than restating it.
 *
 * The output is gitignored and rebuilt before every `start`, `verify` and `android` run. Editing it
 * is pointless; edit `data/hooks/<hook>.json` in the documentation repository instead.
 *
 * Set PIXELKIT_HOOKS_DATA to a local `data/hooks` directory to work against unpublished changes.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_REPO = process.env.PIXELKIT_DOCS_REPO ?? 'https://github.com/PixelKit-Labs/pixelkit-docs.git';
const CHECKOUT = path.join(ROOT, '.pixelkit-docs');
const OUT = path.join(ROOT, 'src', 'screens', 'docsGenerated.ts');

function resolveHooksDir() {
  if (process.env.PIXELKIT_HOOKS_DATA) {
    const local = path.resolve(process.env.PIXELKIT_HOOKS_DATA);
    if (!existsSync(local)) {
      console.error(`sync-docs-data: PIXELKIT_HOOKS_DATA is ${local}, which does not exist`);
      process.exit(1);
    }
    console.log(`sync-docs-data: using local hook data at ${local}`);
    return local;
  }
  rmSync(CHECKOUT, { recursive: true, force: true });
  console.log(`sync-docs-data: cloning ${DOCS_REPO} for data/hooks`);
  execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', DOCS_REPO, CHECKOUT], { stdio: 'inherit' });
  execFileSync('git', ['sparse-checkout', 'set', 'data/hooks'], { cwd: CHECKOUT, stdio: 'inherit' });
  return path.join(CHECKOUT, 'data', 'hooks');
}

const hooksDir = resolveHooksDir();
const files = readdirSync(hooksDir).filter((f) => f.endsWith('.json')).sort();
if (files.length === 0) {
  console.error(`sync-docs-data: no hook definitions in ${hooksDir}`);
  process.exit(1);
}

const entries = files.map((f) => JSON.parse(readFileSync(path.join(hooksDir, f), 'utf8')));

// The order the Docs tab lists them in: by category, then as the documentation orders them.
const CATEGORY_ORDER = ['silicon', 'pro', 'ai', 'sensors', 'radios', 'system'];
entries.sort((a, b) => {
  const ci = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  return ci !== 0 ? ci : a.id.localeCompare(b.id);
});

const banner = `/**
 * @file docsGenerated.ts
 * @description GENERATED. Do not edit.
 *
 * Written by scripts/sync-docs-data.mjs from data/hooks in PixelKit-Labs/pixelkit-docs, which is
 * the documentation contract the SDK's CI checks itself against. Edit the JSON there, not this file.
 *
 * ${entries.length} hooks, ${entries.reduce((n, e) => n + (e.returns?.length ?? 0) + (e.actions?.length ?? 0) + (e.params?.length ?? 0), 0)} documented fields, functions and parameters.
 */

import type { DocModule } from './docs/shared';

export const GENERATED_MODULES: Omit<DocModule, 'badgeColor'>[] = ${JSON.stringify(entries, null, 2)};
`;

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, banner);
console.log(`sync-docs-data: wrote ${entries.length} hooks to ${path.relative(ROOT, OUT)}`);
