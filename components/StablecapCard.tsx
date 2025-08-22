"use client";

import useSWR from "swr";
import { Sparkline } from "@/components/Sparkline";

const fetcher = (u: string) => fetch(u).then(r => r.json());

function fmtUSD(n?: number | null) {
  if (typeof n !== "number") return "-";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + Math.round(n).toLocaleString();
}

export function StablecapCard() {
  const { data, error, isLoading } = useSWR<{ data?: { sumCaps: number[]; now: number | null; parts: { usdt: number | null; usdc: number | null } } }>("/api/stables", fetcher, {
    refreshInterval: 60_000, // 1분
  });

  const sum = data?.data?.now ?? null;
  const usdt = data?.data?.parts?.usdt ?? null;
  const usdc = data?.data?.parts?.usdc ?? null;
  const series = data?.data?.sumCaps ?? [];

  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Stablecoin 총 시총 (USDT + USDC)</div>
        <div className="text-[11px] text-brand-ink/60">데이터: CoinGecko</div>
      </div>

      <div className="mt-2 text-brand-ink/80">
        현재 합계: <span className="font-semibold">{fmtUSD(sum)}</span>
      </div>
      <div className="mt-1 text-xs text-brand-ink/70">
        USDT: {fmtUSD(usdt)} · USDC: {fmtUSD(usdc)}
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="text-xs text-brand-ink/60">로딩 중…</div>
        ) : error ? (
          <div className="text-xs text-rose-400">불러오기 실패</div>
        ) : (
          <Sparkline
            points={series}
            width={320}
            height={60}
            stroke="#F5C451"
            fill="rgba(245,196,81,0.12)"
          />
        )}
      </div>

      <div className="mt-2 text-[11px] text-brand-ink/60">
        ※ 정확한 “거래소 Netflow(순유입/유출)”은 유료 온체인 데이터가 필요합니다.  
        현재는 **총 공급(=시총) 추세**로 유동성 흐름을 근사합니다.
      </div>
    </div>
  );
}