"use client";

import { useEffect, useState } from "react";
import { useSeatingStore } from "@/lib/store";
import {
  generateArrangement,
  seedArrangementFromStudentOrder,
} from "@/lib/arrangement";
import { LayoutEditor } from "@/components/LayoutEditor";
import { StudentsEditor } from "@/components/StudentsEditor";
import { ConstraintsEditor } from "@/components/ConstraintsEditor";
import { SeatingView } from "@/components/SeatingView";

type Tab = "arrange" | "layout" | "students" | "constraints";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("arrange");
  const [warning, setWarning] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const {
    layout,
    students,
    frontPriorityIds,
    incompatiblePairs,
    current,
    setLayout,
    setStudents,
    toggleFrontPriority,
    addIncompatiblePair,
    removeIncompatiblePair,
    setCurrent,
    pushHistory,
    resetAll,
  } = useSeatingStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initial tab choice — runs once after mount based on current data.
  // Do NOT depend on layout/students.length, or editing them would steal focus.
  useEffect(() => {
    if (!mounted) return;
    const { layout: l, students: s } = useSeatingStore.getState();
    if (!l) setTab("layout");
    else if (s.length === 0) setTab("students");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="p-8 text-sm text-gray-500">로딩중...</div>
    );
  }

  const deskCount = layout?.cells.filter((c) => c === "desk").length ?? 0;
  const canArrange =
    layout !== null && students.length > 0 && students.length <= deskCount;

  const onGenerate = () => {
    setWarning(null);
    setEditing(false);
    if (!layout) return;
    const result = generateArrangement(
      layout,
      students,
      frontPriorityIds,
      incompatiblePairs,
      current,
    );
    setCurrent(result.arrangement);
    pushHistory(result.arrangement);
    if (!result.satisfiesIncompatible) {
      setWarning(
        "사이 안 좋은 쌍을 모두 떨어뜨리는 배치를 찾지 못해 가장 가까운 결과를 보여줍니다.",
      );
    } else if (result.difference < 0.3 && current) {
      setWarning(
        `이전 배치와 ${Math.round(result.difference * 100)}%만 달라요. 학생/제약이 적으면 변동이 작을 수 있습니다.`,
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">교실 자리 배치</h1>
          <button
            type="button"
            onClick={() => {
              if (confirm("저장된 모든 데이터를 지울까요?")) resetAll();
            }}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            전체 초기화
          </button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 text-sm">
          {[
            { id: "arrange", label: "배치" },
            { id: "layout", label: "책상 배치" },
            { id: "students", label: "학생" },
            { id: "constraints", label: "제약 조건" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as Tab)}
              className={`px-3 py-2 border-b-2 ${
                tab === t.id
                  ? "border-blue-600 text-blue-600 font-medium"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === "arrange" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={onGenerate}
                disabled={!canArrange}
                className="px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:bg-gray-300"
              >
                새 배치 생성
              </button>
              <div className="text-sm text-gray-600">
                학생 {students.length}명 / 책상 {deskCount}석
              </div>
            </div>
            {!canArrange && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                {!layout
                  ? "먼저 [책상 배치] 탭에서 교실을 만드세요."
                  : students.length === 0
                    ? "[학생] 탭에서 학생 이름을 입력하세요."
                    : `책상(${deskCount})보다 학생(${students.length})이 많습니다. 책상을 늘리거나 학생을 줄이세요.`}
              </div>
            )}
            {canArrange && !current && layout && (
              <div className="text-sm bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
                <div className="font-medium text-blue-900">
                  학기 중간에 시작하셨나요?
                </div>
                <div className="text-blue-800">
                  지난달 배치를 입력해두면, 새 배치가 그와 다르게 생성됩니다.
                  [학생] 탭의 이름 순서대로 앞자리부터 채운 뒤 그리드에서
                  조정할 수 있어요.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrent(
                      seedArrangementFromStudentOrder(layout, students),
                    );
                    setEditing(true);
                  }}
                  className="px-3 py-1.5 bg-white border border-blue-400 text-blue-700 rounded text-sm hover:bg-blue-100"
                >
                  학생 순서대로 지난달 배치 채우기
                </button>
              </div>
            )}
            {warning && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                {warning}
              </div>
            )}
            {layout && current && (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    className={`px-3 py-1.5 rounded text-sm border ${
                      editing
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {editing ? "편집 완료" : "자리 직접 편집"}
                  </button>
                  {editing && (
                    <span className="text-xs text-gray-500">
                      두 자리를 클릭하면 서로 바뀝니다.
                    </span>
                  )}
                </div>
                <SeatingView
                  layout={layout}
                  students={students}
                  arrangement={current}
                  frontPriorityIds={frontPriorityIds}
                  editable={editing}
                  onSeatsChange={(seats) =>
                    setCurrent({ seats, createdAt: Date.now() })
                  }
                />
              </>
            )}
          </div>
        )}

        {tab === "layout" && (
          <LayoutEditor value={layout} onChange={setLayout} />
        )}

        {tab === "students" && (
          <StudentsEditor value={students} onChange={setStudents} />
        )}

        {tab === "constraints" && (
          <ConstraintsEditor
            students={students}
            frontPriorityIds={frontPriorityIds}
            incompatiblePairs={incompatiblePairs}
            onToggleFront={toggleFrontPriority}
            onAddPair={addIncompatiblePair}
            onRemovePair={removeIncompatiblePair}
          />
        )}
      </main>
    </div>
  );
}
