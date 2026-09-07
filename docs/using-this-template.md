# Using this template

PixelKit is a template and a reference implementation, not a shipped app. It exists so you can see
what real Pixel hardware access looks like when nothing is faked, then take the parts you need.

Click **Use this template** on GitHub, or clone it. Then work through this page.

---

## What to rename

Ten places carry the PixelKit name. Change them all or you will ship an app that reports itself as
someone else's.

| Where | What | Notes |
| :--- | :--- | :--- |
| `app.json` | `expo.name`, `expo.slug` | The display name and the Expo project slug |
| `app.json` | `expo.android.package` | `com.pixelkit.sdk` → your own reverse-domain id. This is permanent once published to Play |
| `package.json` | `name` | Also `private: true` unless you intend to publish to npm |
| `packages/native/android/build.gradle` | `group = 'com.pixelkit'` | Gradle coordinates for the local module |
| `packages/mlkit/android/build.gradle` | `group = 'com.pixelkit'` | Same |
| `scripts/hilight-daemon/src/com/pixelkit/hilight/` | Java package and directory | Rename the folder and the `package` line together |
| `scripts/hilight-daemon/run.ps1` | `pkill -f com.pixelkit.hilight.HiLightDaemon` | Must match the package above or the daemon will not stop |
| `packages/pixelkit/src/ai/geminiClient.ts` | `PIXELKIT_GEMINI_API_KEY` | The SecureStore key. Changing it orphans any key a user already saved |
| `src/screens/SensorsLabScreen.tsx` | `VAULT_KEY`, the `'PixelKit'` album name | Demo constants |
| `assets/` | `icon.png`, the three adaptive icon layers, `favicon.png` | Replace all of them; the adaptive icon needs foreground, background and monochrome |

The Kotlin source packages (`expo.modules.pixelnative`, `expo.modules.pixelnano`) do **not** need
renaming. They are internal to the Expo module and never appear to a user.

Then update the wordmark in `App.tsx` (`<Wordmark name="…" />`), the README, and the agent guides —
`CLAUDE.md`, `AGENTS.md` and `GEMINI.md` are byte-identical copies and must stay that way.

## What to keep

These are the parts worth taking, and the reason the template exists:

- **`packages/pixelkit/src/core/observability.ts`** — provenance (`hardware | derived | unavailable`), traced
  operations with correlation ids, per-module error counts. Every hook reports through it.
- **`src/core/surface.ts` and `scripts/check-parity.js`** — the map from hook to the one screen that
  demonstrates it, and the check that fails the build when the two disagree. This is what stops an
  SDK from growing surfaces the app never shows.
- **`MetricCard`'s `source` prop** — a value that cannot be read renders as "—" with an N/A tag. The
  discipline only works if you keep it everywhere; one card that fills a gap with `0` undoes it.
- **`ScreenScaffold`** — one header and one sub-tab control for every screen.
- **The hooks themselves.** Each is self-contained: delete the ones you do not need and the rest
  keep working.

## What to delete when you do not need it

| Remove | If you do not need | Also remove |
| :--- | :--- | :--- |
| `packages/mlkit/` | Gemini Nano, ML Kit vision or ML Kit language | `packages/pixelkit/src/ai/useGeminiNano.ts`, `useGenAITasks.ts`, `useNaturalLanguageAI.ts`, `useVisionAI.ts`, the AI Lab sections that use them |
| `packages/native/` | CPU, GPU, memory, thermals, torch, haptics detail, radios | Most of `packages/pixelkit/src/hardware/`; the hooks then report `unavailable`, which is honest but empty |
| `scripts/hilight-daemon/` | The camera-bar LEDs | `packages/pixelkit/src/hardware/useHiLight.ts` and its section |
| `packages/pixelkit/src/ai/` cloud hooks | Cloud Gemini | `@google/genai` from `package.json` |

After any deletion, run `npm run parity`. It will tell you exactly which map entries, screens and
documentation entries you left behind — that is what it is for.

## Adding your own hook

1. Write it in `packages/pixelkit/src/hardware/` or `packages/pixelkit/src/ai/`, wrapping platform calls in `traced()` and exposing
   `source` and `error`.
2. Export it from `packages/pixelkit/src/index.ts`.
3. Give it a home in `src/core/surface.ts` — a tab and a section.
4. Build the section that demonstrates it on that screen.
5. Document it in `src/screens/docs/<category>.ts`: `params`, `returns`, and `actions` where every
   function carries `inputs` and `output`.
6. `npm run verify`. It fails until steps 3 through 5 are real.

## Device requirements

Written for a Pixel 11 Pro on Android 17. On other devices the hardware that is missing reports
`unavailable` rather than pretending, so the app still runs — it just shows less. Gemini Nano needs
AICore (Pixel 9 and later), and the HiLight LEDs are Pixel 11 Pro-class only.

Native modules cannot run in Expo Go. Use a development build:

```bash
npm install
npx expo run:android
```

## The documents you inherit

`RELEASING.md`, `docs/PRIVACY.md` and `docs/store-listing.md` describe shipping *this* app. If you
ship your own, they are a starting point, not a policy: the privacy policy in particular states what
this code does, and you must re-verify every claim against what your code does before publishing it
under your name.
