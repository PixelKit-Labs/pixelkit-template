/**
 * @file DashboardScreen.tsx
 * @description Silicon and system telemetry. Four sections, from `src/core/surface.ts`: compute
 * (cores, frames, memory, thermals), system (what the device is and how it is powered), network
 * (the interface and the carrier), and trace (what every hook has been doing).
 *
 * Every value is read from the device through PixelNative or an Expo module, or it is "—". Cards
 * carry a provenance tag; nothing is substituted. Actuators and radios live on the Sensors tab, so
 * each piece of hardware has exactly one home.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { resetObservability, useADPF, useCPU, useCapabilities, useCellular, useDevice, useDisplay, useGPU, useMemory, useNetwork, useObservability, useTPU } from '@pixelkit-labs/sdk';
import { Chip, Reactor, SectionHeader, TelemetryRow } from '../components/Decor';
import { Colors, Type } from '../theme/colors';
import { HapticButton } from '../components/HapticButton';
import { MetricCard } from '../components/MetricCard';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { resolveMode } from '../theme/mode';
import { isPixelNativeAvailable } from '@pixelkit-labs/native';
import { sectionsFor } from '../core/surface';

const fmt = (v: number | null | undefined, digits = 0) => (v == null ? null : Number(v.toFixed(digits)));
const pct = (v: number | null | undefined) => (v == null ? null : Math.round(v * 100));

export const DashboardScreen: React.FC = () => {
  const caps = useCapabilities();
  const device = useDevice();
  const adpf = useADPF();
  const cpu = useCPU();
  const gpu = useGPU();
  const memory = useMemory();
  const tpu = useTPU();
  const display = useDisplay();
  const network = useNetwork();
  const cellular = useCellular();
  const obs = useObservability();

  const sections = sectionsFor('silicon');
  const [section, setSection] = useState<string>('compute');
  const [refreshing, setRefreshing] = useState(false);

  const brand = device.brand ? device.brand.charAt(0).toUpperCase() + device.brand.slice(1) : '';
  const mode = resolveMode({
    nativeAvailable: isPixelNativeAvailable,
    thermalStatusCode: adpf.thermalStatusCode,
    busy: cpu.isBenchmarking || tpu.isBenchmarking,
  });

  const handleRefresh = () => {
    setRefreshing(true);
    void Promise.all([device.refresh(), network.refreshNetwork(), cellular.refresh()]).finally(() =>
      setTimeout(() => setRefreshing(false), 400),
    );
  };

  const hero = (
    <View style={styles.hero}>
      <Reactor mode={mode} detail={`${brand} ${device.modelName}`} />
      <View style={styles.heroTelemetry}>
        <TelemetryRow label="android" value={Platform.OS === 'android' ? `${device.osVersion} · API ${caps.androidApiLevel ?? '?'}` : '—'} />
        <TelemetryRow label="display" value={display.refreshRateHz ? `${display.refreshRateHz} Hz${display.hasArrSupport ? ' · ARR' : ''}` : '—'} />
        <TelemetryRow
          label="thermal"
          value={adpf.thermalHeadroom != null ? `${adpf.thermalStatus} · ${adpf.thermalHeadroom.toFixed(2)}` : adpf.thermalStatus}
          tone={adpf.thermalStatusCode === 0 ? 'on' : 'warn'}
        />
        <TelemetryRow
          label="battery"
          value={device.batteryPercent != null ? `${device.batteryPercent}%${device.batteryTemperatureC != null ? ` · ${device.batteryTemperatureC.toFixed(1)} °C` : ''}` : '—'}
          tone={device.batteryTemperatureC != null && device.batteryTemperatureC > 42 ? 'warn' : 'on'}
        />
        <TelemetryRow label="nano tier" value={caps.geminiNanoTier} tone="muted" />
        <TelemetryRow label="capabilities" value={caps.verification === 'device' ? 'device-verified' : 'model table'} tone={caps.verification === 'device' ? 'on' : 'muted'} />
        <TelemetryRow label="network" value={network.networkType.toLowerCase()} tone={network.isConnected ? 'on' : 'off'} />
      </View>
    </View>
  );

  return (
    <ScreenScaffold
      title="Silicon"
      subtitle="What the chip is doing right now"
      hero={hero}
      sections={sections}
      activeSection={section}
      onSelectSection={setSection}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    >
      {section === 'compute' && <ComputeSection cpu={cpu} gpu={gpu} memory={memory} adpf={adpf} tpu={tpu} caps={caps} />}
      {section === 'system' && <SystemSection device={device} display={display} caps={caps} />}
      {section === 'network' && <NetworkSection network={network} cellular={cellular} caps={caps} />}
      {section === 'trace' && <TraceSection obs={obs} />}
    </ScreenScaffold>
  );
};

/** Cores, frames, memory and thermal headroom: the four numbers that decide whether to start work. */
const ComputeSection: React.FC<{
  cpu: ReturnType<typeof useCPU>;
  gpu: ReturnType<typeof useGPU>;
  memory: ReturnType<typeof useMemory>;
  adpf: ReturnType<typeof useADPF>;
  tpu: ReturnType<typeof useTPU>;
  caps: ReturnType<typeof useCapabilities>;
}> = ({ cpu, gpu, memory, adpf, tpu, caps }) => (
  <View>
    <SectionHeader title="Tensor G6 CPU" />
    <MetricCard
      title="Cluster utilisation"
      value={cpu.cpuLoadPercent}
      unit="%"
      badge={`${cpu.coreCount || '?'} cores`}
      badgeColor={Colors.dark.primary}
      subtitle="avg current/max frequency — not scheduler load"
      source={cpu.cpuLoadPercent == null ? 'unavailable' : 'hardware'}
    />
    <MetricCard
      title="This app CPU"
      value={cpu.appCpuPercent}
      unit="%"
      badge={cpu.governorMode}
      badgeColor={Colors.dark.success}
      subtitle="process time / wall time"
      source={cpu.appCpuPercent == null ? 'unavailable' : 'derived'}
    />
    <MetricCard
      title="Topology"
      value={cpu.coreTopology}
      subtitle={cpu.cores.length ? `${cpu.cores.map(c => c.curMHz ?? '—').join(' · ')} MHz now` : 'Reading cpufreq…'}
      badge="/proc/cpuinfo + cpufreq"
      badgeColor={Colors.dark.primary}
      source={cpu.source}
    />
    <HapticButton
      title={cpu.isBenchmarking ? 'Running JS prime sieve…' : `JS single-thread benchmark${cpu.lastBenchmarkDurationMs != null ? ` (${cpu.lastBenchmarkDurationMs} ms)` : ''}`}
      onPress={() => { void cpu.benchmarkCPU(); }}
      disabled={cpu.isBenchmarking}
      variant="secondary"
      style={styles.actionButton}
    />

    <SectionHeader title="Thermal & ADPF headroom" hint="10 s poll" />
    <MetricCard
      title="Thermal headroom"
      value={fmt(adpf.thermalHeadroom, 2)}
      badge={adpf.thermalStatus.toUpperCase()}
      badgeColor={adpf.thermalStatusCode === 0 ? Colors.dark.success : adpf.thermalStatusCode < 3 ? Colors.dark.warning : Colors.dark.error}
      subtitle="0 cool → 1 the point where clocks get cut; above 1 already throttling"
      source={adpf.thermalHeadroom == null ? 'unavailable' : 'hardware'}
    />
    <MetricCard
      title="CPU / GPU headroom"
      value={
        adpf.cpuHeadroom != null && adpf.gpuHeadroom != null
          ? `${pct(adpf.cpuHeadroom) ?? '—'}% / ${pct(adpf.gpuHeadroom) ?? '—'}%`
          : null
      }
      badge={adpf.cpuHeadroom != null ? 'SystemHealth' : 'ANDROID 16+'}
      badgeColor={Colors.dark.primary}
      subtitle="SystemHealthManager; null on devices that do not report it"
      source={adpf.cpuHeadroom != null && adpf.gpuHeadroom != null ? 'hardware' : 'unavailable'}
    />
    <MetricCard
      title="Frame budget check"
      value={adpf.reportWorkDuration(gpu.frameRenderTimeMs ?? 0)}
      badge={adpf.targetFps ? `${adpf.targetFps} Hz` : '—'}
      badgeColor={Colors.dark.tertiary}
      subtitle="last measured frame interval judged against the budget"
      source={gpu.frameRenderTimeMs == null ? 'unavailable' : 'derived'}
    />

    <SectionHeader title="GPU & frame pacing" />
    <MetricCard
      title="Frame interval"
      value={gpu.frameRenderTimeMs}
      unit="ms"
      badge={`budget ${gpu.targetBudgetMs} ms`}
      badgeColor={gpu.isStuttering ? Colors.dark.warning : Colors.dark.success}
      subtitle={`max ${gpu.maxFrameMs ?? '—'} ms · jank ${gpu.droppedFrameCount} total, ${gpu.jankFramesLastSecond} last second`}
      source={gpu.frameRenderTimeMs == null ? 'unavailable' : 'hardware'}
    />
    <MetricCard
      title="Presented FPS"
      value={gpu.measuredFps}
      unit="FPS"
      badge={adpf.currentFps ? `${adpf.currentFps} Hz measured` : '—'}
      badgeColor={Colors.dark.success}
      subtitle="Choreographer, 1 s window"
      source={gpu.measuredFps == null ? 'unavailable' : 'hardware'}
    />
    <MetricCard
      title="GPU"
      value={gpu.gpuRenderer ?? null}
      badge={gpu.graphicsApi ?? 'EGL'}
      badgeColor={Colors.dark.primary}
      subtitle={gpu.gpuVendor ? `${gpu.gpuVendor} · GPU memory is not exposed to apps` : 'Querying EGL…'}
      source={gpu.gpuRenderer ? 'hardware' : 'unavailable'}
    />

    <SectionHeader title="Memory" />
    <MetricCard
      title="System RAM"
      value={memory.usedRAMMB || null}
      unit="MB used"
      badge={memory.isLowMemory ? 'LOW MEMORY' : 'OK'}
      badgeColor={memory.isLowMemory ? Colors.dark.error : Colors.dark.primary}
      subtitle={memory.totalRAMMB ? `Free ${memory.freeRAMMB} of ${memory.totalRAMMB} MB · LMK threshold ${memory.lowMemoryThresholdMB} MB` : 'Reading ActivityManager…'}
      source={memory.source}
    />
    <MetricCard
      title="This app"
      value={memory.appJavaHeapMB || null}
      unit="MB Java heap"
      badge={`native ${memory.appNativeHeapMB} MB`}
      badgeColor={Colors.dark.primary}
      subtitle={`Heap limit ${memory.appJavaHeapMaxMB} MB`}
      source={memory.source}
    />
    <HapticButton title="Request GC and re-read" onPress={memory.purgeCaches} variant="outline" style={styles.actionButton} />

    <SectionHeader title="On-device AI stack" hint="inference lives in AI Lab" />
    <MetricCard
      title="AICore (Gemini Nano host)"
      value={tpu.aicoreInstalled ? 'Installed' : 'Not installed'}
      badge={caps.geminiNanoTier.toUpperCase()}
      badgeColor={tpu.aicoreInstalled ? Colors.dark.tensorGlow : Colors.dark.warning}
      subtitle={`${tpu.aicoreVersion ?? '—'} · PCS ${tpu.privateComputeServicesVersion ?? '—'} · NPU feature ${tpu.hasNpuFeature == null ? '?' : tpu.hasNpuFeature ? 'declared' : 'not declared'}`}
      source={tpu.source}
    />
    <MetricCard
      title="CPU fallback matmul"
      value={tpu.cpuFallbackLatencyMs}
      unit="ms"
      badge={tpu.activeDelegate.toUpperCase()}
      badgeColor={Colors.dark.warning}
      subtitle="256×256 float multiply on the JS thread — a CPU number, not a TPU one"
      source={tpu.cpuFallbackLatencyMs == null ? 'unavailable' : 'derived'}
    />
    <HapticButton
      title={tpu.isBenchmarking ? 'Running matmul…' : 'Run CPU fallback benchmark'}
      onPress={() => { void tpu.benchmarkTPU(); }}
      disabled={tpu.isBenchmarking}
      variant="secondary"
      style={styles.actionButton}
    />
  </View>
);

/** What this device is, how it is powered, and what the panel can do. */
const SystemSection: React.FC<{
  device: ReturnType<typeof useDevice>;
  display: ReturnType<typeof useDisplay>;
  caps: ReturnType<typeof useCapabilities>;
}> = ({ device, display, caps }) => (
  <View>
    <SectionHeader title="Power" hint={device.batteryTechnology ?? 'battery'} />
    <MetricCard
      title="Battery"
      value={device.batteryPercent}
      unit="%"
      badge={device.isCharging ? (device.pluggedSource && device.pluggedSource !== 'NONE' ? device.pluggedSource : 'CHARGING') : 'DISCHARGING'}
      badgeColor={device.isCharging ? Colors.dark.success : Colors.dark.warning}
      subtitle={
        device.batteryVoltageMv != null
          ? `${device.batteryVoltageMv} mV · ${device.lowPowerMode ? 'Battery Saver on' : 'normal power profile'}`
          : device.lowPowerMode
          ? 'Battery Saver on'
          : 'normal power profile'
      }
      source={device.batteryPercent != null ? 'hardware' : 'unavailable'}
    />
    <MetricCard
      title="Cell temperature"
      value={fmt(device.batteryTemperatureC, 1)}
      unit="°C"
      badge={device.batteryHealth ?? 'HEALTH'}
      badgeColor={
        device.batteryHealth === 'OVERHEAT'
          ? Colors.dark.error
          : device.batteryTemperatureC != null && device.batteryTemperatureC > 42
          ? Colors.dark.warning
          : Colors.dark.success
      }
      subtitle="fuel-gauge thermistor, not the SoC temperature"
      source={device.batteryTemperatureC != null ? 'hardware' : 'unavailable'}
    />
    <MetricCard
      title="Power draw"
      value={device.batteryPowerWatts != null ? fmt(device.batteryPowerWatts, 2) : fmt(device.batteryCurrentMa, 0)}
      unit={device.batteryPowerWatts != null ? 'W' : 'mA'}
      badge={device.batteryCurrentMa != null ? `${device.batteryCurrentMa >= 0 ? '+' : ''}${Math.round(device.batteryCurrentMa)} mA` : 'POWER'}
      badgeColor={device.batteryCurrentMa != null && device.batteryCurrentMa >= 0 ? Colors.dark.success : Colors.dark.primary}
      subtitle={device.batteryCycleCount != null ? `${device.batteryCycleCount} lifetime cycles` : 'positive charging, negative discharging'}
      source={device.batteryPowerWatts != null || device.batteryCurrentMa != null ? 'hardware' : 'unavailable'}
    />
    <MetricCard
      title="Remaining charge"
      value={fmt(device.batteryChargeCounterMah, 0)}
      unit="mAh"
      badge={device.batteryEnergyCounterMwh != null ? `${Math.round(device.batteryEnergyCounterMwh)} mWh` : 'FUEL GAUGE'}
      badgeColor={Colors.dark.tertiary}
      subtitle="charge counter as the gauge reports it"
      source={device.batteryChargeCounterMah != null ? 'hardware' : 'unavailable'}
    />

    <SectionHeader title="Display" hint={display.hasArrSupport ? 'adaptive refresh' : 'fixed modes'} />
    <MetricCard
      title="Refresh rate"
      value={display.refreshRateHz || null}
      unit="Hz"
      badge={display.isHdr ? 'HDR' : 'SDR'}
      badgeColor={Colors.dark.primary}
      subtitle={display.supportedRefreshRates.length ? `panel drives ${display.supportedRefreshRates.join(' / ')} Hz` : 'reading display modes…'}
      source={display.source}
    />
    <MetricCard
      title="Resolution"
      value={display.resolution ? `${display.resolution.width} × ${display.resolution.height}` : null}
      badge={display.resolution ? `${display.resolution.densityDpi} dpi` : '—'}
      badgeColor={Colors.dark.tertiary}
      subtitle={display.maxLuminance != null ? `peak luminance ${Math.round(display.maxLuminance)} nits as reported` : 'peak luminance not reported by the platform'}
      source={display.resolution ? 'hardware' : 'unavailable'}
    />
    <View style={styles.rowButtons}>
      <HapticButton title="Prefer 120 Hz" onPress={() => { void display.setPreferredRefreshRate(120); }} variant="secondary" style={styles.flexButtonLeft} />
      <HapticButton title="Prefer 60 Hz" onPress={() => { void display.setPreferredRefreshRate(60); }} variant="secondary" style={styles.flexButtonRight} />
    </View>
    <MetricCard
      title="Brightness"
      value={pct(display.brightness)}
      unit="%"
      badge={display.isKeepAwake ? 'AWAKE LOCKED' : 'NORMAL'}
      badgeColor={display.isKeepAwake ? Colors.dark.warning : Colors.dark.primary}
      subtitle="app-window brightness; the wake lock stops the screen dimming mid-read"
      source={display.source}
    />
    <View style={styles.rowButtons}>
      <HapticButton title="Dim" onPress={() => { void display.setScreenBrightness(0.2); }} variant="secondary" style={styles.flexButtonLeft} />
      <HapticButton title="Half" onPress={() => { void display.setScreenBrightness(0.5); }} variant="secondary" style={styles.flexButtonMid} />
      <HapticButton title="Full" onPress={() => { void display.setScreenBrightness(1); }} variant="secondary" style={styles.flexButtonRight} />
    </View>
    <HapticButton
      title={display.isKeepAwake ? 'Allow the screen to sleep' : 'Keep the screen awake'}
      onPress={() => { void display.toggleKeepAwake(); }}
      variant="outline"
      style={styles.actionButton}
    />

    <SectionHeader title="Capabilities" hint={caps.verification === 'device' ? 'device-verified' : 'model table'} />
    <View style={styles.chipRow}>
      <Chip label={`HiLight ${flagLabel(caps.hasHiLight)}`} color={caps.hasHiLight ? Colors.dark.success : Colors.dark.textMuted} />
      <Chip label={`UWB ${flagLabel(caps.hasUWB)}`} color={caps.hasUWB ? Colors.dark.success : Colors.dark.textMuted} />
      <Chip label={`NFC ${flagLabel(caps.hasNFC)}`} color={caps.hasNFC ? Colors.dark.success : Colors.dark.textMuted} />
      <Chip label={`StrongBox ${flagLabel(caps.hasStrongBox)}`} color={caps.hasStrongBox ? Colors.dark.success : Colors.dark.textMuted} />
      <Chip label={`Channel sounding ${flagLabel(caps.hasBleChannelSounding)}`} color={caps.hasBleChannelSounding ? Colors.dark.success : Colors.dark.textMuted} />
      <Chip label={`Wi-Fi RTT ${flagLabel(caps.hasWifiRtt)}`} color={caps.hasWifiRtt ? Colors.dark.success : Colors.dark.textMuted} />
      <Chip label={`Satellite ${flagLabel(caps.hasSatelliteTelephony)}`} color={caps.hasSatelliteTelephony ? Colors.dark.success : Colors.dark.textMuted} />
      <Chip label={`NPU flag ${flagLabel(caps.hasNpuFeature)}`} color={caps.hasNpuFeature ? Colors.dark.success : Colors.dark.textMuted} />
      <Chip label={`Envelopes ${flagLabel(caps.supportsHapticEnvelopes)}`} color={caps.supportsHapticEnvelopes ? Colors.dark.success : Colors.dark.textMuted} />
      <Chip label={`AppFunctions ${flagLabel(caps.supportsAppFunctions)}`} color={caps.supportsAppFunctions ? Colors.dark.success : Colors.dark.textMuted} />
    </View>
    <Text style={styles.note}>
      {caps.verification === 'device'
        ? 'Confirmed with PackageManager.hasSystemFeature through the native module.'
        : 'Inferred from the model name only — treat as a hint until the native module answers.'}
    </Text>
  </View>
);

function flagLabel(v: boolean | null | undefined): string {
  return v == null ? '?' : v ? '✓' : '✗';
}

/** The interface you are on, and which carrier is serving it. */
const NetworkSection: React.FC<{
  network: ReturnType<typeof useNetwork>;
  cellular: ReturnType<typeof useCellular>;
  caps: ReturnType<typeof useCapabilities>;
}> = ({ network, cellular, caps }) => (
  <View>
    <SectionHeader title="Connectivity" hint={network.isChecking ? 'checking…' : network.networkType.toLowerCase()} />
    <MetricCard
      title="Interface"
      value={network.hasRead ? network.networkType : null}
      badge={network.isConnected ? 'REACHABLE' : 'NO ROUTE'}
      badgeColor={network.isConnected ? Colors.dark.success : Colors.dark.error}
      subtitle="attached is not the same as reachable; this requires both"
      source={network.source}
    />
    <MetricCard
      title="Address"
      value={network.ipAddress}
      badge={network.isMetered ? 'METERED' : 'UNMETERED'}
      badgeColor={network.isMetered ? Colors.dark.warning : Colors.dark.primary}
      subtitle={network.isMetered ? 'the user pays per byte here — gate large transfers' : 'no per-byte cost signalled'}
      source={network.ipAddress ? 'hardware' : 'unavailable'}
    />
    <MetricCard
      title="Airplane mode"
      value={network.hasRead ? (network.isAirplaneMode ? 'On' : 'Off') : null}
      badge={network.error ? 'ERROR' : 'SYSTEM'}
      badgeColor={network.error ? Colors.dark.error : Colors.dark.tertiary}
      subtitle={network.error ?? 'every radio is off when this is on'}
      source={network.source}
    />
    <HapticButton
      title={network.isChecking ? 'Checking…' : 'Re-check connectivity'}
      onPress={() => { void network.refreshNetwork(); }}
      disabled={network.isChecking}
      variant="secondary"
      style={styles.actionButton}
    />

    <SectionHeader title="Cellular" hint={cellular.permissionGranted ? 'phone state granted' : 'permission needed for carrier'} />
    <MetricCard
      title="Radio generation"
      value={cellular.generation === 'unknown' ? null : cellular.generation}
      badge={cellular.is5G ? '5G' : cellular.generation.toUpperCase()}
      badgeColor={cellular.is5G ? Colors.dark.success : Colors.dark.primary}
      subtitle="follows the live data connection; unknown on Wi-Fi with no cellular data attached"
      source={cellular.source}
    />
    <MetricCard
      title="Carrier"
      value={cellular.carrierName}
      badge={cellular.isoCountryCode ? cellular.isoCountryCode.toUpperCase() : 'SIM'}
      badgeColor={Colors.dark.tertiary}
      subtitle={
        cellular.mobileCountryCode && cellular.mobileNetworkCode
          ? `MCC ${cellular.mobileCountryCode} · MNC ${cellular.mobileNetworkCode} — match on these, not the display name`
          : 'needs the phone-state permission'
      }
      source={cellular.carrierName ? 'hardware' : 'unavailable'}
    />
    <MetricCard
      title="Carrier VoIP"
      value={cellular.allowsVoip == null ? null : cellular.allowsVoip ? 'Allowed' : 'Not allowed'}
      badge={caps.hasSatelliteTelephony ? 'SATELLITE CAPABLE' : 'TERRESTRIAL'}
      badgeColor={Colors.dark.primary}
      subtitle={cellular.error ?? 'whether the carrier permits voice over IP'}
      source={cellular.allowsVoip == null ? 'unavailable' : 'hardware'}
    />
    {!cellular.permissionGranted && (
      <HapticButton title="Allow carrier details" onPress={() => { void cellular.requestPermission(); }} variant="secondary" style={styles.actionButton} />
    )}
    <HapticButton title="Re-read cellular state" onPress={() => { void cellular.refresh(); }} variant="outline" style={styles.actionButton} />
  </View>
);

/** What every hook has been doing: provenance, events, slow operations and failures. */
const TraceSection: React.FC<{ obs: ReturnType<typeof useObservability> }> = ({ obs }) => {
  const recentEvents = obs.events.slice(-14).reverse();
  const failing = obs.health.filter(h => h.errors > 0);

  return (
    <View>
      <SectionHeader title="Provenance by module" hint={`${Object.keys(obs.sources).length} reporting`} />
      <View style={styles.chipRow}>
        {Object.entries(obs.sources).map(([mod, srcs]) => (
          <Chip
            key={mod}
            label={`${mod.replace(/^use/, '')} · ${srcs.join('/')}`}
            color={srcs.includes('hardware') ? Colors.dark.success : srcs.includes('derived') ? Colors.dark.primary : Colors.dark.warning}
          />
        ))}
        {Object.keys(obs.sources).length === 0 && <Text style={styles.note}>No metric has been recorded yet.</Text>}
      </View>

      <SectionHeader title="Slowest operations" hint="traced calls" />
      {obs.slowest.slice(0, 5).map(t => (
        <View key={t.id} style={styles.traceRow}>
          <Text style={styles.traceOp}>{t.module}.{t.op}</Text>
          <Text style={[styles.traceMs, t.durationMs > 1500 && { color: Colors.dark.warning }, !t.ok && { color: Colors.dark.error }]}>
            {t.durationMs} ms{t.ok ? '' : ' · failed'}
          </Text>
        </View>
      ))}
      {obs.slowest.length === 0 && <Text style={styles.note}>Nothing traced yet. Run a benchmark or open a radio.</Text>}

      <SectionHeader title="Errors by module" hint={failing.length ? `${failing.length} with failures` : 'none'} />
      {failing.map(h => (
        <View key={h.module} style={styles.traceRow}>
          <Text style={styles.traceOp}>{h.module}</Text>
          <Text style={[styles.traceMs, { color: Colors.dark.error }]}>
            {h.errors} error{h.errors === 1 ? '' : 's'} · slowest {h.slowestMs} ms
          </Text>
        </View>
      ))}
      {failing.length === 0 && <Text style={styles.note}>No hook has reported a failure this session.</Text>}

      <SectionHeader title="Recent events" hint="also in adb logcat" />
      <View style={styles.obsCard}>
        {recentEvents.length === 0 && <Text style={styles.obsLine}>—</Text>}
        {recentEvents.map((e, i) => (
          <Text
            key={`${e.ts}-${i}`}
            style={[styles.obsLine, e.level === 'error' && { color: Colors.dark.error }, e.level === 'warn' && { color: Colors.dark.warning }]}
            numberOfLines={2}
          >
            {new Date(e.ts).toLocaleTimeString()} {e.module} · {e.event}
            {e.data ? ` ${JSON.stringify(e.data).slice(0, 90)}` : ''}
          </Text>
        ))}
      </View>
      <HapticButton title="Reset diagnostics" onPress={resetObservability} variant="outline" style={styles.actionButton} />
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    paddingTop: 12,
    paddingBottom: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
    overflow: 'hidden',
  },
  heroTelemetry: { marginTop: 8 },
  actionButton: { marginBottom: 16 },
  rowButtons: { flexDirection: 'row', marginBottom: 12 },
  flexButtonLeft: { flex: 1, marginRight: 4 },
  flexButtonMid: { flex: 1, marginHorizontal: 4 },
  flexButtonRight: { flex: 1, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  note: { ...Type.caption, color: Colors.dark.textMuted, marginBottom: 12, marginLeft: 2 },
  traceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  traceOp: { ...Type.mono, color: Colors.dark.text, fontSize: 11 },
  traceMs: { ...Type.mono, color: Colors.dark.textMuted, fontSize: 11 },
  obsCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  obsLine: { ...Type.mono, color: Colors.dark.textMuted, fontSize: 11, marginTop: 3 },
});
