"use client";

import { useState } from "react";
import type { CellType, Layout } from "@/lib/types";

type Props = {
  value: Layout | null;
  onChange: (layout: Layout) => void;
};

const MAX_ROWS = 12;
const MAX_COLS = 12;

function makeCells(rows: number, cols: number, prev?: Layout): CellType[] {
  const out: CellType[] = new Array(rows * cols).fill("desk");
  if (prev) {
    for (let r = 0; r < Math.min(rows, prev.rows); r++) {
      for (let c = 0; c < Math.min(cols, prev.cols); c++) {
        out[r * cols + c] = prev.cells[r * prev.cols + c];
      }
    }
  }
  return out;
}

function isColumnAisle(layout: Layout, c: number): boolean {
  for (let r = 0; r < layout.rows; r++) {
    if (layout.cells[r * layout.cols + c] !== "empty") return false;
  }
  return true;
}

function isRowAisle(layout: Layout, r: number): boolean {
  for (let c = 0; c < layout.cols; c++) {
    if (layout.cells[r * layout.cols + c] !== "empty") return false;
  }
  return true;
}

export function LayoutEditor({ value, onChange }: Props) {
  const [hoverDim, setHoverDim] = useState<{ r: number; c: number } | null>(
    null,
  );
  const layout = value ?? { rows: 0, cols: 0, cells: [] };
  const hasLayout = layout.rows > 0 && layout.cols > 0;

  const toggleCell = (idx: number) => {
    const next = layout.cells.slice();
    next[idx] = next[idx] === "desk" ? "empty" : "desk";
    onChange({ ...layout, cells: next });
  };

  const toggleColumnAisle = (c: number) => {
    const next = layout.cells.slice();
    const target: CellType = isColumnAisle(layout, c) ? "desk" : "empty";
    for (let r = 0; r < layout.rows; r++) {
      next[r * layout.cols + c] = target;
    }
    onChange({ ...layout, cells: next });
  };

  const toggleRowAisle = (r: number) => {
    const next = layout.cells.slice();
    const target: CellType = isRowAisle(layout, r) ? "desk" : "empty";
    for (let c = 0; c < layout.cols; c++) {
      next[r * layout.cols + c] = target;
    }
    onChange({ ...layout, cells: next });
  };

  const pickDims = (r: number, c: number) => {
    onChange({ rows: r, cols: c, cells: makeCells(r, c, value ?? undefined) });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium mb-2 text-center">
          1) 행 × 열 선택 (PPT 표처럼 호버 후 클릭)
        </div>
        <div className="flex flex-col items-center">
          <div
            className="inline-block border border-gray-300 rounded p-1 bg-white"
            onMouseLeave={() => setHoverDim(null)}
          >
            {Array.from({ length: MAX_ROWS }).map((_, r) => (
              <div key={r} className="flex">
                {Array.from({ length: MAX_COLS }).map((_, c) => {
                  const within =
                    hoverDim !== null && r <= hoverDim.r && c <= hoverDim.c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onMouseEnter={() => setHoverDim({ r, c })}
                      onClick={() => pickDims(r + 1, c + 1)}
                      className={`w-5 h-5 m-0.5 border ${
                        within
                          ? "bg-blue-400 border-blue-600"
                          : "bg-gray-50 border-gray-300"
                      }`}
                      aria-label={`${r + 1}행 ${c + 1}열`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {hoverDim
              ? `${hoverDim.r + 1} × ${hoverDim.c + 1}`
              : hasLayout
                ? `현재: ${layout.rows} × ${layout.cols}`
                : "표 크기를 선택하세요"}
          </div>
        </div>
      </div>

      {hasLayout && (
        <div>
          <div className="text-sm font-medium mb-2 text-center">
            2) 책상이 없는 칸은 클릭, 행/열 머리는 통째로 복도 토글
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xs text-gray-500 mb-2">↑ 교실 앞 (칠판)</div>
            <div
              className="grid gap-1 p-2 border border-gray-300 rounded bg-gray-50"
              style={{
                gridTemplateColumns: `2rem repeat(${layout.cols}, 2.5rem)`,
                gridTemplateRows: `1.5rem repeat(${layout.rows}, 2.5rem)`,
              }}
            >
              <div />
              {Array.from({ length: layout.cols }).map((_, c) => {
                const aisle = isColumnAisle(layout, c);
                return (
                  <button
                    key={`col-${c}`}
                    type="button"
                    onClick={() => toggleColumnAisle(c)}
                    title={
                      aisle
                        ? "이 열 전체 복도 — 클릭해 책상으로"
                        : "이 열 전체를 복도로"
                    }
                    className={`h-6 text-[10px] rounded border ${
                      aisle
                        ? "bg-amber-100 border-amber-400 text-amber-700"
                        : "bg-white border-gray-300 text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    {aisle ? "복도" : "↓"}
                  </button>
                );
              })}

              {Array.from({ length: layout.rows }).map((_, r) => (
                <RowGroup
                  key={`row-${r}`}
                  r={r}
                  layout={layout}
                  onToggleRow={toggleRowAisle}
                  onToggleCell={toggleCell}
                />
              ))}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              책상: {layout.cells.filter((c) => c === "desk").length}개
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RowGroup({
  r,
  layout,
  onToggleRow,
  onToggleCell,
}: {
  r: number;
  layout: Layout;
  onToggleRow: (r: number) => void;
  onToggleCell: (idx: number) => void;
}) {
  const aisle = isRowAisle(layout, r);
  return (
    <>
      <button
        type="button"
        onClick={() => onToggleRow(r)}
        title={
          aisle ? "이 행 전체 복도 — 클릭해 책상으로" : "이 행 전체를 복도로"
        }
        className={`w-8 text-[10px] rounded border ${
          aisle
            ? "bg-amber-100 border-amber-400 text-amber-700"
            : "bg-white border-gray-300 text-gray-400 hover:bg-gray-100"
        }`}
      >
        {aisle ? "복도" : "→"}
      </button>
      {Array.from({ length: layout.cols }).map((_, c) => {
        const idx = r * layout.cols + c;
        const cell = layout.cells[idx];
        return (
          <button
            key={c}
            type="button"
            onClick={() => onToggleCell(idx)}
            className={`w-10 h-10 border text-xs ${
              cell === "desk"
                ? "bg-white border-gray-400"
                : "bg-gray-200 border-dashed border-gray-300 text-gray-400"
            }`}
          >
            {cell === "desk" ? "🪑" : "·"}
          </button>
        );
      })}
    </>
  );
}
