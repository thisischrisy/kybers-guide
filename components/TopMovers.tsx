"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState } from "react";

type CgCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number | null;
  current_price: number | null;
  price_change_percentage_24h?: number | null;
  // CoinGecko는 7d/30d를 *_in_currency 로 내려줍니다.
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
};

const fetcher = (u: string) => fetch(u).then(r => r.json());

export function TopMovers() {
  const [window, setWindow] = useState<"24h" | "7d" | "30d">("24h");

  const { data, isLoading, error } = useSWR<CgCoin[]>(
    // 대형주(시총 상위) 위주로 250개 받아서 클라에서 소팅
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h,7d,30d",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const sorted = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const getPct = (c: CgCoin) =>
      window === "24h"
        ? (c.price_change_percentage_24h ?? null)
        : window === "7d"
        ? (c.price_change_percentage_7d_in_currency ?? null)
        : (c.price_change_percentage_30d_in_currency ?? null);

    // 가격변화율 있는 애들만 필터 → 내림차순 상위 8개
    return data
      .filter(c => typeof getPct(c) === "number")
      .sort((a, b) => (getPct(b)! - getPct(a)!))
      .slice(0, 8);
  }, [data, window]);

  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Top Movers</div>
        <div className="flex gap-1 text-xs">
          {(["24h", "7d", "30d"] as const).map(w => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={[
                "px-2 py-1 rounded-md border transition",
                window === w
                  ? "bg-brand-accent/20 border-brand-accent/60 text-brand-accent"
                  : "bg-brand-card/60 border-brand-line/40 text-brand-ink/80 hover:border-brand-line",
              ].join(" ")}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        {isLoading ? (
          <div className="text-xs text-brand-ink/60 col-span-full">로딩 중…</div>
        ) : error ? (
          <div className="text-xs text-rose-400 col-span-full">불러오기 실패</div>
        ) : (
          sorted.map(c => {
            const sym = (c.symbol || "").toUpperCase();
            const pct =
              window === "24h"
                ? c.price_change_percentage_24h
                : window === "7d"
                ? c.price_change_percentage_7d_in_currency
                : c.price_change_percentage_30d_in_currency;

            return (
              <Link
                key={c.id}
                href={`/coin/${c.id}?sym=${encodeURIComponent(sym)}`}
                className="rounded-lg border border-brand-line/30 bg-brand-card/50 p-3 hover:border-brand-line/60 transition"
              >
                <div className="flex items-center gap-2">
                  {/* 로고 */}
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-6 h-6 rounded-full border border-brand-line/40"
                  />
                  <div className="flex-1">
                    <div className="text-sm">
                      {c.name} <span className="text-brand-ink/60 text-xs">({sym})</span>
                    </div>
                    <div className="text-[11px] text-brand-ink/60">
                      Rank {c.market_cap_rank ?? "-"}
                    </div>
                  </div>
                  {/* 퍼포먼스 */}
                  <div className={`text-sm ${pct! >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {pct != null ? `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%` : "-"}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="mt-2 text-[11px] text-brand-ink/60">
        데이터: CoinGecko — 상위 250개 중 {window} 상승률 기준 상위 8개 표시
      </div>
    </div>
  );
}