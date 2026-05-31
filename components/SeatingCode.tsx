"use client";

import { useMemo, useState } from "react";
import type { Arrangement, Layout, Student } from "@/lib/types";
import {
  applyDecoded,
  decodeSeating,
  encodeSeating,
} from "@/lib/seatingCode";

type Props = {
  layout: Layout;
  students: Student[];
  current: Arrangement | null;
  // 코드 적용 시 상위에서 layout/students/current 를 한 번에 갱신한다.
  onImport: (
    layout: Layout,
    students: Student[],
    seats: Record<number, string>,
  ) => void;
};

export function SeatingCode({ layout, students, current, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const code = useMemo(
    () => encodeSeating(layout, students, current),
    [layout, students, current],
  );

  const onCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없을 때 — 직접 선택해 복사하도록 안내.
      setError("자동 복사가 막혀 있어요. 코드를 길게 눌러 직접 복사해주세요.");
    }
  };

  const onApply = () => {
    setError(null);
    setSuccess(null);
    try {
      const decoded = decodeSeating(pasteText);
      const { students: nextStudents, seats } = applyDecoded(decoded, students);
      const added = nextStudents.length - students.length;
      onImport(decoded.layout, nextStudents, seats);
      const seatCount = Object.keys(seats).length;
      setSuccess(
        `자리 배치를 불러왔어요. ${seatCount}명 배치됨` +
          (added > 0 ? ` · 명단에 없던 ${added}명 추가됨` : ""),
      );
      setPasteText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "코드를 불러오지 못했어요.");
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
        aria-expanded={open}
      >
        <span className="font-medium">📋 자리 배치 코드로 저장·불러오기</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-5 text-sm">
          <p className="text-xs text-gray-500">
            현재 배치를 긴 코드로 저장해 두면, 나중에 그 코드를 붙여넣어 똑같은
            배치를 다시 만들 수 있어요. 후보 배치를 여러 개 보관할 때 쓰세요.
          </p>

          {/* 내보내기 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">
                지금 배치를 코드로
              </span>
              <button
                type="button"
                onClick={onCopy}
                disabled={!code}
                className="px-3 py-1 rounded border border-blue-400 text-blue-700 bg-white hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 text-xs"
              >
                {copied ? "복사됨!" : "코드 복사"}
              </button>
            </div>
            {code ? (
              <textarea
                readOnly
                value={code}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full h-24 border border-gray-300 rounded p-2 font-mono text-xs text-gray-600 bg-gray-50 resize-none"
              />
            ) : (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                먼저 배치를 생성해야 코드를 만들 수 있어요.
              </div>
            )}
          </div>

          {/* 불러오기 */}
          <div className="space-y-2">
            <span className="font-medium text-gray-700">코드 붙여넣어 불러오기</span>
            <textarea
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              placeholder="SEAT1. 으로 시작하는 코드를 붙여넣으세요"
              className="w-full h-24 border border-gray-300 rounded p-2 font-mono text-xs resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onApply}
                disabled={!pasteText.trim()}
                className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300"
              >
                이 배치로 만들기
              </button>
              <span className="text-xs text-gray-400">
                현재 책상 배치와 자리가 코드 내용으로 바뀝니다.
              </span>
            </div>
            {error && <div className="text-xs text-red-600">{error}</div>}
            {success && <div className="text-xs text-emerald-700">{success}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
