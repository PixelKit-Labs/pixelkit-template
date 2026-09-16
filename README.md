<p align="center">
  <img src="https://raw.githubusercontent.com/PixelKit-Labs/pixelkit-sdk/master/PixelKit_readme.jpg" alt="PixelKit" width="640">
</p>

<h1 align="center">PixelKit Showcase & Starter Template</h1>

<p align="center">
  A production-ready Expo and React Native application demonstrating every hardware and AI capability in 
  <a href="https://github.com/PixelKit-Labs/pixelkit-sdk"><strong>PixelKit</strong></a> on real Google Pixel devices.
  <br><br>
  Four interactive tabs, responsive visualizers, live hardware telemetry, and an on-device AI lab.
  <br>
  Use this as a starting point for your next Pixel app, or as a reference implementation for PixelKit hooks.
</p>

<p align="center">
  <a href="https://pixelkit-labs.github.io/pixelkit-docs/">Documentation</a>
  &middot;
  <a href="https://www.npmjs.com/package/@pixelkit-labs/sdk">npm: @pixelkit-labs/sdk</a>
  &middot;
  <a href="https://github.com/PixelKit-Labs/pixelkit-sdk/issues/new?labels=bug">Report an issue</a>
</p>

---

## What's Inside

The template is organized into 4 interactive tabs demonstrating all 53 PixelKit hooks:

- ⚡ **Silicon & Compute**: Real-time Tensor G6 per-core CPU frequencies, GPU load, ADPF thermal headroom gauges, reverse wireless battery sharing, charging intelligence (cycle count & health), and frame pacing hint sessions.
- 🤖 **AI Lab**: On-device Gemini Nano text generation, local 512/768-dim vector embeddings, offline translation (58 languages), ML Kit computer vision (face mesh, pose, document scanner), and real-time **Gemini 3.8 Live bidirectional audio duplex streaming** with autonomous hardware triage agents.
- 📡 **Sensors, Radios & Actuators**: Directional 3-microphone beamforming visualizer, non-contact MLX90632 FIR thermometer, ICAO barometric altimeter with climb rates, Camera2 extensions (Night Sight, HDR), Wi-Fi 7 MLO multi-link aggregation, Wi-Fi RTT indoor ranging, Satellite NTN status, and camera-bar HiLight LED sequences.
- 📖 **Docs & HUD**: In-app documentation, device compatibility diagnostics, and the `<PixelKitDevTools />` live trace and performance HUD.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Compile native modules and launch on connected Android device
npx expo run:android

# 3. Start Metro bundler (subsequent changes reload instantly)
npm start
```

> **Note**: PixelKit communicates directly with Android kernel sysfs nodes, HALs, and Kotlin native modules. An Expo Development Build (`npx expo run:android`) is required; it cannot run inside standard Expo Go.

### Environment Diagnostics

To verify your device, ADB connection, and AICore status:

```bash
npm run doctor
```

This runs `@pixelkit-labs/cli doctor` to verify:
- Connected Pixel device authorization and Android API level
- Development build installation (`com.pixelkit.template`)
- Native package resolution (`@pixelkit-labs/native`, `@pixelkit-labs/mlkit`)
- AICore presence for Gemini Nano

---

## Project Structure

| Directory / File | Description |
| :--- | :--- |
| `src/screens/` | Screen implementations: `SiliconScreen`, `AILabScreen`, `SensorsScreen`, and `DocsScreen` |
| `src/components/` | UI primitives: `MetricCard`, `HapticButton`, `ScreenScaffold`, `SensorVisualizer`, and `Decor` |
| `src/theme/` | Design tokens, typography, dark theme palette, and status colors |
| `src/core/surface.ts` | Complete mapping registry linking every SDK hook to its corresponding screen and section |
| `scripts/check-parity.js` | Parity test verifying that every hook in the installed SDK has an interactive UI home |

---

## Clean Hardware Architecture

PixelKit hooks provide a typed `source: 'hardware' | 'derived' | 'unavailable'` property. When a physical sensor is unavailable or unreadable, values cleanly return `null`. The components in this template (such as `MetricCard`) render `null` as an em dash (`—`) and safely disable unsupported actions, providing a defensive, crash-proof user interface out of the box.

---

## Adding or Customizing Screens

To wire up a new hook or customize an existing tab:

1. Import the hook from `@pixelkit-labs/sdk` (or `@pixelkit-labs/sdk/mlkit`).
2. Add its mapping in `src/core/surface.ts` under the target tab and section.
3. Call the hook and render its state in the corresponding screen component.
4. Run `npm run verify` (`check-deps`, `sync-docs`, `typecheck`, `parity`) to verify full contract adherence.

---

## Renaming the App

See [docs/using-this-template.md](./docs/using-this-template.md) for a checklist of application package IDs, app names, and assets to update when launching your own production app.

---

## Documentation

Comprehensive API documentation for every hook:
[https://pixelkit-labs.github.io/pixelkit-docs/](https://pixelkit-labs.github.io/pixelkit-docs/)

---

## License

MIT © PixelKit Labs
