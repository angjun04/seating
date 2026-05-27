import type {
  Arrangement,
  IncompatiblePair,
  Layout,
  Level,
  PinnedSeats,
  SeatmatePolicy,
  Student,
  StudentMetric,
} from "./types";

// The 상/중/하 value the arrangement should balance on, per the chosen metric.
function levelOf(s: Student, metric: StudentMetric): Level {
  return metric === "behavior" ? (s.behavior ?? "중") : s.level;
}

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
  metric: StudentMetric,
  avoidLowLow: boolean,
): { lowLow: number; genderMismatch: number } {
  const byId = new Map(students.map((s) => [s.id, s]));
  let lowLow = 0;
  let genderMismatch = 0;
  for (const [a, b] of seatmatePairs(seats, layout)) {
    const sa = byId.get(a);
    const sb = byId.get(b);
    if (!sa || !sb) continue;
    if (
      avoidLowLow &&
      levelOf(sa, metric) === "하" &&
      levelOf(sb, metric) === "하"
    ) {
      lowLow++;
    }
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

function groupMemberPairs(
  seats: Record<number, string>,
  groups: number[],
): Set<string> {
  const byGroup = new Map<number, string[]>();
  for (const k of Object.keys(seats)) {
    const idx = Number(k);
    const g = groups[idx] ?? 0;
    if (!g) continue;
    const sid = seats[idx];
    if (!sid) continue;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(sid);
  }
  const out = new Set<string>();
  for (const members of byGroup.values()) {
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        out.add(pairKey(members[i], members[j]));
      }
    }
  }
  return out;
}

function computeGroupImbalance(
  seats: Record<number, string>,
  groups: number[],
  students: Student[],
  metric: StudentMetric,
): number {
  const levelById = new Map<string, Level>(
    students.map((s) => [s.id, levelOf(s, metric)]),
  );
  const counts = new Map<number, Record<Level, number>>();
  const sizes = new Map<number, number>();
  for (const k of Object.keys(seats)) {
    const idx = Number(k);
    const g = groups[idx] ?? 0;
    if (!g) continue;
    const lvl = levelById.get(seats[idx]);
    if (!lvl) continue;
    if (!counts.has(g)) {
      counts.set(g, { 상: 0, 중: 0, 하: 0 });
      sizes.set(g, 0);
    }
    counts.get(g)![lvl]++;
    sizes.set(g, (sizes.get(g) ?? 0) + 1);
  }
  let total = 0;
  for (const [g, c] of counts) {
    const n = sizes.get(g) ?? 0;
    if (n === 0) continue;
    const ideal = n / 3;
    total += (c.상 - ideal) ** 2 + (c.중 - ideal) ** 2 + (c.하 - ideal) ** 2;
  }
  return total;
}

function countBadPairsInGroup(
  seats: Record<number, string>,
  groups: number[],
  pairs: IncompatiblePair[],
): number {
  if (pairs.length === 0) return 0;
  const groupOf = new Map<string, number>();
  for (const k of Object.keys(seats)) {
    const idx = Number(k);
    const g = groups[idx] ?? 0;
    if (!g) continue;
    groupOf.set(seats[idx], g);
  }
  let count = 0;
  for (const [a, b] of pairs) {
    const ga = groupOf.get(a);
    const gb = groupOf.get(b);
    if (ga !== undefined && ga === gb) count++;
  }
  return count;
}

export type GenerateOptions = {
  minDifference?: number; // 0..1; default 0.5
  maxAttempts?: number; // default 500
  // Last month's confirmed arrangement, used to avoid repeating seat
  // positions AND seatmate (adjacent) pairings.
  confirmedSeats?: Record<number, string> | null;
  seatmatePolicy?: SeatmatePolicy; // default "random"
  // Which attribute drives group balancing and the 하-하 rule. Default "level".
  metric?: StudentMetric;
  // Whether to avoid seating two "하" (by `metric`) students together.
  avoidLowLow?: boolean; // default true
  // 맨 뒷자리 우선 학생. Seated in the back rows.
  backPriorityIds?: string[];
  // 미리 자리를 지정한 학생 (seatIndex -> studentId). These seats are fixed.
  pinnedSeats?: PinnedSeats | null;
};

// Number of seats (front-first ordered) that fall within full rows needed to
// host `count` priority students. Expanding to whole rows keeps a tidy block.
function frontZoneSize(ordered: number[], cols: number, count: number): number {
  if (count <= 0) return 0;
  let i = 0;
  while (i < ordered.length && i < count) {
    const row = Math.floor(ordered[i] / cols);
    while (i < ordered.length && Math.floor(ordered[i] / cols) === row) i++;
  }
  return i;
}

// Same idea, counting whole rows from the back.
function backZoneSize(ordered: number[], cols: number, count: number): number {
  if (count <= 0) return 0;
  let i = ordered.length - 1;
  let taken = 0;
  while (i >= 0 && taken < count) {
    const row = Math.floor(ordered[i] / cols);
    while (i >= 0 && Math.floor(ordered[i] / cols) === row) {
      i--;
      taken++;
    }
  }
  return ordered.length - 1 - i;
}

export type GenerateResult = {
  arrangement: Arrangement;
  satisfiesIncompatible: boolean;
  difference: number;
  repeatSeatmates: number;
  lowLowPairs: number;
  genderMismatches: number;
  repeatGroupmates: number;
  badPairsInGroup: number;
  groupImbalance: number;
};

function isBetter(a: GenerateResult, b: GenerateResult): boolean {
  if (a.satisfiesIncompatible !== b.satisfiesIncompatible) {
    return a.satisfiesIncompatible;
  }
  // 하-하 짝꿍은 절대 금지 — 다른 무엇보다 우선해서 줄인다.
  if (a.lowLowPairs !== b.lowLowPairs) return a.lowLowPairs < b.lowLowPairs;
  // 사이 안 좋은 쌍이 같은 모둠 — 사용자가 명시한 분리 요구
  if (a.badPairsInGroup !== b.badPairsInGroup) {
    return a.badPairsInGroup < b.badPairsInGroup;
  }
  if (a.genderMismatches !== b.genderMismatches) {
    return a.genderMismatches < b.genderMismatches;
  }
  if (a.repeatSeatmates !== b.repeatSeatmates) {
    return a.repeatSeatmates < b.repeatSeatmates;
  }
  if (a.repeatGroupmates !== b.repeatGroupmates) {
    return a.repeatGroupmates < b.repeatGroupmates;
  }
  if (a.groupImbalance !== b.groupImbalance) {
    return a.groupImbalance < b.groupImbalance;
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
  const metric: StudentMetric = opts.metric ?? "level";
  const avoidLowLow = opts.avoidLowLow ?? true;
  const { rows, cols, cells } = layout;
  const groups = layout.groups ?? new Array(cells.length).fill(0);
  const numGroups = layout.numGroups ?? 0;
  const hasGroups = numGroups > 0;

  const studentById = new Map(students.map((s) => [s.id, s]));

  const deskIndices: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === "desk") deskIndices.push(i);
  }
  // Sort front-first (row ascending). Within a row, row-major already gives
  // left-to-right, and the sort is stable so that order is preserved.
  deskIndices.sort((a, b) => Math.floor(a / cols) - Math.floor(b / cols));

  // Pinned (사전 지정) seats are fixed before anything else and dropped from
  // the shuffle pools. Only honour pins that point at a real desk + student.
  const pinnedEntries = Object.entries(opts.pinnedSeats ?? {})
    .map(([k, v]) => [Number(k), v] as [number, string])
    .filter(([idx, sid]) => cells[idx] === "desk" && studentById.has(sid));
  const pinnedSeatSet = new Set(pinnedEntries.map(([idx]) => idx));
  const pinnedStudentSet = new Set(pinnedEntries.map(([, sid]) => sid));

  const freeStudents = students.filter((s) => !pinnedStudentSet.has(s.id));

  // Free desks (excluding pinned), front-first, limited to the free-student
  // count so leftover empties end up at the back of the room.
  const freeDeskIndices = deskIndices.filter((i) => !pinnedSeatSet.has(i));
  const orderedSeats = freeDeskIndices.slice(0, freeStudents.length);

  // Front/back priority are mutually exclusive; front wins if somehow both.
  const frontSet = new Set(frontPriorityIds);
  const backSet = new Set(opts.backPriorityIds ?? []);
  const frontStudents = freeStudents.filter((s) => frontSet.has(s.id));
  const backStudents = freeStudents.filter(
    (s) => backSet.has(s.id) && !frontSet.has(s.id),
  );
  const restStudents = freeStudents.filter(
    (s) => !frontSet.has(s.id) && !backSet.has(s.id),
  );

  // Carve the free seats into a front zone and a back zone (whole rows), with
  // the middle left for everyone else. Clamp so the zones never overlap.
  const fZone = frontZoneSize(orderedSeats, cols, frontStudents.length);
  let bZone = backZoneSize(orderedSeats, cols, backStudents.length);
  if (fZone + bZone > orderedSeats.length) {
    bZone = Math.max(0, orderedSeats.length - fZone);
  }
  const frontSeats = orderedSeats.slice(0, fZone);
  const backSeats = orderedSeats.slice(orderedSeats.length - bZone);

  const confirmedPairs = confirmedSeats
    ? computeNeighborPairs(confirmedSeats, rows, cols)
    : null;
  // Previous group memberships — applies CURRENT layout's group definitions
  // to LAST month's seats so re-drawing groups still works as a comparison.
  const confirmedGroupPairs =
    confirmedSeats && hasGroups ? groupMemberPairs(confirmedSeats, groups) : null;

  let best: GenerateResult | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seats: Record<number, string> = {};
    for (const [idx, sid] of pinnedEntries) seats[idx] = sid;

    // Seat priority students in their zone; students that don't fit overflow
    // into the general pool so nobody is left without a desk.
    const placeZone = (zoneSeats: number[], pool: Student[]): Student[] => {
      const ss = shuffle(zoneSeats);
      const st = shuffle(pool);
      let i = 0;
      for (; i < st.length && i < ss.length; i++) seats[ss[i]] = st[i].id;
      return st.slice(i);
    };
    const overflowFront = placeZone(frontSeats, frontStudents);
    const overflowBack = placeZone(backSeats, backStudents);

    const filled = new Set(Object.keys(seats).map(Number));
    const remainingSeats = shuffle(orderedSeats.filter((s) => !filled.has(s)));
    const remainingStudents = shuffle([
      ...restStudents,
      ...overflowFront,
      ...overflowBack,
    ]);
    for (
      let i = 0;
      i < remainingSeats.length && i < remainingStudents.length;
      i++
    ) {
      seats[remainingSeats[i]] = remainingStudents[i].id;
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
      metric,
      avoidLowLow,
    );
    let repeatGroup = 0;
    if (confirmedGroupPairs && confirmedGroupPairs.size > 0) {
      const newGroupPairs = groupMemberPairs(seats, groups);
      for (const p of newGroupPairs) if (confirmedGroupPairs.has(p)) repeatGroup++;
    }
    const badInGroup = hasGroups
      ? countBadPairsInGroup(seats, groups, incompatible)
      : 0;
    const imbalance = hasGroups
      ? computeGroupImbalance(seats, groups, students, metric)
      : 0;

    const candidate: GenerateResult = {
      arrangement: { seats, createdAt: Date.now() },
      satisfiesIncompatible: ok,
      difference: diff,
      repeatSeatmates: repeats,
      lowLowPairs: lowLow,
      genderMismatches: genderMismatch,
      repeatGroupmates: repeatGroup,
      badPairsInGroup: badInGroup,
      groupImbalance: imbalance,
    };

    if (
      ok &&
      diff >= minDifference &&
      repeats === 0 &&
      lowLow === 0 &&
      genderMismatch === 0 &&
      badInGroup === 0 &&
      repeatGroup === 0 &&
      imbalance <= 1
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
      repeatGroupmates: 0,
      badPairsInGroup: 0,
      groupImbalance: 0,
    }
  );
}
