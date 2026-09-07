/**
 * @file shared.ts
 * @description Types and constants every documentation entry file uses.
 *
 * Split out of docsData.ts, which had grown past two thousand lines: the entries are now one file
 * per category, matching the categories the Docs tab filters by.
 */

import { Colors } from '../../theme/colors';
/** One documented value: a return field, a hook argument, or a callable. */
export interface DocField {
  name: string;
  /** TypeScript type as the hook really declares it. */
  type: string;
  /** One sentence on what it means and when it matters. */
  desc: string;
  /** For a callable: every argument it accepts, with its default and units. */
  inputs?: DocField[];
  /** For a callable: what it resolves to, and what a failure looks like. */
  output?: string;
}

export interface DocModule {
  id: string;
  name: string;
  category: 'silicon' | 'pro' | 'ai' | 'sensors' | 'radios' | 'system';
  /** Hardware or service this maps onto. */
  chipBadge: string;
  badgeColor: string;
  /** One line shown before the card is opened. */
  summary: string;
  /** What the hook is for, in plain language. */
  plain: string;
  /** How it works: the APIs underneath and the limits that follow from them. */
  description: string;
  signature: string;
  /** Arguments the hook accepts. */
  params: DocField[];
  /** Values it returns. */
  returns: DocField[];
  /** Functions it returns. */
  actions: DocField[];
  example: string;
  /** Guidance for a coding agent working against this hook. */
  agentNote: string;
}

export const SILICON = '#B794FF';
export const PRO = Colors.dark.tensorGlow;
export const AI = Colors.dark.tensorGlow;
export const SENSOR = Colors.dark.primary;
export const RADIO = Colors.dark.success;
export const SYSTEM = Colors.dark.warning;

/** Returned by every hardware-backed hook; documented once and referenced everywhere. */
export const SOURCE_FIELD: DocField = {
  name: 'source',
  type: "'hardware' | 'derived' | 'unavailable'",
  desc: "Where the numbers came from. There is no 'simulated' value: a reading is real, derived from real readings, or unavailable.",
};

