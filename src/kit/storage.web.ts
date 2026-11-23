// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// Web storage: localStorage. Falls back to memory if storage is blocked (private mode, previews).
const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const kv = {
  get(key: string): string | null {
    try {
      return ls()?.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string): void {
    memory.set(key, value);
    try {
      ls()?.setItem(key, value);
    } catch {
      // Quota or privacy mode: the in-memory copy keeps the session working.
    }
  },
  remove(key: string): void {
    memory.delete(key);
    try {
      ls()?.removeItem(key);
    } catch {}
  },
  keys(): string[] {
    const s = ls();
    const out = new Set(memory.keys());
    try {
      if (s) for (let i = 0; i < s.length; i++) out.add(s.key(i)!);
    } catch {}
    return [...out];
  },
};
