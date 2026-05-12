"use client";

import { useState } from "react";
import type { IncompatiblePair, Student } from "@/lib/types";

type Props = {
  students: Student[];
  frontPriorityIds: string[];
  incompatiblePairs: IncompatiblePair[];
  onToggleFront: (id: string) => void;
  onAddPair: (pair: IncompatiblePair) => void;
  onRemovePair: (index: number) => void;
};

export function ConstraintsEditor({
  students,
  frontPriorityIds,
  incompatiblePairs,
  onToggleFront,
  onAddPair,
  onRemovePair,
}: Props) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const front = new Set(frontPriorityIds);

  const nameById = new Map(students.map((s) => [s.id, s.name]));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="text-sm font-medium mb-2">앞자리 우선 학생</div>
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
                checked={front.has(s.id)}
                onChange={() => onToggleFront(s.id)}
              />
              <span>{s.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">사이 안 좋은 학생 쌍</div>
        <div className="flex gap-2 mb-2">
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
        <ul className="border border-gray-300 rounded p-2 max-h-56 overflow-auto space-y-1">
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
    </div>
  );
}
