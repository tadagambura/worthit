// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// Native storage: SQLite-backed key-value store (no size cap, synchronous, survives app updates).
import Storage from 'expo-sqlite/kv-store';

export const kv = {
  get(key: string): string | null {
    return Storage.getItemSync(key);
  },
  set(key: string, value: string): void {
    Storage.setItemSync(key, value);
  },
  remove(key: string): void {
    Storage.removeItemSync(key);
  },
  keys(): string[] {
    return Storage.getAllKeysSync();
  },
};
