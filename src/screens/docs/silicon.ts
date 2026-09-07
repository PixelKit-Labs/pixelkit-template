/**
 * @file silicon.ts
 * @description Silicon & compute: one documentation entry per hook, each with its inputs, its
 * outputs, and a contract for every function it exposes.
 */

import { type DocModule, SILICON, AI, SYSTEM, SOURCE_FIELD } from './shared';

export const SILICON_MODULES: DocModule[] = [
  {
    id: 'useCPU',
    name: 'useCPU',
    category: 'silicon',
    chipBadge: 'Tensor G6 · /proc/cpuinfo + cpufreq',
    badgeColor: SILICON,
    summary: 'What the CPU is and how hard it is working right now.',
    plain:
      'Tells you the shape of the processor (how many cores, which type, how fast each one can go) and how busy it is at this instant. Use it to decide whether the phone has room for heavy work, or to show a live performance readout.',
    description:
      'Core identity comes from /proc/cpuinfo and per-core frequencies from the cpufreq sysfs tree, both read through the PixelNative module. Two different load signals are reported and they mean different things: cpuLoadPercent is how close the cores are running to their maximum clock, read from hardware; appCpuPercent is this app\'s own share of CPU time, computed from process time over wall time. Android does not let apps read system-wide /proc/stat, so a true "system load" figure does not exist here and is not invented.',
    signature: 'useCPU(): CPUState',
    params: [],
    returns: [
      { name: 'coreTopology', type: 'string', desc: 'Readable summary of the clusters, for example "1x Arm C1-Ultra @ 4.11 GHz + 4x Arm C1-Pro @ 3.38 GHz".' },
      { name: 'coreCount', type: 'number', desc: 'Cores visible to this process. Seven on the Tensor G6.' },
      { name: 'cpuLoadPercent', type: 'number | null', desc: 'How close the cores are to their maximum clock, averaged. Null when the sysfs files cannot be read.' },
      { name: 'appCpuPercent', type: 'number | null', desc: "This app's own CPU usage. Null on the very first sample because it needs two readings." },
      { name: 'cores', type: '{ index, part, name, curMHz, maxMHz, minMHz }[]', desc: 'Per-core detail, including the frequency each core is running at right now.' },
      { name: 'clusters', type: '{ part, name, maxMHz, count }[]', desc: 'Cores grouped by type, which is how you tell the big cores from the efficiency ones.' },
      { name: 'governorMode', type: 'string', desc: 'Kernel scheduling policy for cpu0, "sched_pixel" on this device. Read-only without root.' },
      { name: 'lastBenchmarkDurationMs', type: 'number | null', desc: 'Milliseconds the last benchmark took. Null until you run one.' },
      { name: 'isBenchmarking', type: 'boolean', desc: 'True while the benchmark is running, so you can disable the button.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'benchmarkCPU()',
        type: '() => Promise<number>',
        desc: 'Runs a real single-threaded prime sieve on the JS thread. It measures Hermes single-thread throughput, not the system, and blocks the UI while it runs.',
        output: 'Resolves with the run duration in milliseconds, which is also written to lastBenchmarkDurationMs. Lower is faster.',
      },
    ],
    example: `import { useCPU } from 'pixelkit';

function CPUWidget() {
  const { coreTopology, cpuLoadPercent, cores, benchmarkCPU } = useCPU();
  return (
    <View>
      <Text>{coreTopology}</Text>
      <Text>{cpuLoadPercent ?? '—'}% · {cores.map(c => c.curMHz).join('/')} MHz</Text>
      <Button title="Run benchmark" onPress={() => benchmarkCPU()} />
    </View>
  );
}`,
    agentNote:
      'Values are null until the native module answers; never substitute a default. cpuLoadPercent is frequency utilisation, not scheduler load, so do not label it "CPU usage".',
  },
  {
    id: 'useGPU',
    name: 'useGPU',
    category: 'silicon',
    chipBadge: 'PowerVR CXTP-48-1536 · Vulkan 1.4',
    badgeColor: SILICON,
    summary: 'Which GPU this is, and whether your frames are arriving on time.',
    plain:
      'Identifies the graphics chip and measures how smoothly the interface is drawing. If animations feel rough, this tells you whether frames are actually being missed and by how much.',
    description:
      'The renderer, vendor and OpenGL version are read through a real offscreen EGL context; the Vulkan version comes from the android.hardware.vulkan.version system feature. Frame timing is measured on the UI thread with Choreographer in one-second windows: average and worst frame interval, frames presented per second, and a jank count for frames that took more than 1.5x the expected interval. Android does not expose GPU memory usage to apps, so that field is always null rather than estimated.',
    signature: 'useGPU(): GPUState',
    params: [],
    returns: [
      { name: 'gpuRenderer', type: 'string | null', desc: 'GPU name from the driver. Null until the EGL context has been created.' },
      { name: 'gpuVendor', type: 'string | null', desc: 'Driver vendor string.' },
      { name: 'graphicsApi', type: 'string | null', desc: 'OpenGL ES version and, where present, the Vulkan version.' },
      { name: 'frameRenderTimeMs', type: 'number | null', desc: 'Average gap between presented frames over the last second. Compare against targetBudgetMs.' },
      { name: 'maxFrameMs', type: 'number | null', desc: 'Worst single frame in that window, which is what a user actually perceives as a stutter.' },
      { name: 'measuredFps', type: 'number | null', desc: 'Frames actually presented per second, not the display mode.' },
      { name: 'droppedFrameCount', type: 'number', desc: 'Running total of janky frames since the hook mounted.' },
      { name: 'jankFramesLastSecond', type: 'number', desc: 'Janky frames in the most recent window only.' },
      { name: 'targetBudgetMs', type: 'number', desc: 'Time available per frame at the current refresh rate: 8.33 ms at 120 Hz, 16.67 ms at 60 Hz.' },
      { name: 'isStuttering', type: 'boolean', desc: 'True when the average frame is running more than 1.5x over budget.' },
      { name: 'gpuMemoryUsageMB', type: 'null', desc: 'Always null. Android does not expose this to apps.' },
      SOURCE_FIELD,
    ],
    actions: [],
    example: `import { useGPU } from 'pixelkit';

function GPUHUD() {
  const { measuredFps, frameRenderTimeMs, targetBudgetMs, isStuttering } = useGPU();
  return (
    <Text style={{ color: isStuttering ? '#F25C55' : '#46D786' }}>
      {measuredFps ?? '—'} FPS · {frameRenderTimeMs ?? '—'} / {targetBudgetMs} ms
    </Text>
  );
}`,
    agentNote:
      'Check isStuttering before adding animation work. Frame timing measures the UI thread, so heavy JS shows up here even when the GPU is idle.',
  },
  {
    id: 'useTPU',
    name: 'useTPU',
    category: 'silicon',
    chipBadge: 'AICore · Gemini Nano host',
    badgeColor: AI,
    summary: 'Whether the on-device AI stack is installed and usable.',
    plain:
      'Answers one question: can this phone run AI locally? It checks that the system services which host on-device models are present, and reports their versions. It does not run inference itself.',
    description:
      "The Tensor TPU is only reachable through AICore (Gemini Nano, via ML Kit) or LiteRT, so this hook reports what is verifiably installed rather than guessing at hardware. AICore and Private Compute Services versions come from PackageManager, which needs a <queries> entry to see them at all. Inference timings deliberately stay null here; real measured latency lives in useGeminiNano. benchmarkTPU runs a genuine matrix multiplication on the JS thread and is labelled CPU fallback, because that is what it is.",
    signature: 'useTPU(): TPUState',
    params: [],
    returns: [
      { name: 'aicoreInstalled', type: 'boolean', desc: 'Whether AICore, the system service that hosts Gemini Nano, is present.' },
      { name: 'aicoreVersion', type: 'string | null', desc: 'Installed AICore build. Useful when a model feature depends on a minimum version.' },
      { name: 'privateComputeServicesVersion', type: 'string | null', desc: 'Version of the service that delivers model weights privately.' },
      { name: 'hasNpuFeature', type: 'boolean | null', desc: 'Whether the device declares a neural processing unit feature. False on this Pixel, which does not declare it.' },
      { name: 'activeDelegate', type: "'Tensor TPU' | 'NPU' | 'GPU' | 'CPU Fallback'", desc: 'What last executed work from this hook. Only ever CPU fallback, because the benchmark is JS.' },
      { name: 'isHardwareAccelerated', type: 'boolean', desc: 'Always false here. This hook runs nothing on the TPU.' },
      { name: 'lastInferenceLatencyMs', type: 'number | null', desc: 'Always null by design. Use useGeminiNano for real on-device latency.' },
      { name: 'cpuFallbackLatencyMs', type: 'number | null', desc: 'Duration of the last JS matrix multiplication, in milliseconds.' },
      { name: 'isBenchmarking', type: 'boolean', desc: 'True while the fallback benchmark runs.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'benchmarkTPU()',
        type: '() => Promise<TPUAcceleration>',
        desc: 'Runs a 256x256 float matrix multiply in JavaScript and reports it explicitly as a CPU fallback. No part of it touches the TPU.',
        output: 'Resolves with { activeDelegate: "CPU Fallback", isHardwareAccelerated: false, lastInferenceLatencyMs, throughputTokensPerSec: null, memoryFootprintMB: null }. Label it as a CPU number wherever you show it.',
      },
    ],
    example: `import { useTPU } from 'pixelkit';

function AIStack() {
  const { aicoreInstalled, aicoreVersion, cpuFallbackLatencyMs, benchmarkTPU } = useTPU();
  return (
    <View>
      <Text>AICore: {aicoreInstalled ? aicoreVersion : 'not installed'}</Text>
      <Text>CPU matmul: {cpuFallbackLatencyMs ?? '—'} ms</Text>
      <Button title="Run CPU fallback benchmark" onPress={() => benchmarkTPU()} />
    </View>
  );
}`,
    agentNote:
      'Check aicoreInstalled before offering on-device AI. Never present cpuFallbackLatencyMs as TPU performance; it is a JavaScript number.',
  },
  {
    id: 'useMemory',
    name: 'useMemory',
    category: 'silicon',
    chipBadge: 'ActivityManager · 12 GB LPDDR5X',
    badgeColor: SILICON,
    summary: 'System RAM, this app\'s heaps, and how close the system is to killing you.',
    plain:
      'Shows how much memory the phone has left and how much this app is holding. The important field is isLowMemory: when it turns true, Android is close to killing background apps and you should release caches.',
    description:
      "System totals come from ActivityManager.getMemoryInfo, polled every two seconds: total RAM, available RAM, the low-memory threshold and the kernel's own low-memory flag. App figures come from Runtime for the Java heap and Debug.getNativeHeapAllocatedSize for the native heap, which is where Hermes, decoded images and JSI allocations live. purgeCaches requests a garbage collection and re-reads; it does not claim to free system RAM, because an app cannot do that.",
    signature: 'useMemory(): MemoryState',
    params: [],
    returns: [
      { name: 'totalRAMMB', type: 'number', desc: 'Physical RAM the system reports, about 11,647 MB on a 12 GB device.' },
      { name: 'freeRAMMB', type: 'number', desc: 'Memory currently available to start new work.' },
      { name: 'usedRAMMB', type: 'number', desc: 'Total minus available. Includes reclaimable caches, so it reads higher than you might expect.' },
      { name: 'isLowMemory', type: 'boolean', desc: 'Kernel low-memory flag. When true, free buffers now.' },
      { name: 'lowMemoryThresholdMB', type: 'number', desc: 'The level at which the system starts killing background processes.' },
      { name: 'appJavaHeapMB', type: 'number', desc: "This app's Java heap in use." },
      { name: 'appJavaHeapMaxMB', type: 'number', desc: 'Ceiling for that heap. Crossing it throws OutOfMemoryError.' },
      { name: 'appNativeHeapMB', type: 'number', desc: 'Native allocations: the JS engine, decoded bitmaps, native modules.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'purgeCaches()',
        type: '() => void',
        desc: 'Requests a garbage collection and re-reads the numbers. Advisory only; the runtime decides when to collect, and it can never free system RAM.',
        output: 'Returns nothing. The refreshed reading lands in the hook fields, and the amount reclaimed is logged as freedMB.',
      },
    ],
    example: `import { useMemory } from 'pixelkit';

function MemoryHUD() {
  const { freeRAMMB, isLowMemory, purgeCaches } = useMemory();
  return (
    <View>
      <Text>Free: {freeRAMMB} MB</Text>
      {isLowMemory && <Button title="Purge caches" onPress={purgeCaches} />}
    </View>
  );
}`,
    agentNote:
      'React to isLowMemory by dropping image buffers before starting large multimodal payloads. Do not treat usedRAMMB as a leak signal; it includes reclaimable cache.',
  },
  {
    id: 'useADPF',
    name: 'useADPF',
    category: 'silicon',
    chipBadge: 'PowerManager · SystemHealth',
    badgeColor: SYSTEM,
    summary: 'How much thermal room is left before the phone slows itself down.',
    plain:
      'Warns you before the phone gets hot enough to throttle. Check thermalHeadroom before starting sustained work such as camera capture or a long inference run, and back off as it climbs toward 1.',
    description:
      'thermalHeadroom comes from PowerManager.getThermalHeadroom and is sampled every ten seconds, which is the cadence Google specifies; polling faster returns NaN. A live thermal-status listener reports the coarse state from NONE through SHUTDOWN. On Android 16 and above, SystemHealthManager can also report CPU and GPU headroom, which stays null when the device does not provide it. Frame figures pair the display mode refresh rate as a target with the Choreographer-measured rate as the actual.',
    signature: 'useADPF(): ADPFState',
    params: [],
    returns: [
      { name: 'thermalHeadroom', type: 'number | null', desc: '0 is cool, 1 means throttling is imminent. The single number to gate heavy work on.' },
      { name: 'thermalThresholds', type: 'Record<string, number> | null', desc: 'Headroom values at which this specific device enters each thermal status.' },
      { name: 'thermalStatus', type: "'nominal' | 'light' | 'moderate' | 'severe' | 'critical'", desc: 'Coarse state, updated by a system listener rather than polling.' },
      { name: 'thermalStatusCode', type: 'number', desc: 'Raw PowerManager constant behind that label.' },
      { name: 'cpuHeadroom', type: 'number | null', desc: 'Android 16+ remaining CPU capacity. Null when the device does not report it.' },
      { name: 'gpuHeadroom', type: 'number | null', desc: 'Same for the GPU.' },
      { name: 'targetFps', type: 'number | null', desc: 'Refresh rate of the current display mode.' },
      { name: 'currentFps', type: 'number | null', desc: 'Frames actually presented, measured by Choreographer.' },
      SOURCE_FIELD,
    ],
    actions: [
      {
        name: 'reportWorkDuration(actualMs, targetMs?)',
        type: "(actualWorkDurationMs: number, targetDurationMs?: number) => 'WITHIN_BUDGET' | 'BOOST_REQUESTED'",
        desc: 'Pure helper that judges a measured piece of work against the frame budget. It computes a verdict for your own scheduling; it does not call the platform performance hint system.',
        inputs: [
          { name: 'actualWorkDurationMs', type: 'number', desc: 'How long the work you just did actually took, in milliseconds.' },
          { name: 'targetDurationMs', type: 'number | undefined', desc: 'Budget to judge it against. Defaults to 1000 / targetFps, or 8.33 ms before the refresh rate has been read.' },
        ],
        output: "'WITHIN_BUDGET' when the work fits the frame, 'BOOST_REQUESTED' when it overran and you should shed work.",
      },
    ],
    example: `import { useADPF } from 'pixelkit';

async function runHeavyTask(adpf) {
  if ((adpf.thermalHeadroom ?? 0) > 0.8) return 'deferred: device is hot';
  // ... start the work
}`,
    agentNote:
      'Gate sustained workloads on thermalHeadroom, not on thermalStatus alone; the number moves before the label does.',
  },
];
