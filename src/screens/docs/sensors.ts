/**
 * @file sensors.ts
 * @description Sensors & actuators: one documentation entry per hook, each with its inputs, its
 * outputs, and a contract for every function it exposes.
 */

import { type DocModule, SENSOR, SOURCE_FIELD } from './shared';

export const SENSORS_MODULES: DocModule[] = [
  {
    id: 'useSensors',
    name: 'useSensors',
    category: 'sensors',
    chipBadge: 'IMU · barometer · light',
    badgeColor: SENSOR,
    summary: 'Motion, orientation, air pressure and ambient light, streaming live.',
    plain:
      'A live feed from the phone\'s motion and environment sensors: how it is being tilted and moved, which way is north, the air pressure, and how bright the room is. Set the interval to trade smoothness against battery.',
    description:
      'Streams from expo-sensors: accelerometer and gyroscope for the six-axis IMU, magnetometer for heading, barometer for pressure, and the ambient light sensor. Relative altitude is computed from pressure with the international hypsometric formula, so it is a derived value and drifts with weather. The sampling interval applies to all streams; shorter intervals cost battery and wake the sensor hub more often.',
    signature: 'useSensors(intervalMs?: number): SensorTelemetry',
    params: [
      { name: 'updateIntervalMs', type: 'number', desc: 'Sampling period in milliseconds for the IMU, magnetometer and barometer, defaulting to 100; the light sensor samples at twice this. Use 16 to 33 for animation, 500 or more for background monitoring. Changing it re-subscribes every sensor.' },
    ],
    returns: [
      { name: 'accelerometer', type: '{ x, y, z }', desc: 'Acceleration in g, including gravity. This is how you detect tilt and shake.' },
      { name: 'gyroscope', type: '{ x, y, z }', desc: 'Rotation rate in radians per second.' },
      { name: 'magnetometer', type: '{ x, y, z }', desc: 'Magnetic field in microtesla, used for compass heading.' },
      { name: 'barometer', type: '{ pressure, relativeAltitude? }', desc: 'Pressure in hectopascal, plus an altitude estimate derived from it.' },
      { name: 'lightLux', type: 'number | undefined', desc: 'Ambient brightness in lux. Undefined until the first sample arrives.' },
      { name: 'isAvailable', type: 'boolean', desc: 'Whether the sensors are present and streaming.' },
    ],
    actions: [],
    example: `import { useSensors } from 'pixelkit';

function Level() {
  const { accelerometer, lightLux } = useSensors(100);
  return <Text>tilt {accelerometer.x.toFixed(2)} · {lightLux ?? '—'} lux</Text>;
}`,
    agentNote:
      'Do not poll at 16 ms unless something is animating from it. relativeAltitude is derived from pressure, so treat it as relative, never as a GPS altitude.',
  },
  {
    id: 'useHaptics',
    name: 'useHaptics',
    category: 'sensors',
    chipBadge: 'LRA · Android 16 envelopes',
    badgeColor: SENSOR,
    summary: 'Vibration, from simple taps to custom-shaped waveforms.',
    plain:
      'Makes the phone buzz. Standard patterns cover ordinary taps and confirmations. On this device you can also design your own vibration shape, rising and falling in intensity, which is how you make a distinctive feel rather than a generic buzz.',
    description:
      'Standard patterns come from expo-haptics. Beyond that, the native module reports the actual vibrator hardware: whether amplitude can be varied, its resonant frequency, and which composition primitives it supports. Android 16 envelope effects are built with BasicEnvelopeBuilder from intensity and sharpness control points and must finish at zero intensity. This Pixel supports them, which is how the thinking ramp and alert pulses are produced.',
    signature: 'useHaptics(): HapticsState',
    params: [],
    returns: [
      { name: 'hasAmplitudeControl', type: 'boolean | null', desc: 'Whether vibration strength can be varied rather than just on and off.' },
      { name: 'envelopeSupported', type: 'boolean', desc: 'Whether custom envelope waveforms can be played.' },
      { name: 'resonantFrequencyHz', type: 'number | null', desc: 'The frequency at which the actuator is most efficient. Around 134 Hz here.' },
      { name: 'supportedPrimitives', type: 'string[]', desc: 'Composition building blocks the hardware provides, such as click, tick, thud and rise.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'selection()',
        type: '() => Promise<void>',
        desc: 'Faint tick for moving between options: sliders, wheel pickers, tab changes.',
        output: 'Resolves once dispatched. No-op on web; failures are logged rather than thrown.',
      },
      {
        name: 'light() / medium() / heavy()',
        type: '() => Promise<void>',
        desc: 'Impact taps of increasing weight, for presses, reveals and destructive confirmations.',
        output: 'Resolves once dispatched. No-op on web.',
      },
      {
        name: 'success() / warning() / error()',
        type: '() => Promise<void>',
        desc: 'Notification patterns that carry meaning: a double pulse, a buzz, a triple pulse. Use them consistently.',
        output: 'Resolves once dispatched. No-op on web.',
      },
      {
        name: 'playEnvelope(points, sharpness?)',
        type: '(points: EnvelopePoint[], initialSharpness?: number) => boolean',
        desc: 'Plays a custom waveform on Android 16 and later. Check envelopeSupported first.',
        inputs: [
          { name: 'points', type: '{ intensity: number; sharpness: number; durationMs: number }[]', desc: 'Steps of the curve; intensity and sharpness are 0 to 1. The envelope must end at intensity 0, which the module appends for you.' },
          { name: 'initialSharpness', type: 'number | undefined', desc: 'Sharpness to start from, 0 to 1.' },
        ],
        output: 'Returns true when the effect was dispatched, false when envelopes are unsupported or the call failed. It never throws.',
      },
      {
        name: 'playPrimitives(steps)',
        type: '(steps: PrimitiveStep[]) => boolean',
        desc: 'Chains hardware primitives into a composition, Android 11 and later.',
        inputs: [{ name: 'steps', type: '{ primitive: string; scale?: number; delayMs?: number }[]', desc: 'primitive is one of supportedPrimitives; scale sets strength 0 to 1; delayMs is the gap before that step.' }],
        output: 'Returns true when the composition was dispatched, false when the native module is absent or the call failed.',
      },
      {
        name: 'cancel()',
        type: '() => void',
        desc: 'Stops any vibration immediately, including an envelope or composition in progress.',
        output: 'Returns nothing.',
      },
    ],
    example: `import { useHaptics, HapticEnvelopes } from 'pixelkit';

function Confirm() {
  const { success, playEnvelope, envelopeSupported } = useHaptics();
  const onDone = () => envelopeSupported ? playEnvelope(HapticEnvelopes.thinkingRamp) : success();
  return <Button title="Done" onPress={onDone} />;
}`,
    agentNote:
      'Attach haptics to every touchable, preferably through HapticButton. Check envelopeSupported before using envelopes and fall back to a standard pattern.',
  },
  {
    id: 'useCamera',
    name: 'useCamera',
    category: 'sensors',
    chipBadge: 'expo-camera · photo & video',
    badgeColor: SENSOR,
    summary: 'Lens, zoom, flash and torch, plus taking photos and recording video.',
    plain:
      'Drives the camera and captures from it. Give it a camera view to hold on to and it can take a still or record a clip, both of which land as real files you can play back, save to the gallery or send to a model. Note that the Pixel Camera app\'s own colour Looks and long-range zoom are not available to other apps.',
    description:
      "The hook owns a ref to a CameraView and drives it, so a screen only renders the view and attaches cameraRef and handleCameraReady. takePicture resolves with a file, its dimensions and optionally base64 for the AI hooks; startRecording resolves when the recording ends, either because you called stopRecording or because a duration or size limit was reached. Two things the API does not make obvious: zoom is a 0 to 1 fraction of the lens range rather than an optical multiplier, so a \"5x\" figure does not map onto it; and Camera Looks, Super Res Zoom and the low-light video mode belong to the Pixel Camera app and cannot be driven from here, so selectedLook is a label for your own interface.",
    signature: 'useCamera(): CameraState',
    params: [],
    returns: [
      { name: 'cameraRef', type: 'RefObject<CameraView | null>', desc: 'Attach to your CameraView. Capture fails without it.' },
      { name: 'viewProps', type: '{ facing, zoom, flash, enableTorch, mode }', desc: 'Spread onto the view so it reflects this hook\'s state.' },
      { name: 'facing', type: "'back' | 'front'", desc: 'Which camera is active.' },
      { name: 'zoomFactor', type: 'number', desc: 'Zoom as a 0 to 1 fraction of the lens range, not an optical multiplier.' },
      { name: 'flashMode', type: "'auto' | 'on' | 'off'", desc: 'Whether the flash fires at capture.' },
      { name: 'isTorchOn', type: 'boolean', desc: 'Continuous light, as distinct from the capture-time flash.' },
      { name: 'mode', type: "'picture' | 'video'", desc: 'View configuration. Recording requires video.' },
      { name: 'isReady', type: 'boolean', desc: 'Whether the preview is running and capture is possible.' },
      { name: 'hasPermission', type: 'boolean', desc: 'Whether camera permission was granted.' },
      { name: 'isCapturing', type: 'boolean', desc: 'True while a still is being taken.' },
      { name: 'lastPhoto', type: 'CapturedPhoto | null', desc: 'Most recent still: uri, width, height and optional base64 and exif.' },
      { name: 'isRecording', type: 'boolean', desc: 'True while video is recording.' },
      { name: 'recordingSeconds', type: 'number', desc: 'Elapsed seconds of the current recording.' },
      { name: 'lastVideoUri', type: 'string | null', desc: 'File of the most recent clip. Hand this to useVideo to play it back.' },
      { name: 'availableLenses', type: 'string[]', desc: 'Lens identifiers the device reports, once the preview is running.' },
      { name: 'availablePictureSizes', type: 'string[]', desc: 'Picture sizes the device supports.' },
      { name: 'selectedLook', type: 'CameraLook', desc: 'Label only. Looks are a Pixel Camera app feature and are not applied here.' },
      { name: 'error', type: 'string | null', desc: 'Why the last capture failed.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'handleCameraReady()',
        type: '() => Promise<void>',
        desc: "Pass to the view's onCameraReady. Lens and picture-size lists only resolve once the preview is running, so they are read here.",
        output: 'Resolves once isReady is set and availableLenses and availablePictureSizes have been filled.',
      },
      {
        name: 'takePicture(options?)',
        type: '(options?: TakePictureOptions) => Promise<CapturedPhoto | null>',
        desc: 'Takes a still into the app cache. Use useMediaLibrary().save() to keep it.',
        inputs: [
          { name: 'options.quality', type: 'number | undefined', desc: 'JPEG quality 0 to 1. Defaults to 0.85.' },
          { name: 'options.base64', type: 'boolean | undefined', desc: 'Also return the image as base64, which is what the AI hooks consume. Defaults to false.' },
          { name: 'options.exif', type: 'boolean | undefined', desc: 'Include EXIF metadata. Defaults to false.' },
          { name: 'options.shutterSound', type: 'boolean | undefined', desc: 'Play the shutter sound where the platform allows suppressing it. Defaults to true.' },
        ],
        output: 'Resolves with { uri, width, height, base64?, exif? }, or null when the view is not mounted or the capture failed, with the reason in error.',
      },
      {
        name: 'startRecording(options?)',
        type: '(options?: StartRecordingOptions) => Promise<string | null>',
        desc: 'Records video, switching the view to video mode first.',
        inputs: [
          { name: 'options.maxDurationSeconds', type: 'number | undefined', desc: 'Stop automatically after this many seconds.' },
          { name: 'options.maxFileSizeBytes', type: 'number | undefined', desc: 'Stop automatically at this file size.' },
          { name: 'options.mirror', type: 'boolean | undefined', desc: 'Mirror the recording, matching what the user saw on a front-facing preview.' },
        ],
        output: 'Resolves with the video file URI when recording ends — through stopRecording() or a limit — or null on failure. recordingSeconds ticks while it runs.',
      },
      {
        name: 'stopRecording()',
        type: '() => void',
        desc: 'Ends the recording. No-op when nothing is recording.',
        output: 'Returns nothing; the promise from startRecording resolves with the video file.',
      },
      {
        name: 'toggleFacing()',
        type: '() => void',
        desc: 'Switches between the front and rear camera.',
        output: 'Returns nothing; facing flips and viewProps carries it to the view.',
      },
      {
        name: 'setLook(look)',
        type: '(look: CameraLook) => void',
        desc: 'Records a Look label in state. It does not change the image: Camera Looks belong to the Pixel Camera app and are not reachable from a third-party app.',
        inputs: [{ name: 'look', type: 'CameraLook', desc: "One of Original, Natural, Shadows, Vanilla, Editorial, Velvet, Classic, Digi, Black Tie, Minimal." }],
        output: 'Returns nothing; selectedLook updates so your own interface can show it.',
      },
      {
        name: 'setZoom(fraction)',
        type: '(fraction: number) => void',
        desc: 'Sets zoom as a fraction of the lens range, not an optical multiplier.',
        inputs: [{ name: 'fraction', type: 'number', desc: '0 to 1; values outside are clamped. Do not pass 5 for "5x".' }],
        output: 'Returns nothing; zoomFactor updates and viewProps carries it to the view.',
      },
      {
        name: 'setZoomStep(step, total?)',
        type: '(step: number, totalSteps?: number) => void',
        desc: 'Evenly spaced zoom stops, for a control with discrete positions.',
        inputs: [
          { name: 'step', type: 'number', desc: 'Which stop to select, clamped to 0..totalSteps.' },
          { name: 'totalSteps', type: 'number | undefined', desc: 'How many stops there are. Defaults to 4.' },
        ],
        output: 'Returns nothing; sets zoomFactor to step / totalSteps.',
      },
      {
        name: 'setFlash(mode)',
        type: "(mode: 'auto' | 'on' | 'off') => void",
        desc: 'Chooses flash behaviour for the next capture, as distinct from the continuous torch.',
        inputs: [{ name: 'mode', type: "'auto' | 'on' | 'off'", desc: 'auto lets the camera decide by scene brightness.' }],
        output: 'Returns nothing; flashMode updates.',
      },
      {
        name: 'toggleTorch()',
        type: '() => void',
        desc: 'Turns the continuous light on or off through the preview. For torch without a preview, use useTorch.',
        output: 'Returns nothing; isTorchOn flips.',
      },
      {
        name: 'setMode(mode)',
        type: "(mode: 'picture' | 'video') => void",
        desc: 'Switches the view between stills and video.',
        inputs: [{ name: 'mode', type: "'picture' | 'video'", desc: 'Recording requires video; startRecording switches it for you.' }],
        output: 'Returns nothing; mode and viewProps update.',
      },
      {
        name: 'pausePreview() / resumePreview()',
        type: '() => Promise<void>',
        desc: 'Freezes or restarts the preview without tearing the camera down.',
        output: 'Resolves once applied. Silently no-ops when the view has been unmounted.',
      },
    ],
    example: `import { CameraView } from 'expo-camera';
import { useCamera } from 'pixelkit';

function Capture() {
  const cam = useCamera();
  if (!cam.hasPermission) return <Text>Camera permission needed</Text>;
  return (
    <View>
      <CameraView ref={cam.cameraRef} onCameraReady={cam.handleCameraReady} {...cam.viewProps} style={{ flex: 1 }} />
      <Button title="Photo" onPress={() => cam.takePicture({ base64: true })} />
      <Button
        title={cam.isRecording ? \`Stop (\${cam.recordingSeconds}s)\` : 'Record'}
        onPress={() => cam.isRecording ? cam.stopRecording() : cam.startRecording({ maxDurationSeconds: 60 })}
      />
    </View>
  );
}`,
    agentNote:
      'Attach cameraRef to a mounted CameraView before calling capture, or it fails. zoom is 0..1, not a multiplier; do not pass 5 for "5x". Captures land in cache, so use useMediaLibrary().save() to keep them.',
  },
  {
    id: 'useTorch',
    name: 'useTorch',
    category: 'sensors',
    chipBadge: 'CameraManager torch',
    badgeColor: SENSOR,
    summary: 'The rear flashlight, including variable brightness and an SOS strobe.',
    plain:
      'Turns the rear light on and off. On this phone the brightness is adjustable in steps rather than just on or off. The state follows the system, so if the user toggles the torch from Quick Settings this hook notices.',
    description:
      'Backed by CameraManager.setTorchMode, with turnOnTorchWithStrengthLevel on Android 13 and above for variable brightness. A registered torch callback means external changes are reflected rather than the hook holding a stale belief. Nothing is simulated: when the native module is absent, isAvailable is false and every action rejects instead of pretending.',
    signature: 'useTorch(): TorchState',
    params: [],
    returns: [
      { name: 'isAvailable', type: 'boolean', desc: 'Whether a rear flash unit exists and the native module is present.' },
      { name: 'isTorchOn', type: 'boolean', desc: 'Whether the light is on, according to the system callback.' },
      { name: 'isStrobing', type: 'boolean', desc: 'Whether the SOS strobe is running.' },
      { name: 'maxStrengthLevel', type: 'number | null', desc: 'Number of brightness steps, 21 on this device. Null when variable brightness is unsupported.' },
      { name: 'error', type: 'string | null', desc: 'Why the last action failed, for example the camera being in use.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'setTorch(on, level?)',
        type: '(on: boolean, strengthLevel?: number) => Promise<boolean>',
        desc: 'Switches the rear LED, optionally at a specific brightness.',
        inputs: [
          { name: 'on', type: 'boolean', desc: 'Desired state.' },
          { name: 'strengthLevel', type: 'number | undefined', desc: '1 to maxStrengthLevel, honoured on Android 13 and later and ignored below it. Omit for the device default.' },
        ],
        output: 'Resolves true when the call was accepted, false when the hardware is unavailable or the call threw, with the reason in error.',
      },
      {
        name: 'toggleTorch()',
        type: '() => Promise<boolean>',
        desc: 'Flips the current state, stopping any strobe first.',
        output: 'Resolves with the state the torch is in afterwards.',
      },
      {
        name: 'startStrobe(intervalMs?)',
        type: '(intervalMs?: number) => void',
        desc: 'Toggles the hardware torch on a timer.',
        inputs: [{ name: 'intervalMs', type: 'number | undefined', desc: 'Half-period in milliseconds. Defaults to 150 and is clamped to at least 120, because the camera HAL needs roughly 50 to 100 ms per switch.' }],
        output: 'Returns nothing; isStrobing becomes true. Replaces any strobe already running.',
      },
      {
        name: 'stopStrobe()',
        type: '() => void',
        desc: 'Cancels the strobe timer and switches the LED off.',
        output: 'Returns nothing; isStrobing becomes false.',
      },
    ],
    example: `import { useTorch } from 'pixelkit';

function Flashlight() {
  const { isTorchOn, maxStrengthLevel, setTorch, toggleTorch } = useTorch();
  return (
    <View>
      <Button title={isTorchOn ? 'Off' : 'On'} onPress={toggleTorch} />
      <Button title="Half" onPress={() => setTorch(true, Math.ceil((maxStrengthLevel ?? 2) / 2))} />
    </View>
  );
}`,
    agentNote:
      'The torch competes with the camera; a capture session can take it away. Always surface error rather than assuming the call worked.',
  },
];
