import type {
  Arrangement,
  IncompatiblePair,
  Layout,
  SeatmatePolicy,
  Student,
} from "./types";

// Map students to desks in row-major order (front-left first).
// Used to seed `current` from "last month's arrangement" when a teacher
// starts mid-year and wants the next generation to differ from it.
export function seedArrangementFromStudentOrder(
  layout: Layout,
  students: Student[],
): Arrangement {
  const seats: Record<number, string> = {};
  let si = 0;
  for (let i = 0; i < layout.cells.length && si < students.length; i++) {
    if (layout.cells[i] === "desk") {
      seats[i] = students[si].id;
      si++;
    }
  }
  return { seats, createdAt: Date.now() };
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function neighbors(index: number, rows: number, cols: number): number[] {
  const r = Math.floor(index / cols);
  const c = index % cols;
  const out: number[] = [];
  if (r > 0) out.push((r - 1) * cols + c);
  if (r < rows - 1) out.push((r + 1) * cols + c);
  if (c > 0) out.push(r * cols + (c - 1));
  if (c < cols - 1) out.push(r * cols + (c + 1));
  return out;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function computeNeighborPairs(
  seats: Record<number, string>,
  rows: number,
  cols: number,
): Set<string> {
  const set = new Set<string>();
  for (const k of Object.keys(seats)) {
    const idx = Number(k);
    const sid = seats[idx];
    if (!sid) continue;
    for (const n of neighbors(idx, rows, cols)) {
      const nsid = seats[n];
      if (!nsid) continue;
      set.add(pairKey(sid, nsid));
    }
  }
  return set;
}

function validIncompatible(
  seats: Record<number, string>,
  pairs: IncompatiblePair[],
  rows: number,
  cols: number,
): boolean {
  if (pairs.length === 0) return true;
  const where = new Map<string, number>();
  for (const [k, v] of Object.entries(seats)) where.set(v, Number(k));
  for (const [a, b] of pairs) {
    const ia = where.get(a);
    const ib = where.get(b);
    if (ia === undefined || ib === undefined) continue;
    if (neighbors(ia, rows, cols).includes(ib)) return false;
  }
  return true;
}

// "짝꿍" = horizontally adjacent occupied desks within the same row.
// Returns each pair as [leftStudentId, rightStudentId].
function seatmatePairs(
  seats: Record<number, string>,
  layout: Layout,
): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const { rows, cols, cells } = layout;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const li = r * cols + c;
      const ri = li + 1;
      if (cells[li] !== "desk" || cells[ri] !== "desk") continue;
      const a = seats[li];
      const b = seats[ri];
      if (!a || !b) continue;
      out.push([a, b]);
    }
  }
  return out;
}

function countSeatmateViolations(
  seats: Record<number, string>,
  layout: Layout,
  students: Student[],
  policy: SeatmatePolicy,
): { lowLow: number; genderMismatch: number } {
  const byId = new Map(students.map((s) => [s.id, s]));
  let lowLow = 0;
  let genderMismatch = 0;
  for (const [a, b] of seatmatePairs(seats, layout)) {
    const sa = byId.get(a);
    const sb = byId.get(b);
    if (!sa || !sb) continue;
    if (sa.level === "하" && sb.level === "하") lowLow++;
    if (policy === "same" && sa.gender !== sb.gender) genderMismatch++;
    else if (policy === "opposite" && sa.gender === sb.gender) genderMismatch++;
  }
  return { lowLow, genderMismatch };
}

function differenceRatio(
  next: Record<number, string>,
  prev: Record<number, string> | null,
): number {
  if (!prev) return 1;
  const keys = Object.keys(next);
  if (keys.length === 0) return 1;
  let changed = 0;
  for (const k of keys) if (next[Number(k)] !== prev[Number(k)]) changed++;
  return changed / keys.length;
}

export type GenerateOptions = {
  minDifference?: number; // 0..1; default 0.5
  maxAttempts?: number; // default 500
  // Last month's confirmed arrangement, used to avoid repeating seat
  // positions AND seatmate (adjacent) pairings.
  confirmedSeats?: Record<number, string> | null;
  seatmatePolicy?: SeatmatePolicy; // default "random"
};

export type GenerateResult = {
  arrangement: Arrangement;
  satisfiesIncompatible: boolean;
  difference: number;
  repeatSeatmates: number;
  lowLowPairs: number;
  genderMismatches: number;
};

function isBetter(a: GenerateResult, b: GenerateResult): boolean {
  if (a.satisfiesIncompatible !== b.satisfiesIncompatible) {
    return a.satisfiesIncompatible;
  }
  // 하-하 짝꿍은 절대 금지 — 다른 무엇보다 우선해서 줄인다.
  if (a.lowLowPairs !== b.lowLowPairs) return a.lowLowPairs < b.lowLowPairs;
  if (a.genderMismatches !== b.genderMismatches) {
    return a.genderMismatches < b.genderMismatches;
  }
  if (a.repeatSeatmates !== b.repeatSeatmates) {
    return a.repeatSeatmates < b.repeatSeatmates;
  }
  return a.difference > b.difference;
}

export function generateArrangement(
  layout: Layout,
  students: Student[],
  frontPriorityIds: string[],
  incompatible: IncompatiblePair[],
  previous: Arrangement | null,
  opts: GenerateOptions = {},
): GenerateResult {
  const minDifference = opts.minDifference ?? 0.5;
  const maxAttempts = opts.maxAttempts ?? 500;
  const confirmedSeats = opts.confirmedSeats ?? null;
  const seatmatePolicy: SeatmatePolicy = opts.seatmatePolicy ?? "random";
  const { rows, cols, cells } = layout;

  const deskIndices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === "desk") deskIndices.push(i);
  }
  // Sort front-first (row ascending). Within a row, row-major already gives
  // left-to-right, and the sort is stable so that order is preserved.
  deskIndices.sort((a, b) => Math.floor(a / cols) - Math.floor(b / cols));

  // Limit seats used to the number of students so leftover empties end up at
  // the back of the room rather than scattered randomly.
  const activeDeskIndices = deskIndices.slice(0, students.length);

  const frontSet = new Set(frontPriorityIds);
  const frontStudents = students.filter((s) => frontSet.has(s.id));
  const restStudents = students.filter((s) => !frontSet.has(s.id));

  // Determine "front zone" — enough seats to host front-priority students,
  // expanded to fill full rows for fairness.
  const frontCount = frontStudents.length;
  let frontZoneSize = frontCount;
  if (frontZoneSize > 0) {
    let row = 0;
    let count = 0;
    while (count < frontCount && row < rows) {
      for (let c = 0; c < cols; c++) {
        if (cells[row * cols + c] === "desk") count++;
      }
      row++;
    }
    frontZoneSize = deskIndices.filter(
      (idx) => Math.floor(idx / cols) < row,
    ).length;
  }
  // Cap to active seats (in case the front rows alone hold more than the
  // total student count).
  const frontSeatsCount = Math.min(frontZoneSize, activeDeskIndices.length);

  const frontSeats = activeDeskIndices.slice(0, frontSeatsCount);
  const otherSeats = activeDeskIndices.slice(frontSeatsCount);

  const confirmedPairs = confirmedSeats
    ? computeNeighborPairs(confirmedSeats, rows, cols)
    : null;

  let best: GenerateResult | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seats: Record<number, string> = {};

    const shuffledFront = shuffle(frontStudents);
    const shuffledRest = shuffle(restStudents);

    const fs = shuffle(frontSeats);
    for (let i = 0; i < shuffledFront.length && i < fs.length; i++) {
      seats[fs[i]] = shuffledFront[i].id;
    }
    const restPool = shuffledRest.slice();
    for (let i = shuffledFront.length; i < fs.length && restPool.length; i++) {
      seats[fs[i]] = restPool.shift()!.id;
    }
    const os = shuffle(otherSeats);
    for (let i = 0; i < os.length && restPool.length; i++) {
      seats[os[i]] = restPool.shift()!.id;
    }

    const ok = validIncompatible(seats, incompatible, rows, cols);
    const diff = differenceRatio(seats, previous?.seats ?? null);
    let repeats = 0;
    if (confirmedPairs && confirmedPairs.size > 0) {
      const newPairs = computeNeighborPairs(seats, rows, cols);
      for (const p of newPairs) if (confirmedPairs.has(p)) repeats++;
    }
    const { lowLow, genderMismatch } = countSeatmateViolations(
      seats,
      layout,
      students,
      seatmatePolicy,
    );

    const candidate: GenerateResult = {
      arrangement: { seats, createdAt: Date.now() },
      satisfiesIncompatible: ok,
      difference: diff,
      repeatSeatmates: repeats,
      lowLowPairs: lowLow,
      genderMismatches: genderMismatch,
    };

    if (
      ok &&
      diff >= minDifference &&
      repeats === 0 &&
      lowLow === 0 &&
      genderMismatch === 0
    ) {
      return candidate;
    }

    if (!best || isBetter(candidate, best)) best = candidate;
  }

  return (
    best ?? {
      arrangement: { seats: {}, createdAt: Date.now() },
      satisfiesIncompatible: incompatible.length === 0,
      difference: 0,
      repeatSeatmates: 0,
      lowLowPairs: 0,
      genderMismatches: 0,
    }
  );
}
