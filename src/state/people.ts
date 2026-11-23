import { todayKey, type DayKey } from '@/kit/dates';
import { persisted, uid } from '@/kit/store';
import { score, type CheckIn } from '@/domain/score';

export type Note = { id: string; day: DayKey; text: string };
export type Person = { id: string; nickname: string; emoji: string; added: DayKey; checkIns: CheckIn[]; notes: Note[]; ended?: { day: DayKey; lesson: string } };

type PeopleState = {
  people: Person[];
  add: (nickname: string, emoji: string) => string;
  checkIn: (id: string, c: Omit<CheckIn, 'day'>) => void;
  addNote: (id: string, text: string) => void;
  removeNote: (id: string, noteId: string) => void;
  end: (id: string, lesson: string) => void;
  reopen: (id: string) => void;
  remove: (id: string) => Person | undefined;
  restore: (p: Person) => void;
};

export const usePeople = persisted<PeopleState>('worthit.people', 1, (set, get) => ({
  people: [],
  add: (nickname, emoji) => {
    const id = uid('p');
    set((s) => ({ people: [...s.people, { id, nickname, emoji, added: todayKey(), checkIns: [], notes: [] }] }));
    return id;
  },
  checkIn: (id, c) => set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, checkIns: [...p.checkIns, { ...c, day: todayKey() }] } : p)) })),
  addNote: (id, text) => set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, notes: [{ id: uid('n'), day: todayKey(), text }, ...p.notes] } : p)) })),
  removeNote: (id, noteId) => set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, notes: p.notes.filter((n) => n.id !== noteId) } : p)) })),
  end: (id, lesson) => set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, ended: { day: todayKey(), lesson } } : p)) })),
  reopen: (id) => set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, ended: undefined } : p)) })),
  remove: (id) => {
    const p = get().people.find((x) => x.id === id);
    set((s) => ({ people: s.people.filter((x) => x.id !== id) }));
    return p;
  },
  restore: (p) => set((s) => ({ people: [...s.people, p] })),
}));

export const latestScore = (p: Person): number | null => (p.checkIns.length ? score(p.checkIns[p.checkIns.length - 1]) : null);
