"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Arrangement,
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
  resetAll: () => void;
};

const initial: SeatingState = {
  layout: null,
  students: [],
  frontPriorityIds: [],
  incompatiblePairs: [],
  current: null,
  history: [],
};

export const useSeatingStore = create<SeatingState & Actions>()(
  persist(
    (set) => ({
      ...initial,
      setLayout: (layout) => set({ layout }),
      setStudents: (students) =>
        set((s) => {
          const ids = new Set(students.map((x) => x.id));
          return {
            students,
            frontPriorityIds: s.frontPriorityIds.filter((id) => ids.has(id)),
            incompatiblePairs: s.incompatiblePairs.filter(
              ([a, b]) => ids.has(a) && ids.has(b),
            ),
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
      resetAll: () => set(initial),
    }),
    {
      name: "seating-store-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
