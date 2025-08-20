"use client";

import useSWR from "swr";
import Image from "next/image";
import { Sparkline } from "@/components/Sparkline";

type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  sparkline_in_7d?: { price: number[] };
  market_cap_rank?: number | null;
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
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Image src={c.image} alt={c.symbol} width={20} height={20} className="rounded-full" />
        <div className="truncate">
          <div className="text-sm leading-tight truncate">{c.name}</div>
          <div className="text-[11px] text-brand-ink/60 uppercase">{c.symbol}</div>
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
    </div>
  );
}

export function AltTopMovers() {
  const { data, error, isLoading } = useSWR<{ data?: Coin[] }>("/api/markets", fetcher, {
    refreshInterval: 60_000, // 1분마다 갱신
  });

  const coins = data?.data || [];
  const valid = coins.filter((c) => typeof c.price_change_percentage_24h_in_currency === "number");

  // 상위/하위 6개
  const topGainers = [...valid].sort((a, b) =>
    (b.price_change_percentage_24h_in_currency! - a.price_change_percentage_24h_in_currency!)
  ).slice(0, 6);

  const topLosers = [...valid].sort((a, b) =>
    (a.price_change_percentage_24h_in_currency! - b.price_change_percentage_24h_in_currency!)
  ).slice(0, 6);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Top Gainers (24h)</div>
          <div className="text-[11px] text-brand-ink/60">데이터: CoinGecko (무료)</div>
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
          <div className="text-[11px] text-brand-ink/60">데이터: CoinGecko (무료)</div>
        </div>
        {isLoading && <div className="text-xs text-brand-ink/60">로딩 중…</div>}
        {error && <div className="text-xs text-rose-400">불러오기 실패</div>}
        <div className="divide-y divide-brand-line/20">
          {topLosers.map((c) => <CoinRow key={c.id} c={c} />)}
        </div>
      </div>
    </div>
  );
}