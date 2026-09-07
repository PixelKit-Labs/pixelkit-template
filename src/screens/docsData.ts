/**
 * @file docsData.ts
 * @description Content for the in-app Docs tab, assembled from one file per category.
 *
 * Every entry documents one exported hook: what it is for in plain language, how it works
 * underneath, the arguments it takes, the values it returns, and the functions it gives you.
 * Each function carries its own contract too: `inputs` describes every argument with its default
 * and units, and `output` says what the call resolves to and what a failure looks like.
 *
 * Field names and types are copied from the hook's actual return object, so this is the
 * documentation contract. If a hook's surface changes, the matching entry changes with it.
 */

export { type DocField, type DocModule } from './docs/shared';

import type { DocModule } from './docs/shared';
import { SILICON_MODULES } from './docs/silicon';
import { PRO_MODULES } from './docs/pro';
import { AI_MODULES } from './docs/ai';
import { SENSORS_MODULES } from './docs/sensors';
import { RADIOS_MODULES } from './docs/radios';
import { SYSTEM_MODULES } from './docs/system';

/** Every documented hook, in the order the Docs tab lists them. */
export const DOC_MODULES: DocModule[] = [
  ...SILICON_MODULES,
  ...PRO_MODULES,
  ...AI_MODULES,
  ...SENSORS_MODULES,
  ...RADIOS_MODULES,
  ...SYSTEM_MODULES,
];
