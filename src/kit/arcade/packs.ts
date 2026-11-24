// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// Game packs are downloaded on demand: installing an app only brings its flagship game.
// A pack is fetched from kaoticchainz.com the first time someone plays it, checked against
// the SHA-256 in the catalog (so a corrupted or tampered file is never used), and cached on
// the phone so it works offline from then on. Packs are content only (questions, items,
// prompts), never code.
import { kv } from '../storage';
import { sha256 } from './sha256';
import type { GameMeta, Pack } from './types';

export const PACK_BASE = 'https://kaoticchainz.com/arcade/';

export type PackState = 'bundled' | 'cached' | 'remote';

const cacheKey = (app: string, g: GameMeta) => `${app}.arcade.pack.${g.id}.${g.pack?.sha256.slice(0, 12)}`;

export function packState(app: string, g: GameMeta, bundled: Record<string, Pack>): PackState {
  if (bundled[g.id]) return 'bundled';
  if (g.pack && kv.get(cacheKey(app, g))) return 'cached';
  return 'remote';
}

export type Fetcher = (url: string) => Promise<{ ok: boolean; text: () => Promise<string> }>;

export async function loadPack(app: string, g: GameMeta, bundled: Record<string, Pack>, fetcher: Fetcher = fetch as unknown as Fetcher): Promise<Pack> {
  if (bundled[g.id]) return bundled[g.id];
  if (!g.pack) throw new Error('This game has no content pack.');
  const key = cacheKey(app, g);
  const hit = kv.get(key);
  if (hit) return JSON.parse(hit) as Pack;
  let text: string;
  try {
    const res = await fetcher(PACK_BASE + g.pack.file);
    if (!res.ok) throw new Error('bad status');
    text = await res.text();
  } catch {
    throw new Error("Couldn't download this game. Check your connection and try again.");
  }
  if (sha256(text) !== g.pack.sha256) throw new Error("This game didn't download properly. Please try again.");
  kv.set(key, text);
  return JSON.parse(text) as Pack;
}

/** Remove a downloaded pack (Settings → free up space). */
export function removePack(app: string, g: GameMeta) {
  if (g.pack) kv.remove(cacheKey(app, g));
}
