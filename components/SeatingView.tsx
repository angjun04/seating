"use client";

import { useEffect, useState } from "react";
import type { Arrangement, Layout, Student } from "@/lib/types";

type Props = {
  layout: Layout;
  students: Student[];
  arrangement: Arrangement | null;
  frontPriorityIds: string[];
  editable?: boolean;
  onSeatsChange?: (seats: Record<number, string>) => void;
};

export function SeatingView({
  layout,
  students,
  arrangement,
  frontPriorityIds,
  editable = false,
  onSeatsChange,
}: Props) {
  const nameById = new Map(students.map((s) => [s.id, s.name]));
  const front = new Set(frontPriorityIds);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (!editable) setSelected(null);
  }, [editable]);

  const onSeatClick = (idx: number) => {
    if (!editable || !arrangement || !onSeatsChange) return;
    if (selected === null) {
      // First click: select any desk (even empty desk).
      setSelected(idx);
      return;
    }
    if (selected === idx) {
      setSelected(null);
      return;
    }
    const next = { ...arrangement.seats };
    const a = next[selected];
    const b = next[idx];
    if (a === undefined && b === undefined) {
      setSelected(null);
      return;
    }
    if (a !== undefined) next[idx] = a;
    else delete next[idx];
    if (b !== undefined) next[selected] = b;
    else delete next[selected];
    onSeatsChange(next);
    setSelected(null);
  };

  return (
    <div>
      <div className="text-center text-xs text-gray-500 mb-1">
        ↑ 교실 앞 (칠판)
      </div>
      {editable && (
        <div className="text-center text-xs text-blue-600 mb-2">
          {selected === null
            ? "옮길 자리를 클릭하세요."
            : "바꿀 자리를 클릭하면 두 자리가 교환됩니다."}
        </div>
      )}
      <div
        className="inline-grid gap-2 p-3 bg-gray-50 border border-gray-300 rounded"
        style={{ gridTemplateColumns: `repeat(${layout.cols}, 5rem)` }}
      >
        {layout.cells.map((cell, idx) => {
          if (cell === "empty") {
            return (
              <div
                key={idx}
                className="w-20 h-16 border border-dashed border-gray-200"
              />
            );
          }
          const sid = arrangement?.seats[idx];
          const name = sid ? nameById.get(sid) : null;
          const isFront = sid ? front.has(sid) : false;
          const isSelected = editable && selected === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSeatClick(idx)}
              disabled={!editable}
              className={`w-20 h-16 border rounded flex items-center justify-center text-sm bg-white transition ${
                isSelected
                  ? "ring-2 ring-blue-500 border-blue-500"
                  : isFront
                    ? "border-amber-500 border-2"
                    : "border-gray-400"
              } ${
                editable
                  ? "cursor-pointer hover:bg-blue-50"
                  : "cursor-default"
              }`}
              title={isFront ? "앞자리 우선" : undefined}
            >
              {name ?? <span className="text-gray-300">빈자리</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
