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

// ---------- "Download all games" (like a game's HD resources screen, all inside the app) ----------

export type DownloadSummary = { total: number; onPhone: number; toDownload: number; bytesToDownload: number; bytesOnPhone: number };

/** What's already on the phone (bundled or downloaded) and what a "Download all" would fetch. */
export function downloadSummary(app: string, games: GameMeta[], bundled: Record<string, Pack>): DownloadSummary {
  const withPacks = games.filter((g) => g.pack);
  let onPhone = 0;
  let bytesOnPhone = 0;
  let bytesToDownload = 0;
  for (const g of withPacks) {
    if (packState(app, g, bundled) === 'remote') bytesToDownload += g.pack!.bytes;
    else {
      onPhone++;
      bytesOnPhone += g.pack!.bytes;
    }
  }
  return { total: withPacks.length, onPhone, toDownload: withPacks.length - onPhone, bytesToDownload, bytesOnPhone };
}

/**
 * Download every game that isn't on the phone yet, one at a time, inside the app. Failures
 * don't stop the rest; they're counted so the person can retry. Already-cached packs are skipped.
 */
export async function downloadAll(
  app: string,
  games: GameMeta[],
  bundled: Record<string, Pack>,
  onProgress: (done: number, total: number) => void = () => {},
  fetcher?: Fetcher,
): Promise<{ downloaded: number; failed: number }> {
  const todo = games.filter((g) => g.pack && packState(app, g, bundled) === 'remote');
  let downloaded = 0;
  let failed = 0;
  onProgress(0, todo.length);
  for (const g of todo) {
    try {
      await loadPack(app, g, bundled, fetcher);
      downloaded++;
    } catch {
      failed++;
    }
    onProgress(downloaded + failed, todo.length);
  }
  return { downloaded, failed };
}

/** Free up space: remove every downloaded game. Bundled games and progress (scores, currency) stay. */
export function removeAllDownloads(app: string, games: GameMeta[]) {
  for (const g of games) removePack(app, g);
}
