"use client";

import { useState } from "react";
import { TopMovers } from "@/components/TopMovers";
import { SectorInsight } from "@/components/SectorInsight";
import { SECTORS, SectorKey } from "@/lib/sectors";

export default function AltcoinContent() {
  const [filter, setFilter] = useState<SectorKey>("All");

  return (
    <div className="space-y-4">
      {/* 필터 버튼들 */}
      <div className="flex flex-wrap gap-2">
        {SECTORS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full border text-sm transition
              ${filter === f
                ? "border-brand-gold/60 text-brand-gold"
                : "border-brand-line/30 text-brand-ink/80 hover:border-brand-line/60"}
            `}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 섹터 인사이트(상·하락 요약) */}
      <SectorInsight filter={filter} />

      {/* Top Movers 카드들 */}
      <TopMovers filter={filter} />
    </div>
  );
}