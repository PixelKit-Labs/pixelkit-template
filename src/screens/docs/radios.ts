/**
 * @file radios.ts
 * @description Radios & security: one documentation entry per hook, each with its inputs, its
 * outputs, and a contract for every function it exposes.
 */

import { type DocModule, RADIO, SOURCE_FIELD } from './shared';

export const RADIOS_MODULES: DocModule[] = [
  {
    id: 'useBiometrics',
    name: 'useBiometrics',
    category: 'radios',
    chipBadge: 'BiometricPrompt',
    badgeColor: RADIO,
    summary: 'Fingerprint and face authentication.',
    plain:
      'Asks the user to prove who they are with their fingerprint or face. Check that hardware exists and that something is actually enrolled before you offer it, otherwise the prompt will fail.',
    description:
      'Uses the platform BiometricPrompt through expo-local-authentication, which on a Pixel is backed by the hardware security module. The two checks matter separately: a device can have the sensor but no enrolled credential, in which case authentication cannot succeed and you should fall back to a passcode path.',
    signature: 'useBiometrics(): BiometricState & { authenticate }',
    params: [],
    returns: [
      { name: 'hasHardware', type: 'boolean', desc: 'Whether a biometric sensor exists.' },
      { name: 'isEnrolled', type: 'boolean', desc: 'Whether the user has registered a fingerprint or face. Without this, prompts fail.' },
      { name: 'supportedTypes', type: 'string[]', desc: 'Which modalities are available, such as fingerprint or face.' },
    ],
    actions: [
      {
        name: 'authenticate(promptMessage?)',
        type: '(promptMessage?: string) => Promise<boolean>',
        desc: 'Shows the system biometric prompt with a device-passcode fallback.',
        inputs: [{ name: 'promptMessage', type: 'string | undefined', desc: 'The line shown in the system sheet. Defaults to "Verify identity with Pixel Biometrics".' }],
        output: 'Resolves true only on success. A cancel or a mismatch resolves false without setting error; missing hardware or no enrolment resolves false and sets error. lastResult tells the three apart.',
      },
    ],
    example: `import { useBiometrics } from 'pixelkit';

function Unlock() {
  const { hasHardware, isEnrolled, authenticate } = useBiometrics();
  if (!hasHardware || !isEnrolled) return <Text>Use a passcode instead</Text>;
  return <Button title="Unlock" onPress={() => authenticate('Confirm your identity')} />;
}`,
    agentNote:
      'Always provide a non-biometric path. Never treat a false result as an attack; a cancel and a failure look the same here.',
  },
  {
    id: 'useSecurity',
    name: 'useSecurity',
    category: 'radios',
    chipBadge: 'SecureStore · Android Keystore',
    badgeColor: RADIO,
    summary: 'Encrypted storage for secrets, backed by hardware.',
    plain:
      'Where API keys and tokens belong. Values are encrypted with a key the operating system holds in secure hardware, so they are not readable from app storage. Never put a secret anywhere else.',
    description:
      'Wraps expo-secure-store, which encrypts values using a key held in the Android Keystore and, on devices that have it, StrongBox. Whether this device actually has StrongBox is verified separately by useCapabilities().hasStrongBox. Android 17 does have post-quantum key types, but SecureStore does not use them, so isPostQuantumProtected is false rather than implying protection that is not there.',
    signature: 'useSecurity(): SecurityState',
    params: [],
    returns: [
      { name: 'isHardwareBacked', type: 'boolean', desc: 'True on Android, where the encryption key lives in the Keystore.' },
      { name: 'securityModule', type: 'string', desc: 'Backend name the platform reports, "Android Keystore" here.' },
      { name: 'isPostQuantumProtected', type: 'boolean', desc: 'Always false. SecureStore uses classical AES; do not claim otherwise.' },
    ],
    actions: [
      {
        name: 'saveSecureItem(key, value)',
        type: '(key: string, value: string) => Promise<boolean>',
        desc: 'Encrypts and stores a value. This is the only sanctioned place for a secret.',
        inputs: [
          { name: 'key', type: 'string', desc: 'Storage key: alphanumerics, dot, dash and underscore.' },
          { name: 'value', type: 'string', desc: 'The secret itself. It is never written to the log.' },
        ],
        output: 'Resolves true on success, false with the reason in error on failure.',
      },
      {
        name: 'getSecureItem(key)',
        type: '(key: string) => Promise<string | null>',
        desc: 'Decrypts and returns a stored value.',
        inputs: [{ name: 'key', type: 'string', desc: 'The key used when saving.' }],
        output: 'Resolves with the value, or null when nothing is stored under that key or the read failed.',
      },
      {
        name: 'deleteSecureItem(key)',
        type: '(key: string) => Promise<boolean>',
        desc: 'Removes a stored value.',
        inputs: [{ name: 'key', type: 'string', desc: 'The key to delete.' }],
        output: 'Resolves true when the delete completed, false with the reason in error otherwise.',
      },
    ],
    example: `import { useSecurity } from 'pixelkit';

async function storeKey(value: string, security) {
  await security.saveSecureItem('MY_API_KEY', value);
}`,
    agentNote:
      'Never write a secret to plain storage, a log line, or source. Use this hook or saveApiKey, and do not describe the storage as post-quantum.',
  },
  {
    id: 'useBLE',
    name: 'useBLE',
    category: 'radios',
    chipBadge: 'Bluetooth 5.4 LE',
    badgeColor: RADIO,
    summary: 'Bluetooth adapter state, Channel Sounding, bonded devices, and active BLE peripheral discovery.',
    plain:
      'Reports whether Bluetooth is on, which devices are already paired, whether this phone supports Channel Sounding, and performs live RF peripheral discovery with real RSSI values.',
    description:
      'Adapter state, Channel Sounding support and the bonded device list are read from Android BluetoothAdapter through the native module with source hardware. Live peripheral discovery scans for nearby BLE beacons using Android BluetoothLeScanner, returning verified MAC addresses, RSSI (dBm), and log-distance path loss distance estimations.',
    signature: 'useBLE(): BLEState',
    params: [],
    returns: [
      { name: 'isSupported', type: 'boolean', desc: 'Whether the device has Bluetooth Low Energy.' },
      { name: 'isEnabled', type: 'boolean', desc: 'Whether Bluetooth is switched on in settings.' },
      { name: 'state', type: "'ON' | 'OFF' | 'TURNING_ON' | 'TURNING_OFF'", desc: 'Adapter state, including the transitional values.' },
      { name: 'channelSounding', type: 'boolean', desc: 'Whether Bluetooth 5.4 Channel Sounding, used for accurate distance, is supported.' },
      { name: 'bondedDevices', type: 'BondedDevice[]', desc: 'Devices already paired with this phone. Real data.' },
      { name: 'isScanning', type: 'boolean', desc: 'Whether a BLE scan is running.' },
      { name: 'peripherals', type: 'BLEPeripheral[]', desc: 'Discovered nearby BLE peripherals with genuine RSSI and distance estimate.' },
      { name: 'scanError', type: 'string | null', desc: 'Error message if scanning fails to start or times out.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'startScan(timeoutMs?)',
        type: '(timeoutMs?: number) => Promise<boolean>',
        desc: 'Begins physical Bluetooth Low Energy discovery through BluetoothLeScanner.',
        inputs: [{ name: 'timeoutMs', type: 'number | undefined', desc: 'How long to scan before stopping automatically, in milliseconds. Defaults to 10000.' }],
        output: 'Resolves true when the scan started; false with the reason in scanError otherwise. Results appear in peripherals, polled every 500 ms.',
      },
      {
        name: 'stopScan()',
        type: '() => void',
        desc: 'Stops active BLE discovery and clears the auto-stop timer.',
        output: 'Returns nothing; a final results sync runs first, so nothing already discovered is lost.',
      },
    ],
    example: `import { useBLE } from 'pixelkit';

function Bluetooth() {
  const { isEnabled, bondedDevices, peripherals, isScanning, startScan, stopScan } = useBLE();
  return (
    <View>
      <Text>{isEnabled ? \`\${bondedDevices.length} paired · \${peripherals.length} discovered\` : 'Bluetooth off'}</Text>
      <Button
        title={isScanning ? 'Stop scan' : 'Scan for peripherals'}
        onPress={() => isScanning ? stopScan() : startScan(8000)}
      />
    </View>
  );
}`,
    agentNote:
      'BLE scanning uses Android BluetoothLeScanner directly on physical hardware. Call startScan with a finite timeout to preserve battery.',
  },
  {
    id: 'useNFC',
    name: 'useNFC',
    category: 'radios',
    chipBadge: 'NfcAdapter reader mode · NDEF',
    badgeColor: RADIO,
    summary: 'Reading and writing real NFC tags through reader mode.',
    plain:
      'Reads tags you touch to the back of the phone and can write text to them. Start the reader, hold a tag against the upper third of the phone, and the tag arrives with its identifier, capacity and decoded contents. Writing works the same way: queue the text, then present the tag.',
    description:
      "Enables NfcAdapter reader mode on the foreground Activity through the native module. Every tag entering the field raises an event carrying its identifier, supported technologies, NDEF capacity, writability and decoded records; text records have their language prefix stripped and URI records are resolved. Two platform constraints are surfaced rather than hidden: reader mode is bound to the Activity, so it stops when the app is backgrounded and must be started again on resume; and a tag is only readable while physically in the field, so a read either happens in that window or reports why it did not.",
    signature: 'useNFC(): NFCState',
    params: [],
    returns: [
      { name: 'isSupported', type: 'boolean', desc: 'Whether this device has an NFC radio.' },
      { name: 'isEnabled', type: 'boolean', desc: 'Whether NFC is switched on in system settings.' },
      { name: 'observeModeSupported', type: 'boolean', desc: 'Whether Android 15 Observe Mode is available, which lets an app watch reader field activity.' },
      { name: 'antennaState', type: "'ENABLED' | 'DISABLED' | 'UNAVAILABLE'", desc: 'Current antenna state.' },
      { name: 'isReading', type: 'boolean', desc: 'Whether reader mode is running. Stops when the app leaves the foreground.' },
      { name: 'lastScannedTag', type: 'ScannedTag | null', desc: 'The last physical tag read: id, technologies, capacity, writability and decoded NDEF records.' },
      { name: 'tagCount', type: 'number', desc: 'How many tags have been read this session.' },
      { name: 'pendingWrite', type: 'string | null', desc: 'Text waiting to be written to the next tag presented.' },
      { name: 'lastWriteOk', type: 'boolean | null', desc: 'Whether the last queued write succeeded. Null before any attempt.' },
      { name: 'error', type: 'string | null', desc: 'Why the last operation failed, for example a read-only tag or one too small for the message.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'startReader()',
        type: '() => Promise<boolean>',
        desc: 'Enables NFC reader mode on the foreground Activity.',
        output: 'Resolves true when reader mode started; false with the reason in error when the device has no radio, NFC is switched off, or the build has no reader. Tags then arrive in lastScannedTag.',
      },
      {
        name: 'stopReader()',
        type: '() => Promise<void>',
        desc: 'Disables reader mode and releases the Activity binding.',
        output: 'Resolves once released; isReading becomes false and any pending write is dropped.',
      },
      {
        name: 'writeText(text)',
        type: '(text: string) => Promise<boolean>',
        desc: 'Queues a text record for the next tag presented. The reader must already be running.',
        inputs: [{ name: 'text', type: 'string', desc: 'The NDEF text record to write.' }],
        output: 'Resolves true when the write was queued, not when it completed; the outcome arrives later in lastWriteOk. False with the reason in error when it could not be queued.',
      },
      {
        name: 'clearTag()',
        type: '() => void',
        desc: 'Clears the last read from state, for a "scan another" control.',
        output: 'Returns nothing; lastScannedTag and lastWriteOk become null.',
      },
    ],
    example: `import { useNFC } from 'pixelkit';

function TagReader() {
  const nfc = useNFC();
  if (!nfc.isSupported) return <Text>No NFC radio</Text>;
  if (!nfc.isEnabled) return <Text>Turn NFC on in settings</Text>;
  return (
    <View>
      <Button
        title={nfc.isReading ? 'Stop reader' : 'Start reader'}
        onPress={() => nfc.isReading ? nfc.stopReader() : nfc.startReader()}
      />
      <Button title="Write a tag" onPress={() => nfc.writeText('hello from PixelKit')} />
      {nfc.lastScannedTag && (
        <Text>
          {nfc.lastScannedTag.id} · {nfc.lastScannedTag.records.length} records · {nfc.lastScannedTag.payload}
        </Text>
      )}
    </View>
  );
}`,
    agentNote:
      'Reader mode needs a foreground Activity, so restart it on resume rather than assuming it survived. Writing needs the reader running first, and the result arrives with the next tag event as lastWriteOk.',
  },
  {
    id: 'useRadios',
    name: 'useRadios',
    category: 'radios',
    chipBadge: 'Unified radio telemetry',
    badgeColor: RADIO,
    summary: 'Every radio subsystem in one read.',
    plain:
      'A single snapshot of all the wireless hardware: NFC, Bluetooth, ultra-wideband, Wi-Fi precise ranging and satellite messaging. Use this for a status overview instead of calling four separate hooks.',
    description:
      'One native call gathers state from NfcAdapter, BluetoothManager, UwbManager, WifiRttManager and PackageManager, refreshed every five seconds. Everything here is read from the platform, so the whole object carries source hardware. It overlaps with useNFC, useBLE and useUWB on purpose: those add per-radio actions, this one is purely for reading state.',
    signature: 'useRadios(): RadioTelemetry',
    params: [],
    returns: [
      { name: 'nfc', type: '{ supported, enabled, observeModeSupported, antennaState }', desc: 'NFC controller state.' },
      { name: 'bluetooth', type: '{ supported, bleSupported, enabled, state, channelSounding, bondedDevices }', desc: 'Adapter state plus paired devices and Channel Sounding support.' },
      { name: 'uwb', type: '{ supported, enabled, chipId, rangingApiSupported }', desc: 'Ultra-wideband chip state.' },
      { name: 'wifiRtt', type: '{ supported, available }', desc: 'Wi-Fi round-trip-time ranging, used for indoor positioning.' },
      { name: 'satellite', type: '{ supported }', desc: 'Whether satellite messaging is available on this device.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'refresh()',
        type: '() => void',
        desc: 'Forces an immediate re-read instead of waiting for the next five-second poll.',
        output: 'Returns nothing; the nfc, bluetooth, uwb, wifiRtt and satellite blocks update. Call it after sending the user to Settings.',
      },
    ],
    example: `import { useRadios } from 'pixelkit';

function RadioPanel() {
  const radios = useRadios();
  return <Text>NFC {radios.nfc.enabled ? 'on' : 'off'} · UWB {radios.uwb.enabled ? 'on' : 'off'}</Text>;
}`,
    agentNote:
      'Use this for a status overview and the individual hooks when you need to act. All fields here are real platform reads.',
  },
  {
    id: 'useLocation',
    name: 'useLocation',
    category: 'radios',
    chipBadge: 'Multi-band GNSS',
    badgeColor: RADIO,
    summary: 'Position, altitude, heading and speed from the satellite receiver.',
    plain:
      'Where the phone is, how accurate that is, which way it is pointing and how fast it is moving. Always check accuracy before trusting a fix, and check permission before assuming you will get one at all.',
    description:
      'Streams from expo-location using the high-accuracy provider, which on a Pixel uses the dual-band receiver. The accuracy value is the radius in metres that the platform believes the position lies within; indoors it can be tens of metres and should gate any decision made from the coordinates. Heading and speed are only meaningful while actually moving.',
    signature: 'useLocation(): LocationTelemetry & { refreshLocation }',
    params: [],
    returns: [
      { name: 'latitude', type: 'number', desc: 'Decimal degrees north.' },
      { name: 'longitude', type: 'number', desc: 'Decimal degrees east.' },
      { name: 'altitude', type: 'number | null', desc: 'Metres above sea level, less reliable than the horizontal position.' },
      { name: 'accuracy', type: 'number | null', desc: 'Radius in metres the fix is confident within. Check this before trusting the position.' },
      { name: 'heading', type: 'number | null', desc: 'Direction of travel in degrees, meaningful only while moving.' },
      { name: 'speed', type: 'number | null', desc: 'Ground speed in metres per second.' },
      { name: 'hasPermission', type: 'boolean', desc: 'Whether fine location permission was granted.' },
    ],
    actions: [
      {
        name: 'refreshLocation()',
        type: '() => Promise<boolean>',
        desc: 'Requests permission if needed and takes a fresh highest-accuracy fix.',
        output: 'Resolves true when a fix arrived, false when permission was denied or the fix failed, with the reason in error. Coordinates never reach the log.',
      },
    ],
    example: `import { useLocation } from 'pixelkit';

function Position() {
  const { latitude, longitude, accuracy, hasPermission } = useLocation();
  if (!hasPermission) return <Text>Location permission needed</Text>;
  return <Text>{latitude.toFixed(5)}, {longitude.toFixed(5)} ±{accuracy ?? '—'} m</Text>;
}`,
    agentNote:
      'Never present coordinates without their accuracy. Request permission in response to a user action, not on mount.',
  },
];
