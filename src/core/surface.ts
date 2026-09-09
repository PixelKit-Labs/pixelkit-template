/**
 * @file surface.ts
 * @description Where every hook lives in the app. One home each, named once.
 *
 * The Docs tab documents all 39 hooks; this map is what guarantees each one is also *reachable* —
 * a screen, a section within it, and the line the section header shows. `scripts/check-parity.js`
 * reads this file and the screen sources and fails when a hook has no home, when its home screen
 * does not actually call it, or when a documented action is not wired to a control.
 *
 * A hook may appear on other screens as a supporting effect (AI Lab pulses HiLight, for example).
 * `home` is where it is demonstrated and where the Docs tab points the reader.
 */

import type { SurfaceSection } from '@pixelkit-labs/sdk';
export type { SurfaceSection };

/** Top-level tabs, matching `App.tsx`. */
export type SurfaceTab = 'silicon' | 'ai' | 'sensors' | 'docs';

/** Where a hook is demonstrated: the tab, and the section id within it. */
export interface HookHome {
  tab: SurfaceTab;
  section: string;
}

export const TAB_TITLES: Record<SurfaceTab, string> = {
  silicon: 'Silicon',
  ai: 'AI Lab',
  sensors: 'Sensors',
  docs: 'Docs',
};

/** Ordered sections per tab. The order here is the order of the sub-tab row. */
export const TAB_SECTIONS: Record<SurfaceTab, SurfaceSection[]> = {
  silicon: [
    { id: 'compute', title: 'Compute', blurb: 'Cores, clocks, frames, memory and thermal headroom, read from the kernel.' },
    { id: 'system', title: 'System', blurb: 'What this device is, how it is powered, and what the panel can do.' },
    { id: 'network', title: 'Network', blurb: 'The interface you are on, and which carrier is serving it.' },
    { id: 'trace', title: 'Trace', blurb: 'Live events, per-module provenance, slowest operations and error counts.' },
  ],
  ai: [
    { id: 'chat', title: 'Chat', blurb: 'Cloud Gemini and on-device Gemini Nano, same conversation surface.' },
    { id: 'tasks', title: 'Tasks', blurb: 'Summarize, proofread, rewrite and describe, entirely on the phone.' },
    { id: 'vision', title: 'Vision', blurb: 'ML Kit vision on-device, plus cloud scene analysis.' },
    { id: 'language', title: 'Language', blurb: 'Offline translation, language identification, smart reply and entities.' },
    { id: 'voice', title: 'Voice', blurb: 'Speech in, speech out: recognition and the platform speech engine.' },
    { id: 'agents', title: 'Agents', blurb: 'Functions this app publishes to system agents, and the on-device AI stack behind them.' },
  ],
  sensors: [
    { id: 'motion', title: 'Motion', blurb: 'The IMU, magnetometer, barometer and ambient light, streaming live.' },
    { id: 'capture', title: 'Capture', blurb: 'Take a photo, record a clip, play it back, keep it in the gallery.' },
    { id: 'audio', title: 'Audio', blurb: 'Microphone capture with real dBFS metering, input selection and playback.' },
    { id: 'actuators', title: 'Actuators', blurb: 'The things that move and light up: the vibrator, the torch, the camera-bar ring.' },
    { id: 'radios', title: 'Radios', blurb: 'Bluetooth, NFC, ultra-wideband and the satellite receiver.' },
    { id: 'security', title: 'Security', blurb: 'The biometric prompt and the hardware-backed keystore.' },
  ],
  docs: [],
};

/**
 * Every exported hook and where it is demonstrated. Adding a hook without adding it here fails
 * `npm run parity`, which is the whole point: the SDK cannot grow a surface the app does not show.
 */
export const HOOK_HOMES: Record<string, HookHome> = {
  // Silicon · compute
  useCPU: { tab: 'silicon', section: 'compute' },
  useGPU: { tab: 'silicon', section: 'compute' },
  useTPU: { tab: 'silicon', section: 'compute' },
  useMemory: { tab: 'silicon', section: 'compute' },
  useADPF: { tab: 'silicon', section: 'compute' },
  // Silicon · system
  useDevice: { tab: 'silicon', section: 'system' },
  useDisplay: { tab: 'silicon', section: 'system' },
  useCapabilities: { tab: 'silicon', section: 'system' },
  // Silicon · network
  useNetwork: { tab: 'silicon', section: 'network' },
  useCellular: { tab: 'silicon', section: 'network' },
  // Silicon · trace
  usePerfetto: { tab: 'silicon', section: 'trace' },
  // AI Lab
  useGemini: { tab: 'ai', section: 'chat' },
  useGeminiNano: { tab: 'ai', section: 'chat' },
  useGenAITasks: { tab: 'ai', section: 'tasks' },
  useVisionAI: { tab: 'ai', section: 'vision' },
  useNaturalLanguageAI: { tab: 'ai', section: 'language' },
  useSpeechAI: { tab: 'ai', section: 'voice' },
  useSpeech: { tab: 'ai', section: 'voice' },
  useAppFunctions: { tab: 'ai', section: 'agents' },
  // Sensors
  useSensors: { tab: 'sensors', section: 'motion' },
  useHealthConnect: { tab: 'sensors', section: 'motion' },
  useCamera: { tab: 'sensors', section: 'capture' },
  useCameraExtensions: { tab: 'sensors', section: 'capture' },
  useVideo: { tab: 'sensors', section: 'capture' },
  useMediaLibrary: { tab: 'sensors', section: 'capture' },
  useAudio: { tab: 'sensors', section: 'audio' },
  useSpatialAudio: { tab: 'sensors', section: 'audio' },
  useHaptics: { tab: 'sensors', section: 'actuators' },
  useTorch: { tab: 'sensors', section: 'actuators' },
  useHiLight: { tab: 'sensors', section: 'actuators' },
  useBLE: { tab: 'sensors', section: 'radios' },
  useChannelSounding: { tab: 'sensors', section: 'radios' },
  useNFC: { tab: 'sensors', section: 'radios' },
  useUWB: { tab: 'sensors', section: 'radios' },
  useRadios: { tab: 'sensors', section: 'radios' },
  useLocation: { tab: 'sensors', section: 'radios' },
  useBiometrics: { tab: 'sensors', section: 'security' },
  useSecurity: { tab: 'sensors', section: 'security' },
  usePlayIntegrity: { tab: 'sensors', section: 'security' },
};

/** Section metadata for a tab id, or an empty list for a tab without sections. */
export function sectionsFor(tab: SurfaceTab): SurfaceSection[] {
  return TAB_SECTIONS[tab] ?? [];
}

/**
 * Human directions to where a hook can be tried, e.g. "Sensors → Capture".
 * Returns null for a hook with no home, which the parity check treats as a failure.
 */
export function whereToTry(hook: string): string | null {
  const home = HOOK_HOMES[hook];
  if (!home) return null;
  const section = TAB_SECTIONS[home.tab].find(s => s.id === home.section);
  return section ? `${TAB_TITLES[home.tab]} → ${section.title}` : TAB_TITLES[home.tab];
}
