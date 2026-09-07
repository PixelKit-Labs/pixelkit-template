/**
 * @file pro.ts
 * @description Pixel Pro exclusives: one documentation entry per hook, each with its inputs, its
 * outputs, and a contract for every function it exposes.
 */

import { type DocModule, PRO, SOURCE_FIELD } from './shared';

export const PRO_MODULES: DocModule[] = [
  {
    id: 'useHiLight',
    name: 'useHiLight',
    category: 'pro',
    chipBadge: 'HiLight · 8 LEDs (Pro)',
    badgeColor: PRO,
    summary: 'The eight-LED ring around the rear camera flash. Real LEDs or nothing.',
    plain:
      'Controls the coloured lights around the rear camera. Useful as a glanceable signal when the phone is face down: a colour for an incoming call, a pulse while an assistant is thinking. Either it drives the physical LEDs or it reports that it cannot; there is no on-screen substitute.',
    description:
      'Android 17 exposes the array as eight lights of type Light.LIGHT_TYPE_APPLICATION, but every lights session needs CONTROL_DEVICE_LIGHTS, which is signature|privileged and cannot be held by a normal app. PixelKit therefore ships a small Java daemon that runs as the adb shell user and listens on 127.0.0.1:11080; start it with npm run hilight:daemon. With the daemon up, availability is hardware and the calls drive real LEDs. Without it, availability is simulated: the colour and pattern state is still tracked and mirrored on screen with haptics, and nothing pretends the lights are on.',
    signature: 'useHiLight(): HiLightState',
    params: [],
    returns: [
      { name: 'availability', type: "'hardware' | 'unavailable' | 'unsupported'", desc: "Whether calls reach the LEDs ('hardware'), the daemon is not running ('unavailable'), or this device has no array." },
      { name: 'isHardwareSupported', type: 'boolean', desc: 'Whether this device physically has the LED array.' },
      { name: 'isDaemonConnected', type: 'boolean', desc: 'Whether the local daemon answered its last status check, polled every five seconds.' },
      { name: 'isActive', type: 'boolean', desc: 'Whether the ring is currently lit.' },
      { name: 'currentColor', type: 'string', desc: 'Active colour as a hex string.' },
      { name: 'mode', type: 'HiLightMode', desc: "Pattern label: off, glow, breathing, pulse, gemini_thinking, incoming_call or notification." },
      { name: 'brightness', type: 'number', desc: '0 to 1. The hardware has no brightness channel, so this scales the RGB values.' },
      { name: 'isFaceDownMode', type: 'boolean', desc: 'Whether glanceable face-down behaviour is engaged.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'refreshDaemonStatus()',
        type: '() => Promise<boolean>',
        desc: 'Re-checks the daemon immediately instead of waiting for the next five-second poll.',
        output: 'Resolves true when the daemon answered, false otherwise. The same value lands in isDaemonConnected.',
      },
      {
        name: 'setColor(hex)',
        type: '(hexColor: string) => void',
        desc: 'Sets a solid colour and turns the ring on, switching the mode from off to glow when needed.',
        inputs: [{ name: 'hexColor', type: 'string', desc: 'RGB hex string such as "#81C995". Sent to the daemon as-is, scaled by brightness.' }],
        output: 'Returns nothing. Nothing lights unless availability is hardware.',
      },
      {
        name: 'setMode(mode)',
        type: '(mode: HiLightMode) => void',
        desc: 'Switches the animation pattern.',
        inputs: [{ name: 'mode', type: 'HiLightMode', desc: "One of off, glow, breathing, pulse, gemini_thinking, incoming_call, notification. Passing 'off' extinguishes the ring." }],
        output: 'Returns nothing; mode and isActive update immediately.',
      },
      {
        name: 'setBrightness(level)',
        type: '(level: number) => void',
        desc: 'Scales the RGB values sent to the LEDs. The hardware has no separate brightness channel.',
        inputs: [{ name: 'level', type: 'number', desc: '0.0 to 1.0; values outside are clamped.' }],
        output: 'Returns nothing. Applied immediately when the ring is lit, stored otherwise.',
      },
      {
        name: 'triggerGeminiPulse(ms?)',
        type: '(durationMs?: number) => void',
        desc: 'Cyan gemini_thinking hold that clears itself. Pair it with a model call.',
        inputs: [{ name: 'durationMs', type: 'number | undefined', desc: 'How long to hold before clearing, in milliseconds. Defaults to 4000.' }],
        output: 'Returns nothing. A pending timer from an earlier call is cancelled first.',
      },
      {
        name: 'triggerContactAlert(hex, ms?)',
        type: '(hexColor: string, durationMs?: number) => void',
        desc: 'Coloured incoming_call hold for a caller or event, then clears itself.',
        inputs: [
          { name: 'hexColor', type: 'string', desc: 'RGB hex for the alert colour.' },
          { name: 'durationMs', type: 'number | undefined', desc: 'Hold time in milliseconds. Defaults to 5000.' },
        ],
        output: 'Returns nothing. Replaces any hold already running.',
      },
      {
        name: 'turnOff()',
        type: '() => void',
        desc: 'Clears the ring and cancels any pending auto-off timer.',
        output: 'Returns nothing; mode becomes off and isActive false.',
      },
      {
        name: 'toggle()',
        type: '() => void',
        desc: 'Switches between off and a default blue glow.',
        output: 'Returns nothing; isActive flips.',
      },
    ],
    example: `import { useHiLight } from 'pixelkit';

function StatusRing() {
  const hilight = useHiLight();
  return (
    <View>
      <Text>{hilight.availability} · {hilight.mode}</Text>
      <Button title="Thinking pulse" onPress={() => hilight.triggerGeminiPulse(4000)} />
    </View>
  );
}`,
    agentNote:
      "Read availability before promising light. Only 'hardware' drives the LEDs; 'unavailable' means the daemon is not running and the control functions refuse rather than pretending.",
  },
  {
    id: 'useUWB',
    name: 'useUWB',
    category: 'pro',
    chipBadge: 'Ultra-Wideband (Pro)',
    badgeColor: PRO,
    summary: 'Ultra-wideband radio state, hardware ranging sessions, and spatial diagnostics.',
    plain:
      'Reports whether this phone has the short-range precision radio used for precision spatial tracking and car keys, and manages hardware ranging sessions via UwbManager and RangingManager.',
    description:
      'Chip presence, enabled state, chip id and ranging service readiness are queried from Android UwbManager and PackageManager through the native module, carrying source hardware. Hardware ranging sessions are initiated via startRanging(), exposing session diagnostics (session ID, protocol status, HAL direct vs declared feature) without mock placeholders.',
    signature: 'useUWB(): UWBState',
    params: [],
    returns: [
      { name: 'isSupported', type: 'boolean', desc: 'Whether the UWB chip exists on this device.' },
      { name: 'isEnabled', type: 'boolean', desc: 'Whether the radio is switched on in system settings.' },
      { name: 'chipId', type: 'string | null', desc: 'Chip identifier the platform reports, "default" on this Pixel.' },
      { name: 'rangingApiSupported', type: 'boolean', desc: 'Whether the Android 16 RangingManager feature is declared. False on this unit.' },
      { name: 'isRanging', type: 'boolean', desc: 'Whether a ranging session is actively running.' },
      { name: 'sessionInfo', type: 'UwbRangingResult | null', desc: 'Hardware session diagnostics: status, serviceName, technology, and timestamp.' },
      { name: 'sessionError', type: 'string | null', desc: 'Error message if session creation or ranging fails.' },
      { name: 'activeTargets', type: 'UWBSpatialTarget[]', desc: 'Tracked responder anchors and devices with distance and angles.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'startRanging(sessionId?)',
        type: '(sessionId?: number) => Promise<boolean>',
        desc: 'Initiates a hardware UWB ranging session through UwbManager and RangingManager.',
        inputs: [{ name: 'sessionId', type: 'number | undefined', desc: 'Identifier for the session, default 1001. Use distinct ids for concurrent sessions.' }],
        output: 'Resolves true when the session opened; false with the reason in sessionError when the service is missing or the hardware refused. Diagnostics land in sessionInfo either way.',
      },
      {
        name: 'stopRanging()',
        type: '() => void',
        desc: 'Ends the active UWB ranging session. Safe to call when nothing is running.',
        output: 'Returns nothing; isRanging becomes false.',
      },
    ],
    example: `import { useUWB } from 'pixelkit';

function Radar() {
  const { isSupported, isRanging, sessionInfo, startRanging, stopRanging } = useUWB();
  if (!isSupported) return <Text>No UWB radio</Text>;
  return (
    <View>
      <Text>Session: {sessionInfo?.status ?? 'Inactive'}</Text>
      <Button
        title={isRanging ? 'Stop session' : 'Start hardware session'}
        onPress={() => isRanging ? stopRanging() : startRanging(1001)}
      />
    </View>
  );
}`,
    agentNote:
      'UWB chip status and sessions are backed by physical hardware. Note that this preview build declares android.hardware.uwb but not android.hardware.ranging.',
  },
];
