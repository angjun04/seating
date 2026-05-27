"use client";

import { useState } from "react";
import {
  STUDENT_METRIC_LABEL,
  type IncompatiblePair,
  type Layout,
  type PinnedSeats,
  type Student,
  type StudentMetric,
} from "@/lib/types";

type Props = {
  students: Student[];
  layout: Layout | null;
  frontPriorityIds: string[];
  backPriorityIds: string[];
  incompatiblePairs: IncompatiblePair[];
  pinnedSeats: PinnedSeats;
  balanceMetric: StudentMetric;
  avoidLowLowSeatmates: boolean;
  onToggleFront: (id: string) => void;
  onToggleBack: (id: string) => void;
  onAddPair: (pair: IncompatiblePair) => void;
  onRemovePair: (index: number) => void;
  onSetPinnedSeat: (seatIndex: number, studentId: string) => void;
  onRemovePinnedSeat: (seatIndex: number) => void;
  onClearPinnedSeats: () => void;
  onSetAvoidLowLow: (v: boolean) => void;
};

export function ConstraintsEditor({
  students,
  layout,
  frontPriorityIds,
  backPriorityIds,
  incompatiblePairs,
  pinnedSeats,
  balanceMetric,
  avoidLowLowSeatmates,
  onToggleFront,
  onToggleBack,
  onAddPair,
  onRemovePair,
  onSetPinnedSeat,
  onRemovePinnedSeat,
  onClearPinnedSeats,
  onSetAvoidLowLow,
}: Props) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const front = new Set(frontPriorityIds);
  const back = new Set(backPriorityIds);

  const nameById = new Map(students.map((s) => [s.id, s.name]));
  const metricLabel = STUDENT_METRIC_LABEL[balanceMetric];

  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded p-3 bg-gray-50">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={avoidLowLowSeatmates}
            onChange={(e) => onSetAvoidLowLow(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="font-medium">
              {metricLabel} ‘하’ 학생끼리 짝꿍이 되지 않게
            </span>
            <span className="block text-xs text-gray-500">
              켜면 좌우로 붙은 두 자리에 ‘하’ 학생이 함께 앉지 않도록 배치합니다.
              ‘하’ 학생 수가 많으면 완전히 피하기 어려울 수 있어요.
            </span>
          </span>
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <PriorityList
          title="앞자리 우선 학생"
          hint="필요한 학생을 앞쪽 자리에 우선 배치합니다."
          students={students}
          checked={front}
          onToggle={onToggleFront}
          otherChecked={back}
          otherLabel="뒷자리"
        />
        <PriorityList
          title="맨 뒷자리 우선 학생"
          hint="키가 큰 학생 등을 뒤쪽 자리에 우선 배치해 시야 가림을 줄입니다."
          students={students}
          checked={back}
          onToggle={onToggleBack}
          otherChecked={front}
          otherLabel="앞자리"
        />
      </div>

      <div>
        <div className="text-sm font-medium mb-2">사이 안 좋은 학생 쌍</div>
        <div className="flex gap-2 mb-2 max-w-xl">
          <select
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="flex-1 border border-gray-300 rounded p-1 text-sm"
          >
            <option value="">학생 1</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="flex-1 border border-gray-300 rounded p-1 text-sm"
          >
            <option value="">학생 2</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!a || !b || a === b}
            onClick={() => {
              onAddPair([a, b]);
              setA("");
              setB("");
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:bg-gray-300"
          >
            추가
          </button>
        </div>
        <ul className="border border-gray-300 rounded p-2 max-h-56 overflow-auto space-y-1 max-w-xl">
          {incompatiblePairs.length === 0 && (
            <li className="text-xs text-gray-500">등록된 쌍 없음</li>
          )}
          {incompatiblePairs.map(([x, y], i) => (
            <li
              key={i}
              className="flex justify-between items-center text-sm bg-gray-50 px-2 py-1 rounded"
            >
              <span>
                {nameById.get(x) ?? "?"} ↔ {nameById.get(y) ?? "?"}
              </span>
              <button
                type="button"
                onClick={() => onRemovePair(i)}
                className="text-red-600 text-xs"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </div>

      <PinnedSeatsEditor
        layout={layout}
        students={students}
        pinnedSeats={pinnedSeats}
        onSetPinnedSeat={onSetPinnedSeat}
        onRemovePinnedSeat={onRemovePinnedSeat}
        onClearPinnedSeats={onClearPinnedSeats}
      />
    </div>
  );
}

function PriorityList({
  title,
  hint,
  students,
  checked,
  onToggle,
  otherChecked,
  otherLabel,
}: {
  title: string;
  hint: string;
  students: Student[];
  checked: Set<string>;
  onToggle: (id: string) => void;
  otherChecked: Set<string>;
  otherLabel: string;
}) {
  return (
    <div>
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="text-xs text-gray-500 mb-2">{hint}</div>
      <div className="border border-gray-300 rounded p-2 max-h-72 overflow-auto space-y-1">
        {students.length === 0 && (
          <div className="text-xs text-gray-500">먼저 학생을 입력하세요.</div>
        )}
        {students.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
          >
            <input
              type="checkbox"
              checked={checked.has(s.id)}
              onChange={() => onToggle(s.id)}
            />
            <span>{s.name}</span>
            {otherChecked.has(s.id) && (
              <span className="text-[10px] text-gray-400">({otherLabel} 우선)</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function PinnedSeatsEditor({
  layout,
  students,
  pinnedSeats,
  onSetPinnedSeat,
  onRemovePinnedSeat,
  onClearPinnedSeats,
}: {
  layout: Layout | null;
  students: Student[];
  pinnedSeats: PinnedSeats;
  onSetPinnedSeat: (seatIndex: number, studentId: string) => void;
  onRemovePinnedSeat: (seatIndex: number) => void;
  onClearPinnedSeats: () => void;
}) {
  const [selected, setSelected] = useState("");
  const nameById = new Map(students.map((s) => [s.id, s.name]));
  const pinEntries = Object.entries(pinnedSeats)
    .map(([k, v]) => [Number(k), v] as [number, string])
    .sort((p, q) => p[0] - q[0]);

  return (
    <div>
      <div className="text-sm font-medium mb-1">자리 고정 (사전 지정)</div>
      <div className="text-xs text-gray-500 mb-2">
        특정 학생을 정해진 자리에 미리 앉힙니다. 학생을 고른 뒤 자리를
        클릭하세요. 고정된 자리는 배치를 생성해도 바뀌지 않습니다.
      </div>

      {!layout ? (
        <div className="text-xs text-gray-500 border border-gray-300 rounded p-3">
          먼저 [책상 배치] 탭에서 교실을 만드세요.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="border border-gray-300 rounded p-1 text-sm"
            >
              <option value="">앉힐 학생 선택</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">
              {selected
                ? "→ 그리드에서 자리를 클릭하세요."
                : "학생을 선택하지 않고 고정된 자리를 클릭하면 고정이 해제됩니다."}
            </span>
            {pinEntries.length > 0 && (
              <button
                type="button"
                onClick={onClearPinnedSeats}
                className="ml-auto text-xs text-red-600 hover:text-red-800"
              >
                전체 해제
              </button>
            )}
          </div>

          <div className="flex flex-col items-center">
            <div className="text-xs text-gray-500 mb-1">↑ 교실 앞 (칠판)</div>
            <div
              className="grid gap-1 p-2 border border-gray-300 rounded bg-gray-50"
              style={{ gridTemplateColumns: `repeat(${layout.cols}, 3rem)` }}
            >
              {layout.cells.map((cell, idx) => {
                if (cell === "empty") {
                  return (
                    <div
                      key={idx}
                      className="w-12 h-12 border border-dashed border-gray-200 bg-gray-100"
                    />
                  );
                }
                const pinnedId = pinnedSeats[idx];
                const pinnedName = pinnedId ? nameById.get(pinnedId) : undefined;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        onSetPinnedSeat(idx, selected);
                        setSelected("");
                      } else if (pinnedId) {
                        onRemovePinnedSeat(idx);
                      }
                    }}
                    title={
                      pinnedName
                        ? `${pinnedName} 고정 — 클릭해 해제`
                        : selected
                          ? `${nameById.get(selected)} 여기에 고정`
                          : "학생을 먼저 선택하세요"
                    }
                    className={`w-12 h-12 border rounded flex items-center justify-center text-[10px] leading-tight px-0.5 text-center break-keep ${
                      pinnedName
                        ? "bg-indigo-100 border-indigo-400 text-indigo-800 font-medium"
                        : "bg-white border-gray-300 text-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {pinnedName ?? "·"}
                  </button>
                );
              })}
            </div>
          </div>

          {pinEntries.length > 0 && (
            <ul className="border border-gray-300 rounded p-2 max-h-40 overflow-auto space-y-1 max-w-xl">
              {pinEntries.map(([idx, sid]) => (
                <li
                  key={idx}
                  className="flex justify-between items-center text-sm bg-gray-50 px-2 py-1 rounded"
                >
                  <span>
                    {nameById.get(sid) ?? "?"} —{" "}
                    {Math.floor(idx / layout.cols) + 1}행{" "}
                    {(idx % layout.cols) + 1}열
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemovePinnedSeat(idx)}
                    className="text-red-600 text-xs"
                  >
                    해제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
