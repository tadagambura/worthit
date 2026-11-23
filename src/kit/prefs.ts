// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
import { persisted } from './store';

export type Prefs = {
  onboarded: boolean;
  reminder: { on: boolean; hour: number; minute: number; weekday?: number };
  reduceMotion: boolean;
  setOnboarded: () => void;
  setReminder: (r: Partial<Prefs['reminder']>) => void;
  setReduceMotion: (v: boolean) => void;
};

const stores = new Map<string, ReturnType<typeof make>>();

function make(app: string, defaultHour: number) {
  return persisted<Prefs>(`${app}.prefs`, 1, (set) => ({
    onboarded: false,
    reminder: { on: false, hour: defaultHour, minute: 0 },
    reduceMotion: false,
    setOnboarded: () => set({ onboarded: true }),
    setReminder: (r) => set((s) => ({ reminder: { ...s.reminder, ...r } })),
    setReduceMotion: (v) => set({ reduceMotion: v }),
  }));
}

/** One prefs store per app. Call with the same arguments everywhere. */
export function prefsStore(app: string, defaultHour = 9) {
  let s = stores.get(app);
  if (!s) {
    s = make(app, defaultHour);
    stores.set(app, s);
  }
  return s;
}
