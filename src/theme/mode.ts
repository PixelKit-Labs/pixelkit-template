/**
 * @file mode.ts
 * @description The single map from app state to colour and language. The reactor, the header status
 * chip, and HiLight's virtual ring all read from it so they can never disagree.
 */

import { Colors } from './colors';

export type HudMode = 'offline' | 'idle' | 'active' | 'attention' | 'critical';

export interface ModeStyle {
  /** Status chip text */
  label: string;
  /** Reactor headline, terser */
  headline: string;
  /** Sub-line under the reactor */
  hint: string;
  /** Token colour for text, strokes, and the core */
  color: string;
  /** Whether the core glows. Offline is unlit on purpose */
  emissive: boolean;
  /** Breathing period in ms; 0 = still. Urgency reads as speed */
  breatheMs: number;
}

export const MODE_STYLES: Record<HudMode, ModeStyle> = {
  offline: {
    label: 'JS only',
    headline: 'offline',
    hint: 'native module not loaded',
    color: Colors.dark.textMuted,
    emissive: false,
    breatheMs: 0,
  },
  idle: {
    label: 'native live',
    headline: 'nominal',
    hint: 'telemetry streaming',
    color: Colors.dark.primary,
    emissive: true,
    breatheMs: 3200,
  },
  active: {
    label: 'working',
    headline: 'working',
    hint: 'model or capture in progress',
    color: Colors.dark.secondary,
    emissive: true,
    breatheMs: 1600,
  },
  attention: {
    label: 'throttling',
    headline: 'warm',
    hint: 'thermal status above nominal',
    color: Colors.dark.tertiary,
    emissive: true,
    breatheMs: 1200,
  },
  critical: {
    label: 'critical',
    headline: 'critical',
    hint: 'severe thermal state',
    color: Colors.dark.error,
    emissive: true,
    breatheMs: 800,
  },
};

/** Derive the HUD mode from what the app knows. */
export function resolveMode(input: { nativeAvailable: boolean; thermalStatusCode: number; busy: boolean }): HudMode {
  if (!input.nativeAvailable) return 'offline';
  if (input.thermalStatusCode >= 3) return 'critical';
  if (input.thermalStatusCode >= 1) return 'attention';
  if (input.busy) return 'active';
  return 'idle';
}
