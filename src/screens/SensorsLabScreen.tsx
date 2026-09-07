/**
 * @file SensorsLabScreen.tsx
 * @description Everything the hardware can do, in six sections from `src/core/surface.ts`: motion,
 * capture, audio, actuators, radios and security.
 *
 * Each piece of hardware appears exactly once, on the screen that demonstrates it. Silicon owns the
 * chip and the system; this owns the sensors, the actuators, the radios and the keystore. Values
 * that cannot be read render as "—" with an N/A tag rather than a plausible number.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { VideoView } from 'expo-video';
import { HapticEnvelopes, useAudio, useBLE, useBiometrics, useCamera, useCapabilities, useHaptics, useHiLight, useLocation, useMediaLibrary, useNFC, useRadios, useSecurity, useSensors, useTorch, useUWB, useVideo } from 'pixelkit';
import { Colors, Type } from '../theme/colors';
import { HapticButton } from '../components/HapticButton';
import { MetricCard } from '../components/MetricCard';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SectionHeader } from '../components/Decor';
import { SensorVisualizer } from '../components/SensorVisualizer';
import { sectionsFor } from '../core/surface';

const VAULT_KEY = 'PIXELKIT_DEMO_SECRET';

export const SensorsLabScreen: React.FC = () => {
  const caps = useCapabilities();
  const sections = sectionsFor('sensors');
  const [section, setSection] = useState<string>('motion');

  return (
    <ScreenScaffold
      title="Sensors"
      subtitle={`Direct interface to ${caps.modelName} sensors, actuators and radios`}
      sections={sections}
      activeSection={section}
      onSelectSection={setSection}
    >
      {section === 'motion' && <MotionSection />}
      {section === 'capture' && <CaptureSection />}
      {section === 'audio' && <AudioSection />}
      {section === 'actuators' && <ActuatorsSection />}
      {section === 'radios' && <RadiosSection caps={caps} />}
      {section === 'security' && <SecuritySection />}
    </ScreenScaffold>
  );
};

/** The IMU, magnetometer, barometer and light sensor, streaming at 10 Hz. */
const MotionSection: React.FC = () => {
  const sensors = useSensors(100);

  return (
    <View>
      <SensorVisualizer label="Accelerometer" caption="6-axis IMU · g including gravity" vector={sensors.accelerometer} unit="g" range={2} />
      <SensorVisualizer label="Gyroscope" caption="angular velocity" vector={sensors.gyroscope} unit="rad/s" range={5} />
      <SensorVisualizer label="Magnetometer" caption="geomagnetic field" vector={sensors.magnetometer} unit="μT" range={100} decimals={1} />

      <MetricCard
        title="Barometer"
        value={sensors.barometer.pressure}
        unit="hPa"
        badge={sensors.barometerAvailable === false ? 'NO SENSOR' : 'PRESSURE'}
        badgeColor={sensors.barometerAvailable === false ? Colors.dark.error : Colors.dark.primary}
        subtitle={
          sensors.barometer.relativeAltitude != null
            ? `${sensors.barometer.relativeAltitude} m relative to standard sea level — drifts with the weather, not a GNSS altitude`
            : 'waiting for the first sample'
        }
        source={sensors.barometer.pressure == null ? 'unavailable' : 'hardware'}
      />
      <MetricCard
        title="Ambient light"
        value={sensors.lightLux ?? null}
        unit="lux"
        badge={sensors.lightAvailable === false ? 'NO SENSOR' : 'PHOTODIODE'}
        badgeColor={sensors.lightAvailable === false ? Colors.dark.error : Colors.dark.warning}
        subtitle={
          sensors.lightLux == null
            ? 'waiting for the first sample'
            : sensors.lightLux < 5
            ? 'dark room'
            : sensors.lightLux < 200
            ? 'indoors'
            : 'bright'
        }
        source={sensors.lightLux == null ? 'unavailable' : 'hardware'}
      />
      <MetricCard
        title="Stream state"
        value={sensors.hasMotionSample ? 'Live' : 'Waiting'}
        badge={sensors.isAvailable ? '10 Hz' : 'NOT SUBSCRIBED'}
        badgeColor={sensors.hasMotionSample ? Colors.dark.success : Colors.dark.warning}
        subtitle={sensors.error ?? 'vectors read zero until the first real sample arrives — that is not stillness'}
        source={sensors.source}
      />
    </View>
  );
};

/**
 * Take a photo, record a clip, play it back, keep it. The three hooks that make a capture survive:
 * useCamera writes into the app cache, useVideo plays what was written, useMediaLibrary promotes it
 * into the user's gallery before the system reclaims it.
 */
const CaptureSection: React.FC = () => {
  const camera = useCamera();
  const video = useVideo();
  const library = useMediaLibrary();
  const [status, setStatus] = useState<string | null>(null);
  /** How many frames the last extraction produced. Null until it has been asked for. */
  const [thumbnails, setThumbnails] = useState<number | null>(null);

  const capture = async () => {
    const photo = await camera.takePicture({ base64: false });
    if (!photo) { setStatus(camera.error ?? 'Capture failed'); return; }
    setStatus(`Captured ${photo.width}×${photo.height}`);
  };

  const record = async () => {
    if (camera.isRecording) { camera.stopRecording(); return; }
    setStatus('Recording…');
    const uri = await camera.startRecording({ maxDurationSeconds: 15 });
    if (!uri) { setStatus(camera.error ?? 'Recording failed'); return; }
    setStatus('Clip recorded — loading it into the player');
    await video.load(uri, { autoplay: false });
  };

  /** Extracts three frames from the loaded clip, for a filmstrip or a poster image. */
  const grabThumbnails = async () => {
    const frames = await video.generateThumbnails([0, Math.max(0, video.durationSeconds / 2), Math.max(0, video.durationSeconds - 0.1)]);
    setThumbnails(frames.length);
    setStatus(frames.length ? `Extracted ${frames.length} frames at ${frames.map(f => f.actualTime.toFixed(1)).join(', ')} s` : video.error ?? 'No frames extracted');
  };

  const keepLast = async () => {
    const uri = camera.lastVideoUri ?? camera.lastPhoto?.uri;
    if (!uri) { setStatus('Nothing captured yet'); return; }
    const saved = await library.save(uri, 'PixelKit');
    setStatus(saved ? `Saved ${saved.filename} to the gallery` : library.error ?? 'Save failed');
  };

  if (!camera.hasPermission) {
    return (
      <View>
        <MetricCard
          title="Camera"
          value={null}
          badge="NO PERMISSION"
          badgeColor={Colors.dark.error}
          subtitle="Camera permission has not been granted, so there is nothing to show rather than a placeholder frame."
          source="unavailable"
        />
      </View>
    );
  }

  return (
    <View>
      <SectionHeader title="Camera" hint={camera.isReady ? `${camera.availableLenses.length} lenses` : 'starting preview…'} />
      <View style={styles.previewFrame}>
        <CameraView ref={camera.cameraRef} onCameraReady={camera.handleCameraReady} {...camera.viewProps} style={styles.preview} />
      </View>
      <MetricCard
        title="Zoom"
        value={Math.round(camera.zoomFactor * 100)}
        unit="% of lens range"
        badge={camera.facing === 'back' ? 'REAR' : 'FRONT'}
        badgeColor={Colors.dark.primary}
        subtitle="a fraction of the range, not an optical multiplier — a 5x figure does not map onto it"
        source={camera.source}
      />
      <View style={styles.row}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <HapticButton
            key={f}
            title={`${f * 100}%`}
            onPress={() => camera.setZoom(f)}
            hapticType="selection"
            variant={Math.abs(camera.zoomFactor - f) < 0.01 ? 'primary' : 'outline'}
            size="sm"
            style={styles.flexTight}
          />
        ))}
      </View>
      <View style={styles.row}>
        <HapticButton title={camera.isCapturing ? 'Capturing…' : 'Photo'} onPress={() => { void capture(); }} disabled={camera.isCapturing} variant="primary" style={styles.flexLeft} />
        <HapticButton
          title={camera.isRecording ? `Stop (${camera.recordingSeconds.toFixed(1)}s)` : 'Record 15 s'}
          onPress={() => { void record(); }}
          variant={camera.isRecording ? 'danger' : 'secondary'}
          style={styles.flexRight}
        />
      </View>
      <View style={styles.row}>
        <HapticButton title="Flip camera" onPress={camera.toggleFacing} variant="outline" style={styles.flexLeft} />
        <HapticButton title={camera.isTorchOn ? 'Light off' : 'Light on'} onPress={camera.toggleTorch} variant="outline" style={styles.flexRight} />
      </View>
      {status ? <Text style={styles.note}>{status}</Text> : null}
      {camera.error ? <Text style={styles.error}>{camera.error}</Text> : null}

      {camera.lastPhoto && (
        <MetricCard
          title="Last still"
          value={`${camera.lastPhoto.width} × ${camera.lastPhoto.height}`}
          badge="APP CACHE"
          badgeColor={Colors.dark.warning}
          subtitle="lives in the cache until it is saved — the system reclaims it otherwise"
          source="hardware"
        />
      )}

      <SectionHeader title="Playback" hint={video.hasSource ? video.status : 'no clip loaded'} />
      {video.hasSource ? (
        <View style={styles.previewFrame}>
          <VideoView player={video.player} style={styles.preview} nativeControls />
        </View>
      ) : (
        <Text style={styles.note}>Record a clip and it loads here, played by the same player object the hook owns.</Text>
      )}
      <MetricCard
        title="Position"
        value={video.hasSource ? `${video.positionSeconds.toFixed(1)} / ${video.durationSeconds.toFixed(1)}` : null}
        unit="s"
        badge={video.isPlaying ? 'PLAYING' : video.hasSource ? 'READY' : 'EMPTY'}
        badgeColor={video.isPlaying ? Colors.dark.success : Colors.dark.textMuted}
        subtitle={`buffered ${video.bufferedSeconds.toFixed(1)} s · rate ${video.playbackRate}× · ${video.isMuted ? 'muted' : 'audible'}`}
        source={video.source}
      />
      <View style={styles.row}>
        <HapticButton title={video.isPlaying ? 'Pause' : 'Play'} onPress={video.togglePlay} disabled={!video.hasSource} variant="primary" style={styles.flexLeft} />
        <HapticButton title="−5 s" onPress={() => video.seekBy(-5)} disabled={!video.hasSource} variant="outline" style={styles.flexMid} />
        <HapticButton title="Replay" onPress={video.replay} disabled={!video.hasSource} variant="outline" style={styles.flexRight} />
      </View>
      <View style={styles.row}>
        {[0.5, 1, 2].map(rate => (
          <HapticButton
            key={rate}
            title={`${rate}x`}
            onPress={() => video.setPlaybackRate(rate)}
            disabled={!video.hasSource}
            hapticType="selection"
            variant={video.playbackRate === rate ? 'primary' : 'outline'}
            size="sm"
            style={styles.flexTight}
          />
        ))}
        <HapticButton
          title={thumbnails == null ? 'Poster frames' : `${thumbnails} frames`}
          onPress={() => { void grabThumbnails(); }}
          disabled={!video.hasSource}
          variant="outline"
          size="sm"
          style={styles.flexTight}
        />
      </View>

      <SectionHeader title="Gallery" hint={library.permissionGranted ? (library.hasLimitedAccess ? 'limited access' : 'granted') : 'not granted'} />
      <MetricCard
        title="Last saved"
        value={library.lastSaved ? library.lastSaved.filename : null}
        badge={library.isSaving ? 'SAVING' : library.hasLimitedAccess ? 'PARTIAL LIBRARY' : 'MEDIA STORE'}
        badgeColor={library.hasLimitedAccess ? Colors.dark.warning : Colors.dark.success}
        subtitle={library.error ?? 'a saved item is visible to every other app and survives cache eviction'}
        source={library.source}
      />
      <View style={styles.row}>
        <HapticButton title="Keep last capture" onPress={() => { void keepLast(); }} disabled={library.isSaving} variant="secondary" style={styles.flexLeft} />
        <HapticButton title={library.isLoading ? 'Reading…' : 'Load recent'} onPress={() => { void library.loadRecent(6); }} disabled={library.isLoading} variant="outline" style={styles.flexRight} />
      </View>
      {library.recent.map(item => (
        <MetricCard
          key={item.id}
          title={item.filename}
          value={`${item.width} × ${item.height}`}
          badge={item.durationSeconds != null ? `${item.durationSeconds.toFixed(1)} s` : 'STILL'}
          badgeColor={Colors.dark.tertiary}
          subtitle={item.creationTime ? new Date(item.creationTime).toLocaleString() : 'creation time not reported'}
          source="hardware"
        />
      ))}
    </View>
  );
};

/** Microphone capture with real dBFS metering, input selection, routing and playback. */
const AudioSection: React.FC = () => {
  const audio = useAudio();

  return (
    <View>
      <SectionHeader title="Microphone" hint={audio.quality === 'speech' ? '16 kHz mono, noise suppressed' : '48 kHz stereo, unprocessed'} />
      <MetricCard
        title="Level"
        value={audio.isRecording ? audio.meteringDecibels : null}
        unit="dBFS"
        badge={audio.isRecording ? (audio.isPaused ? 'PAUSED' : audio.isSilent ? 'QUIET' : 'SIGNAL') : audio.permissionGranted ? 'IDLE' : 'NO PERMISSION'}
        badgeColor={
          audio.isRecording
            ? audio.isPaused
              ? Colors.dark.warning
              : audio.isSilent
              ? Colors.dark.textMuted
              : Colors.dark.success
            : Colors.dark.textMuted
        }
        subtitle={
          audio.isRecording
            ? `${audio.durationSeconds.toFixed(1)} s · peak ${audio.peakDecibels} dBFS · silence below ${audio.silenceThresholdDbfs} dBFS`
            : '−160 is digital silence, 0 is clipping'
        }
        source={audio.source}
      />
      <View style={styles.levelTrack}>
        <View style={[styles.levelFill, { width: `${Math.round(audio.level * 100)}%` }]} />
      </View>

      <View style={styles.row}>
        <HapticButton
          title={audio.isRecording ? 'Stop' : 'Record'}
          onPress={() => { void (audio.isRecording ? audio.stopRecording() : audio.startRecording()); }}
          variant={audio.isRecording ? 'danger' : 'primary'}
          style={styles.flexLeft}
        />
        <HapticButton
          title={audio.isPaused ? 'Resume' : 'Pause'}
          onPress={() => { if (audio.isPaused) audio.resumeRecording(); else audio.pauseRecording(); }}
          disabled={!audio.isRecording}
          variant="outline"
          style={styles.flexRight}
        />
      </View>
      <View style={styles.row}>
        <HapticButton title="Speech profile" onPress={() => audio.setQuality('speech')} variant={audio.quality === 'speech' ? 'primary' : 'outline'} style={styles.flexLeft} />
        <HapticButton title="Studio profile" onPress={() => audio.setQuality('studio')} variant={audio.quality === 'studio' ? 'primary' : 'outline'} style={styles.flexRight} />
      </View>

      <MetricCard
        title="Inputs and routing"
        value={audio.inputs.length ? `${audio.inputs.length} available` : null}
        badge={audio.route === 'earpiece' ? 'EARPIECE' : 'SPEAKER'}
        badgeColor={Colors.dark.primary}
        subtitle={audio.inputs.length ? audio.inputs.map(i => i.name).join(' · ') : 'the microphone list resolves once a recording has been prepared'}
        source={audio.inputs.length ? 'hardware' : 'unavailable'}
      />
      {audio.inputs.map(input => (
        <HapticButton
          key={input.uid}
          title={`${input.name}${audio.currentInputUid === input.uid ? ' · selected' : ''}`}
          onPress={() => audio.selectInput(input.uid)}
          variant={audio.currentInputUid === input.uid ? 'primary' : 'outline'}
          size="sm"
          style={styles.stackedButton}
        />
      ))}
      <View style={styles.row}>
        <HapticButton title="To speaker" onPress={() => { void audio.setRoute('speaker'); }} variant={audio.route === 'speaker' ? 'primary' : 'outline'} style={styles.flexLeft} />
        <HapticButton title="To earpiece" onPress={() => { void audio.setRoute('earpiece'); }} variant={audio.route === 'earpiece' ? 'primary' : 'outline'} style={styles.flexRight} />
      </View>

      {audio.lastRecordingUri && (
        <>
          <SectionHeader title="Playback" />
          <MetricCard
            title="Last recording"
            value={audio.isPlaying ? `${audio.playbackPositionSeconds} / ${audio.playbackDurationSeconds}` : audio.playbackDurationSeconds || null}
            unit="s"
            badge={audio.isPlaying ? 'PLAYING' : 'READY'}
            badgeColor={audio.isPlaying ? Colors.dark.success : Colors.dark.textMuted}
            subtitle="captured on this device; hand the same file to useSpeechAI for a transcript"
            source="hardware"
          />
          <View style={styles.row}>
            <HapticButton
              title={audio.isPlaying ? 'Pause' : 'Play'}
              onPress={() => { void (audio.isPlaying ? audio.pausePlayback() : audio.playLastRecording()); }}
              variant="primary"
              style={styles.flexLeft}
            />
            <HapticButton title="Back 5 s" onPress={() => { void audio.seekPlayback(Math.max(0, audio.playbackPositionSeconds - 5)); }} disabled={!audio.isPlaying} variant="outline" style={styles.flexMid} />
            <HapticButton title="Stop" onPress={() => { void audio.stopPlayback(); }} disabled={!audio.isPlaying} variant="outline" style={styles.flexRight} />
          </View>
        </>
      )}
      {audio.error ? <Text style={styles.error}>{audio.error}</Text> : null}
    </View>
  );
};

/** The things that move and light up: the vibrator, the rear torch, the camera-bar ring. */
const ActuatorsSection: React.FC = () => {
  const haptics = useHaptics();
  const torch = useTorch();
  const hilight = useHiLight();
  const [lastEnvelope, setLastEnvelope] = useState<string | null>(null);

  const playEnvelope = (name: keyof typeof HapticEnvelopes) => {
    const ok = haptics.playEnvelope(HapticEnvelopes[name]);
    setLastEnvelope(ok ? `${name} played` : `${name}: envelope effects are unsupported here`);
  };

  return (
    <View>
      <SectionHeader title="Linear resonant actuator" />
      <MetricCard
        title="Vibrator"
        value={haptics.resonantFrequencyHz != null ? haptics.resonantFrequencyHz.toFixed(1) : null}
        unit="Hz resonant"
        badge={haptics.envelopeSupported ? 'ENVELOPES (PWLE v2)' : 'PRIMITIVES ONLY'}
        badgeColor={haptics.envelopeSupported ? Colors.dark.success : Colors.dark.warning}
        subtitle={`amplitude control ${haptics.hasAmplitudeControl == null ? '?' : haptics.hasAmplitudeControl ? 'yes' : 'no'} · primitives ${haptics.supportedPrimitives.join(', ') || '—'}`}
        source={haptics.source}
      />
      <View style={styles.grid}>
        <HapticButton title="Selection tick" onPress={haptics.selection} hapticType="selection" variant="secondary" style={styles.stackedButton} />
        <HapticButton title="Light impact" onPress={haptics.light} hapticType="light" variant="secondary" style={styles.stackedButton} />
        <HapticButton title="Medium impact" onPress={haptics.medium} hapticType="medium" variant="secondary" style={styles.stackedButton} />
        <HapticButton title="Heavy thud" onPress={haptics.heavy} hapticType="heavy" variant="secondary" style={styles.stackedButton} />
        <HapticButton title="Success" onPress={haptics.success} hapticType="success" variant="primary" style={styles.stackedButton} />
        <HapticButton title="Warning" onPress={haptics.warning} hapticType="warning" variant="outline" style={styles.stackedButton} />
        <HapticButton title="Error" onPress={haptics.error} hapticType="error" variant="danger" style={styles.stackedButton} />
      </View>

      <SectionHeader title="Envelopes and compositions" hint={haptics.envelopeSupported ? 'Android 16+' : 'unsupported here'} />
      <Text style={styles.note}>Intensity and sharpness curves rendered by the driver, and hardware primitives chained with a scale and a delay.</Text>
      <View style={styles.grid}>
        <HapticButton title="Thinking ramp" onPress={() => playEnvelope('thinkingRamp')} hapticType="selection" variant="secondary" style={styles.stackedButton} disabled={!haptics.envelopeSupported} />
        <HapticButton title="Double pulse" onPress={() => playEnvelope('doublePulse')} hapticType="selection" variant="secondary" style={styles.stackedButton} disabled={!haptics.envelopeSupported} />
        <HapticButton title="Bouncing spring" onPress={() => playEnvelope('spring')} hapticType="selection" variant="secondary" style={styles.stackedButton} disabled={!haptics.envelopeSupported} />
        <HapticButton
          title="Composition: rise then thud"
          onPress={() => {
            const ok = haptics.playPrimitives([{ primitive: 'QUICK_RISE', scale: 0.8 }, { primitive: 'THUD', scale: 1, delayMs: 40 }]);
            setLastEnvelope(ok ? 'composition played' : 'primitives unavailable');
          }}
          hapticType="selection"
          variant="outline"
          style={styles.stackedButton}
        />
        <HapticButton title="Cancel vibration" onPress={haptics.cancel} variant="ghost" style={styles.stackedButton} />
      </View>
      {lastEnvelope ? <Text style={styles.note}>{lastEnvelope}</Text> : null}

      <SectionHeader title="Rear torch" hint={torch.maxStrengthLevel ? `${torch.maxStrengthLevel} levels` : 'on and off only'} />
      <MetricCard
        title="Flashlight"
        value={torch.isAvailable ? (torch.isTorchOn ? 'On' : 'Off') : null}
        badge={torch.isStrobing ? 'STROBING' : torch.isAvailable ? 'CAMERAMANAGER' : 'UNAVAILABLE'}
        badgeColor={torch.isTorchOn ? Colors.dark.warning : Colors.dark.primary}
        subtitle={torch.error ?? 'state follows the system torch callback, so a Quick Settings toggle shows up here'}
        source={torch.source}
      />
      <View style={styles.row}>
        <HapticButton
          title={torch.isTorchOn ? 'Torch off' : 'Torch on'}
          onPress={() => { void torch.toggleTorch(); }}
          disabled={!torch.isAvailable}
          variant={torch.isTorchOn ? 'danger' : 'primary'}
          style={styles.flexLeft}
        />
        <HapticButton
          title={torch.isStrobing ? 'Stop strobe' : 'SOS strobe'}
          onPress={() => (torch.isStrobing ? torch.stopStrobe() : torch.startStrobe(150))}
          disabled={!torch.isAvailable}
          variant="outline"
          style={styles.flexRight}
        />
      </View>
      {torch.maxStrengthLevel != null && torch.maxStrengthLevel > 1 && (
        <View style={styles.row}>
          <HapticButton title="Dim" onPress={() => { void torch.setTorch(true, 1); }} variant="secondary" style={styles.flexLeft} />
          <HapticButton title="Half" onPress={() => { void torch.setTorch(true, Math.ceil((torch.maxStrengthLevel ?? 2) / 2)); }} variant="secondary" style={styles.flexMid} />
          <HapticButton title="Max" onPress={() => { void torch.setTorch(true, torch.maxStrengthLevel ?? 1); }} variant="secondary" style={styles.flexRight} />
        </View>
      )}

      <SectionHeader title="HiLight camera-bar ring" hint={hilight.availability} />
      <MetricCard
        title="LED ring"
        value={hilight.isActive ? `${hilight.mode} · ${hilight.currentColor}` : 'Standby'}
        badge={!hilight.isHardwareSupported ? 'NO ARRAY' : hilight.isDaemonConnected ? 'HARDWARE' : 'DAEMON OFF'}
        badgeColor={!hilight.isHardwareSupported ? Colors.dark.error : hilight.isDaemonConnected ? Colors.dark.success : Colors.dark.warning}
        subtitle={
          !hilight.isHardwareSupported
            ? 'this device has no LED array'
            : hilight.isDaemonConnected
            ? `daemon connected · brightness ${Math.round(hilight.brightness * 100)}%`
            : 'the LEDs cannot be driven without the daemon: npm run hilight:daemon'
        }
        source={hilight.source}
      />
      <View style={styles.row}>
        <HapticButton title="Thinking pulse" onPress={() => hilight.triggerGeminiPulse(3500)} disabled={hilight.availability !== 'hardware'} variant="secondary" style={styles.flexLeft} />
        <HapticButton title="Contact alert" onPress={() => hilight.triggerContactAlert('#81C995', 3500)} disabled={hilight.availability !== 'hardware'} variant="secondary" style={styles.flexMid} />
        <HapticButton title={hilight.isActive ? 'Ring off' : 'Ring on'} onPress={hilight.toggle} disabled={hilight.availability !== 'hardware'} variant="outline" style={styles.flexRight} />
      </View>
      <View style={styles.row}>
        <HapticButton title="Dim ring" onPress={() => hilight.setBrightness(0.3)} disabled={hilight.availability !== 'hardware'} variant="outline" style={styles.flexLeft} />
        <HapticButton title="Full ring" onPress={() => hilight.setBrightness(1)} disabled={hilight.availability !== 'hardware'} variant="outline" style={styles.flexMid} />
        <HapticButton title="Re-check daemon" onPress={() => { void hilight.refreshDaemonStatus(); }} variant="ghost" style={styles.flexRight} />
      </View>
      {hilight.error ? <Text style={styles.error}>{hilight.error}</Text> : null}
    </View>
  );
};

/** Bluetooth, NFC, ultra-wideband, Wi-Fi RTT, satellite and the GNSS receiver. */
const RadiosSection: React.FC<{ caps: ReturnType<typeof useCapabilities> }> = ({ caps }) => {
  const radios = useRadios();
  const nfc = useNFC();
  const ble = useBLE();
  const uwb = useUWB();
  const location = useLocation();
  const [writeState, setWriteState] = useState<string | null>(null);

  const queueWrite = async () => {
    const ok = await nfc.writeText(`PixelKit ${new Date().toISOString()}`);
    setWriteState(ok ? 'Queued — present a writable tag' : nfc.error ?? 'Could not queue the write');
  };

  return (
    <View>
      <SectionHeader title="Radio inventory" hint={caps.verification === 'device' ? 'device-verified' : 'model table'} />
      <MetricCard
        title="What this device has"
        value={`${[radios.nfc.supported, radios.bluetooth.bleSupported, radios.uwb.supported, radios.wifiRtt.supported, radios.satellite.supported].filter(Boolean).length} of 5 radios`}
        badge={radios.source === 'hardware' ? 'PACKAGEMANAGER' : 'UNAVAILABLE'}
        badgeColor={radios.source === 'hardware' ? Colors.dark.success : Colors.dark.warning}
        subtitle={`NFC ${flag(radios.nfc.supported)} · BLE ${flag(radios.bluetooth.bleSupported)} · UWB ${flag(radios.uwb.supported)} · Wi-Fi RTT ${flag(radios.wifiRtt.supported)}${radios.wifiRtt.supported ? ` (${radios.wifiRtt.available ? 'available now' : 'not available now'})` : ''} · satellite ${flag(radios.satellite.supported)}`}
        source={radios.source}
      />
      <HapticButton title="Re-read every radio" onPress={radios.refresh} variant="outline" style={styles.stackedButton} />

      <SectionHeader title="Near-field communication" hint={nfc.antennaState.toLowerCase()} />
      <MetricCard
        title="Reader"
        value={nfc.isReading ? 'Reader mode on' : nfc.lastScannedTag ? 'Tag read' : 'Idle'}
        badge={nfc.observeModeSupported ? 'OBSERVE MODE' : nfc.isEnabled ? 'ENABLED' : 'OFF'}
        badgeColor={nfc.isEnabled ? Colors.dark.success : Colors.dark.textMuted}
        subtitle={`${nfc.tagCount} tag${nfc.tagCount === 1 ? '' : 's'} this session · reader mode needs the app in the foreground`}
        source={nfc.source}
      />
      {nfc.lastScannedTag && (
        <MetricCard
          title={`Tag ${nfc.lastScannedTag.id}`}
          value={nfc.lastScannedTag.payload || '(no payload)'}
          badge={nfc.lastScannedTag.writable ? 'WRITABLE' : 'READ ONLY'}
          badgeColor={nfc.lastScannedTag.writable ? Colors.dark.success : Colors.dark.textMuted}
          subtitle={`${nfc.lastScannedTag.techs.join(', ')} · ${nfc.lastScannedTag.records.length} record${nfc.lastScannedTag.records.length === 1 ? '' : 's'}${nfc.lastScannedTag.maxSize != null ? ` · ${nfc.lastScannedTag.maxSize} bytes capacity` : ''}`}
          source="hardware"
        />
      )}
      <View style={styles.row}>
        <HapticButton
          title={nfc.isReading ? 'Stop reader' : 'Start reader'}
          onPress={() => { void (nfc.isReading ? nfc.stopReader() : nfc.startReader()); }}
          disabled={!nfc.isSupported || !nfc.isEnabled}
          variant={nfc.isReading ? 'danger' : 'secondary'}
          style={styles.flexLeft}
        />
        <HapticButton title="Queue text write" onPress={() => { void queueWrite(); }} disabled={!nfc.isReading} variant="outline" style={styles.flexMid} />
        <HapticButton title="Clear" onPress={nfc.clearTag} variant="ghost" style={styles.flexRight} />
      </View>
      {nfc.pendingWrite ? <Text style={styles.note}>Pending write: {nfc.pendingWrite}</Text> : null}
      {writeState ? <Text style={styles.note}>{writeState}</Text> : null}
      {nfc.lastWriteOk != null ? (
        <Text style={nfc.lastWriteOk ? styles.note : styles.error}>{nfc.lastWriteOk ? 'Last write succeeded' : 'Last write failed'}</Text>
      ) : null}
      {nfc.error ? <Text style={styles.error}>{nfc.error}</Text> : null}

      <SectionHeader title="Bluetooth Low Energy" hint={ble.state.toLowerCase()} />
      <MetricCard
        title="Adapter"
        value={ble.isSupported ? ble.state : null}
        badge={ble.channelSounding ? 'CHANNEL SOUNDING' : 'BLE'}
        badgeColor={ble.isEnabled ? Colors.dark.success : Colors.dark.textMuted}
        subtitle={`${ble.bondedDevices.length} bonded device${ble.bondedDevices.length === 1 ? '' : 's'} · fine ranging ${ble.channelSounding ? 'supported by the silicon' : 'not supported'}`}
        source={ble.source}
      />
      {ble.bondedDevices.map(dev => (
        <MetricCard
          key={dev.address}
          title={dev.name || 'Unnamed device'}
          value={dev.bondState}
          badge={dev.type === 2 ? 'LE' : dev.type === 1 ? 'CLASSIC' : 'DUAL'}
          badgeColor={Colors.dark.accent}
          subtitle={dev.address}
          source="hardware"
        />
      ))}
      <View style={styles.row}>
        <HapticButton
          title={ble.isScanning ? 'Scanning…' : 'Scan 8 s'}
          onPress={() => { void ble.startScan(8000); }}
          disabled={ble.isScanning || !ble.isEnabled}
          variant="secondary"
          style={styles.flexLeft}
        />
        <HapticButton title="Stop scan" onPress={ble.stopScan} disabled={!ble.isScanning} variant="outline" style={styles.flexRight} />
      </View>
      {ble.scanError ? <Text style={styles.error}>{ble.scanError}</Text> : null}
      {ble.peripherals.map(device => (
        <MetricCard
          key={device.id}
          title={device.name || 'Unnamed peripheral'}
          value={device.rssi}
          unit="dBm"
          badge={`~${device.estimatedDistanceMeters} m`}
          badgeColor={device.rssi > -65 ? Colors.dark.success : Colors.dark.warning}
          subtitle={`${device.id} · distance estimated from RSSI, so obstacles skew it`}
          source="hardware"
        />
      ))}

      <SectionHeader title="Ultra-wideband" hint={uwb.chipId ?? 'no chip'} />
      <MetricCard
        title="Transceiver"
        value={uwb.isSupported ? (uwb.isEnabled ? 'Ready' : 'Disabled in settings') : null}
        badge={uwb.rangingApiSupported ? 'RANGING SERVICE' : uwb.isSupported ? 'CHIP ONLY' : 'ABSENT'}
        badgeColor={uwb.isEnabled ? Colors.dark.success : Colors.dark.textMuted}
        subtitle={`chip ${uwb.chipId ?? 'none'} · ${uwb.isRanging ? 'session open' : 'no session'}`}
        source={uwb.source}
      />
      <View style={styles.row}>
        <HapticButton
          title={uwb.isRanging ? 'Session open' : 'Start ranging'}
          onPress={() => { void uwb.startRanging(); }}
          disabled={uwb.isRanging || !uwb.isSupported}
          variant="secondary"
          style={styles.flexLeft}
        />
        <HapticButton title="Stop ranging" onPress={uwb.stopRanging} disabled={!uwb.isRanging} variant="outline" style={styles.flexRight} />
      </View>
      {uwb.sessionInfo && (
        <MetricCard
          title="Session"
          value={uwb.sessionInfo.status}
          badge={uwb.sessionInfo.serviceName.toUpperCase()}
          badgeColor={uwb.sessionInfo.serviceAvailable ? Colors.dark.success : Colors.dark.warning}
          subtitle={`id ${uwb.sessionInfo.sessionId} · ${uwb.sessionInfo.technology} · feature ${uwb.sessionInfo.rangingFeature ? 'declared' : 'HAL direct'}`}
          source="hardware"
        />
      )}
      {uwb.sessionError ? <Text style={styles.error}>{uwb.sessionError}</Text> : null}
      {uwb.activeTargets.map(target => (
        <MetricCard
          key={target.deviceId}
          title={target.deviceId}
          value={target.distanceMeters.toFixed(2)}
          unit="m"
          badge={`${target.azimuthDegrees > 0 ? '+' : ''}${target.azimuthDegrees.toFixed(1)}°`}
          badgeColor={Colors.dark.warning}
          subtitle={`elevation ${target.elevationDegrees.toFixed(1)}° · quality ${Math.round(target.signalQuality * 100)}%`}
          source="hardware"
        />
      ))}
      {uwb.isRanging && uwb.activeTargets.length === 0 && (
        <Text style={styles.note}>Session open with no responders in range. The list stays empty rather than inventing anchors.</Text>
      )}

      <SectionHeader title="GNSS" hint={location.hasFix ? 'fix acquired' : location.isLocating ? 'acquiring…' : 'no fix'} />
      <MetricCard
        title="Position"
        value={location.hasFix ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : null}
        badge={location.accuracy != null ? `±${Math.round(location.accuracy)} m` : 'NO FIX'}
        badgeColor={location.accuracy != null && location.accuracy < 20 ? Colors.dark.success : Colors.dark.warning}
        subtitle={
          location.lastFixAt
            ? `fixed at ${new Date(location.lastFixAt).toLocaleTimeString()} · coordinates are never written to the log`
            : location.error ?? 'no position obtained this session'
        }
        source={location.source}
      />
      <MetricCard
        title="Altitude and motion"
        value={location.altitude != null ? Math.round(location.altitude) : null}
        unit="m above sea level"
        badge={location.speed != null ? `${location.speed.toFixed(1)} m/s` : 'STATIONARY'}
        badgeColor={Colors.dark.tertiary}
        subtitle={`heading ${location.heading != null ? `${Math.round(location.heading)}°` : '—'} · GNSS altitude, not the barometric one on the motion tab`}
        source={location.altitude == null ? 'unavailable' : 'hardware'}
      />
      <HapticButton
        title={location.isLocating ? 'Acquiring…' : 'Take a fresh fix'}
        onPress={() => { void location.refreshLocation(); }}
        disabled={location.isLocating}
        variant="secondary"
        style={styles.stackedButton}
      />
    </View>
  );
};

function flag(v: boolean | null | undefined): string {
  return v == null ? '?' : v ? '✓' : '✗';
}

/**
 * The biometric prompt and the keystore behind it. The vault round trip is real: it writes a value
 * through SecureStore, reads it back and deletes it, so the section proves the path rather than
 * describing it.
 */
const SecuritySection: React.FC = () => {
  const biometrics = useBiometrics();
  const security = useSecurity();
  const [vaultState, setVaultState] = useState<string | null>(null);
  const [authState, setAuthState] = useState<string | null>(null);

  const canPrompt = biometrics.hasHardware && biometrics.isEnrolled;

  const authenticate = async () => {
    const ok = await biometrics.authenticate('Unlock the PixelKit demo vault');
    setAuthState(
      ok
        ? 'Verified'
        : biometrics.lastResult === 'cancelled'
        ? 'Cancelled by the user — not a failure'
        : biometrics.error ?? 'Not recognised',
    );
  };

  const roundTrip = async () => {
    const written = `secret-${Date.now()}`;
    const saved = await security.saveSecureItem(VAULT_KEY, written);
    if (!saved) { setVaultState(security.error ?? 'Write failed'); return; }
    const read = await security.getSecureItem(VAULT_KEY);
    setVaultState(read === written ? `Wrote and read back ${read.slice(0, 12)}…` : `Read back ${read ?? 'nothing'}`);
  };

  const clearVault = async () => {
    const ok = await security.deleteSecureItem(VAULT_KEY);
    setVaultState(ok ? 'Deleted from the keystore' : security.error ?? 'Delete failed');
  };

  return (
    <View>
      <SectionHeader title="Biometrics" hint={biometrics.supportedTypes.join(' · ') || 'none enrolled'} />
      <MetricCard
        title="Prompt readiness"
        value={biometrics.hasChecked ? (canPrompt ? 'Ready' : biometrics.hasHardware ? 'Nothing enrolled' : 'No hardware') : null}
        badge={biometrics.lastResult ? biometrics.lastResult.toUpperCase() : 'UNTESTED'}
        badgeColor={
          biometrics.lastResult === 'success'
            ? Colors.dark.success
            : biometrics.lastResult === 'failed'
            ? Colors.dark.error
            : Colors.dark.textMuted
        }
        subtitle={
          canPrompt
            ? 'a cancel and a rejected finger both resolve false; only a call failure sets error'
            : 'a prompt cannot succeed without an enrolled credential, so the control stays disabled'
        }
        source={biometrics.source}
      />
      <View style={styles.row}>
        <HapticButton title="Show biometric prompt" onPress={() => { void authenticate(); }} disabled={!canPrompt} variant="primary" style={styles.flexLeft} />
        <HapticButton title="Re-check enrolment" onPress={() => { void biometrics.refresh(); }} variant="outline" style={styles.flexRight} />
      </View>
      {authState ? <Text style={styles.note}>{authState}</Text> : null}

      <SectionHeader title="Keystore" hint={security.securityModule} />
      <MetricCard
        title="Secret storage"
        value={security.isHardwareBacked ? 'Hardware-backed' : 'Not hardware-backed'}
        badge={security.isPostQuantumProtected ? 'PQ' : 'AES'}
        badgeColor={security.isHardwareBacked ? Colors.dark.success : Colors.dark.warning}
        subtitle={
          security.isHardwareBacked
            ? 'the key lives in the Keystore and never reaches this process; values are readable only while unlocked'
            : 'on web this falls back to localStorage, which is not encrypted'
        }
        source={security.source}
      />
      <MetricCard
        title="Last operation"
        value={security.lastOperation}
        badge={security.error ? 'ERROR' : 'CLEAN'}
        badgeColor={security.error ? Colors.dark.error : Colors.dark.textMuted}
        subtitle={security.error ?? 'the operation and the key are logged; the value never is'}
        source={security.lastOperation ? 'hardware' : 'unavailable'}
      />
      <View style={styles.row}>
        <HapticButton title="Write and read back" onPress={() => { void roundTrip(); }} variant="secondary" style={styles.flexLeft} />
        <HapticButton title="Delete secret" onPress={() => { void clearVault(); }} variant="outline" style={styles.flexRight} />
      </View>
      {vaultState ? <Text style={styles.note}>{vaultState}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 12 },
  grid: { marginBottom: 8 },
  flexLeft: { flex: 1, marginRight: 4 },
  flexMid: { flex: 1, marginHorizontal: 4 },
  flexRight: { flex: 1, marginLeft: 4 },
  flexTight: { flex: 1, marginHorizontal: 2 },
  stackedButton: { marginBottom: 8 },
  note: { ...Type.caption, color: Colors.dark.textMuted, marginBottom: 12, marginLeft: 2 },
  error: { ...Type.caption, color: Colors.dark.error, marginBottom: 12, marginLeft: 2 },
  /** Fixed height: a preview inside a scroll view needs one or it collapses. */
  previewFrame: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    marginBottom: 12,
    backgroundColor: Colors.dark.surfaceVariant,
  },
  preview: { flex: 1 },
  /** Level meter driven by the 0..1 value, because a dBFS scale reads wrong on a bar. */
  levelTrack: { height: 4, borderRadius: 2, backgroundColor: Colors.dark.cardBorder, overflow: 'hidden', marginBottom: 12 },
  levelFill: { height: 4, borderRadius: 2, backgroundColor: Colors.dark.primary },
});
