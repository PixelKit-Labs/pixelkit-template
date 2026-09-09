# Changelog

All notable changes to the PixelKit Template are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

**Rule:** every change to the codebase bumps the patch version by 0.0.1 (1.0.0 → 1.0.1 → 1.0.2 …) and adds an entry here in the same commit. Bump ersion in package.json and expo.version in pp.json together, and increment expo.android.versionCode by 1. Minor and major bumps are decided by the maintainer, not by agents.

## [1.3.1] - 2026-09-09

### Added
- **Vector MicIcon Component (src/components/MicIcon.tsx)**:
  Replaced plain text Mic button in the AI Lab Chat composer with a dedicated vector icon component. Renders clean vector SVG on Web and zero-dependency geometric primitives on Native Android, eliminating missing icon-font glyph issues.
- **Composer Live Listening Feedback**:
  Added live banner above the Chat composer displaying real-time interim tokens as speech is recognized from the microphone.

### Fixed
- **Android Text Truncation in Sub-Tabs & Telemetry**:
  Fixed React Native Android StaticLayout text truncation where letterSpacing and 
umberOfLines={1} caused button labels (COMPUTE, SYSTEM, NETWORK, TRACE) to truncate prematurely with ellipsis (...). Made 
umberOfLines optional on HapticButton and normalized letterSpacing on Android.
- **Symmetrical 2×2 Sub-Tab Grid Layout**:
  Updated SectionTabs to detect 4-section screens (like **Silicon**) and render them as a balanced 2×2 grid (lexBasis: '47%') instead of an awkward 3-and-1 wrap.
- **Icon-Only Haptic Buttons**:
  Updated HapticButton to support icon-only modes with centered alignment and refined composerMic to a 42×42 dp circular action button matching the text input and Send button height.

## [1.3.0] - 2026-09-09

### Added
- **PixelKit SDK 1.6.0 Upgrade**:
  Updated showcase to PixelKit SDK 1.6.0 featuring all 39 hardware hooks across Silicon, AI Lab, Sensors, and Docs.
- **Draggable <PixelKitDevTools /> HUD**:
  Integrated floating developer HUD displaying real-time Choreographer 120Hz frame rates, ADPF thermal headroom, and CPU cluster utilization.
