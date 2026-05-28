"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GENDERS,
  GENDER_LABEL,
  LEVELS,
  STUDENT_METRIC_LABEL,
  type Gender,
  type Level,
  type Student,
  type StudentMetric,
} from "@/lib/types";

type Props = {
  value: Student[];
  onChange: (next: Student[]) => void;
  useLevel: boolean;
  useBehavior: boolean;
  balanceMetric: StudentMetric;
  onSetUseLevel: (v: boolean) => void;
  onSetUseBehavior: (v: boolean) => void;
  onSetBalanceMetric: (m: StudentMetric) => void;
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

type Parsed = {
  name: string;
  gender: Gender;
  level: Level;
  behavior: Level;
};

function parseToken(token: string): { gender?: Gender; level?: Level } {
  const t = token.trim();
  if (t === "남" || t === "M" || t === "m") return { gender: "M" };
  if (t === "여" || t === "F" || t === "f") return { gender: "F" };
  if (t === "상" || t === "중" || t === "하") return { level: t as Level };
  return {};
}

// 한 줄 포맷: "이름 성별 성적 생활태도".
// 상/중/하 토큰을 등장 순서대로 모아, 1개면 성적·생활태도 모두 그 값으로 맞춘다.
function parseLine(line: string): Parsed | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  const name = parts[0];
  if (!name) return null;
  let gender: Gender = "M";
  const levels: Level[] = [];
  for (const p of parts.slice(1)) {
    const r = parseToken(p);
    if (r.gender) gender = r.gender;
    if (r.level) levels.push(r.level);
  }
  const level: Level = levels[0] ?? "상";
  const behavior: Level = levels[1] ?? level;
  return { name, gender, level, behavior };
}

function parseStudents(text: string): Parsed[] {
  return text
    .split(/[\n,]+/)
    .map(parseLine)
    .filter((x): x is Parsed => x !== null);
}

function studentsToText(students: Student[]): string {
  return students
    .map((s) => {
      const behavior = s.behavior ?? s.level;
      // 두 값이 같으면 하나만 적어 1-토큰 규칙으로 라운드트립되게 한다.
      return behavior === s.level
        ? `${s.name} ${GENDER_LABEL[s.gender]} ${s.level}`
        : `${s.name} ${GENDER_LABEL[s.gender]} ${s.level} ${behavior}`;
    })
    .join("\n");
}

function cycle<T>(arr: readonly T[], current: T, step: 1 | -1): T {
  const i = arr.indexOf(current);
  const len = arr.length;
  return arr[(i + step + len) % len];
}

// 성적/생활태도는 둘 다 같은 상/중/하 척도지만, 한눈에 구분되도록 색을 달리한다.
function levelClass(l: Level): string {
  return l === "상"
    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
    : l === "중"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-gray-200 text-gray-700 border-gray-400";
}

function behaviorClass(l: Level): string {
  return l === "상"
    ? "bg-teal-100 text-teal-800 border-teal-300"
    : l === "중"
      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
      : "bg-stone-200 text-stone-700 border-stone-400";
}

export function StudentsEditor({
  value,
  onChange,
  useLevel,
  useBehavior,
  balanceMetric,
  onSetUseLevel,
  onSetUseBehavior,
  onSetBalanceMetric,
}: Props) {
  const [text, setText] = useState(() => studentsToText(value));

  useEffect(() => {
    setText(studentsToText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const parsedCount = useMemo(() => parseStudents(text).length, [text]);

  // Chip columns rendered per row, in order. Gender is always shown; 성적/생활태도
  // depend on which metrics the teacher enabled.
  const chipCols = useMemo(() => {
    const cols: Array<"gender" | "level" | "behavior"> = ["gender"];
    if (useLevel) cols.push("level");
    if (useBehavior) cols.push("behavior");
    return cols;
  }, [useLevel, useBehavior]);

  const commitText = (raw: string) => {
    const parsed = parseStudents(raw);
    const byName = new Map(value.map((s) => [s.name, s]));
    const next: Student[] = parsed.map((p) => {
      const existing = byName.get(p.name);
      return existing
        ? {
            ...existing,
            name: p.name,
            gender: p.gender,
            level: p.level,
            behavior: p.behavior,
          }
        : {
            id: makeId(),
            name: p.name,
            gender: p.gender,
            level: p.level,
            behavior: p.behavior,
          };
    });
    onChange(next);
  };

  const updateStudent = (id: string, patch: Partial<Student>) => {
    onChange(value.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const bothOn = useLevel && useBehavior;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="border border-gray-200 rounded p-3 bg-gray-50 space-y-2">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-gray-600">사용 지표:</span>
          <MetricToggle
            label="성적"
            on={useLevel}
            // 마지막 하나는 끄지 못하게 막는다.
            disabled={useLevel && !useBehavior}
            onClick={() => onSetUseLevel(!useLevel)}
          />
          <MetricToggle
            label="생활태도"
            on={useBehavior}
            disabled={useBehavior && !useLevel}
            onClick={() => onSetUseBehavior(!useBehavior)}
          />
        </div>
        {bothOn && (
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-gray-600">배치 기준:</span>
            <div
              role="radiogroup"
              aria-label="배치 기준 지표"
              className="inline-flex rounded-md border border-gray-300 overflow-hidden"
            >
              {(["level", "behavior"] as StudentMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={balanceMetric === m}
                  onClick={() => onSetBalanceMetric(m)}
                  className={`px-3 py-1 text-sm border-l first:border-l-0 border-gray-300 ${
                    balanceMetric === m
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {STUDENT_METRIC_LABEL[m]}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              모둠 균형·짝꿍 제한에 사용할 지표입니다.
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">
          학생 입력 (한 줄에 &quot;이름 성별 성적 생활태도&quot;, 줄바꿈 또는
          쉼표로 구분)
        </div>
        <textarea
          className="w-full h-48 border border-gray-300 rounded p-2 font-mono text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commitText(e.target.value)}
          placeholder={"김영준 남 상 중\n홍길동 여 중"}
        />
        <div className="text-xs text-gray-600">
          총 {parsedCount}명 · 포커스 해제 시 저장 · 상/중/하를 하나만 적으면
          성적·생활태도 모두 그 값으로 적용 (예: &quot;김영준 남 중&quot; → 성적·생활태도 모두 중)
        </div>
      </div>

      {value.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            명단 (칩 클릭 또는 ←↑↓→ 이동 · Enter 로 변경)
          </div>
          <div className="border border-gray-300 rounded divide-y divide-gray-200">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 bg-gray-50">
              <div className="flex-1">이름</div>
              <div className="w-14 text-center">성별</div>
              {useLevel && <div className="w-14 text-center">성적</div>}
              {useBehavior && <div className="w-14 text-center">생활태도</div>}
            </div>
            {value.map((s, row) => (
              <div
                key={s.id}
                className="flex items-center gap-2 px-3 py-1.5"
              >
                <div className="flex-1 text-sm">{s.name}</div>
                {chipCols.map((kind, col) => {
                  const colCount = chipCols.length;
                  if (kind === "gender") {
                    return (
                      <CycleChip
                        key="gender"
                        row={row}
                        col={col}
                        colCount={colCount}
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
                    );
                  }
                  if (kind === "level") {
                    return (
                      <CycleChip
                        key="level"
                        row={row}
                        col={col}
                        colCount={colCount}
                        rowCount={value.length}
                        options={LEVELS}
                        value={s.level}
                        getLabel={(l) => l}
                        getClass={levelClass}
                        onChange={(l) => updateStudent(s.id, { level: l })}
                        ariaLabel={`${s.name} 성적`}
                      />
                    );
                  }
                  return (
                    <CycleChip
                      key="behavior"
                      row={row}
                      col={col}
                      colCount={colCount}
                      rowCount={value.length}
                      options={LEVELS}
                      value={s.behavior ?? "중"}
                      getLabel={(l) => l}
                      getClass={behaviorClass}
                      onChange={(l) => updateStudent(s.id, { behavior: l })}
                      ariaLabel={`${s.name} 생활태도`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricToggle({
  label,
  on,
  disabled,
  onClick,
}: {
  label: string;
  on: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded-full border font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${
        on
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
      }`}
      title={disabled ? "최소 한 가지 지표는 사용해야 합니다." : undefined}
    >
      {on ? "✓ " : ""}
      {label}
    </button>
  );
}

function focusChip(row: number, col: number) {
  const el = document.querySelector<HTMLButtonElement>(
    `[data-chip="${row}-${col}"]`,
  );
  el?.focus();
}

function CycleChip<T extends string>({
  row,
  col,
  colCount,
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
  colCount: number;
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
        focusChip(row, (col + 1) % colCount);
        return;
      case "ArrowLeft":
        e.preventDefault();
        focusChip(row, (col - 1 + colCount) % colCount);
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
      className={`w-14 px-2 py-0.5 text-xs rounded-full border font-medium hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-blue-400 ${getClass(value)}`}
    >
      {getLabel(value)}
    </button>
  );
}
