// app/altcoin/AltcoinContent.tsx
"use client";

import { useState } from "react";
import { TopMovers } from "@/components/TopMovers";

const FILTERS = [
  "All",
  "LargeCap",
  "Layer1",
  "Layer2",
  "DeFi",
  "Meme",
  "AI",
  "RWA",
  "Metaverse",
  "GameFi",
  "Oracles",
  "PrivacyZK",
  "LiquidStaking",
  "Stablecoin",
  "Exchange",
];

export default function AltcoinContent() {
  const [filter, setFilter] = useState<string>("All");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
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

      <TopMovers filter={filter} />
    </div>
  );
}