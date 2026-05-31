// 자리 배치를 DB 없이 "긴 코드"로 저장/복원하기 위한 인코딩.
//
// 코드는 자급자족(self-contained)이다: 책상 격자(가로세로·빈칸·모둠·남녀줄)와
// 각 자리에 앉은 학생의 이름·성별·성적·생활태도를 모두 담는다. 따라서 다른
// 기기/브라우저에 붙여넣어도 동일한 배치를 그대로 만들 수 있다.

import type { Arrangement, Gender, Layout, Level, Student } from "./types";

// 코드 앞에 붙는 표식 — 버전 구분과 "이건 자리 코드"라는 검증에 쓴다.
const PREFIX = "SEAT1.";

// 한 자리에 앉은 학생 한 명. 키를 짧게 줄여 코드 길이를 줄인다.
type SeatEntry = {
  i: number; // seatIndex (row*cols + col)
  n: string; // 이름
  g: Gender; // 성별
  l: Level; // 성적
  b: Level; // 생활태도
};

type Payload = {
  v: 1;
  r: number; // rows
  c: number; // cols
  d: string; // cells: '1'=책상, '0'=빈칸, 길이 = r*c
  g?: number[]; // groups (모둠 번호), 있을 때만
  ng?: number; // numGroups
  cg?: Record<number, Gender>; // columnGenders (남자줄/여자줄)
  s: SeatEntry[]; // 자리 배정
};

// --- UTF-8 안전 base64 (한글 이름 포함) ---

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// 현재 배치를 코드 문자열로. current(arrangement)가 없으면 null.
export function encodeSeating(
  layout: Layout,
  students: Student[],
  current: Arrangement | null,
): string | null {
  if (!current) return null;
  const byId = new Map(students.map((s) => [s.id, s]));

  const seats: SeatEntry[] = [];
  for (const key of Object.keys(current.seats)) {
    const idx = Number(key);
    const st = byId.get(current.seats[idx]);
    if (!st) continue; // 더 이상 존재하지 않는 학생 자리는 건너뛴다
    seats.push({
      i: idx,
      n: st.name,
      g: st.gender,
      l: st.level,
      b: st.behavior ?? st.level,
    });
  }
  if (seats.length === 0) return null;

  const payload: Payload = {
    v: 1,
    r: layout.rows,
    c: layout.cols,
    d: layout.cells.map((c) => (c === "desk" ? "1" : "0")).join(""),
    s: seats,
  };
  if (layout.groups && layout.numGroups && layout.numGroups > 0) {
    payload.g = layout.groups;
    payload.ng = layout.numGroups;
  }
  if (layout.columnGenders && Object.keys(layout.columnGenders).length > 0) {
    payload.cg = layout.columnGenders;
  }

  return PREFIX + toBase64(JSON.stringify(payload));
}

export type DecodedSeating = {
  layout: Layout;
  seats: SeatEntry[];
};

function isGender(v: unknown): v is Gender {
  return v === "M" || v === "F";
}
function isLevel(v: unknown): v is Level {
  return v === "상" || v === "중" || v === "하";
}

// 코드 문자열을 파싱. 형식이 잘못되면 한국어 메시지로 throw 한다.
export function decodeSeating(code: string): DecodedSeating {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) {
    throw new Error("자리 배치 코드 형식이 아니에요. 코드 전체를 붙여넣었는지 확인해주세요.");
  }
  let payload: Payload;
  try {
    payload = JSON.parse(fromBase64(trimmed.slice(PREFIX.length)));
  } catch {
    throw new Error("코드를 읽을 수 없어요. 복사 중 일부가 빠졌을 수 있어요.");
  }

  const { r, c, d, s } = payload;
  if (
    typeof r !== "number" ||
    typeof c !== "number" ||
    r < 1 ||
    c < 1 ||
    typeof d !== "string" ||
    d.length !== r * c ||
    !Array.isArray(s)
  ) {
    throw new Error("코드 내용이 올바르지 않아요.");
  }

  const cells = Array.from(d, (ch) => (ch === "1" ? "desk" : "empty")) as
    Layout["cells"];

  const layout: Layout = { rows: r, cols: c, cells };
  if (Array.isArray(payload.g) && payload.g.length === r * c && payload.ng) {
    layout.groups = payload.g;
    layout.numGroups = payload.ng;
  }
  if (payload.cg && typeof payload.cg === "object") {
    layout.columnGenders = payload.cg;
  }

  const seats: SeatEntry[] = [];
  const cellCount = r * c;
  for (const e of s) {
    if (
      !e ||
      typeof e.i !== "number" ||
      e.i < 0 ||
      e.i >= cellCount ||
      typeof e.n !== "string" ||
      !isGender(e.g) ||
      !isLevel(e.l) ||
      !isLevel(e.b)
    ) {
      throw new Error("코드 안의 학생 정보가 올바르지 않아요.");
    }
    seats.push({ i: e.i, n: e.n, g: e.g, l: e.l, b: e.b });
  }

  return { layout, seats };
}

export type AppliedSeating = {
  // 기존 명단을 보존하되(이름 일치 시 같은 학생 재사용), 코드에만 있는 학생은 추가.
  students: Student[];
  // seatIndex -> studentId
  seats: Record<number, string>;
};

// 디코딩 결과를 기존 명단과 맞춰 적용 가능한 형태로 변환한다.
// 이름으로 기존 학생을 재사용해 id/제약(앞뒤자리·사이나쁨·고정)을 유지하고,
// 코드에만 있는 이름은 새 학생으로 추가한다. 동명이인은 등장 순서대로 배정.
export function applyDecoded(
  decoded: DecodedSeating,
  existingStudents: Student[],
): AppliedSeating {
  const unusedByName = new Map<string, Student[]>();
  for (const st of existingStudents) {
    const q = unusedByName.get(st.name);
    if (q) q.push(st);
    else unusedByName.set(st.name, [st]);
  }

  const students = [...existingStudents];
  const seats: Record<number, string> = {};
  for (const e of decoded.seats) {
    const queue = unusedByName.get(e.n);
    let id: string;
    if (queue && queue.length > 0) {
      id = queue.shift()!.id;
    } else {
      const created: Student = {
        id: makeId(),
        name: e.n,
        gender: e.g,
        level: e.l,
        behavior: e.b,
      };
      students.push(created);
      id = created.id;
    }
    seats[e.i] = id;
  }

  return { students, seats };
}
