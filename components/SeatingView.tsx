"use client";

import { useEffect, useState } from "react";
import type { Arrangement, Layout, Level, Student } from "@/lib/types";
import { groupColor } from "./LayoutEditor";

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
  const byId = new Map(students.map((s) => [s.id, s]));
  const front = new Set(frontPriorityIds);
  const levelDot: Record<Level, string> = {
    상: "bg-emerald-500",
    중: "bg-amber-500",
    하: "bg-gray-400",
  };
  const [selected, setSelected] = useState<number | null>(null);
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    if (!editable) {
      setSelected(null);
      setDragSrc(null);
      setDragOver(null);
    }
  }, [editable]);

  const swapSeats = (a: number, b: number) => {
    if (!arrangement || !onSeatsChange) return;
    if (a === b) return;
    const next = { ...arrangement.seats };
    const sa = next[a];
    const sb = next[b];
    if (sa === undefined && sb === undefined) return;
    if (sa !== undefined) next[b] = sa;
    else delete next[b];
    if (sb !== undefined) next[a] = sb;
    else delete next[a];
    onSeatsChange(next);
  };

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
    swapSeats(selected, idx);
    setSelected(null);
  };

  const onDragStart = (idx: number, e: React.DragEvent<HTMLButtonElement>) => {
    if (!editable || !arrangement) return;
    // Only allow dragging desks that have a student (empty desks have nothing to move).
    if (arrangement.seats[idx] === undefined) {
      e.preventDefault();
      return;
    }
    setDragSrc(idx);
    setSelected(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const onDragOverSeat = (idx: number, e: React.DragEvent<HTMLButtonElement>) => {
    if (!editable || dragSrc === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== idx) setDragOver(idx);
  };

  const onDragLeaveSeat = (idx: number) => {
    if (dragOver === idx) setDragOver(null);
  };

  const onDropSeat = (idx: number, e: React.DragEvent<HTMLButtonElement>) => {
    if (!editable) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    const src = raw === "" ? dragSrc : Number(raw);
    if (src === null || Number.isNaN(src)) return;
    swapSeats(src, idx);
    setDragSrc(null);
    setDragOver(null);
  };

  const onDragEnd = () => {
    setDragSrc(null);
    setDragOver(null);
  };

  const boardWidth = `${layout.cols * 5 + (layout.cols - 1) * 0.5 + 1.5}rem`;
  return (
    <div className="flex flex-col items-center">
      <div
        className="bg-slate-800 text-slate-100 text-xs tracking-wide text-center rounded-md px-4 py-1.5 mb-2"
        style={{ minWidth: boardWidth }}
      >
        칠판 (교실 앞)
      </div>
      <div
        className="inline-grid gap-2 p-3 bg-gray-50 border border-gray-300 rounded-md"
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
          const student = sid ? byId.get(sid) : undefined;
          const isFront = sid ? front.has(sid) : false;
          const isSelected = editable && selected === idx;
          const isDragSrc = editable && dragSrc === idx;
          const isDragOver = editable && dragOver === idx && dragSrc !== idx;
          const g = layout.groups?.[idx] ?? 0;
          const gColor = g > 0 ? groupColor(g) : null;
          const genderBg = student
            ? student.gender === "F"
              ? "bg-rose-50"
              : "bg-sky-50"
            : "bg-white";
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSeatClick(idx)}
              disabled={!editable}
              draggable={editable && student !== undefined}
              onDragStart={(e) => onDragStart(idx, e)}
              onDragOver={(e) => onDragOverSeat(idx, e)}
              onDragLeave={() => onDragLeaveSeat(idx)}
              onDrop={(e) => onDropSeat(idx, e)}
              onDragEnd={onDragEnd}
              className={`relative w-20 h-16 border rounded flex items-center justify-center text-sm transition ${genderBg} ${
                isDragOver
                  ? "ring-2 ring-emerald-500 border-emerald-500"
                  : isSelected
                    ? "ring-2 ring-blue-500 border-blue-500"
                    : isFront
                      ? "border-amber-500 border-2"
                      : "border-gray-400"
              } ${isDragSrc ? "opacity-40" : ""} ${
                editable
                  ? student
                    ? "cursor-grab active:cursor-grabbing hover:brightness-95"
                    : "cursor-pointer hover:brightness-95"
                  : "cursor-default"
              }`}
              title={
                student
                  ? `${student.name} · ${student.gender === "M" ? "남" : "여"} · ${student.level}${isFront ? " · 앞자리 우선" : ""}`
                  : isFront
                    ? "앞자리 우선"
                    : undefined
              }
            >
              {gColor && (
                <span
                  className={`absolute top-1 left-1 text-[10px] font-bold px-1 rounded ${gColor.bg} ${gColor.text}`}
                  aria-label={`모둠 ${g}`}
                  title={`모둠 ${g}`}
                >
                  {g}
                </span>
              )}
              {student ? (
                <>
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ${levelDot[student.level]}`}
                    aria-label={`성적 ${student.level}`}
                  />
                  {student.name}
                </>
              ) : (
                <span className="text-gray-300">빈자리</span>
              )}
            </button>
          );
        })}
      </div>
      {editable && (
        <div className="text-xs text-blue-600 mt-2 text-center">
          학생을 끌어다 다른 자리에 놓으면 교환됩니다. 또는{" "}
          {selected === null
            ? "옮길 자리를 클릭하세요."
            : "바꿀 자리를 클릭하면 두 자리가 교환됩니다."}
        </div>
      )}
    </div>
  );
}
