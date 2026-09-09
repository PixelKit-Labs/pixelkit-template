<p align="center">
  <img src="https://raw.githubusercontent.com/PixelKit-Labs/pixelkit-sdk/master/PixelKit_readme.jpg" alt="PixelKit" width="640">
</p>

<h1 align="center">PixelKit Template</h1>

<p align="center">
  A working Expo app on Google Pixel hardware. Four tabs, all 39 PixelKit hooks, running against
  the real device.
  <br><br>
  Press <strong>Use this template</strong>, build it onto your phone, and start deleting what you
  do not need.
</p>

## Start

```bash
npm install
npx expo run:android     # compiles the native modules and installs on a connected device
npm start
```

The first build takes a few minutes because it compiles Kotlin. After that, `npm start` is enough:
the JavaScript reloads without rebuilding.

**This cannot run in Expo Go.** Reading a thermal sensor takes native code compiled into the app,
and Expo Go only contains what Expo shipped. `npx expo run:android` builds your own copy with the
native modules in it.

Something showing an em dash and you do not know why?

```bash
npm run doctor
```

That checks whether adb sees your device, whether this is a Pixel, whether a development build is
installed, whether the native packages resolved, and whether AICore is present for Gemini Nano.

## What is here

| | |
| :--- | :--- |
| `src/screens/` | Silicon, AI Lab, Sensors and Docs — four tabs, each split into sections |
| `src/components/` | `MetricCard`, `HapticButton`, `ScreenScaffold`, `SensorVisualizer`, `Decor` |
| `src/theme/` | Colour tokens and the state-to-colour mapping |
| `src/core/surface.ts` | Which screen demonstrates which hook |
| `scripts/check-parity.js` | Fails the build if a hook has no home, or a documented action no control |

The hooks themselves are not here. They come from
[`@pixelkit-labs/sdk`](https://github.com/PixelKit-Labs/pixelkit-sdk), installed from npm.

## The rule this app exists to demonstrate

Every hook returns `source: 'hardware' | 'derived' | 'unavailable'`. There is deliberately no
`simulated` member, so a fabricated reading cannot be represented.

**The SDK ships no UI, so rendering a reading honestly is this app's job.** It exports the hooks,
the types and the observability layer, and nothing that draws. `MetricCard` here is the reference:
a `null` value renders as an em dash and the control that depends on it refuses, rather than
showing a number nobody measured. If you replace the components, keep that behaviour — it is the
one part of this template that matters more than how it looks.

## Adding a hook

`npm run verify` enforces the loop:

1. Import it from `@pixelkit-labs/sdk`
2. Give it a home in `src/core/surface.ts` — a tab and a section
3. Call it from that screen
4. Document it in `src/screens/docs/`

The parity check reads the *installed* `@pixelkit-labs/sdk`, so it verifies against the published package
rather than a local copy. A hook the SDK exports with nowhere to try it fails the build.

## Renaming it

See [docs/using-this-template.md](./docs/using-this-template.md) for the ten places the PixelKit
name is baked in, what is worth keeping, and what to delete when you do not need it.

## Documentation

[https://pixelkit-labs.github.io/pixelkit-docs/](https://pixelkit-labs.github.io/pixelkit-docs/) covers every hook: its inputs, its
outputs, and a contract for each function it exposes. The hooks are not documented in this
repository, because they are not implemented here.

MIT.
