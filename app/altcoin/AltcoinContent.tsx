"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const TopMovers = dynamic(() => import("@/components/TopMovers").then(m => m.TopMovers), { ssr: false });

const FILTERS = ["All", "LargeCap", "Meme", "AI", "DeFi"];

export default function AltcoinContent() {
  const [filter, setFilter] = useState("All");

  return (
    <div>
      {/* 필터 버튼 그룹 */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm border transition ${
              filter === f
                ? "bg-brand-gold text-black border-brand-gold"
                : "bg-brand-card text-brand-ink/70 border-brand-line/30 hover:bg-brand-card/80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Top Movers */}
      <TopMovers filter={filter} />
    </div>
  );
}