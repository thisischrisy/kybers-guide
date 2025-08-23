"use client";

import useSWR from "swr";
import Link from "next/link";
import { RULES, isStable, SectorKey } from "@/lib/sectors";
import { SectorBadge } from "@/components/SectorBadge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Props = { filter?: SectorKey };

function byAbs24hDesc(a:any,b:any){
  const ax=Math.abs(a.price_change_percentage_24h??0);
  const bx=Math.abs(b.price_change_percentage_24h??0);
  return bx-ax;
}
function byMcapDesc(a:any,b:any){ return (b.market_cap??0)-(a.market_cap??0); }

export function TopMovers({ filter = "All" }: Props) {
  const { data, error, isLoading } = useSWR("/api/markets", fetcher, { refreshInterval: 60_000 });

  if (error) return <div>불러오기 실패</div>;
  if (isLoading || !Array.isArray(data)) return <div>로딩 중…</div>;

  const base = filter==="Stablecoin" ? data : data.filter((c:any)=>!isStable(c));
  const rule = RULES[filter] ?? RULES["All"];
  let filtered = base.filter(rule);

  filtered.sort((a:any,b:any) => {
    const p = byAbs24hDesc(a,b);
    return p!==0 ? p : byMcapDesc(a,b);
  });

  if (filtered.length < 5) {
    const need = 5 - filtered.length;
    const filler = base
      .filter((c:any)=>!filtered.some((x:any)=>x.id===c.id))
      .sort(byAbs24hDesc)
      .slice(0, need);
    filtered = [...filtered, ...filler];
  }

  const show = filtered.slice(0, 12);

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {show.map((coin: any) => {
        const p = Number(coin.price_change_percentage_24h ?? 0);
        const tone = p >= 0 ? "text-green-400" : "text-red-400";
        return (
          <Link
            key={coin.id}
            href={`/coin/${coin.id}`}
            className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4 block hover:border-brand-gold/60 transition"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">
                {coin.name} ({coin.symbol?.toUpperCase()})
              </div>
              {/* 섹터 배지(현재 선택된 필터 표시) */}
              <div className="ml-2">
                <SectorBadge sector={filter} small />
              </div>
            </div>

            <div className="text-sm text-brand-ink/70">
              시총: {coin.market_cap ? `$${Math.round(coin.market_cap / 1e6)}M` : "-"}
            </div>
            <div className={`text-sm ${tone}`}>
              24h: {Number.isFinite(p) ? `${p.toFixed(2)}%` : "-"}
            </div>
          </Link>
        );
      })}
    </div>
  );
}