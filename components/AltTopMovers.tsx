"use client";

import { useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import { Sparkline } from "@/components/Sparkline";

type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap_rank?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  sparkline_in_7d?: { price: number[] };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function fmtPct(n?: number | null) {
  if (typeof n !== "number") return "-";
  const s = n.toFixed(1);
  return (n >= 0 ? "▲" : "▼") + Math.abs(+s) + "%";
}

function CoinRow({ c }: { c: Coin }) {
  const pct24 = c.price_change_percentage_24h_in_currency ?? null;
  const up = (pct24 ?? 0) >= 0;

  return (
    <Link
      href={`/coin/${c.id}?sym=${encodeURIComponent(c.symbol.toUpperCase())}`}
      className="flex items-center justify-between gap-3 py-2 hover:bg-white/5 rounded-lg px-2 transition"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Image src={c.image} alt={c.symbol} width={20} height={20} className="rounded-full" />
        <div className="truncate">
          <div className="text-sm leading-tight truncate">{c.name}</div>
          <div className="text-[11px] text-brand-ink/60 uppercase">#{c.market_cap_rank ?? "-"} · {c.symbol}</div>
        </div>
      </div>
      <div className={`text-sm ${up ? "text-emerald-400" : "text-rose-400"}`}>{fmtPct(pct24)}</div>
      <div className="flex-shrink-0">
        <Sparkline
          points={c.sparkline_in_7d?.price || []}
          width={120}
          height={36}
          stroke={up ? "#10B981" : "#F87171"}
          fill={up ? "rgba(16,185,129,0.15)" : "rgba(248,113,113,0.12)"}
        />
      </div>
    </Link>
  );
}

export function AltTopMovers() {
  const { data, error, isLoading } = useSWR<{ data?: Coin[] }>("/api/markets", fetcher, {
    refreshInterval: 60_000, // 1분
  });

  // 🔹 필터 상태: All vs LargeCaps(시총랭크 <= 100)
  const [scope, setScope] = useState<"all" | "large">("all");

  const coins = data?.data || [];
  const scopeFiltered =
    scope === "large"
      ? coins.filter((c) => (c.market_cap_rank ?? 9999) <= 100)
      : coins;

  const valid = scopeFiltered.filter((c) => typeof c.price_change_percentage_24h_in_currency === "number");

  const topGainers = [...valid].sort((a, b) =>
    (b.price_change_percentage_24h_in_currency! - a.price_change_percentage_24h_in_currency!)
  ).slice(0, 6);

  const topLosers = [...valid].sort((a, b) =>
    (a.price_change_percentage_24h_in_currency! - b.price_change_percentage_24h_in_currency!)
  ).slice(0, 6);

  const BTN = ({ value, label }: { value: "all" | "large"; label: string }) => (
    <button
      onClick={() => setScope(value)}
      className={[
        "px-2.5 py-1 rounded-md border text-xs transition",
        scope === value
          ? "bg-brand-accent/20 border-brand-accent/50 text-brand-accent"
          : "bg-brand-card/60 border-brand-line/40 text-brand-ink/80 hover:border-brand-line",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* 🔸 필터 배지 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-brand-ink/70">범위:</div>
        <div className="flex gap-1.5">
          <BTN value="all" label="All" />
          <BTN value="large" label="LargeCaps (Top 100)" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Top Gainers (24h)</div>
            <div className="text-[11px] text-brand-ink/60">데이터: CoinGecko</div>
          </div>
          {isLoading && <div className="text-xs text-brand-ink/60">로딩 중…</div>}
          {error && <div className="text-xs text-rose-400">불러오기 실패</div>}
          <div className="divide-y divide-brand-line/20">
            {topGainers.map((c) => <CoinRow key={c.id} c={c} />)}
          </div>
        </div>

        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Top Losers (24h)</div>
            <div className="text-[11px] text-brand-ink/60">데이터: CoinGecko</div>
          </div>
          {isLoading && <div className="text-xs text-brand-ink/60">로딩 중…</div>}
          {error && <div className="text-xs text-rose-400">불러오기 실패</div>}
          <div className="divide-y divide-brand-line/20">
            {topLosers.map((c) => <CoinRow key={c.id} c={c} />)}
          </div>
        </div>
      </div>
    </div>
  );
}