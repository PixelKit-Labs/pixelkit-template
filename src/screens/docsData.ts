/**
 * @file docsData.ts
 * @description Content for the in-app Docs tab, assembled from the documentation contract.
 *
 * The entries themselves are generated: `scripts/sync-docs-data.mjs` pulls `data/hooks/*.json` from
 * PixelKit-Labs/pixelkit-docs, which is what the SDK's own CI checks itself against. They used to be
 * written by hand in `src/screens/docs/*.ts` — 2,384 lines restating the same 460 fields the
 * documentation already described, kept in step by discipline alone.
 *
 * What stays here is the part that is genuinely this app's: which colour each category is drawn in.
 * That is a rendering decision, and the contract has no opinion about it.
 */

import type { DocModule } from './docs/shared';
import { SILICON, PRO, AI, SENSOR, RADIO, SYSTEM } from './docs/shared';
import { GENERATED_MODULES } from './docsGenerated';

export { type DocField, type DocModule } from './docs/shared';

/** Category to accent colour. The only thing this app decides about a documentation entry. */
const BADGE: Record<DocModule['category'], string> = {
  silicon: SILICON,
  pro: PRO,
  ai: AI,
  sensors: SENSOR,
  radios: RADIO,
  system: SYSTEM,
};

/** Every documented hook, in the order the Docs tab lists them. */
export const DOC_MODULES: DocModule[] = GENERATED_MODULES.map((mod) => ({
  ...mod,
  badgeColor: BADGE[mod.category] ?? SYSTEM,
}));
