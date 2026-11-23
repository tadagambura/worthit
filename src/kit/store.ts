// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
// Persisted zustand stores. Each store has its own storage key, a version and an optional
// migration, so one write never re-serialises the whole app and old data upgrades safely.
import { create, type StateCreator, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist, type PersistOptions } from 'zustand/middleware';
import { kv } from './storage';

const syncStorage = createJSONStorage(() => ({
  getItem: (name: string) => kv.get(name),
  setItem: (name: string, value: string) => kv.set(name, value),
  removeItem: (name: string) => kv.remove(name),
}));

type Registered = { key: string; reset: () => void };
const registry: Registered[] = [];

export function persisted<T extends object>(
  key: string,
  version: number,
  init: StateCreator<T, [], []>,
  options: Pick<PersistOptions<T, Partial<T>>, 'migrate' | 'partialize'> = {},
): UseBoundStore<StoreApi<T>> {
  const store = create<T>()(
    persist(init as StateCreator<T, [], [['zustand/persist', unknown]]>, {
      name: key,
      version,
      storage: syncStorage,
      skipHydration: true,
      ...options,
    } as PersistOptions<T, unknown>),
  );
  // Capture the defaults before loading saved data, so "delete all" really resets.
  const initial = store.getState();
  // Storage is synchronous, so this applies saved data before the first render.
  void (store as unknown as { persist: { rehydrate: () => Promise<void> } }).persist.rehydrate();
  registry.push({ key, reset: () => store.setState(initial, true) });
  return store;
}

/** Every key this app has written, for export. */
export function storedKeys(prefix: string): string[] {
  return kv.keys().filter((k) => k.startsWith(prefix + '.'));
}

/** Wipe all of this app's data on the device and reset every store in memory. */
export function wipeAll(prefix: string): void {
  for (const k of storedKeys(prefix)) kv.remove(k);
  for (const r of registry) r.reset();
  for (const k of storedKeys(prefix)) kv.remove(k); // resets above may re-persist defaults
}

let seq = 0;
/** Short unique id for records created on this device. */
export function uid(prefix = ''): string {
  seq = (seq + 1) % 1296;
  return prefix + Date.now().toString(36) + seq.toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 6);
}
