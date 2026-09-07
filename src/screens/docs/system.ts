/**
 * @file system.ts
 * @description System & media: one documentation entry per hook, each with its inputs, its
 * outputs, and a contract for every function it exposes.
 */

import { type DocModule, AI, SYSTEM, SOURCE_FIELD } from './shared';

export const SYSTEM_MODULES: DocModule[] = [
  {
    id: 'useCapabilities',
    name: 'useCapabilities',
    category: 'system',
    chipBadge: 'PackageManager verified',
    badgeColor: SYSTEM,
    summary: 'What this particular phone actually has.',
    plain:
      'The first hook to call. It answers "does this device have that?" so your interface can hide features the phone does not support, instead of showing a control that will fail.',
    description:
      'Resolution starts from a model table keyed on the device name, then upgrades to real PackageManager feature checks when the native module is present, at which point verification changes from model-table to device. Fields that can only be answered by the device are null until that upgrade happens. Note two results on this Pixel that are easy to assume wrongly: it does not declare a neural processing unit feature, and it does not declare the ranging feature.',
    signature: 'useCapabilities(): DeviceCapabilities',
    params: [],
    returns: [
      { name: 'modelName', type: 'string', desc: 'Marketing model name, for example "Pixel 11 Pro".' },
      { name: 'isPixel / isProModel / isFoldable', type: 'boolean', desc: 'Device family flags used to gate Pro-only features.' },
      { name: 'pixelGeneration', type: 'number | null', desc: 'Generation number, 11 here. Null on non-Pixel hardware.' },
      { name: 'androidApiLevel', type: 'number | null', desc: 'API level, 37 for Android 17. Null on web.' },
      { name: 'verification', type: "'device' | 'model-table'", desc: 'Whether flags were confirmed against the device or inferred from the model name. Prefer acting on device.' },
      { name: 'hasHiLight', type: 'boolean', desc: 'Whether the LED array is present.' },
      { name: 'hasUWB', type: 'boolean', desc: 'Whether an ultra-wideband radio is present.' },
      { name: 'hasNFC / hasBleChannelSounding / hasWifiRtt / hasSatelliteTelephony', type: 'boolean | null', desc: 'Radio features confirmed from PackageManager. Null before device verification.' },
      { name: 'hasStrongBox', type: 'boolean | null', desc: 'Whether keys can be held in the dedicated secure element.' },
      { name: 'hasNpuFeature', type: 'boolean | null', desc: 'Whether a neural processing unit feature is declared. False on this device.' },
      { name: 'geminiNanoTier', type: "'nano-v4' | 'nano-v3' | 'nano-v2' | 'none'", desc: 'Which on-device model generation to expect.' },
      { name: 'aicoreVersion', type: 'string | null', desc: 'Installed AICore build when the native module can read it.' },
      { name: 'supportsRangingApi / supportsHapticEnvelopes / supportsAppFunctions / supportsAndroid17Apis', type: 'boolean', desc: 'Platform API availability gates.' },
    ],
    actions: [],
    example: `import { useCapabilities } from 'pixelkit';

function ProFeatures() {
  const caps = useCapabilities();
  return (
    <View>
      <Text>{caps.modelName} · API {caps.androidApiLevel} · {caps.verification}</Text>
      {caps.hasHiLight && <HiLightCard />}
      {caps.hasUWB && <UWBCard />}
    </View>
  );
}`,
    agentNote:
      'Never hardcode a device assumption; read this first. Treat null as unknown rather than false, and prefer acting once verification is device.',
  },
  {
    id: 'useAudio',
    name: 'useAudio',
    category: 'system',
    chipBadge: 'expo-audio · capture & playback',
    badgeColor: SYSTEM,
    summary: 'Microphone recording with levels and input choice, plus playback.',
    plain:
      'Records from the microphone and plays recordings back. It gives you a live loudness reading for meters and speaking indicators, lets you pause and resume a take, choose which microphone to use, and pick between a speech profile and an unprocessed studio profile.',
    description:
      'Built on expo-audio. The speech profile records 16 kHz mono through the voice_recognition source, which is the path that applies the platform noise suppression and is what speech APIs expect; the studio profile records 48 kHz stereo through unprocessed, the raw microphone with no platform processing. Levels are read every 100 ms from the recorder status in dBFS, where -160 is digital silence and 0 is clipping; level maps that onto 0 to 1 with a floor at -60 dBFS so meters behave sensibly. Microphone enumeration only works once the recorder has been prepared, which is why inputs populate after recording starts. Playback routing between speaker and earpiece is an audio-mode setting, so it applies to the whole app.',
    signature: 'useAudio(): AudioState',
    params: [],
    returns: [
      { name: 'isRecording', type: 'boolean', desc: 'Whether the microphone is open. Stays true while paused.' },
      { name: 'isPaused', type: 'boolean', desc: 'Whether the current take is paused.' },
      { name: 'canRecord', type: 'boolean', desc: 'Whether the recorder reports it is ready to start.' },
      { name: 'permissionGranted', type: 'boolean', desc: 'Whether microphone permission has been granted.' },
      { name: 'durationSeconds', type: 'number', desc: 'Elapsed seconds of the current take.' },
      { name: 'quality', type: "'speech' | 'studio'", desc: 'Active capture profile.' },
      { name: 'meteringDecibels', type: 'number', desc: 'Live level in dBFS, -160 silence to 0 clipping.' },
      { name: 'peakDecibels', type: 'number', desc: 'Loudest level seen during this take, for a peak indicator.' },
      { name: 'level', type: 'number', desc: '0 to 1 version of the level, floored at -60 dBFS. Use this to drive a meter.' },
      { name: 'isSilent', type: 'boolean', desc: 'True while the level sits below the silence threshold. Useful for a "say something" hint.' },
      { name: 'silenceThresholdDbfs', type: 'number', desc: 'Boundary between silence and speech, -45 dBFS by default.' },
      { name: 'inputs', type: 'RecordingInput[]', desc: 'Microphones the platform offers, populated once recording has been prepared.' },
      { name: 'currentInputUid', type: 'string | null', desc: 'Which microphone is selected.' },
      { name: 'route', type: "'speaker' | 'earpiece'", desc: 'Where playback is sent.' },
      { name: 'lastRecordingUri', type: 'string | null', desc: 'File of the last completed recording.' },
      { name: 'isPlaying', type: 'boolean', desc: 'Whether playback is running.' },
      { name: 'playbackPositionSeconds', type: 'number', desc: 'Playback position, for a scrubber.' },
      { name: 'playbackDurationSeconds', type: 'number', desc: 'Length of the audio being played.' },
      { name: 'error', type: 'string | null', desc: 'Why the last action failed.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'startRecording(options?)',
        type: '(options?: { maxDurationSeconds?: number; quality?: AudioQuality }) => Promise<boolean>',
        desc: 'Requests permission if needed, prepares the profile and opens the microphone with metering at 10 Hz.',
        inputs: [
          { name: 'options.maxDurationSeconds', type: 'number | undefined', desc: 'Stop automatically after this many seconds; the recorder finalises the file itself.' },
          { name: 'options.quality', type: "'speech' | 'studio' | undefined", desc: 'Profile for this take, which also becomes the active profile. speech is 16 kHz mono noise-suppressed, studio is 48 kHz stereo unprocessed.' },
        ],
        output: 'Resolves true when recording started, false with the reason in error when permission was denied or the recorder refused.',
      },
      {
        name: 'pauseRecording()',
        type: '() => boolean',
        desc: 'Pauses without finalising the file, so resumeRecording continues the same take.',
        output: 'Returns true when the take was paused, false when nothing was recording or it was already paused.',
      },
      {
        name: 'resumeRecording()',
        type: '() => boolean',
        desc: 'Continues the same take after a pause.',
        output: 'Returns true when recording resumed, false when there was nothing paused.',
      },
      {
        name: 'stopRecording()',
        type: '() => Promise<string | null>',
        desc: 'Finalises the take and stops metering.',
        output: 'Resolves with the recorded file URI, also stored in lastRecordingUri, or null when nothing was recording or the stop failed.',
      },
      {
        name: 'setSilenceThresholdDbfs(dbfs)',
        type: '(dbfs: number) => void',
        desc: 'Moves the boundary between silence and speech that isSilent reports against.',
        inputs: [{ name: 'dbfs', type: 'number', desc: 'Threshold in dBFS, -45 by default. A quiet room sits near -50, so raising it makes isSilent stricter.' }],
        output: 'Returns nothing; isSilent re-evaluates on the next metering sample.',
      },
      {
        name: 'setQuality(quality)',
        type: "(quality: 'speech' | 'studio') => void",
        desc: 'Chooses the capture profile for the next recording, not the current one.',
        inputs: [{ name: 'quality', type: "'speech' | 'studio'", desc: 'speech records 16 kHz mono through the noise-suppressed voice path; studio records 48 kHz stereo unprocessed.' }],
        output: 'Returns nothing; quality updates immediately.',
      },
      {
        name: 'refreshInputs()',
        type: '() => RecordingInput[]',
        desc: 'Re-reads the available microphones. Only valid once a recording has been prepared.',
        output: 'Returns the list, also written to inputs. Empty when the platform cannot answer.',
      },
      {
        name: 'selectInput(uid)',
        type: '(uid: string) => boolean',
        desc: 'Switches to a specific microphone, such as an attached USB or Bluetooth one.',
        inputs: [{ name: 'uid', type: 'string', desc: 'A uid from the inputs list.' }],
        output: 'Returns true when the platform accepted it, false with the reason in error otherwise.',
      },
      {
        name: 'setRoute(route)',
        type: "(route: 'speaker' | 'earpiece') => Promise<void>",
        desc: 'Sends playback to the loudspeaker or the call earpiece, at the audio-mode level.',
        inputs: [{ name: 'route', type: "'speaker' | 'earpiece'", desc: 'earpiece is the quiet, held-to-the-ear path.' }],
        output: 'Resolves once the audio mode is applied; on failure route is unchanged and error is set.',
      },
      {
        name: 'playLastRecording(uri?)',
        type: '(uri?: string) => Promise<boolean>',
        desc: 'Plays a recording and starts position polling five times a second.',
        inputs: [{ name: 'uri', type: 'string | undefined', desc: 'A specific file to play. Defaults to lastRecordingUri.' }],
        output: 'Resolves true when playback started, false when there is nothing to play or the player refused.',
      },
      {
        name: 'pausePlayback()',
        type: '() => void',
        desc: 'Pauses playback where it is.',
        output: 'Returns nothing; isPlaying becomes false and position polling stops.',
      },
      {
        name: 'stopPlayback()',
        type: '() => Promise<void>',
        desc: 'Stops playback and rewinds to the start.',
        output: 'Resolves once rewound; playbackPositionSeconds returns to 0.',
      },
      {
        name: 'seekPlayback(seconds)',
        type: '(seconds: number) => Promise<void>',
        desc: 'Jumps to a position in the file being played.',
        inputs: [{ name: 'seconds', type: 'number', desc: 'Absolute position; negatives are clamped to 0.' }],
        output: 'Resolves once the seek completes; playbackPositionSeconds updates.',
      },
    ],
    example: `import { useAudio } from 'pixelkit';

function Recorder() {
  const audio = useAudio();
  return (
    <View>
      <Button
        title={audio.isRecording ? 'Stop' : 'Record'}
        onPress={() => audio.isRecording ? audio.stopRecording() : audio.startRecording({ maxDurationSeconds: 30 })}
      />
      <View style={{ width: 200 * audio.level, height: 4, backgroundColor: '#6FDCF2' }} />
      <Text>{audio.durationSeconds}s · peak {audio.peakDecibels} dBFS</Text>
      {audio.lastRecordingUri && <Button title="Play" onPress={() => audio.playLastRecording()} />}
    </View>
  );
}`,
    agentNote:
      'Use level for meters, not meteringDecibels, because the dBFS scale is logarithmic and looks wrong on a bar. Use the speech profile for anything heading to speech recognition.',
  },
  {
    id: 'useDisplay',
    name: 'useDisplay',
    category: 'system',
    chipBadge: 'LTPO OLED · ARR',
    badgeColor: SYSTEM,
    summary: 'Refresh rate, HDR capability, brightness and the screen wake lock.',
    plain:
      'Reads what the screen is doing and lets you influence it. The refresh rate changes constantly on this panel to save power, so it is re-read live rather than assumed.',
    description:
      'Display mode, supported refresh rates, HDR types and resolution come from the Android Display object through the native module, re-read every two seconds because adaptive refresh rate changes the active mode continuously. Brightness uses expo-brightness and the wake lock uses expo-keep-awake. setPreferredRefreshRate requests a rate; the platform may ignore it, so read refreshRateHz back rather than assuming it took.',
    signature: 'useDisplay(): DisplayState',
    params: [],
    returns: [
      { name: 'refreshRateHz', type: 'number', desc: 'Rate the panel is running at right now. Changes on its own with adaptive refresh.' },
      { name: 'hasArrSupport', type: 'boolean | null', desc: 'Whether adaptive refresh rate is supported.' },
      { name: 'supportedRefreshRates', type: 'number[]', desc: 'Every rate the panel can drive, down to 1 Hz on this device.' },
      { name: 'resolution', type: '{ width, height, densityDpi } | null', desc: 'Physical resolution and density of the active mode.' },
      { name: 'hdrTypes', type: 'number[]', desc: 'Supported HDR formats: 1 Dolby Vision, 2 HDR10, 3 HLG, 4 HDR10+.' },
      { name: 'isHdr', type: 'boolean', desc: 'Whether the panel reports HDR capability at all.' },
      { name: 'maxLuminance', type: 'number | null', desc: 'Peak luminance the panel reports, when it reports one.' },
      { name: 'brightness', type: 'number', desc: 'Current screen brightness from 0 to 1.' },
      { name: 'isKeepAwake', type: 'boolean', desc: 'Whether this app is currently holding the screen on.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'setPreferredRefreshRate(hz)',
        type: '(rateHz: number) => Promise<boolean>',
        desc: 'Asks the system for a refresh rate for this window, for example 120 during an animation and 60 otherwise.',
        inputs: [{ name: 'rateHz', type: 'number', desc: 'A rate from supportedRefreshRates.' }],
        output: 'Resolves true when the request was applied. It is a request, not a guarantee: the system may pick another mode.',
      },
      {
        name: 'setScreenBrightness(value)',
        type: '(value: number) => Promise<void>',
        desc: 'Sets the brightness of this app window.',
        inputs: [{ name: 'value', type: 'number', desc: '0 to 1; values outside are clamped.' }],
        output: 'Resolves once applied. No-op on web; on failure brightness is left unchanged.',
      },
      {
        name: 'toggleKeepAwake()',
        type: '() => Promise<void>',
        desc: 'Acquires or releases a tagged screen wake lock, so the display does not dim during a long read or capture.',
        output: 'Resolves once the lock state has flipped; isKeepAwake reflects it. Release it when you no longer need it.',
      },
    ],
    example: `import { useDisplay } from 'pixelkit';

function DisplayPanel() {
  const display = useDisplay();
  return (
    <View>
      <Text>{display.refreshRateHz} Hz{display.hasArrSupport ? ' · adaptive' : ''}</Text>
      <Button title="Prefer 120 Hz" onPress={() => display.setPreferredRefreshRate(120)} />
    </View>
  );
}`,
    agentNote:
      'Do not cache refreshRateHz; it moves. Always release the wake lock when the screen no longer needs to stay on, or you will drain the battery.',
  },
  {
    id: 'useDevice',
    name: 'useDevice',
    category: 'system',
    chipBadge: 'Battery · PMIC · power telemetry',
    badgeColor: SYSTEM,
    summary: 'Device identity, battery level, thermistor temperature, voltage, current, and wattage.',
    plain:
      'Facts about the phone, its hardware identity, and its real physical power state: battery level, fuel gauge thermistor temperature, instantaneous cell voltage and current flow, wattage draw/charging rate, health status, and lifetime charge cycles.',
    description:
      'Identity comes from expo-device, live power state from expo-battery listeners, and deep physical battery telemetry from the native fuel gauge PMIC via PixelNative.getBatteryTelemetry(). batteryTemperatureC reads the actual lithium pack NTC thermistor in 0.1 °C units. batteryVoltageMv and batteryCurrentMa give the cell terminal voltage and live current draw (negative discharging, positive charging); batteryPowerWatts computes real-time wattage (V × I). On Android 14+, batteryCycleCount reads lifetime charge cycles from the PMIC EEPROM. Nothing is simulated: unavailable readings are null.',
    signature: 'useDevice(): DeviceTelemetry & { batteryPercent, batteryTemperatureC, batteryVoltageMv, batteryCurrentMa, batteryCurrentAvgMa, batteryPowerWatts, batteryHealth, batteryCycleCount, batteryChargeCounterMah, batteryEnergyCounterMwh, batteryTechnology, pluggedSource, batteryTelemetry, hasRead, error, source, refresh }',
    params: [],
    returns: [
      { name: 'modelName', type: 'string', desc: 'Commercial model name (e.g. "Pixel 11 Pro").' },
      { name: 'brand', type: 'string', desc: 'Hardware manufacturer brand (e.g. "Google").' },
      { name: 'osVersion', type: 'string', desc: 'Android release string.' },
      { name: 'batteryPercent', type: 'number | null', desc: 'Charge remaining as an integer percentage, 0 to 100. Null until the first read; it is never reported as 0 to fill the gap.' },
      { name: 'batteryPercent', type: 'number | null', desc: 'Honest charge percentage, null until the platform answers.' },
      { name: 'isCharging', type: 'boolean', desc: 'Whether a charger is attached (AC, USB, wireless or dock).' },
      { name: 'lowPowerMode', type: 'boolean', desc: 'Whether Battery Saver is active. Treat as a direct instruction to do less work.' },
      { name: 'networkType', type: 'string', desc: 'Active network connection type (e.g. "WIFI", "CELLULAR").' },
      { name: 'isConnected', type: 'boolean', desc: 'Whether a working, reachable internet route exists.' },
      { name: 'totalMemoryMB', type: 'number | undefined', desc: 'Total system LPDDR5X RAM in MB, when the platform reports it.' },
      { name: 'batteryTemperatureC', type: 'number | null', desc: 'Real physical battery temperature in °C from the fuel gauge NTC thermistor.' },
      { name: 'batteryVoltageMv', type: 'number | null', desc: 'Instantaneous battery cell terminal voltage in millivolts (e.g. 4120 mV).' },
      { name: 'batteryCurrentMa', type: 'number | null', desc: 'Instantaneous current flow in mA (negative discharging, positive charging).' },
      { name: 'batteryCurrentAvgMa', type: 'number | null', desc: 'Rolling average current flow in mA from the fuel gauge.' },
      { name: 'batteryPowerWatts', type: 'number | null', desc: 'Real-time power consumption or fast-charging rate in Watts (V × |I|).' },
      { name: 'batteryHealth', type: "'GOOD' | 'OVERHEAT' | 'DEAD' | 'OVER_VOLTAGE' | 'UNSPECIFIED_FAILURE' | 'COLD' | 'UNKNOWN' | null", desc: 'Hardware battery health state reported by the PMIC.' },
      { name: 'batteryCycleCount', type: 'number | null', desc: 'Lifetime charge cycle count stored in the battery EEPROM (Android 14+).' },
      { name: 'batteryChargeCounterMah', type: 'number | null', desc: 'Remaining battery charge capacity in milliampere-hours (mAh).' },
      { name: 'batteryEnergyCounterMwh', type: 'number | null', desc: 'Remaining stored energy in milliwatt-hours (mWh).' },
      { name: 'batteryTechnology', type: 'string | null', desc: 'Battery cell chemistry string (e.g. "Li-ion").' },
      { name: 'pluggedSource', type: "'AC' | 'USB' | 'WIRELESS' | 'DOCK' | 'NONE' | null", desc: 'Specific power supply source when charging.' },
      { name: 'batteryTelemetry', type: 'BatteryTelemetry | null', desc: 'Full native battery telemetry structure including probed thermal zones.' },
      { name: 'hasRead', type: 'boolean', desc: 'Whether any power, battery, or network value has been successfully read.' },
      { name: 'error', type: 'string | null', desc: 'Error message if the last telemetry read failed, null otherwise.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'refresh',
        type: '() => Promise<void>',
        desc: 'Re-reads device power, PMIC battery fuel gauge, and network connectivity.',
        inputs: [],
        output: 'Promise<void> — Resolves once all battery, electrical, and network states are refreshed.',
      },
    ],
    example: `import { useDevice } from 'pixelkit';

function PowerHUD() {
  const { batteryPercent, batteryTemperatureC, batteryVoltageMv, batteryPowerWatts, isCharging, refresh } = useDevice();
  return (
    <View>
      <Text>Battery: {batteryPercent}% {isCharging ? '(charging)' : ''}</Text>
      <Text>Temp: {batteryTemperatureC != null ? \`\${batteryTemperatureC.toFixed(1)} °C\` : '—'}</Text>
      <Text>Voltage: {batteryVoltageMv ?? '—'} mV</Text>
      <Text>Rate: {batteryPowerWatts != null ? \`\${batteryPowerWatts.toFixed(2)} W\` : '—'}</Text>
    </View>
  );
}`,
    agentNote:
      'Respect lowPowerMode: reduce sensor intervals and defer heavy work when true. Use batteryTemperatureC and batteryVoltageMv for real battery hardware metrics rather than simulating values.',
  },
  {
    id: 'useNetwork',
    name: 'useNetwork',
    category: 'system',
    chipBadge: 'expo-network',
    badgeColor: SYSTEM,
    summary: 'Connection type, address and whether traffic actually goes anywhere.',
    plain:
      'Whether the phone is online, how it is connected, and whether that connection costs money. Check isConnected before any network call, and isMetered before a large download.',
    description:
      'Reads from expo-network: interface type, IP address, reachability and airplane mode. Being connected to Wi-Fi is not the same as having internet, which is why isConnected reflects a usable route rather than merely an attached interface. isMetered marks connections where the user pays per byte, typically cellular or a hotspot.',
    signature: 'useNetwork(): NetworkTelemetry & { refreshNetwork }',
    params: [],
    returns: [
      { name: 'networkType', type: 'string', desc: 'WIFI, CELLULAR, NONE or UNKNOWN.' },
      { name: 'ipAddress', type: 'string | null', desc: 'Address on the current interface.' },
      { name: 'isConnected', type: 'boolean', desc: 'Whether a usable internet route exists, not merely an attached interface.' },
      { name: 'isMetered', type: 'boolean', desc: 'Whether the user pays for this traffic. Gate large transfers on it.' },
      { name: 'isAirplaneMode', type: 'boolean', desc: 'Whether airplane mode is on.' },
    ],
    actions: [
      {
        name: 'refreshNetwork()',
        type: '() => Promise<void>',
        desc: 'Re-runs the connectivity check immediately, for example when the app returns to the foreground.',
        output: 'Resolves once the read completes. Each sub-read fails independently, so one missing value does not blank the rest.',
      },
    ],
    example: `import { useNetwork } from 'pixelkit';

async function upload(net) {
  if (!net.isConnected) return 'offline';
  if (net.isMetered) return 'ask the user before using mobile data';
  // ... proceed
}`,
    agentNote:
      'Check isConnected before every network call and isMetered before anything large. Never assume Wi-Fi means free or fast.',
  },
  {
    id: 'useVideo',
    name: 'useVideo',
    category: 'system',
    chipBadge: 'expo-video · playback',
    badgeColor: SYSTEM,
    summary: 'Playing video back, with position, seeking and thumbnails.',
    plain:
      'Plays a video file or stream. The natural partner to the camera: record a clip, hand the file to load(), and play it. It tracks position and duration so you can draw a scrubber, and can pull out frames as images for a poster or filmstrip.',
    description:
      'Wraps expo-video, the SDK 57 replacement for the removed expo-av. The hook owns the player and a screen renders VideoView with it. Position, duration, buffered position and status are polled four times a second, which is enough for a scrubber without waking the JS thread every frame. Everything reported comes from the player rather than being tracked locally, so a seek made elsewhere still shows up.',
    signature: 'useVideo(initialSource?: VideoSource): VideoState',
    params: [
      { name: 'initialSource', type: 'VideoSource', desc: 'Optional file URI, remote URL or bundled asset to load on mount. Defaults to null.' },
    ],
    returns: [
      { name: 'player', type: 'VideoPlayer', desc: 'Pass to <VideoView player={player} />. The view renders nothing without it.' },
      { name: 'hasSource', type: 'boolean', desc: 'Whether a source has been loaded.' },
      { name: 'isPlaying', type: 'boolean', desc: 'Whether playback is running.' },
      { name: 'positionSeconds', type: 'number', desc: 'Seconds into the clip. Drives a scrubber.' },
      { name: 'durationSeconds', type: 'number', desc: 'Total length. 0 until the source reports it.' },
      { name: 'bufferedSeconds', type: 'number', desc: 'How far ahead the player has buffered, which matters for a remote source.' },
      { name: 'status', type: 'string', desc: 'Player status, for example loading, readyToPlay or error.' },
      { name: 'isMuted', type: 'boolean', desc: 'Whether audio is muted.' },
      { name: 'isLooping', type: 'boolean', desc: 'Whether the clip restarts at the end.' },
      { name: 'playbackRate', type: 'number', desc: 'Speed multiplier; 1 is normal. Pitch is preserved.' },
      { name: 'volume', type: 'number', desc: 'Player volume from 0 to 1.' },
      { name: 'error', type: 'string | null', desc: 'Why the last operation failed.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'load(source, options?)',
        type: '(next: VideoSource, options?: { autoplay?: boolean; loop?: boolean; muted?: boolean }) => Promise<boolean>',
        desc: 'Swaps the player source, for example the clip useCamera just recorded.',
        inputs: [
          { name: 'next', type: 'VideoSource', desc: 'A file URI, a remote URL, a required asset, or null to clear.' },
          { name: 'options.autoplay', type: 'boolean | undefined', desc: 'Start playing as soon as the source is ready.' },
          { name: 'options.loop', type: 'boolean | undefined', desc: 'Restart from the beginning at the end.' },
          { name: 'options.muted', type: 'boolean | undefined', desc: 'Start muted.' },
        ],
        output: 'Resolves true when the source was replaced, false with the reason in error otherwise.',
      },
      {
        name: 'play() / pause() / togglePlay()',
        type: '() => void',
        desc: 'Transport controls for the player this hook owns.',
        output: 'Returns nothing; isPlaying updates on the next poll or immediately, and error is set when the player refused.',
      },
      {
        name: 'seekTo(seconds)',
        type: '(seconds: number) => void',
        desc: 'Jumps to an absolute position.',
        inputs: [{ name: 'seconds', type: 'number', desc: 'Position in seconds, clamped to 0 and the clip duration.' }],
        output: 'Returns nothing; positionSeconds updates immediately.',
      },
      {
        name: 'seekBy(seconds)',
        type: '(seconds: number) => void',
        desc: 'Moves relative to the current position.',
        inputs: [{ name: 'seconds', type: 'number', desc: 'Offset in seconds; negative rewinds.' }],
        output: 'Returns nothing; on failure error is set.',
      },
      {
        name: 'replay()',
        type: '() => void',
        desc: 'Restarts from the beginning and plays.',
        output: 'Returns nothing; positionSeconds returns to 0.',
      },
      {
        name: 'setMuted(muted) / setLoop(loop)',
        type: '(value: boolean) => void',
        desc: 'Toggles mute and looping.',
        inputs: [{ name: 'value', type: 'boolean', desc: 'True mutes, or makes the clip restart at the end.' }],
        output: 'Returns nothing; isMuted and isLooping reflect it. Muting does not change volume.',
      },
      {
        name: 'setPlaybackRate(rate)',
        type: '(rate: number) => void',
        desc: 'Sets playback speed with pitch preserved.',
        inputs: [{ name: 'rate', type: 'number', desc: 'Clamped between 0.25 and 4; 1 is normal speed.' }],
        output: 'Returns nothing; playbackRate reflects the clamped value.',
      },
      {
        name: 'setVolume(value)',
        type: '(value: number) => void',
        desc: 'Sets player volume, independently of mute.',
        inputs: [{ name: 'value', type: 'number', desc: '0 to 1; values outside are clamped.' }],
        output: 'Returns nothing; volume updates.',
      },
      {
        name: 'setKeepScreenOn(keep)',
        type: '(keep: boolean) => void',
        desc: 'Stops the screen dimming mid-clip.',
        inputs: [{ name: 'keep', type: 'boolean', desc: 'True while a video is playing; release it afterwards.' }],
        output: 'Returns nothing.',
      },
      {
        name: 'generateThumbnails(times)',
        type: '(times: number | number[]) => Promise<VideoThumbnail[]>',
        desc: 'Extracts frames as images, for a filmstrip or a poster.',
        inputs: [{ name: 'times', type: 'number | number[]', desc: 'One position in seconds, or several.' }],
        output: 'Resolves with the extracted frames, or an empty array on failure with the reason in error.',
      },
    ],
    example: `import { VideoView } from 'expo-video';
import { useCamera, useVideo } from 'pixelkit';

function Playback() {
  const cam = useCamera();
  const video = useVideo();

  return (
    <View>
      <VideoView player={video.player} style={{ height: 220 }} />
      <Button
        title="Play last recording"
        disabled={!cam.lastVideoUri}
        onPress={() => cam.lastVideoUri && video.load(cam.lastVideoUri, { autoplay: true })}
      />
      <Text>{video.positionSeconds} / {video.durationSeconds} s</Text>
    </View>
  );
}`,
    agentNote:
      'The view needs the player object; passing a URI to VideoView does nothing. Turn keepScreenOn off when playback ends or the screen stays lit.',
  },
  {
    id: 'useSpeech',
    name: 'useSpeech',
    category: 'ai',
    chipBadge: 'expo-speech · text to speech',
    badgeColor: AI,
    summary: 'Speaking text aloud with the voices the phone has installed.',
    plain:
      'Reads text out loud. This is the output half of voice: useSpeechAI listens, this one talks back. Which voices exist depends on what the user has downloaded in system settings, so check the list rather than assuming a language is available.',
    description:
      'Wraps expo-speech, which drives the platform speech service. speak resolves when the engine finishes, so utterances can be awaited in sequence rather than overlapping. Text longer than maxInputLength is rejected rather than silently truncated, because a cut-off sentence is worse than an error. The hook stops the engine on unmount so speech does not continue after the screen is gone.',
    signature: 'useSpeech(): SpeechState',
    params: [],
    returns: [
      { name: 'isSpeaking', type: 'boolean', desc: 'Whether the engine is talking.' },
      { name: 'isPaused', type: 'boolean', desc: 'Whether speech is paused rather than stopped.' },
      { name: 'voices', type: 'Voice[]', desc: 'Installed voices, each with an identifier, name, language and quality.' },
      { name: 'voice', type: 'string | null', desc: 'Selected voice identifier, or null for the system default.' },
      { name: 'rate', type: 'number', desc: 'Speaking speed; 1 is normal.' },
      { name: 'pitch', type: 'number', desc: 'Voice pitch; 1 is normal.' },
      { name: 'maxInputLength', type: 'number', desc: 'Longest string the engine accepts in one call.' },
      { name: 'lastSpokenText', type: 'string | null', desc: 'Text of the most recent utterance.' },
      { name: 'error', type: 'string | null', desc: 'Why the last utterance failed.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'speak(text, options?)',
        type: '(text: string, options?: SpeakOptions) => Promise<void>',
        desc: 'Speaks the text on the platform engine. Await it to sequence utterances instead of overlapping them.',
        inputs: [
          { name: 'text', type: 'string', desc: 'What to say. Trimmed first; blank resolves immediately. Longer than maxInputLength is rejected, not truncated.' },
          { name: 'options.language', type: 'string | undefined', desc: 'BCP-47 tag such as en-GB. Defaults to the system language.' },
          { name: 'options.voice', type: 'string | undefined', desc: 'Identifier from voices; overrides language when both are given.' },
          { name: 'options.rate', type: 'number | undefined', desc: 'Speaking speed; 1 is normal. Falls back to the hook rate.' },
          { name: 'options.pitch', type: 'number | undefined', desc: 'Voice pitch; 1 is normal. Falls back to the hook pitch.' },
          { name: 'options.volume', type: 'number | undefined', desc: '0 to 1 for this utterance.' },
        ],
        output: 'Resolves when the engine finishes or is stopped. Rejects when the text is too long or the engine errors, with the message also in error.',
      },
      {
        name: 'stop()',
        type: '() => Promise<void>',
        desc: 'Stops speaking immediately and discards the queue.',
        output: 'Resolves once stopped; isSpeaking and isPaused become false. Any pending speak promise resolves rather than rejecting.',
      },
      {
        name: 'pause() / resume()',
        type: '() => Promise<void>',
        desc: 'Suspends and continues an utterance. Not supported by every engine.',
        output: 'Resolves once applied; where the engine does not support it, error explains that and isPaused is unchanged.',
      },
      {
        name: 'checkSpeaking()',
        type: '() => Promise<boolean>',
        desc: 'Asks the engine directly rather than trusting the local flag.',
        output: 'Resolves with the engine answer, which is also written to isSpeaking. False when the engine cannot be reached.',
      },
      {
        name: 'refreshVoices()',
        type: '() => Promise<Voice[]>',
        desc: 'Re-reads installed voices, which changes when the user downloads one in system settings.',
        output: 'Resolves with the list, also written to voices. Empty array on failure, with the reason in error.',
      },
      {
        name: 'voicesForLanguage(languageTag)',
        type: '(languageTag: string) => Voice[]',
        desc: 'Filters the installed voices to one language, so you can offer a real choice.',
        inputs: [{ name: 'languageTag', type: 'string', desc: "A prefix such as 'en' or a full tag such as 'en-GB'. Matched case-insensitively." }],
        output: 'Returns the matching voices; empty when none are installed for that language.',
      },
      {
        name: 'setVoice(id) / setRate(n) / setPitch(n)',
        type: '(value: string | null | number) => void',
        desc: 'Defaults applied to later calls to speak, unless that call overrides them.',
        inputs: [{ name: 'value', type: 'string | null | number', desc: 'A voice identifier from voices, or null for the system default; for rate and pitch, 1 is normal.' }],
        output: 'Returns nothing; voice, rate and pitch update.',
      },
    ],
    example: `import { useSpeech, useGeminiNano } from 'pixelkit';

function TalkBack() {
  const speech = useSpeech();
  const nano = useGeminiNano();

  const answer = async () => {
    const reply = await nano.generate('Describe the thermal state in one sentence.');
    await speech.speak(reply.text, { rate: 0.95 });
  };
  return <Button title="Ask and speak" onPress={answer} />;
}`,
    agentNote:
      'Await speak rather than firing several in a row, or they queue unpredictably. Check voices before promising a language; coverage depends on what the user installed.',
  },
  {
    id: 'useMediaLibrary',
    name: 'useMediaLibrary',
    category: 'system',
    chipBadge: 'expo-media-library · gallery',
    badgeColor: SYSTEM,
    summary: 'Saving captures to the gallery, and reading what is there.',
    plain:
      'Puts a photo or video into the user\'s own gallery, where it survives and other apps can see it. Without this a capture sits in the app\'s cache and disappears when the system needs space. Also lists recent items and can delete one.',
    description:
      'Wraps expo-media-library. SDK 57 uses the class API (Asset.create, Album.create, Query) rather than the deprecated createAssetAsync helpers, which now throw at runtime. Asset fields are async accessors, so the hook flattens each into a plain SavedMedia object that a list can render directly. Permission is more subtle than a yes or no on modern Android: access is granted per media type, and the user can share only selected items, which is what hasLimitedAccess reports.',
    signature: 'useMediaLibrary(): MediaLibraryState',
    params: [],
    returns: [
      { name: 'permissionGranted', type: 'boolean', desc: 'Whether library access was granted.' },
      { name: 'hasLimitedAccess', type: 'boolean', desc: 'Android 13+: the user shared only selected items, so the library is not fully visible.' },
      { name: 'isSaving', type: 'boolean', desc: 'True while a file is being written.' },
      { name: 'isLoading', type: 'boolean', desc: 'True while the library is being read.' },
      { name: 'recent', type: 'SavedMedia[]', desc: 'Newest items from the last loadRecent call, most recent first.' },
      { name: 'lastSaved', type: 'SavedMedia | null', desc: 'The item this app most recently wrote.' },
      { name: 'error', type: 'string | null', desc: 'Why the last operation failed.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'requestPermission(writeOnly?)',
        type: '(writeOnly?: boolean) => Promise<boolean>',
        desc: 'Asks for media library access.',
        inputs: [{ name: 'writeOnly', type: 'boolean | undefined', desc: 'True asks only for write access, for an app that saves but never browses. Defaults to false.' }],
        output: 'Resolves true when granted. hasLimitedAccess becomes true when the user shared only selected items, so a grant is not full access.',
      },
      {
        name: 'save(localUri, albumName?)',
        type: '(localUri: string, albumName?: string) => Promise<SavedMedia | null>',
        desc: 'Copies a capture out of the app cache into the user media store, where it survives.',
        inputs: [
          { name: 'localUri', type: 'string', desc: 'The file useCamera or useAudio returned.' },
          { name: 'albumName', type: 'string | undefined', desc: 'Album to file it under. Created when it does not exist.' },
        ],
        output: 'Resolves with { id, uri, filename, width, height, durationSeconds, creationTime }, or null when permission was denied or the write failed.',
      },
      {
        name: 'loadRecent(limit?)',
        type: '(limit?: number) => Promise<SavedMedia[]>',
        desc: 'Reads the newest items in the library, newest first.',
        inputs: [{ name: 'limit', type: 'number | undefined', desc: 'How many items to read. Defaults to 20.' }],
        output: 'Resolves with the items, also written to recent. Empty array when permission was denied.',
      },
      {
        name: 'remove(media)',
        type: '(media: SavedMedia) => Promise<boolean>',
        desc: 'Deletes an item from the device. The system may show its own confirmation.',
        inputs: [{ name: 'media', type: 'SavedMedia', desc: 'An item from recent or lastSaved.' }],
        output: 'Resolves true when the item was deleted, and it is dropped from recent.',
      },
    ],
    example: `import { useCamera, useMediaLibrary } from 'pixelkit';

function Keep() {
  const cam = useCamera();
  const library = useMediaLibrary();

  const shoot = async () => {
    const photo = await cam.takePicture();
    if (photo) await library.save(photo.uri, 'PixelKit');
  };
  return <Button title="Capture and keep" onPress={shoot} />;
}`,
    agentNote:
      'A capture is not kept until you call save; cache files are collected by the system. Ask with writeOnly when you only need to save, and handle hasLimitedAccess rather than assuming the whole library is readable.',
  },
  {
    id: 'useCellular',
    name: 'useCellular',
    category: 'system',
    chipBadge: 'expo-cellular · modem',
    badgeColor: SYSTEM,
    summary: 'Carrier, radio generation and network codes from the modem.',
    plain:
      'Tells you whether the phone is on 5G or something slower, and which carrier is serving it. useNetwork can only say the connection is cellular; this says what kind, which is what you need before deciding to stream or download something large.',
    description:
      'Wraps expo-cellular. generation reflects the current data connection, so it changes as the phone moves and reads unknown when there is no cellular data attached, including on Wi-Fi. Carrier name and the mobile country and network codes need the phone-state permission on Android; without it they stay null rather than being guessed. The country and network codes together identify a carrier globally, which is more reliable than matching on the display name.',
    signature: 'useCellular(): CellularState',
    params: [],
    returns: [
      { name: 'generation', type: "'unknown' | '2G' | '3G' | '4G' | '5G'", desc: 'Radio generation of the current data connection.' },
      { name: 'is5G', type: 'boolean', desc: 'Convenience for generation === "5G".' },
      { name: 'carrierName', type: 'string | null', desc: 'Carrier display name. Null without the phone-state permission.' },
      { name: 'isoCountryCode', type: 'string | null', desc: 'ISO country of the SIM.' },
      { name: 'mobileCountryCode', type: 'string | null', desc: 'First half of the global carrier identifier.' },
      { name: 'mobileNetworkCode', type: 'string | null', desc: 'Second half. Match on this pair rather than the display name.' },
      { name: 'allowsVoip', type: 'boolean | null', desc: 'Whether the carrier permits voice over IP. Null when undetermined.' },
      { name: 'permissionGranted', type: 'boolean', desc: 'Whether the phone-state permission was granted.' },
      { name: 'error', type: 'string | null', desc: 'Why the last read failed.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'refresh()',
        type: '() => Promise<void>',
        desc: 'Re-reads everything the platform answers without prompting.',
        output: 'Resolves once generation, carrier and network codes have been updated. Values that need the phone-state permission stay null without it.',
      },
      {
        name: 'requestPermission()',
        type: '() => Promise<boolean>',
        desc: 'Asks for the phone-state permission, which unlocks carrier name and network codes on Android.',
        output: 'Resolves true when granted, and refreshes automatically. Generation is readable without it.',
      },
    ],
    example: `import { useCellular, useNetwork } from 'pixelkit';

function ShouldStream() {
  const net = useNetwork();
  const cell = useCellular();
  if (!net.isConnected) return <Text>Offline</Text>;
  if (net.isMetered && !cell.is5G) return <Text>On {cell.generation}, ask before streaming</Text>;
  return <Text>Fine to stream</Text>;
}`,
    agentNote:
      'Pair with useNetwork().isMetered: generation tells you how fast, metered tells you who pays. Do not request phone state unless you actually need the carrier.',
  },
];
