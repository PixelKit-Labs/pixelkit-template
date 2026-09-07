#!/usr/bin/env node
/**
 * @file check-parity.js
 * @description Fails when the app stops representing the SDK.
 *
 * Three things drifted before this existed: hooks were exported and documented but had no screen
 * (nine of them), documented functions had no control anywhere, and a handler taking arguments was
 * passed straight to onPress so the press event became its first argument. This checks all three.
 *
 * Run: npm run parity
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
/**
 * The interface files for each tab. AI Lab is a directory: the screen composes six section
 * components beside it. src/screens/docs is deliberately absent — it holds the documentation
 * entries, and their example code must not count as a control that exists.
 */
const TAB_SOURCES = {
  silicon: ['DashboardScreen.tsx'],
  ai: ['AILabScreen.tsx', 'ailab'],
  sensors: ['SensorsLabScreen.tsx'],
  docs: ['DocsScreen.tsx'],
};

/**
 * The SDK is a dependency here, not a sibling package: this repository installs the pixelkit package from
 * npm. The parity check reads the installed copy's sources, which ship in the tarball precisely
 * so this check can run against exactly the version the app resolves.
 */
const LIB = path.join('node_modules', 'pixelkit');

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

/** Every source file behind one tab: the screen, plus each component in its section directory. */
function tabSource(tab) {
  const parts = [];
  for (const entry of TAB_SOURCES[tab]) {
    const full = path.join(ROOT, 'src', 'screens', entry);
    if (fs.statSync(full).isDirectory()) {
      for (const f of fs.readdirSync(full)) parts.push(fs.readFileSync(path.join(full, f), 'utf8'));
    } else {
      parts.push(fs.readFileSync(full, 'utf8'));
    }
  }
  return parts.join(String.fromCharCode(10));
}

const WAIVED = require('./parity-waivers.json');

/** True when `name` appears in `text` as a whole word, not as part of a longer identifier. */
function mentions(text, name) {
  let from = 0;
  for (;;) {
    const at = text.indexOf(name, from);
    if (at < 0) return false;
    const after = text.charAt(at + name.length);
    const isWordChar = after !== '' && (after === '_' || (after >= '0' && after <= '9') || (after >= 'a' && after <= 'z') || (after >= 'A' && after <= 'Z'));
    if (!isWordChar) return true;
    from = at + name.length;
  }
}

const failures = [];
const waivedSeen = [];

const surface = read(path.join('src', 'core', 'surface.ts'));
const homes = {};
for (const m of surface.matchAll(/^ {2}(use\w+): \{ tab: '(\w+)', section: '(\w+)' \},$/gm)) {
  homes[m[1]] = { tab: m[2], section: m[3] };
}

// The package has two entry points: 'pixelkit' and 'pixelkit/mlkit'. A hook is public if either
// exports it, so both are read. Comments are stripped first, or a hook merely *mentioned* in a note
// would count as exported.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const indexSrc = [read(path.join(LIB, 'src', 'index.ts')), read(path.join(LIB, 'src', 'mlkit.ts'))]
  .map(stripComments)
  .join(String.fromCharCode(10));
const exportedHooks = [...new Set([...indexSrc.matchAll(/\buse[A-Z]\w+/g)].map((m) => m[0]))];
const screenSources = Object.fromEntries(Object.keys(TAB_SOURCES).map((tab) => [tab, tabSource(tab)]));
const allScreens = Object.values(screenSources).join('\n');

// 1. Every exported hook has a home, and that home screen actually calls it.
for (const hook of exportedHooks) {
  const home = homes[hook];
  if (!home) {
    failures.push(hook + ' is exported from ' + LIB + '/src/index.ts but has no entry in src/core/surface.ts');
    continue;
  }
  if (!TAB_SOURCES[home.tab]) {
    failures.push(hook + ' is homed on the unknown tab "' + home.tab + '"');
    continue;
  }
  if (!screenSources[home.tab].includes(hook + '(')) {
    failures.push(hook + ' is homed on the ' + home.tab + ' tab but nothing there calls it');
  }
}

// 2. Every documented action is reachable from some screen, or waived with a reason.
// The entries live one file per category under src/screens/docs; docsData.ts only assembles them.
const docsDir = path.join(ROOT, 'src', 'screens', 'docs');
const docsData = fs
  .readdirSync(docsDir)
  .filter((f) => f.endsWith('.ts') && f !== 'shared.ts')
  .map((f) => fs.readFileSync(path.join(docsDir, f), 'utf8'))
  .join(String.fromCharCode(10));
if (!docsData.includes('actions:')) {
  failures.push('no documentation entries found under src/screens/docs — the action check would silently pass');
}
let currentModule = null;
let inActions = false;
let inReturns = false;
for (const line of docsData.split(String.fromCharCode(10))) {
  const quoted = (text) => {
    const open = text.indexOf(String.fromCharCode(39));
    if (open < 0) return null;
    const close = text.indexOf(String.fromCharCode(39), open + 1);
    return close < 0 ? null : text.slice(open + 1, close);
  };

  if (line.startsWith('    id: ')) {
    currentModule = quoted(line);
    inActions = false;
    inReturns = false;
    continue;
  }
  if (line.trim() === 'actions: [') { inActions = true; inReturns = false; continue; }
  if (line.trim() === 'returns: [') { inReturns = true; inActions = false; continue; }
  if ((inActions || inReturns) && line === '    ],') { inActions = false; inReturns = false; continue; }
  if (!currentModule || (!inActions && !inReturns)) continue;

  // A setter documented under `returns` is still a function. An unreachable one is how the Gemini
  // Nano system instruction stayed out of the interface while the hook had always exposed it.
  if (inReturns && !line.includes('=>')) continue;

  const isExpandedEntry = line.startsWith('        name: ');
  const isInlineEntry = line.startsWith('      { name: ');
  if (!isExpandedEntry && !isInlineEntry) continue;
  const name = quoted(line);
  if (!name) continue;

  // A documented name may carry its call shape, e.g. "sendMessage(text)" or "a() / b()".
  const called = name
    .split('/')
    .map((part) => part.trim().split('(')[0].trim())
    .filter(Boolean);
  if (called.length === 0) continue;

  const key = currentModule + '.' + called[0];
  if (WAIVED[key]) { waivedSeen.push(key); continue; }
  if (!called.some((fn) => allScreens.includes('.' + fn))) {
    failures.push(key + ' is documented as a function but no screen calls it — wire a control, or add a reason to scripts/parity-waivers.json');
  }
}

// 3. Every setter a hook returns is documented. The Gemini Nano system instruction sat in the
// hook, undocumented and therefore unnoticed, while the interface offered three of its twelve
// parameters — this is the check that would have said so.
const HOOK_DIRS = ['hardware', 'ai'];
for (const dir of HOOK_DIRS) {
  const full = path.join(ROOT, LIB, 'src', dir);
  for (const file of fs.readdirSync(full).filter((f) => f.startsWith('use') && f.endsWith('.ts'))) {
    const src = fs.readFileSync(path.join(full, file), 'utf8');
    const start = src.lastIndexOf(String.fromCharCode(10) + '  return {');
    if (start < 0) continue;
    const returned = src.slice(start);
    const setters = [...new Set([...returned.matchAll(new RegExp('\\bset[A-Z]\\w*', 'g'))].map((m) => m[0]))];
    for (const setter of setters) {
      if (!mentions(docsData, setter)) {
        failures.push(
          file.replace('.ts', '') + ' returns ' + setter + ' but no documentation entry mentions it — document it in src/screens/docs, or it will stay out of the interface unnoticed',
        );
      }
    }
  }
}

// 4. A handler that takes arguments is never handed straight to onPress.
for (const [name, src] of Object.entries(screenSources)) {
  for (const m of src.matchAll(/onPress=\{(\w+)\.(\w+)\}/g)) {
    const [, obj, fn] = m;
    if (/^(start|set|seek|save|load|write|select|trigger)[A-Z]/.test(fn)) {
      failures.push(name + ': onPress={' + obj + '.' + fn + '} passes the press event as the first argument — wrap it in an arrow function');
    }
  }
}


// 5. Every hook file in the package is exported from one of the two entries.
//    The reverse of check 1: that one catches a hook with no home, this one catches a hook that
//    quietly stopped being public. Splitting the barrel in two made this easy to do by accident,
//    and an unexported hook fails no other check because nothing downstream can see it.
for (const dir of HOOK_DIRS) {
  const full = path.join(ROOT, LIB, 'src', dir);
  for (const file of fs.readdirSync(full).filter((f) => /^use[A-Z]\w*\.tsx?$/.test(f))) {
    const hook = file.replace(/\.tsx?$/, '');
    if (WAIVED.internal && WAIVED.internal.includes(hook)) continue;
    if (!mentions(indexSrc, hook)) {
      failures.push(
        `${hook} exists in ${LIB}/src/${dir} but is exported from neither 'pixelkit' nor ` +
          `'pixelkit/mlkit', so nothing can import it. Export it, or list it under "internal" in ` +
          `scripts/parity-waivers.json.`
      );
    }
  }
}

if (failures.length) {
  console.error('\nParity check failed with ' + failures.length + ' problem' + (failures.length === 1 ? '' : 's') + ':\n');
  failures.forEach((f) => console.error('  x ' + f));
  console.error('');
  process.exit(1);
}

console.log(
  'Parity check passed: ' + exportedHooks.length + ' exported hooks, each homed on a screen that calls it; ' +
  'every documented action reachable or waived (' + waivedSeen.length + ' waived).',
);
