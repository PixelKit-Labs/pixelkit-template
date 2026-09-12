# Changelog

All notable changes to the PixelKit Template are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

**Rule:** every change to the codebase bumps the patch version by 0.0.1 (1.0.0 → 1.0.1 → 1.0.2 …) and adds an entry here in the same commit. Bump `version` in package.json and `expo.version` in app.json together, and increment `expo.android.versionCode` by 1. Minor and major bumps are decided by the maintainer, not by agents.

## [1.3.3] - 2026-09-12

### Added
- **Automated Dependency & Registry Validation Gate (`scripts/check-deps.mjs`)**:
  Added automated validation script that queries the npm registry in real-time to verify that all `@pixelkit-labs/*` dependencies actually exist and are published on npm before allowing commits or CI verification. Also executes `npm ci --dry-run` to enforce 100% lockfile parity.
- **Git Pre-Push Hook (`.githooks/pre-push`) & Automatic Hook Setup**:
  Added `.githooks/pre-push` to automatically run `npm run verify` before every git push, preventing broken lockfiles, unreleased SDK versions, typecheck errors, or parity drift from ever reaching GitHub. Added `"prepare"` script in `package.json` to auto-configure `core.hooksPath`.

## [1.3.2] - 2026-09-12

### Fixed
- **Synchronize Lockfile for `@pixelkit-labs` 1.6.1 Release**:
  Synchronized `package-lock.json` with the published `@pixelkit-labs/sdk@1.6.1`, `@pixelkit-labs/native@1.6.1`, and `@pixelkit-labs/mlkit@1.6.1` packages on npm, resolving the `ETARGET` / `npm ci` failures in GitHub Actions CI and Dependabot.
- **Added `check-lockfile` Pre-Verification Gate**:
  Added `check-lockfile` (`npm ci --dry-run`) to `npm run verify` in `package.json` so lockfile and registry desynchronizations are caught immediately during local validation before any code is pushed.
- **Typo Fixes in Changelog**:
  Cleaned up escaped control characters in changelog description and 1.3.1 entry.

## [1.3.1] - 2026-09-09

### Added
- **Vector MicIcon Component (src/components/MicIcon.tsx)**:
  Replaced plain text Mic button in the AI Lab Chat composer with a dedicated vector icon component. Renders clean vector SVG on Web and zero-dependency geometric primitives on Native Android, eliminating missing icon-font glyph issues.
- **Composer Live Listening Feedback**:
  Added live banner above the Chat composer displaying real-time interim tokens as speech is recognized from the microphone.

### Fixed
- **Android Text Truncation in Sub-Tabs & Telemetry**:
  Fixed React Native Android StaticLayout text truncation where `letterSpacing` and `numberOfLines={1}` caused button labels (COMPUTE, SYSTEM, NETWORK, TRACE) to truncate prematurely with ellipsis (...). Made `numberOfLines` optional on HapticButton and normalized letterSpacing on Android.
- **Symmetrical 2×2 Sub-Tab Grid Layout**:
  Updated SectionTabs to detect 4-section screens (like **Silicon**) and render them as a balanced 2×2 grid (`flexBasis: '47%'`) instead of an awkward 3-and-1 wrap.
- **Icon-Only Haptic Buttons**:
  Updated HapticButton to support icon-only modes with centered alignment and refined composerMic to a 42×42 dp circular action button matching the text input and Send button height.

## [1.3.0] - 2026-09-09

### Added
- **PixelKit SDK 1.6.0 Upgrade**:
  Updated showcase to PixelKit SDK 1.6.0 featuring all 39 hardware hooks across Silicon, AI Lab, Sensors, and Docs.
- **Draggable <PixelKitDevTools /> HUD**:
  Integrated floating developer HUD displaying real-time Choreographer 120Hz frame rates, ADPF thermal headroom, and CPU cluster utilization.
