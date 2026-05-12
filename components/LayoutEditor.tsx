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

  const pickDims = (r: number, c: number) => {
    onChange({ rows: r, cols: c, cells: makeCells(r, c, value ?? undefined) });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium mb-2">
          1) 행 × 열 선택 (PPT 표처럼 호버 후 클릭)
        </div>
        <div
          className="inline-block border border-gray-300 p-1 bg-white"
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

      {hasLayout && (
        <div>
          <div className="text-sm font-medium mb-2">
            2) 책상이 없는 칸은 클릭해서 빈 칸으로 (앞쪽이 위)
          </div>
          <div className="text-xs text-gray-500 mb-2">↑ 교실 앞 (칠판)</div>
          <div
            className="inline-grid gap-1 p-2 border border-gray-300 bg-gray-50"
            style={{ gridTemplateColumns: `repeat(${layout.cols}, 2.5rem)` }}
          >
            {layout.cells.map((cell, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleCell(idx)}
                className={`w-10 h-10 border text-xs ${
                  cell === "desk"
                    ? "bg-white border-gray-400"
                    : "bg-gray-200 border-dashed border-gray-300 text-gray-400"
                }`}
              >
                {cell === "desk" ? "🪑" : "·"}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-2">
            책상: {layout.cells.filter((c) => c === "desk").length}개
          </div>
        </div>
      )}
    </div>
  );
}
