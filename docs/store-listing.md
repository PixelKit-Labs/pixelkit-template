# Play Store listing

Everything Play asks for, with the reasoning behind each answer. Copy is written to be pasted as-is.

> **If you forked this template:** the answers below are true of this code. Re-derive them for yours
> before you submit — the data-safety form is a declaration you are accountable for.

---

## Identity

| Field | Value |
| :--- | :--- |
| App name | PixelKit |
| Package | `com.pixelkit.sdk` |
| Default language | English (United States) |
| Category | Tools |
| Tags | Developer tools, Utilities |
| Contact email | (maintainer's address — Play requires a public one) |
| Privacy policy URL | Host [`docs/PRIVACY.md`](./PRIVACY.md) and use that URL |

## Short description (80 characters max)

```
Read your Pixel's real hardware: sensors, radios, thermals and on-device AI.
```

*76 characters.*

## Full description (4,000 characters max)

```
PixelKit shows you what your Pixel is actually doing.

Most diagnostic apps fill their gaps with plausible numbers. This one does not. Every reading comes
from an Android API on your device, and every card says where its number came from: read from
hardware, computed from a hardware reading, or unavailable. A value that cannot be read shows as a
dash. Nothing is invented to fill a space.

SILICON
Core topology and live per-core clocks from the kernel. Frame pacing measured on the UI thread,
including the frames that missed. Memory as ActivityManager reports it. Thermal headroom — how close
the phone is to slowing itself down — with the thresholds your specific device uses. Battery
temperature, voltage, current draw and health from the fuel gauge.

SENSORS AND ACTUATORS
The IMU, magnetometer, barometer and light sensor streaming live. Camera capture and video
recording, played back in the app and saved to your gallery. Microphone capture with real dBFS
metering and input selection. The vibration motor, including Android 16 envelope effects and
hardware primitive compositions. The rear torch with its brightness levels.

RADIOS
Bluetooth adapter state, bonded devices and live scanning with signal strength. NFC tag reading and
writing. Ultra-wideband chip state and ranging sessions. Multi-band GNSS position with its accuracy
radius, so you can tell a fix worth trusting from one that is not.

ON-DEVICE AI
Gemini Nano running on the phone through AICore, with the latency, time-to-first-token and decode
rate measured natively rather than estimated. Summarising, proofreading, rewriting, offline
translation across 58 languages, entity extraction, text recognition, barcode scanning, face and
object detection, pose, segmentation and handwriting — all local. Cloud Gemini is available too,
but only if you supply your own API key, and the interface always says which one answered.

DOCUMENTATION IN THE APP
All 32 hooks documented on the device: what each argument means, what every returned field means,
what each function gives back and what a failure looks like. Each entry says which screen
demonstrates it.

PixelKit has no account, no server and no analytics. It does not collect anything. Hardware readings
stay on your phone; the only thing that ever leaves is a prompt you send to Google's Gemini API with
your own key, and only if you set one up.

Built for the Pixel 11 Pro on Android 17. Features the device does not have report themselves as
unavailable instead of pretending.
```

## Data safety form

The answer to "does your app collect or share any user data?" is **no**, and each section below
says why that is true rather than convenient.

| Question | Answer | Why |
| :--- | :--- | :--- |
| Collects personal information | No | No account, no server, no identifiers leave the app |
| Collects location | No | The position is displayed on screen and never transmitted or logged |
| Collects photos or videos | No | Captures stay in the app cache, or in your own gallery if you save them |
| Collects audio | No | Recordings stay on the device; cloud transcription is opt-in and goes to Google under your own key, which Play treats as a user-initiated transfer, not collection by this app |
| Collects device or other IDs | No | Model and Android version are displayed, never sent |
| Shares data with third parties | No | The app has no analytics, advertising or attribution SDKs |
| Data encrypted in transit | Yes | The only outbound traffic is HTTPS to Google's Gemini API |
| Users can request deletion | Not applicable | There is nothing stored off the device to delete |

If Play's reviewer treats the optional Gemini path as a transfer, declare it as: *user-initiated,
opt-in, requires the user's own API key, destination Google Gemini API, purpose app functionality.*

## Sensitive permission declarations

Play asks for a written purpose for these. What each one actually does in the code:

| Permission | Declared purpose |
| :--- | :--- |
| `READ_PHONE_STATE` | Displays the carrier name and mobile country and network codes on the Cellular section. No call handling, no phone number is read, nothing is transmitted. |
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Displays the GNSS position and its accuracy radius on the Radios section, in the foreground only, while the user is looking at that section. Coordinates are never transmitted or written to the log. |
| `CAMERA` | Photo and video capture on the Capture section, initiated by the user. |
| `RECORD_AUDIO` | Level metering and recording on the Audio section, and speech recognition when the user starts it. |
| `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` | Reading adapter state and bonded devices, and scanning for nearby advertisements when the user starts a scan. Results are displayed and never transmitted. Note that the manifest does not currently set `usesPermissionFlags="neverForLocation"`; adding it through a config plugin would let you assert that the scan is not used to derive location, which is true of this app. |
| `UWB_RANGING` | Opening an ultra-wideband ranging session when the user starts one. |
| `NFC` | Reading and writing NDEF tags while the reader is running. |
| `USE_BIOMETRIC` / `USE_FINGERPRINT` | Showing the platform biometric prompt in the Security section. |
| `HIGH_SAMPLING_RATE_SENSORS` | Sampling the IMU faster than 200 Hz for the live motion visualisers. |
| `WAKE_LOCK` | Keeping the screen on during a long reading, only while the user has turned that on. |
| `VIBRATE` | Haptic feedback on every control, and the haptics demonstrations. |

`BODY_SENSORS` was removed in 1.1.0: it covers body-worn sensors such as a heart rate monitor, and
nothing here reads one.

## Screenshots

Play requires at least two phone screenshots. Capture them from the device at release time rather
than committing them, so they cannot drift from what the app looks like:

```bash
adb exec-out screencap -p > silicon.png
```

Worth showing: Silicon → Compute (the reactor and the live clocks), Sensors → Capture, AI Lab →
Chat with Gemini Nano selected, and Docs with an entry expanded. Choose views where the provenance
tags are visible, since that is the thing that distinguishes this app.

## Content rating

Questionnaire answers: no violence, no sexuality, no profanity, no controlled substances, no user
interaction, no personal information shared, no location shared. Expected result: Everyone.
