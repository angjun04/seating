"use client";

import { useEffect, useState } from "react";
import type { Student } from "@/lib/types";

type Props = {
  value: Student[];
  onChange: (next: Student[]) => void;
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function parseNames(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function StudentsEditor({ value, onChange }: Props) {
  const [text, setText] = useState(value.map((s) => s.name).join("\n"));

  useEffect(() => {
    setText(value.map((s) => s.name).join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.length]);

  const commit = (raw: string) => {
    const names = parseNames(raw);
    const byName = new Map(value.map((s) => [s.name, s]));
    const next: Student[] = names.map(
      (name) => byName.get(name) ?? { id: makeId(), name },
    );
    onChange(next);
  };

  return (
    <div className="space-y-2 max-w-xl mx-auto">
      <div className="text-sm font-medium">
        학생 이름 (줄바꿈 또는 쉼표로 구분)
      </div>
      <textarea
        className="w-full h-48 border border-gray-300 rounded p-2 font-mono text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        placeholder="홍길동&#10;김철수&#10;이영희"
      />
      <div className="text-xs text-gray-600">
        총 {parseNames(text).length}명 (포커스 해제 시 저장)
      </div>
    </div>
  );
}
