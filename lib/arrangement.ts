import type { Arrangement, IncompatiblePair, Layout, Student } from "./types";

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

function validIncompatible(
  seats: Record<number, string>,
  pairs: IncompatiblePair[],
  rows: number,
  cols: number,
): boolean {
  if (pairs.length === 0) return true;
  // Build studentId -> seatIndex
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
};

export type GenerateResult = {
  arrangement: Arrangement;
  satisfiesIncompatible: boolean;
  difference: number;
};

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
  const { rows, cols, cells } = layout;

  const deskIndices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === "desk") deskIndices.push(i);
  }
  // Sort by row (front = smaller row index first)
  deskIndices.sort((a, b) => Math.floor(a / cols) - Math.floor(b / cols));

  const frontSet = new Set(frontPriorityIds);
  const frontStudents = students.filter((s) => frontSet.has(s.id));
  const restStudents = students.filter((s) => !frontSet.has(s.id));

  // Determine "front zone" — enough seats to host front-priority students,
  // expanded to fill full rows for fairness.
  const frontCount = frontStudents.length;
  let frontZoneSize = frontCount;
  if (frontZoneSize > 0) {
    // Round up so we cover whole rows from the top
    let row = 0;
    let count = 0;
    while (count < frontCount && row < rows) {
      for (let c = 0; c < cols; c++) {
        if (cells[row * cols + c] === "desk") count++;
      }
      row++;
    }
    // Recount actual desk seats in those rows
    frontZoneSize = deskIndices.filter(
      (idx) => Math.floor(idx / cols) < row,
    ).length;
  }

  const frontSeats = deskIndices.slice(0, frontZoneSize);
  const otherSeats = deskIndices.slice(frontZoneSize);

  let best: GenerateResult | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seats: Record<number, string> = {};

    const shuffledFront = shuffle(frontStudents);
    const shuffledRest = shuffle(restStudents);

    // Place front-priority students in front seats
    const fs = shuffle(frontSeats);
    for (let i = 0; i < shuffledFront.length && i < fs.length; i++) {
      seats[fs[i]] = shuffledFront[i].id;
    }
    // Remaining front seats fill with rest students
    const restPool = shuffledRest.slice();
    for (let i = shuffledFront.length; i < fs.length && restPool.length; i++) {
      seats[fs[i]] = restPool.shift()!.id;
    }
    // Other seats
    const os = shuffle(otherSeats);
    for (let i = 0; i < os.length && restPool.length; i++) {
      seats[os[i]] = restPool.shift()!.id;
    }

    const ok = validIncompatible(seats, incompatible, rows, cols);
    const diff = differenceRatio(seats, previous?.seats ?? null);

    const candidate: GenerateResult = {
      arrangement: { seats, createdAt: Date.now() },
      satisfiesIncompatible: ok,
      difference: diff,
    };

    if (ok && diff >= minDifference) return candidate;

    // Keep best fallback
    if (!best) best = candidate;
    else {
      // Prefer satisfying incompatible; then higher difference
      const betterOk = ok && !best.satisfiesIncompatible;
      const sameOkBetterDiff =
        ok === best.satisfiesIncompatible && diff > best.difference;
      if (betterOk || sameOkBetterDiff) best = candidate;
    }
  }

  return (
    best ?? {
      arrangement: { seats: {}, createdAt: Date.now() },
      satisfiesIncompatible: incompatible.length === 0,
      difference: 0,
    }
  );
}
