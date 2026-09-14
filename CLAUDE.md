# PixelKit: Agent Guide

This file is the single source of truth for any coding agent (Claude, Gemini, Antigravity, Codex, Delta) working in this repository. `CLAUDE.md`, `AGENTS.md` and `GEMINI.md` are identical copies; keep all three in sync.

## Project

PixelKit is an Expo SDK 57 / React Native 0.86 hardware and AI framework for the Google Pixel 11 Pro (Android 17, Tensor G6). Hardware access goes through the `@pixelkit-labs/sdk` package, installed from npm, which wraps two Kotlin Expo Modules: `@pixelkit-labs/native` (telemetry and actuators) and `@pixelkit-labs/mlkit` (Gemini Nano via ML Kit GenAI on AICore). Cloud AI uses `@google/genai` on `gemini-3.8-flash`. The app has four tabs — Silicon, AI Lab, Sensors, Docs — each divided into the sections declared in `src/core/surface.ts`, which is also where every hook declares the one screen that demonstrates it.

Device facts come from the hardware, read with `adb` and `dumpsys`. Do not restate marketing claims (process node, brightness figures, "post-quantum") as facts in code or comments.

## Rules

1. **Changelog on every change.** Every change to the codebase bumps the patch version by 0.0.1 and adds an entry to `CHANGELOG.md` in the same commit. Bump `version` in `package.json` and `expo.version` in `app.json` together and increment `expo.android.versionCode` by 1. Minor and major bumps are the maintainer's call. If a change shipped without an entry, record it under the next version in a `### Recorded late` table giving the commit and the release it first shipped in; never rewrite an entry that has been published.
2. **Docs in sync.** A change to a screen, config or dependency updates whatever describes it in this repository: `README.md`, `docs/using-this-template.md`, `docs/store-listing.md` and `docs/PRIVACY.md`. The API reference and the agent guidance do not live here; they are in pixelkit-docs (rule 11).
3. **Nothing is simulated.** Every hook exposes `source: 'hardware' | 'derived' | 'unavailable'` (`@pixelkit-labs/sdk`). There is deliberately no `simulated` member: the type makes fabricated readings unrepresentable. A value that cannot be read is `null`, renders as "—", and its capability reports `unavailable` so the control refuses rather than pretending. Never substitute a plausible default. If a feature cannot be driven for real, either write the real path (native module, daemon, platform API) or report it as unavailable; do not ship a placeholder.
4. **Comments state facts.** JSDoc and comments describe what the code does and which Android API it uses. No marketing language.
5. **Design system.** Use tokens from `src/theme/colors.ts` and primitives from `src/components/Decor.tsx`. One accent (cyan) for interaction; green = well, red = wrong, amber = a human or tool must act, violet = the model or external streams. Geist for language, Geist Mono for numbers and labels. Panels use wash + hairline + specular, no shadows or gradient fills. Buttons are solid (one per group) or outlined. Only the reactor glows.
6. **Single import.** Hooks come from `@pixelkit-labs/sdk`, and the five ML Kit hooks — `useGeminiNano`, `useGenAITasks`, `useNaturalLanguageAI`, `useVisionAI` and `useEmbeddings` — from `@pixelkit-labs/sdk/mlkit`. Never reach into `node_modules`. Components and theme are local to this repository and imported by relative path; the SDK exports no UI apart from `PixelKitDevTools`.
7. **Haptics on every touchable** via `HapticButton` or `useHaptics`.
8. **Secrets** go through `useSecurity().saveSecureItem()` or `saveApiKey()` (SecureStore, hardware-backed Android Keystore). Never in plaintext storage.
9. **Coordinate with other agents.** Run `git status` and `git log --oneline -5` before editing; another agent may have committed. Prefer targeted edits over whole-file rewrites on files touched recently by others.
10. **Observability on every function.** Any function that touches hardware, the network, a native module or the file system must: wrap the call in `traced(MODULE, 'op', fn, data)` from `@pixelkit-labs/sdk` so it is timed and correlated; surface failure through `logError` and an `error` field on the hook's return, never an empty `catch`; and expose `source` so callers can tell where a value came from. A caught error is never discarded silently. Use `tracedSafe` where a failure is survivable; it still logs and counts.
11. **Hook documentation is not written here.** Hooks are defined in pixelkit-sdk and documented in `data/hooks/<hook>.json` in pixelkit-docs, where `npm run build:api-pages` writes the reference page. The in-app Docs tab is generated from that same JSON by `npm run sync-docs` into `src/screens/docsGenerated.ts`, which is gitignored: edit the JSON in pixelkit-docs, never the generated file. Set `PIXELKIT_HOOKS_DATA` to a local `data/hooks` directory to preview unpublished changes. What this repository documents is its own code: JSDoc on screens and components, and `README.md` and `docs/` where they describe the app.
12. **One home per hook.** Every exported hook is declared in `src/core/surface.ts` with the tab and section that demonstrates it, and that screen must actually call it. A hook may appear elsewhere as a supporting effect — AI Lab pulses HiLight — but it is *demonstrated* in exactly one place, and the Docs entry points the reader there. Adding a hook without a home fails `npm run parity`, as does a documented function with no control anywhere unless it is waived with a reason in `scripts/parity-waivers.json`.
13. **Screens share their frame.** Titles, sub-tab rows and section blurbs come from `ScreenScaffold` (`ScreenHeader`, `SectionTabs`) and `sectionsFor(tab)`. Metrics are `MetricCard`, section titles are `SectionHeader`, buttons are `HapticButton`. Do not hand-roll a header or a tab row; a screen that looks different from the others is a bug, not a style.
14. **SDK dependency protocol.** When upgrading `@pixelkit-labs/sdk`, `@pixelkit-labs/native`, or `@pixelkit-labs/mlkit`, verify the release is published and live on npm (`npm view @pixelkit-labs/sdk@<version>`). Never edit dependency versions in `package.json` without immediately running `npm install` to update `package-lock.json` and committing both together. `npm run verify` executes `check-deps` (`node scripts/check-deps.mjs`), which validates live npm registry existence and runs `npm ci --dry-run` to guarantee lockfile parity. A git pre-push hook (`.githooks/pre-push`) enforces `npm run verify` before any push.
15. **Keep up with the SDK.** The SDK is published separately and this app follows it. When a release adds a hook, the hook needs a home in `src/core/surface.ts` and a control on that tab before the dependency can move: `npm run parity` fails the upgrade until it has one, which is the check doing its job, not a failure to waive. The ARTEMIS recipes in pixelkit-sdk's `test/artemis/recipes/` drive this app's screens by their visible labels, so renaming a screen, section or button means updating the recipes that name it.

## Validation

- `npm run verify` must pass: `check-deps` (ensures all `@pixelkit-labs` packages exist on npm and `package-lock.json` matches `package.json`), `sync-docs`, `typecheck` with 0 errors, then `parity` with no unhomed hooks and no unreachable documented actions.
- `npx expo export -p android` must bundle.
- Native changes: build from the space-free junction `C:\dev\pixel-delta\android` with `.\gradlew.bat assembleDebug` (JDK 17, SDK at `%LOCALAPPDATA%\Android\Sdk`), then `adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk`.
- On-device checks: `adb logcat -s ReactNativeJS | grep PixelKit` for provenance events; `dumpsys` for independent confirmation.

## Tooling

- **Expo docs:** https://docs.expo.dev/versions/v57.0.0/ (SDK 57 only). The Expo MCP server is registered in `.mcp.json`; `npm run start:mcp` starts Metro with local MCP capabilities.
- **Android CLI** (`%USERPROFILE%\AppData\AndroidCLI\android.exe`): `android docs search "<query>"` / `android docs fetch kb://…` (offline official docs, use before web search), `android describe --project_dir=.`, `android layout`, `android screen capture`, `android sdk`, `android emulator`, `android skills add <id>`.
- **Agent skills** in `.agents/skills/`: `android-cli` plus the official Expo skills (`skills-lock.json`, `npx skills add expo/skills`). Read a skill's `SKILL.md` before the related task.
- **Claude Code Expo plugin:** `.claude/settings.json` enables `expo@claude-plugins-official`; enabling it in the repo does not install it, so each workstation runs `claude plugin install expo@claude-plugins-official` once. It installs at user scope.
- **Device:** the Pixel is paired over wireless adb (`adb pair` / `adb connect <device-ip>:<port>`); use `adb reverse tcp:8081 tcp:8081` so the dev client loads Metro from `localhost`.
- **Diagnostics:** `npm run doctor` runs `npx @pixelkit-labs/cli doctor`: adb, the device, this app's installed build (`com.pixelkit.sdk`, the CLI's default), the native packages and AICore, each reported as pass, fail, not applicable or could-not-determine.

## Map

This is an app, not a library. The SDK is a dependency, installed from npm.

```
App.tsx                      shell: fonts, scrims, wordmark, tabs
src/core/surface.ts          tabs, sections and the one screen that demonstrates each hook
src/screens/                 Silicon, AI Lab, Sensors, Docs
src/components/              ScreenScaffold, HapticButton, MetricCard, SensorVisualizer, Decor
src/theme/                   colors (tokens), mode (state -> colour)
scripts/check-deps.mjs       validates npm registry availability and lockfile parity
scripts/check-parity.js      reads node_modules/@pixelkit-labs/sdk, so it checks the published package
docs/                        using this template, privacy, store listing
.githooks/pre-push           blocks git push if npm run verify fails
```

Hooks come from `@pixelkit-labs/sdk` and `@pixelkit-labs/sdk/mlkit`. Components and theme are local: the SDK ships
no UI, so this app owns how a `source` value is rendered. `MetricCard` is the reference for that,
and showing an unreadable value as an em dash rather than a number is the whole point of it.

The SDK itself is developed at https://github.com/PixelKit-Labs/pixelkit-sdk.
