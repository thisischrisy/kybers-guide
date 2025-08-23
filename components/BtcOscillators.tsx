"use client";

import useSWR from "swr";
import { rsi, macd } from "@/lib/indicators";

const fetcher = (u: string) => fetch(u).then(r => r.json());

type MarketChart = { prices?: [number, number][] };

function makeLinePath(vals: number[], W: number, H: number, pad = 6) {
  if (!vals.length) return "";
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const x = (i: number) => pad + (i / (vals.length - 1)) * (W - pad * 2);
  const y = (v: number) => {
    if (hi === lo) return H / 2;
    return H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2);
  };
  let d = `M ${x(0)} ${y(vals[0])}`;
  for (let i = 1; i < vals.length; i++) d += ` L ${x(i)} ${y(vals[i])}`;
  return d;
}

export function BtcOscillators() {
  const { data, error, isLoading } = useSWR<MarketChart>(
    "/api/btc/market-chart?days=120",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const closes = Array.isArray(data?.prices) ? data!.prices.map(p => p[1]) : [];

  const rsiArr = closes.length ? rsi(closes, 14) : [];
  const rsiLast = rsiArr.at(-1) ?? null;

  const { macdLine, signalLine, hist } = closes.length ? macd(closes) : { macdLine: [], signalLine: [], hist: [] };
  const macdLast = macdLine.at(-1) ?? null;
  const signalLast = signalLine.at(-1) ?? null;
  const histLast = hist.at(-1) ?? null;

  // SVG path
  const RSI_W = 260, RSI_H = 70;
  const MACD_W = 260, MACD_H = 70;

  const rsiPath = makeLinePath(rsiArr.filter(n => Number.isFinite(n)), RSI_W, RSI_H);
  const macdPath = makeLinePath(macdLine.filter(n => Number.isFinite(n)), MACD_W, MACD_H);
  const signalPath = makeLinePath(signalLine.filter(n => Number.isFinite(n)), MACD_W, MACD_H);

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* RSI 카드 */}
      <div className="rounded-lg border border-brand-line/30 bg-brand-card/60 p-3">
        <div className="text-sm font-medium flex items-center justify-between">
          <span title="RSI(14): 70 이상 과열, 30 이하 과매도">RSI (14)</span>
          <span className="text-brand-ink/70 text-xs">
            {typeof rsiLast === "number" ? Math.round(rsiLast) : "-"}
          </span>
        </div>
        <div className="mt-2">
          {isLoading ? (
            <div className="text-xs text-brand-ink/60">로딩 중…</div>
          ) : error ? (
            <div className="text-xs text-rose-400">불러오기 실패</div>
          ) : rsiPath ? (
            <svg width={RSI_W} height={RSI_H} className="w-full">
              {/* 30/70 가이드 라인 */}
              <line x1="0" x2={RSI_W} y1={RSI_H * 0.25} y2={RSI_H * 0.25} stroke="rgba(255,255,0,0.3)" strokeDasharray="4 4" />
              <line x1="0" x2={RSI_W} y1={RSI_H * 0.75} y2={RSI_H * 0.75} stroke="rgba(255,255,0,0.3)" strokeDasharray="4 4" />
              {/* RSI 라인 */}
              <path d={rsiPath} fill="none" stroke="#F5C451" strokeWidth={1.6} />
            </svg>
          ) : (
            <div className="text-xs text-brand-ink/60">데이터 부족</div>
          )}
        </div>
        <div className="text-[11px] text-brand-ink/60 mt-1">읽는 법: 70↑ 과열(경계), 30↓ 과매도(반등 주의)</div>
      </div>

      {/* MACD 카드 */}
      <div className="rounded-lg border border-brand-line/30 bg-brand-card/60 p-3">
        <div className="text-sm font-medium flex items-center justify-between">
          <span title="MACD(12,26,9): MACD선이 시그널선을 상향 돌파하면 모멘텀 전환 신호로 해석">MACD (12,26,9)</span>
          <span className="text-brand-ink/70 text-xs">
            {typeof macdLast === "number" && typeof signalLast === "number" && typeof histLast === "number"
              ? `MACD:${macdLast.toFixed(2)} / SIG:${signalLast.toFixed(2)} / HIST:${histLast.toFixed(2)}`
              : "-"}
          </span>
        </div>
        <div className="mt-2">
          {isLoading ? (
            <div className="text-xs text-brand-ink/60">로딩 중…</div>
          ) : error ? (
            <div className="text-xs text-rose-400">불러오기 실패</div>
          ) : (
            <>
              {/* 히스토그램 (세로 막대) */}
              <svg width={MACD_W} height={MACD_H} className="w-full">
                {hist.map((v, i) => {
                  if (!Number.isFinite(v)) return null;
                  const x = (i / Math.max(hist.length - 1, 1)) * MACD_W;
                  const midY = MACD_H / 2;
                  const h = Math.min(Math.abs(v) * 2, MACD_H / 2); // 단순 스케일
                  const y = v >= 0 ? midY - h : midY;
                  return (
                    <rect key={i} x={x} y={y} width="2" height={h} fill={v >= 0 ? "rgba(16,185,129,0.7)" : "rgba(244,63,94,0.7)"} />
                  );
                })}
              </svg>
              {/* MACD/Signal 라인(겹침) */}
              {macdPath && signalPath ? (
                <svg width={MACD_W} height={MACD_H} className="w-full -mt-2">
                  <path d={macdPath} fill="none" stroke="#F5C451" strokeWidth={1.4} />
                  <path d={signalPath} fill="none" stroke="#a8b3b0" strokeWidth={1.2} />
                </svg>
              ) : (
                <div className="text-xs text-brand-ink/60">데이터 부족</div>
              )}
            </>
          )}
        </div>
        <div className="text-[11px] text-brand-ink/60 mt-1">읽는 법: MACD가 SIG 상향 돌파 → 모멘텀 개선, 하향 돌파 → 약화</div>
      </div>
    </div>
  );
}