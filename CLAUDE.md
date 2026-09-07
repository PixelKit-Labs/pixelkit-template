# PixelKit: Agent Guide

This file is the single source of truth for any coding agent (Claude, Gemini, Antigravity, Codex, Delta) working in this repository. `CLAUDE.md`, `AGENTS.md` and `GEMINI.md` are identical copies; keep all three in sync.

## Project

PixelKit is an Expo SDK 57 / React Native 0.86 hardware and AI framework for the Google Pixel 11 Pro (Android 17, Tensor G6). Hardware access goes through the `pixelkit` SDK, installed from npm, which wraps two Kotlin Expo Modules: `@pixelkit/native` (telemetry and actuators) and `@pixelkit/mlkit` (Gemini Nano via ML Kit GenAI on AICore). Cloud AI uses `@google/genai` on `gemini-3.8-flash`. The app has four tabs — Silicon, AI Lab, Sensors, Docs — each divided into the sections declared in `src/core/surface.ts`, which is also where every hook declares the one screen that demonstrates it.

Device facts come from the hardware, read with `adb` and `dumpsys`. Do not restate marketing claims (process node, brightness figures, "post-quantum") as facts in code or comments.

## Rules

1. **Changelog on every change.** Every change to the codebase bumps the patch version by 0.0.1 and adds an entry to `CHANGELOG.md` in the same commit. Bump `version` in `package.json` and `expo.version` in `app.json` together and increment `expo.android.versionCode` by 1. Minor and major bumps are the maintainer's call.
2. **Docs in sync.** Any change to a hook, type, screen, config, or dependency updates: `docs/api/*` and `docs/HARDWARE_API.md` (API), `docs/ai-guidance/*` and `docs/AI_PRIMER.md` (agent rules), `docs/getting-started/*` (setup), `README.md` and `PIXELKIT.md` (feature matrix, tree, examples), and `src/screens/DocsScreen.tsx` (in-app entries with a working example).
3. **Nothing is simulated.** Every hook exposes `source: 'hardware' | 'derived' | 'unavailable'` (`pixelkit`). There is deliberately no `simulated` member: the type makes fabricated readings unrepresentable. A value that cannot be read is `null`, renders as "—", and its capability reports `unavailable` so the control refuses rather than pretending. Never substitute a plausible default. If a feature cannot be driven for real, either write the real path (native module, daemon, platform API) or report it as unavailable; do not ship a placeholder.
4. **Comments state facts.** JSDoc and comments describe what the code does and which Android API it uses. No marketing language.
5. **Design system.** Use tokens from `src/theme/colors.ts` and primitives from `src/components/Decor.tsx`. One accent (cyan) for interaction; green = well, red = wrong, amber = a human or tool must act, violet = the model or external streams. Geist for language, Geist Mono for numbers and labels. Panels use wash + hairline + specular, no shadows or gradient fills. Buttons are solid (one per group) or outlined. Only the reactor glows.
6. **Single import.** Hooks come from `pixelkit`, and the four ML Kit hooks from `pixelkit/mlkit`. Never reach into `node_modules`. Components and theme are local to this repository and imported by relative path.
7. **Haptics on every touchable** via `HapticButton` or `useHaptics`.
8. **Secrets** go through `useSecurity().saveSecureItem()` or `saveApiKey()` (SecureStore, hardware-backed Android Keystore). Never in plaintext storage.
9. **Coordinate with other agents.** Run `git status` and `git log --oneline -5` before editing; another agent may have committed. Prefer targeted edits over whole-file rewrites on files touched recently by others.
10. **Observability on every function.** Any function that touches hardware, the network, a native module or the file system must: wrap the call in `traced(MODULE, 'op', fn, data)` from `pixelkit` so it is timed and correlated; surface failure through `logError` and an `error` field on the hook's return, never an empty `catch`; and expose `source` so callers can tell where a value came from. A caught error is never discarded silently. Use `tracedSafe` where a failure is survivable; it still logs and counts.
11. **Documented before it is done.** A function is not finished until it is documented in all four places: JSDoc on the export saying what it does and which platform API it uses; a structured entry in `src/screens/docsData.ts` with `plain`, `description`, `params`, `returns` and `actions` where every field carries a name, a real type and a sentence; the matching `docs/api/*` and `docs/HARDWARE_API.md` sections; and the feature row in `README.md`. Before committing, re-read the hook's return object and confirm every field appears in the docs entry with the type it actually has.

12. **One home per hook.** Every exported hook is declared in `src/core/surface.ts` with the tab and section that demonstrates it, and that screen must actually call it. A hook may appear elsewhere as a supporting effect — AI Lab pulses HiLight — but it is *demonstrated* in exactly one place, and the Docs entry points the reader there. Adding a hook without a home fails `npm run parity`, as does a documented function with no control anywhere unless it is waived with a reason in `scripts/parity-waivers.json`.
13. **Screens share their frame.** Titles, sub-tab rows and section blurbs come from `ScreenScaffold` (`ScreenHeader`, `SectionTabs`) and `sectionsFor(tab)`. Metrics are `MetricCard`, section titles are `SectionHeader`, buttons are `HapticButton`. Do not hand-roll a header or a tab row; a screen that looks different from the others is a bug, not a style.

## Validation

- `npm run verify` must pass: `typecheck` with 0 errors, then `parity` with no unhomed hooks and no unreachable documented actions.
- `npx expo export -p android` must bundle.
- Native changes: build from the space-free junction `C:\dev\pixel-delta\android` with `.\gradlew.bat assembleDebug` (JDK 17, SDK at `%LOCALAPPDATA%\Android\Sdk`), then `adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk`.
- On-device checks: `adb logcat -s ReactNativeJS | grep PixelKit` for provenance events; `dumpsys` for independent confirmation.

## Tooling

- **Expo docs:** https://docs.expo.dev/versions/v57.0.0/ (SDK 57 only). The Expo MCP server is registered in `.mcp.json`; `npm run start:mcp` starts Metro with local MCP capabilities.
- **Android CLI** (`%USERPROFILE%\AppData\AndroidCLI\android.exe`): `android docs search "<query>"` / `android docs fetch kb://…` (offline official docs, use before web search), `android describe --project_dir=.`, `android layout`, `android screen capture`, `android sdk`, `android emulator`, `android skills add <id>`.
- **Agent skills** in `.agents/skills/`: `android-cli` plus the official Expo skills (`skills-lock.json`, `npx skills add expo/skills`). Read a skill's `SKILL.md` before the related task.
- **Claude Code Expo plugin:** `.claude/settings.json` enables `expo@claude-plugins-official`; enabling it in the repo does not install it, so each workstation runs `claude plugin install expo@claude-plugins-official` once. It installs at user scope.
- **Device:** the Pixel is paired over wireless adb (`adb pair` / `adb connect <device-ip>:<port>`); use `adb reverse tcp:8081 tcp:8081` so the dev client loads Metro from `localhost`.

## Map

This is an app, not a library. The SDK is a dependency, installed from npm.

```
App.tsx                      shell: fonts, scrims, wordmark, tabs
src/core/surface.ts          tabs, sections and the one screen that demonstrates each hook
src/screens/                 Silicon, AI Lab, Sensors, Docs
src/components/              ScreenScaffold, HapticButton, MetricCard, SensorVisualizer, Decor
src/theme/                   colors (tokens), mode (state -> colour)
scripts/check-parity.js      reads node_modules/pixelkit, so it checks the published package
docs/                        using this template, privacy, store listing
```

Hooks come from `pixelkit` and `pixelkit/mlkit`. Components and theme are local: the SDK ships
no UI, so this app owns how a `source` value is rendered. `MetricCard` is the reference for that,
and showing an unreadable value as an em dash rather than a number is the whole point of it.

The SDK itself is developed at https://github.com/PixelKit-Labs/pixelkit-sdk.
