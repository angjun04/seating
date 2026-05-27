"use client";

import { useEffect, useState } from "react";
import type { CellType, Layout } from "@/lib/types";

type Props = {
  value: Layout | null;
  onChange: (layout: Layout) => void;
};

const MAX_ROWS = 12;
const MAX_COLS = 12;

// Tailwind classes per group id (1-indexed). Wrap with modulo for >8 groups.
const GROUP_COLORS: Array<{ bg: string; border: string; text: string; chip: string }> = [
  { bg: "bg-rose-100", border: "border-rose-400", text: "text-rose-800", chip: "bg-rose-500" },
  { bg: "bg-sky-100", border: "border-sky-400", text: "text-sky-800", chip: "bg-sky-500" },
  { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-800", chip: "bg-emerald-500" },
  { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-800", chip: "bg-amber-500" },
  { bg: "bg-violet-100", border: "border-violet-400", text: "text-violet-800", chip: "bg-violet-500" },
  { bg: "bg-pink-100", border: "border-pink-400", text: "text-pink-800", chip: "bg-pink-500" },
  { bg: "bg-cyan-100", border: "border-cyan-400", text: "text-cyan-800", chip: "bg-cyan-500" },
  { bg: "bg-lime-100", border: "border-lime-400", text: "text-lime-800", chip: "bg-lime-500" },
];

export function groupColor(g: number) {
  if (g <= 0) return null;
  return GROUP_COLORS[(g - 1) % GROUP_COLORS.length];
}

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

function makeGroups(rows: number, cols: number, prev?: Layout): number[] {
  const out: number[] = new Array(rows * cols).fill(0);
  if (prev?.groups) {
    for (let r = 0; r < Math.min(rows, prev.rows); r++) {
      for (let c = 0; c < Math.min(cols, prev.cols); c++) {
        out[r * cols + c] = prev.groups[r * prev.cols + c] ?? 0;
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

function rectIndices(a: number, b: number, cols: number): number[] {
  const r1 = Math.floor(a / cols);
  const c1 = a % cols;
  const r2 = Math.floor(b / cols);
  const c2 = b % cols;
  const rs = Math.min(r1, r2);
  const re = Math.max(r1, r2);
  const cs = Math.min(c1, c2);
  const ce = Math.max(c1, c2);
  const out: number[] = [];
  for (let r = rs; r <= re; r++) {
    for (let c = cs; c <= ce; c++) out.push(r * cols + c);
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
    // If cell becomes empty, clear its group.
    let nextGroups = layout.groups?.slice();
    if (nextGroups && next[idx] === "empty") nextGroups[idx] = 0;
    onChange({ ...layout, cells: next, groups: nextGroups });
  };

  const toggleColumnAisle = (c: number) => {
    const next = layout.cells.slice();
    const target: CellType = isColumnAisle(layout, c) ? "desk" : "empty";
    const nextGroups = layout.groups?.slice();
    for (let r = 0; r < layout.rows; r++) {
      const idx = r * layout.cols + c;
      next[idx] = target;
      if (nextGroups && target === "empty") nextGroups[idx] = 0;
    }
    onChange({ ...layout, cells: next, groups: nextGroups });
  };

  const toggleRowAisle = (r: number) => {
    const next = layout.cells.slice();
    const target: CellType = isRowAisle(layout, r) ? "desk" : "empty";
    const nextGroups = layout.groups?.slice();
    for (let c = 0; c < layout.cols; c++) {
      const idx = r * layout.cols + c;
      next[idx] = target;
      if (nextGroups && target === "empty") nextGroups[idx] = 0;
    }
    onChange({ ...layout, cells: next, groups: nextGroups });
  };

  const pickDims = (r: number, c: number) => {
    onChange({
      rows: r,
      cols: c,
      cells: makeCells(r, c, value ?? undefined),
      groups: makeGroups(r, c, value ?? undefined),
      numGroups: value?.numGroups ?? 0,
    });
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
            2) 책상 없는 칸은 클릭해 비우고, 행·열 머리를 누르면 그 줄 전체가
            복도(자리 제외)가 됩니다
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
                        ? "이 열 전체가 복도예요 — 클릭하면 다시 책상"
                        : "이 열 전체를 복도(자리 제외)로"
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

      {hasLayout && (
        <GroupSection layout={layout as Layout} onChange={onChange} />
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
          aisle
            ? "이 행 전체가 복도예요 — 클릭하면 다시 책상"
            : "이 행 전체를 복도(자리 제외)로"
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

function GroupSection({
  layout,
  onChange,
}: {
  layout: Layout;
  onChange: (l: Layout) => void;
}) {
  const groups = layout.groups ?? new Array(layout.cells.length).fill(0);
  const numGroups = layout.numGroups ?? 0;
  const [active, setActive] = useState<number>(() => (numGroups > 0 ? 1 : 0));
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);

  // When numGroups grows or shrinks, keep `active` in a sensible range.
  useEffect(() => {
    if (numGroups === 0 && active !== 0) setActive(0);
    else if (active > numGroups) setActive(numGroups);
  }, [numGroups, active]);

  // Commit pending drag on pointerup anywhere.
  useEffect(() => {
    if (!drag) return;
    const onUp = () => {
      const indices = rectIndices(drag.start, drag.end, layout.cols);
      const nextGroups = groups.slice();
      let changed = false;
      for (const i of indices) {
        if (layout.cells[i] !== "desk") continue;
        if (nextGroups[i] !== active) {
          nextGroups[i] = active;
          changed = true;
        }
      }
      if (changed) {
        onChange({ ...layout, groups: nextGroups, numGroups });
      }
      setDrag(null);
    };
    document.addEventListener("pointerup", onUp);
    return () => document.removeEventListener("pointerup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, layout, active, numGroups]);

  const addGroup = () => {
    const n = numGroups + 1;
    onChange({ ...layout, groups, numGroups: n });
    setActive(n);
  };

  const removeLastGroup = () => {
    if (numGroups === 0) return;
    const target = numGroups;
    const nextGroups = groups.map((g) => (g === target ? 0 : g));
    const next = numGroups - 1;
    onChange({ ...layout, groups: nextGroups, numGroups: next });
    if (active === target) setActive(next > 0 ? next : 0);
  };

  const clearAll = () => {
    if (numGroups === 0) return;
    if (!confirm("모든 모둠 지정을 비울까요? (모둠 개수는 유지)")) return;
    const nextGroups = groups.map(() => 0);
    onChange({ ...layout, groups: nextGroups, numGroups });
  };

  const dragIndices = drag ? rectIndices(drag.start, drag.end, layout.cols) : null;
  const dragSet = dragIndices ? new Set(dragIndices) : null;

  // Count cells per group for the palette.
  const counts: number[] = new Array(numGroups + 1).fill(0);
  for (let i = 0; i < groups.length; i++) {
    if (layout.cells[i] === "desk") counts[groups[i]] = (counts[groups[i]] ?? 0) + 1;
  }

  return (
    <div>
      <div className="text-sm font-medium mb-2 text-center">
        3) 모둠 지정 — 활성 모둠 선택 후 책상 영역을 드래그
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap gap-1.5 items-center justify-center">
          {Array.from({ length: numGroups }).map((_, i) => {
            const g = i + 1;
            const color = groupColor(g)!;
            const isActive = active === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setActive(g)}
                className={`px-2.5 py-1 text-xs rounded border font-medium ${
                  color.bg
                } ${color.text} ${
                  isActive ? `${color.border} ring-2 ring-offset-1 ring-gray-400` : "border-transparent"
                }`}
                title={`모둠 ${g} (${counts[g] ?? 0}석)`}
              >
                모둠 {g}
                <span className="ml-1 text-[10px] opacity-70">{counts[g] ?? 0}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={addGroup}
            className="px-2.5 py-1 text-xs rounded border bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
          >
            + 모둠 추가
          </button>
          <button
            type="button"
            onClick={() => setActive(0)}
            className={`px-2.5 py-1 text-xs rounded border font-medium bg-white text-gray-700 ${
              active === 0 ? "border-gray-500 ring-2 ring-offset-1 ring-gray-400" : "border-gray-300"
            }`}
            title="지우개 — 드래그로 모둠 지정 해제"
          >
            지우개
          </button>
          <button
            type="button"
            onClick={removeLastGroup}
            disabled={numGroups === 0}
            className="px-2.5 py-1 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-40"
            title="마지막 모둠 삭제 (해당 칸은 모둠 없음으로 초기화)"
          >
            − 마지막 삭제
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={numGroups === 0}
            className="px-2.5 py-1 text-xs rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-40"
            title="모든 칸의 모둠 지정 해제"
          >
            전체 비우기
          </button>
        </div>

        {numGroups === 0 && (
          <div className="text-xs text-gray-500">
            먼저 + 모둠 추가로 모둠을 만들고, 책상 영역을 드래그하세요.
          </div>
        )}

        <div
          className="grid gap-1 p-2 border border-gray-300 rounded bg-gray-50 select-none touch-none"
          style={{ gridTemplateColumns: `repeat(${layout.cols}, 2.5rem)` }}
          onPointerLeave={() => {
            /* keep drag alive — commit happens on pointerup anywhere */
          }}
        >
          {layout.cells.map((cell, idx) => {
            if (cell === "empty") {
              return (
                <div
                  key={idx}
                  className="w-10 h-10 border border-dashed border-gray-300 bg-gray-100"
                />
              );
            }
            const g = groups[idx] ?? 0;
            const inDrag = dragSet?.has(idx) ?? false;
            const previewG = inDrag ? active : g;
            const color = previewG > 0 ? groupColor(previewG) : null;
            return (
              <button
                key={idx}
                type="button"
                onPointerDown={(e) => {
                  if (numGroups === 0 && active === 0) return;
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                  setDrag({ start: idx, end: idx });
                }}
                onPointerEnter={() => {
                  if (drag) setDrag({ ...drag, end: idx });
                }}
                className={`w-10 h-10 border text-[10px] flex items-center justify-center font-medium ${
                  color
                    ? `${color.bg} ${color.border} ${color.text}`
                    : "bg-white border-gray-300 text-gray-300"
                } ${inDrag ? "ring-2 ring-gray-700" : ""}`}
                aria-label={`${Math.floor(idx / layout.cols) + 1}행 ${
                  (idx % layout.cols) + 1
                }열${previewG > 0 ? ` 모둠 ${previewG}` : ""}`}
              >
                {previewG > 0 ? previewG : "·"}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-gray-500">
          모둠 미지정 책상:{" "}
          {layout.cells.filter((c, i) => c === "desk" && (groups[i] ?? 0) === 0).length}석
        </div>
      </div>
    </div>
  );
}
