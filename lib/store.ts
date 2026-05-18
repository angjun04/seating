"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Arrangement,
  ConfirmedArrangement,
  IncompatiblePair,
  Layout,
  SeatingState,
  Student,
} from "./types";

const HISTORY_LIMIT = 60;

type Actions = {
  setLayout: (layout: Layout) => void;
  setStudents: (students: Student[]) => void;
  toggleFrontPriority: (id: string) => void;
  addIncompatiblePair: (pair: IncompatiblePair) => void;
  removeIncompatiblePair: (index: number) => void;
  setCurrent: (a: Arrangement) => void;
  pushHistory: (a: Arrangement) => void;
  confirmCurrent: () => void;
  clearConfirmed: () => void;
  resetAll: () => void;
};

const initial: SeatingState = {
  layout: null,
  students: [],
  frontPriorityIds: [],
  incompatiblePairs: [],
  current: null,
  confirmed: null,
  history: [],
};

function pruneSeats(
  seats: Record<number, string>,
  validIds: Set<string>,
): Record<number, string> {
  const out: Record<number, string> = {};
  for (const k of Object.keys(seats)) {
    const v = seats[Number(k)];
    if (validIds.has(v)) out[Number(k)] = v;
  }
  return out;
}

export const useSeatingStore = create<SeatingState & Actions>()(
  persist(
    (set) => ({
      ...initial,
      setLayout: (layout) => set({ layout }),
      setStudents: (students) =>
        set((s) => {
          const ids = new Set(students.map((x) => x.id));
          const nextConfirmed: ConfirmedArrangement | null = s.confirmed
            ? {
                ...s.confirmed,
                seats: pruneSeats(s.confirmed.seats, ids),
              }
            : null;
          return {
            students,
            frontPriorityIds: s.frontPriorityIds.filter((id) => ids.has(id)),
            incompatiblePairs: s.incompatiblePairs.filter(
              ([a, b]) => ids.has(a) && ids.has(b),
            ),
            confirmed: nextConfirmed,
          };
        }),
      toggleFrontPriority: (id) =>
        set((s) => ({
          frontPriorityIds: s.frontPriorityIds.includes(id)
            ? s.frontPriorityIds.filter((x) => x !== id)
            : [...s.frontPriorityIds, id],
        })),
      addIncompatiblePair: (pair) =>
        set((s) => {
          const [a, b] = pair;
          if (a === b) return s;
          const exists = s.incompatiblePairs.some(
            ([x, y]) => (x === a && y === b) || (x === b && y === a),
          );
          if (exists) return s;
          return { incompatiblePairs: [...s.incompatiblePairs, pair] };
        }),
      removeIncompatiblePair: (index) =>
        set((s) => ({
          incompatiblePairs: s.incompatiblePairs.filter((_, i) => i !== index),
        })),
      setCurrent: (a) => set({ current: a }),
      pushHistory: (a) =>
        set((s) => ({
          history: [a, ...s.history].slice(0, HISTORY_LIMIT),
        })),
      confirmCurrent: () =>
        set((s) =>
          s.current
            ? {
                confirmed: {
                  seats: { ...s.current.seats },
                  confirmedAt: Date.now(),
                },
              }
            : s,
        ),
      clearConfirmed: () => set({ confirmed: null }),
      resetAll: () => set(initial),
    }),
    {
      name: "seating-store-v1",
      storage: createJSONStorage(() => localStorage),
      // Shallow merge keeps new fields (e.g. `confirmed`) initialized for
      // users hydrated from older persisted snapshots.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SeatingState>;
        const students = (p.students ?? current.students).map((s) => ({
          ...s,
          gender: s.gender ?? "M",
          level: s.level ?? "상",
        }));
        return { ...current, ...p, students };
      },
    },
  ),
);
