"use client";

import useSWR from "swr";
import { useMemo } from "react";

const fetcher = (u: string) => fetch(u).then(r => r.json());

type MarketChart = { prices?: [number, number][] };

function quantiles(arr: number[], qs: number[]) {
  if (!arr.length) return qs.map(() => NaN);
  const a = [...arr].sort((x, y) => x - y);
  return qs.map(q => {
    const i = (a.length - 1) * q;
    const lo = Math.floor(i), hi = Math.ceil(i);
    if (lo === hi) return a[lo];
    const h = i - lo;
    return a[lo] * (1 - h) + a[hi] * h;
  });
}

export function RainbowLite() {
  const { data, error, isLoading } = useSWR<MarketChart>(
    "/api/btc/market-chart?days=365",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const prices = useMemo(() => (Array.isArray(data?.prices) ? data!.prices.map(p => p[1]) : []), [data]);
  const last = prices.at(-1) ?? null;

  // 분위수(6개 밴드 = 5개 경계): 10/30/50/70/90
  const qs = useMemo(() => quantiles(prices, [0.1, 0.3, 0.5, 0.7, 0.9]), [prices]);
  const min = useMemo(() => Math.min(...prices, Number.POSITIVE_INFINITY), [prices]);
  const max = useMemo(() => Math.max(...prices, Number.NEGATIVE_INFINITY), [prices]);

  // SVG 스케일러
  const W = 640, H = 180, pad = 10;
  const yScale = (v: number) => {
    const lo = min === Infinity ? 0 : min;
    const hi = max === -Infinity ? 1 : max;
    if (hi === lo) return H / 2;
    return H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2);
  };
  const xScale = (i: number) => {
    const n = prices.length || 1;
    return pad + (i / (n - 1)) * (W - pad * 2);
  };

  const pathD = useMemo(() => {
    if (!prices.length) return "";
    let d = `M ${xScale(0)} ${yScale(prices[0])}`;
    for (let i = 1; i < prices.length; i++) d += ` L ${xScale(i)} ${yScale(prices[i])}`;
    return d;
  }, [prices]);

  // 밴드 경계값 배열(최소/분위수들/최대)
  const edges = useMemo(() => {
    if (!prices.length) return [];
    const arr = [min, ...qs, max];
    // NaN 방지
    return arr.map((v) => (Number.isFinite(v) ? v : 0));
  }, [min, max, qs, prices]);

  const bands = [
    { color: "rgba(255, 0, 0, 0.10)", label: "🔥 과열 위험" },
    { color: "rgba(255, 165, 0, 0.10)", label: "고평가" },
    { color: "rgba(255, 215, 0, 0.10)", label: "다소 고평가" },
    { color: "rgba(0, 128, 0, 0.10)", label: "중립" },
    { color: "rgba(0, 191, 255, 0.10)", label: "다소 저평가" },
    { color: "rgba(0, 0, 255, 0.10)", label: "저평가" },
  ];

  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">BTC Rainbow (Lite)</div>
        <div className="text-[11px] text-brand-ink/60">데이터: CoinGecko / 365D</div>
      </div>

      {isLoading ? (
        <div className="text-xs text-brand-ink/60 mt-2">로딩 중…</div>
      ) : error ? (
        <div className="text-xs text-rose-400 mt-2">불러오기 실패</div>
      ) : !prices.length ? (
        <div className="text-xs text-brand-ink/60 mt-2">데이터 없음</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <svg width={W} height={H} style={{ minWidth: "100%" }}>
            {/* 밴드(위에서 아래로) */}
            {edges.length === 6 && bands.map((b, i) => {
              const y1 = yScale(edges[i]);
              const y2 = yScale(edges[i + 1]);
              const yTop = Math.min(y1, y2);
              const height = Math.abs(y2 - y1);
              return (
                <g key={i}>
                  <rect x={0} y={yTop} width={W} height={height} fill={b.color} />
                  <text x={W - 6} y={yTop + 12} textAnchor="end" fontSize="10" fill="#a8b3b0">
                    {b.label}
                  </text>
                </g>
              );
            })}

            {/* 가격 라인 */}
            <path d={pathD} fill="none" stroke="#F5C451" strokeWidth={1.6} />
            {/* 현재가 점 */}
            {last && (
              <circle
                cx={xScale(prices.length - 1)}
                cy={yScale(last)}
                r="3"
                fill="#F5C451"
                stroke="#CBA448"
                strokeWidth="1"
              />
            )}
          </svg>
          <div className="mt-2 text-sm text-brand-ink/80">
            현재가: {last ? `$${Math.round(last).toLocaleString()}` : "-"}
          </div>
          <div className="text-[11px] text-brand-ink/60">
            * 분위수 기반 임시 밴드(로그 회귀 없음). 정식 Rainbow는 추후 업그레이드합니다.
          </div>
        </div>
      )}
    </div>
  );
}