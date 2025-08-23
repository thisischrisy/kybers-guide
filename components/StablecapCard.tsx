"use client";

import useSWR from "swr";
import { useState, useMemo } from "react";
import { Sparkline } from "@/components/Sparkline";

const fetcher = (u: string) => fetch(u).then(r => r.json());

type ApiResp = {
  data?: {
    days: number;
    sumCaps: number[];
    now: number | null;
    parts: { usdt: number | null; usdc: number | null };
  };
};

function fmtUSD(n?: number | null) {
  if (typeof n !== "number") return "-";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + Math.round(n).toLocaleString();
}

export function StablecapCard() {
  const [days, setDays] = useState<30 | 90 | 180>(90);

  const { data, error, isLoading } = useSWR<ApiResp>(`/api/stables?days=${days}`, fetcher, {
    refreshInterval: 60_000,
  });

  const sum = data?.data?.now ?? null;
  const usdt = data?.data?.parts?.usdt ?? null;
  const usdc = data?.data?.parts?.usdc ?? null;
  const series = data?.data?.sumCaps ?? [];

  // 시작 대비 변화율
  const changePct = useMemo(() => {
    if (!Array.isArray(series) || series.length < 2) return null;
    const first = series[0];
    const last = series[series.length - 1];
    if (!first || !last) return null;
    return ((last - first) / first) * 100;
  }, [series]);

  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Stablecoin 총 시총 (USDT + USDC)</div>
        <div className="flex gap-1 text-xs">
          {([30, 90, 180] as const).map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={[
                "px-2 py-1 rounded-md border transition",
                days === d
                  ? "bg-brand-accent/20 border-brand-accent/60 text-brand-accent"
                  : "bg-brand-card/60 border-brand-line/40 text-brand-ink/80 hover:border-brand-line",
              ].join(" ")}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 text-brand-ink/80">
        현재 합계: <span className="font-semibold">{fmtUSD(sum)}</span>
        {typeof changePct === "number" && (
          <span className={`ml-2 text-sm ${changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
          </span>
        )}
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
        ※ 정확한 “거래소 Netflow(순유입/유출)”은 유료 온체인 데이터가 필요합니다. 현재는 **총 공급(=시총) 추세**로 유동성 흐름을 근사합니다.
      </div>
    </div>
  );
}