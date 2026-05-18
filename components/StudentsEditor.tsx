"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GENDERS,
  GENDER_LABEL,
  LEVELS,
  type Gender,
  type Level,
  type Student,
} from "@/lib/types";

type Props = {
  value: Student[];
  onChange: (next: Student[]) => void;
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

type Parsed = { name: string; gender: Gender; level: Level };

function parseToken(token: string): { gender?: Gender; level?: Level } {
  const t = token.trim();
  if (t === "남" || t === "M" || t === "m") return { gender: "M" };
  if (t === "여" || t === "F" || t === "f") return { gender: "F" };
  if (t === "상" || t === "중" || t === "하") return { level: t as Level };
  return {};
}

function parseLine(line: string): Parsed | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  const name = parts[0];
  if (!name) return null;
  let gender: Gender = "M";
  let level: Level = "상";
  for (const p of parts.slice(1)) {
    const r = parseToken(p);
    if (r.gender) gender = r.gender;
    if (r.level) level = r.level;
  }
  return { name, gender, level };
}

function parseStudents(text: string): Parsed[] {
  return text
    .split(/[\n,]+/)
    .map(parseLine)
    .filter((x): x is Parsed => x !== null);
}

function studentsToText(students: Student[]): string {
  return students
    .map((s) => `${s.name} ${GENDER_LABEL[s.gender]} ${s.level}`)
    .join("\n");
}

function cycle<T>(arr: readonly T[], current: T, step: 1 | -1): T {
  const i = arr.indexOf(current);
  const len = arr.length;
  return arr[(i + step + len) % len];
}

export function StudentsEditor({ value, onChange }: Props) {
  const [text, setText] = useState(() => studentsToText(value));

  useEffect(() => {
    setText(studentsToText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const parsedCount = useMemo(() => parseStudents(text).length, [text]);

  const commitText = (raw: string) => {
    const parsed = parseStudents(raw);
    const byName = new Map(value.map((s) => [s.name, s]));
    const next: Student[] = parsed.map((p) => {
      const existing = byName.get(p.name);
      return existing
        ? { ...existing, name: p.name, gender: p.gender, level: p.level }
        : { id: makeId(), name: p.name, gender: p.gender, level: p.level };
    });
    onChange(next);
  };

  const updateStudent = (id: string, patch: Partial<Student>) => {
    onChange(value.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="space-y-2">
        <div className="text-sm font-medium">
          학생 입력 (한 줄에 "이름 성별 성적", 줄바꿈 또는 쉼표로 구분)
        </div>
        <textarea
          className="w-full h-48 border border-gray-300 rounded p-2 font-mono text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commitText(e.target.value)}
          placeholder={"김영준 남 상\n김은희 여 중\n홍길동"}
        />
        <div className="text-xs text-gray-600">
          총 {parsedCount}명 (포커스 해제 시 저장 · 성별/성적 생략 시 남·상으로
          기본값)
        </div>
      </div>

      {value.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            명단 (칩 클릭 또는 ←↑↓→ 이동 · Enter 로 변경)
          </div>
          <div className="border border-gray-300 rounded divide-y divide-gray-200">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 text-xs text-gray-500 bg-gray-50">
              <div>이름</div>
              <div className="w-14 text-center">성별</div>
              <div className="w-20 text-center">성적</div>
            </div>
            {value.map((s, row) => (
              <div
                key={s.id}
                className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 items-center"
              >
                <div className="text-sm">{s.name}</div>
                <CycleChip
                  row={row}
                  col={0}
                  rowCount={value.length}
                  options={GENDERS}
                  value={s.gender}
                  getLabel={(g) => GENDER_LABEL[g]}
                  getClass={(g) =>
                    g === "M"
                      ? "bg-sky-100 text-sky-800 border-sky-300"
                      : "bg-rose-100 text-rose-800 border-rose-300"
                  }
                  onChange={(g) => updateStudent(s.id, { gender: g })}
                  ariaLabel={`${s.name} 성별`}
                />
                <CycleChip
                  row={row}
                  col={1}
                  rowCount={value.length}
                  options={LEVELS}
                  value={s.level}
                  getLabel={(l) => l}
                  getClass={(l) =>
                    l === "상"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : l === "중"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-gray-200 text-gray-700 border-gray-400"
                  }
                  onChange={(l) => updateStudent(s.id, { level: l })}
                  ariaLabel={`${s.name} 성적`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const CHIP_COL_COUNT = 2;

function focusChip(row: number, col: number) {
  const el = document.querySelector<HTMLButtonElement>(
    `[data-chip="${row}-${col}"]`,
  );
  el?.focus();
}

function CycleChip<T extends string>({
  row,
  col,
  rowCount,
  options,
  value,
  getLabel,
  getClass,
  onChange,
  ariaLabel,
}: {
  row: number;
  col: number;
  rowCount: number;
  options: readonly T[];
  value: T;
  getLabel: (v: T) => string;
  getClass: (v: T) => string;
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        onChange(cycle(options, value, 1));
        return;
      case "ArrowRight":
        e.preventDefault();
        focusChip(row, (col + 1) % CHIP_COL_COUNT);
        return;
      case "ArrowLeft":
        e.preventDefault();
        focusChip(row, (col - 1 + CHIP_COL_COUNT) % CHIP_COL_COUNT);
        return;
      case "ArrowDown":
        e.preventDefault();
        focusChip((row + 1) % rowCount, col);
        return;
      case "ArrowUp":
        e.preventDefault();
        focusChip((row - 1 + rowCount) % rowCount, col);
        return;
    }
  };
  return (
    <button
      type="button"
      data-chip={`${row}-${col}`}
      onClick={() => onChange(cycle(options, value, 1))}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      className={`min-w-[2.75rem] px-2 py-0.5 text-xs rounded-full border font-medium hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-blue-400 ${getClass(value)}`}
    >
      {getLabel(value)}
    </button>
  );
}
