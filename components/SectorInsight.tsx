"use client";

import useSWR from "swr";
import { RULES, isStable, SectorKey } from "@/lib/sectors";
import { SectorBadge } from "@/components/SectorBadge";

const fetcher = (u:string)=>fetch(u).then(r=>r.json());

type Props = { filter: SectorKey };

export function SectorInsight({ filter }: Props){
  const { data, error, isLoading } = useSWR("/api/markets", fetcher, { refreshInterval: 60_000 });

  if (error) return <div className="text-sm text-red-400">인사이트 불러오기 실패</div>;
  if (isLoading || !Array.isArray(data)) return <div className="text-sm text-brand-ink/60">인사이트 계산 중…</div>;

  // 스테이블 제외 기본군 (단, Stablecoin 필터는 포함)
  const base = filter === "Stablecoin" ? data : data.filter((c:any)=>!isStable(c));

  const rule = RULES[filter] ?? RULES["All"];
  let sectorList = base.filter(rule);

  // Top5(시총 상위 5) 대상으로 집계
  sectorList.sort((a:any,b:any)=>(b.market_cap??0)-(a.market_cap??0));
  const top5 = sectorList.slice(0,5);

  const changes = top5.map((c:any)=>Number(c.price_change_percentage_24h ?? 0));
  const up = changes.filter((x)=>x>=0).length;
  const down = changes.filter((x)=>x<0).length;
  const avg = changes.length ? changes.reduce((a,b)=>a+b,0)/changes.length : 0;

  let tone:"up"|"down"|"flat" = "flat";
  if (avg > 1) tone = "up";
  else if (avg < -1) tone = "down";

  const toneText = tone==="up" ? "상승 우세" : tone==="down" ? "하락 우세" : "중립";
  const toneClass = tone==="up" ? "text-green-400" : tone==="down" ? "text-red-400" : "text-yellow-300";

  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
      <div className="flex items-center justify-between">
        <SectorBadge sector={filter} />
        <div className={`text-sm ${toneClass}`}>{toneText}</div>
      </div>
      <div className="mt-2 text-sm text-brand-ink/80">
        Top5 평균 24h 변화: <span className={toneClass}>{avg.toFixed(2)}%</span>
      </div>
      <div className="text-xs text-brand-ink/70">상승 {up} · 하락 {down} (Top5 기준)</div>
    </div>
  );
}