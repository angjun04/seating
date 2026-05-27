"use client";

import { useEffect, useMemo, useState } from "react";
import type { Arrangement, Layout, Student } from "@/lib/types";
import { groupColor } from "./LayoutEditor";

type Props = {
  layout: Layout;
  students: Student[];
  arrangement: Arrangement | null;
  frontPriorityIds: string[];
  editable?: boolean;
  onSeatsChange?: (seats: Record<number, string>) => void;
};

// A column/row is an "aisle" (복도) when every cell in it is empty. These get
// drawn as a thin gap so 분단 (desk blocks) read as clearly separated.
function computeAisles(layout: Layout) {
  const { rows, cols, cells } = layout;
  const colAisle: boolean[] = [];
  for (let c = 0; c < cols; c++) {
    let all = true;
    for (let r = 0; r < rows; r++) {
      if (cells[r * cols + c] !== "empty") {
        all = false;
        break;
      }
    }
    colAisle.push(all);
  }
  const rowAisle: boolean[] = [];
  for (let r = 0; r < rows; r++) {
    let all = true;
    for (let c = 0; c < cols; c++) {
      if (cells[r * cols + c] !== "empty") {
        all = false;
        break;
      }
    }
    rowAisle.push(all);
  }
  return { colAisle, rowAisle };
}

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

  const { colAisle, rowAisle } = useMemo(() => computeAisles(layout), [layout]);

  // Contiguous blocks of non-aisle columns become labelled 분단 (only shown
  // when an aisle actually splits the room into 2+ blocks).
  const blocks = useMemo(() => {
    const out: Array<{ start: number; span: number }> = [];
    let c = 0;
    while (c < layout.cols) {
      if (colAisle[c]) {
        c++;
        continue;
      }
      const start = c;
      while (c < layout.cols && !colAisle[c]) c++;
      out.push({ start, span: c - start });
    }
    return out;
  }, [colAisle, layout.cols]);
  const showBunlabels = blocks.length >= 2;

  const colTemplate = colAisle
    .map((a) => (a ? "1rem" : "5rem"))
    .join(" ");
  const rowTemplate = rowAisle
    .map((a) => (a ? "0.75rem" : "4rem"))
    .join(" ");

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

  return (
    <div className="flex flex-col items-center">
      <div className="inline-block">
        <div className="bg-slate-800 text-slate-100 text-xs tracking-wide text-center rounded-md px-4 py-1.5 mb-2 w-full">
          칠판 (교실 앞)
        </div>

        {showBunlabels && (
          <div
            className="grid gap-2 px-3 mb-1"
            style={{ gridTemplateColumns: colTemplate }}
          >
            {(() => {
              const items: React.ReactNode[] = [];
              let bun = 0;
              let c = 0;
              while (c < layout.cols) {
                if (colAisle[c]) {
                  items.push(<div key={`gap-${c}`} />);
                  c++;
                  continue;
                }
                const span = blocks[bun].span;
                bun++;
                items.push(
                  <div
                    key={`bun-${c}`}
                    className="text-[11px] font-medium text-gray-500 text-center"
                    style={{ gridColumn: `span ${span}` }}
                  >
                    {bun}분단
                  </div>,
                );
                c += span;
              }
              return items;
            })()}
          </div>
        )}

        <div
          className="grid gap-2 p-3 bg-gray-50 border border-gray-300 rounded-md"
          style={{
            gridTemplateColumns: colTemplate,
            gridTemplateRows: rowTemplate,
          }}
        >
          {layout.cells.map((cell, idx) => {
            const c = idx % layout.cols;
            const r = Math.floor(idx / layout.cols);
            const isAisle = colAisle[c] || rowAisle[r];
            if (cell === "empty") {
              if (isAisle) {
                // Thin divider that visually separates 분단 / front-back blocks.
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-center w-full h-full"
                    aria-hidden
                  >
                    {colAisle[c] ? (
                      <div className="w-px h-full bg-gray-300" />
                    ) : (
                      <div className="h-px w-full bg-gray-300" />
                    )}
                  </div>
                );
              }
              return (
                <div
                  key={idx}
                  className="w-full h-full border border-dashed border-gray-200"
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
                className={`relative w-full h-full border rounded flex items-center justify-center text-sm transition ${genderBg} ${
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
                    ? `${student.name} · ${student.gender === "M" ? "남" : "여"}${isFront ? " · 앞자리 우선" : ""}`
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
                  student.name
                ) : (
                  <span className="text-gray-300">빈자리</span>
                )}
              </button>
            );
          })}
        </div>
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
