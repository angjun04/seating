"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Arrangement,
  ConfirmedArrangement,
  IncompatiblePair,
  Layout,
  SeatingState,
  SeatmatePolicy,
  Student,
  StudentMetric,
} from "./types";

const HISTORY_LIMIT = 60;

type Actions = {
  setLayout: (layout: Layout) => void;
  setStudents: (students: Student[]) => void;
  toggleFrontPriority: (id: string) => void;
  toggleBackPriority: (id: string) => void;
  addIncompatiblePair: (pair: IncompatiblePair) => void;
  removeIncompatiblePair: (index: number) => void;
  setPinnedSeat: (seatIndex: number, studentId: string) => void;
  removePinnedSeat: (seatIndex: number) => void;
  clearPinnedSeats: () => void;
  setCurrent: (a: Arrangement) => void;
  pushHistory: (a: Arrangement) => void;
  confirmCurrent: () => void;
  clearConfirmed: () => void;
  setSeatmatePolicy: (p: SeatmatePolicy) => void;
  setUseLevel: (v: boolean) => void;
  setUseBehavior: (v: boolean) => void;
  setBalanceMetric: (m: StudentMetric) => void;
  setAvoidLowLowSeatmates: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  resetAll: () => void;
};

const initial: SeatingState = {
  layout: null,
  students: [],
  frontPriorityIds: [],
  backPriorityIds: [],
  incompatiblePairs: [],
  pinnedSeats: {},
  current: null,
  confirmed: null,
  history: [],
  seatmatePolicy: "random",
  useLevel: true,
  useBehavior: false,
  balanceMetric: "level",
  avoidLowLowSeatmates: true,
  soundEnabled: true,
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
      setLayout: (layout) =>
        set((s) => {
          // Drop pins that no longer point at an existing desk cell.
          const valid: Record<number, string> = {};
          for (const k of Object.keys(s.pinnedSeats)) {
            const idx = Number(k);
            if (layout.cells[idx] === "desk") valid[idx] = s.pinnedSeats[idx];
          }
          return { layout, pinnedSeats: valid };
        }),
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
            backPriorityIds: s.backPriorityIds.filter((id) => ids.has(id)),
            incompatiblePairs: s.incompatiblePairs.filter(
              ([a, b]) => ids.has(a) && ids.has(b),
            ),
            pinnedSeats: pruneSeats(s.pinnedSeats, ids),
            confirmed: nextConfirmed,
          };
        }),
      // Front/back priority are mutually exclusive — a student can't be told to
      // sit at both the front and the back.
      toggleFrontPriority: (id) =>
        set((s) => ({
          frontPriorityIds: s.frontPriorityIds.includes(id)
            ? s.frontPriorityIds.filter((x) => x !== id)
            : [...s.frontPriorityIds, id],
          backPriorityIds: s.backPriorityIds.filter((x) => x !== id),
        })),
      toggleBackPriority: (id) =>
        set((s) => ({
          backPriorityIds: s.backPriorityIds.includes(id)
            ? s.backPriorityIds.filter((x) => x !== id)
            : [...s.backPriorityIds, id],
          frontPriorityIds: s.frontPriorityIds.filter((x) => x !== id),
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
      setPinnedSeat: (seatIndex, studentId) =>
        set((s) => {
          const next: Record<number, string> = {};
          // A student can be pinned to only one seat — drop any prior pin.
          for (const k of Object.keys(s.pinnedSeats)) {
            const idx = Number(k);
            if (s.pinnedSeats[idx] !== studentId) next[idx] = s.pinnedSeats[idx];
          }
          next[seatIndex] = studentId;
          return { pinnedSeats: next };
        }),
      removePinnedSeat: (seatIndex) =>
        set((s) => {
          if (!(seatIndex in s.pinnedSeats)) return s;
          const next = { ...s.pinnedSeats };
          delete next[seatIndex];
          return { pinnedSeats: next };
        }),
      clearPinnedSeats: () => set({ pinnedSeats: {} }),
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
      setSeatmatePolicy: (p) => set({ seatmatePolicy: p }),
      setUseLevel: (v) =>
        set((s) => {
          // At least one metric must stay enabled.
          if (!v && !s.useBehavior) return s;
          const balanceMetric =
            !v && s.balanceMetric === "level" ? "behavior" : s.balanceMetric;
          return { useLevel: v, balanceMetric };
        }),
      setUseBehavior: (v) =>
        set((s) => {
          if (!v && !s.useLevel) return s;
          const balanceMetric =
            !v && s.balanceMetric === "behavior" ? "level" : s.balanceMetric;
          return { useBehavior: v, balanceMetric };
        }),
      setBalanceMetric: (m) =>
        set((s) => {
          // Don't let the balance metric point at a disabled attribute.
          if (m === "level" && !s.useLevel) return s;
          if (m === "behavior" && !s.useBehavior) return s;
          return { balanceMetric: m };
        }),
      setAvoidLowLowSeatmates: (v) => set({ avoidLowLowSeatmates: v }),
      setSoundEnabled: (v) => set({ soundEnabled: v }),
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
          behavior: s.behavior ?? "중",
        }));
        return {
          ...current,
          ...p,
          students,
          seatmatePolicy: p.seatmatePolicy ?? current.seatmatePolicy,
          backPriorityIds: p.backPriorityIds ?? current.backPriorityIds,
          pinnedSeats: p.pinnedSeats ?? current.pinnedSeats,
          useLevel: p.useLevel ?? current.useLevel,
          useBehavior: p.useBehavior ?? current.useBehavior,
          balanceMetric: p.balanceMetric ?? current.balanceMetric,
          avoidLowLowSeatmates:
            p.avoidLowLowSeatmates ?? current.avoidLowLowSeatmates,
          soundEnabled: p.soundEnabled ?? current.soundEnabled,
        };
      },
    },
  ),
);
