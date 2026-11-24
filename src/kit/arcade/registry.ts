// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Which arcade this app has. No UI imports, so billing and Premium code can ask "which games
// are for sale here?" without pulling in the arcade screens. Each app registers once from its
// generated src/arcade/index.ts.
import type { ArcadeCatalog, Pack } from './types';

export type Registered = { catalog: ArcadeCatalog; bundled: Record<string, Pack> };
let registered: Registered | null = null;

export function registerArcade(catalog: ArcadeCatalog, bundled: Record<string, Pack>) {
  registered = { catalog, bundled };
}

export function arcade(): Registered | null {
  return registered;
}

/** Games sold one by one for £0.99 (and included with Premium, All Access and the £25 pass). */
export function paidGameIds(catalog: ArcadeCatalog | null | undefined = registered?.catalog): string[] {
  return catalog ? catalog.games.filter((g) => g.tier === 'arcade').map((g) => g.id) : [];
}
