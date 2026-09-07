# Privacy Policy — PixelKit

**Last updated: 7 September 2026**

> **If you forked this template:** this policy describes what *this* code does, verified against it.
> It is a starting point, not boilerplate to sign. Re-check every claim against your own code before
> publishing it under your name — particularly if you add analytics, a backend, or any network call
> beyond the Gemini API.

PixelKit reads hardware on the device it is installed on and shows you what it read. This policy
describes what the app does with that, in the same terms the code uses.

---

## The short version

- **The app has no server.** There is no PixelKit account, no PixelKit backend, and no telemetry
  sent to the developer. Nothing you do in this app is reported anywhere.
- **Hardware readings stay on the device.** Sensors, radios, battery, thermals, position, captures
  — read, displayed, and never transmitted by this app.
- **One feature sends data off the device, and only if you set it up.** Cloud AI features send your
  prompt to Google's Gemini API, and only after you have supplied your own API key.
- **No analytics, no advertising, no tracking, no third-party SDKs that collect anything.**

## What stays on the device

Everything below is read, shown, and forgotten when the app closes. It is not stored on a server,
not shared, and not sent to the developer.

| Data | Why the app reads it |
| :--- | :--- |
| CPU, GPU, memory, thermal state | The Silicon screen shows what the chip is doing |
| Motion, magnetometer, barometer, ambient light | The Sensors screen streams them live |
| Battery level, temperature, voltage, current, health | Power telemetry on the Silicon screen |
| Network type, IP address, metered state, airplane mode | The Network section |
| Carrier name and network codes | The Cellular section; requires the phone-state permission |
| Bluetooth adapter state, bonded devices, nearby advertisements | The Radios section |
| NFC tag identifiers and NDEF records | The Radios section, only while you hold a tag to the phone |
| Ultra-wideband chip state and ranging sessions | The Radios section |
| Precise location | The Radios section shows the coordinates on screen |
| Photos, video and audio you capture | Shown in the app; saved to your gallery only when you ask |
| Biometric result | Whether a prompt succeeded. The app never sees your fingerprint or face data |

**Location is never written to the log.** The app's diagnostic events record accuracy, whether a
fix arrived and how long it took — never the coordinates.

## On-device AI

Gemini Nano and the ML Kit models — summarising, proofreading, rewriting, translation, language
identification, smart reply, entity extraction, text recognition, barcodes, faces, objects, pose,
segmentation, handwriting, and on-device speech recognition — all run on the phone through AICore.
The text, image or audio you give them does not leave the device.

## Cloud AI, if you enable it

Cloud features are inert until you provide your own Google Gemini API key. With a key configured:

- **Chat** sends your messages to the Gemini API.
- **Vision, cloud mode** sends the image you selected.
- **Speech recognition, cloud mode** sends the audio you recorded.

That data goes to Google under [Google's Gemini API terms](https://ai.google.dev/gemini-api/terms)
and privacy policy, not to the developer of this app. Use the on-device modes if you would rather
nothing left the phone; each screen says which mode is active.

Your API key is stored with `expo-secure-store`, encrypted by a key held in the Android Keystore
(StrongBox-backed on a Pixel 11 Pro), readable only while the device is unlocked and only on that
device. The key is never logged and is never sent anywhere except to Google's API as the
authorisation for your own request.

## Local network

The HiLight LED feature talks to `127.0.0.1:11080`, a daemon you start yourself over ADB. That
traffic never leaves the device. Without the daemon the feature reports itself unavailable and does
nothing.

## Permissions, and what each is for

| Permission | Used for | Optional? |
| :--- | :--- | :--- |
| Camera | Photo and video capture on the Sensors screen | Yes — the section says so and does nothing without it |
| Microphone | Level metering, recording, speech recognition | Yes |
| Location (fine and coarse) | The GNSS readout | Yes |
| Phone state | Carrier name and network codes | Yes — generation is shown without it |
| Bluetooth (scan, connect) | Adapter state, bonded devices, nearby advertisements | Yes |
| NFC | Reading and writing tags | Yes |
| Biometrics | The authentication prompt demo | Yes |
| Media library | Saving your captures to your gallery | Yes |
| Vibrate, wake lock, UWB ranging, high-sampling sensors | Haptics, keeping the screen on, ranging, sensor rate | Granted at install; no prompt |

Every one of these can be refused. The feature that needs it then reports itself unavailable rather
than failing quietly — that behaviour is the point of the app.

## Children

PixelKit is a developer tool for inspecting device hardware. It is not directed at children and
collects nothing from anyone.

## Changes

Material changes to this policy will appear in `CHANGELOG.md` alongside the version that carries
them.

## Contact

Questions: open an issue at <https://github.com/PixelKit-Labs/pixelkit-sdk/issues>.
