// app/overview/page.tsx
import dynamic from "next/dynamic";
import { quantiles } from "@/lib/stats";
import { useEffect, useState } from "react";

export const revalidate = 3600; // 1시간 캐시

// ✅ 차트/카운트다운 같은 클라이언트 컴포넌트를 안전하게 동적 로딩
const Donut = dynamic(() => import("@/components/Donut").then(m => m.Donut), { ssr: false });
const MiniLine = dynamic(() => import("@/components/MiniLine").then(m => m.MiniLine), { ssr: false });
const HalvingCountdown = dynamic(
  () => import("@/components/HalvingCountdown").then(m => m.HalvingCountdown),
  { ssr: false }
);

async function getGlobal() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getStable() {
  try {
    const res = await fetch("https://stablecoins.llama.fi/stablecoins");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getFGI() {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getBTCPrices() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1460&interval=daily"
    );
    if (!res.ok) return null;
    return res.json(); // { prices: [[ts, price], ...] }
  } catch {
    return null;
  }
}

function formatUSD(n: number | null | undefined) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

function bandLabel(bands: number[], price: number) {
  if (!bands.length || !Number.isFinite(price)) return "-";
  let idx = 0;
  while (idx < bands.length && price > bands[idx]) idx++;
  const names = ["저평가", "저-중", "중립-", "중립", "중립+", "고-중", "고평가-", "고평가", "극고평가"];
  return names[Math.min(Math.max(idx - 1, 0), names.length - 1)];
}

export default async function OverviewPage() {
  const [global, stableAll, fgi, btc] = await Promise.all([
    getGlobal(),
    getStable(),
    getFGI(),
    getBTCPrices()
  ]);

  // 1) 전체 시총 & 도미넌스
  const mcap = global?.data?.total_market_cap?.usd ?? null;
  const btcDom = global?.data?.market_cap_percentage?.btc ?? null;
  const ethDom = global?.data?.market_cap_percentage?.eth ?? null;
  const altDom = (typeof btcDom === "number" && typeof ethDom === "number") ? (100 - btcDom - ethDom) : null;

  // 2) 스테이블코인 총량 (MVP: 스냅샷)
  const totalStable =
    (stableAll?.total?.[0]?.total as number | undefined) ??
    (stableAll?.total as number | undefined) ??
    null;

  const stableLabels = ["Now"];
  const stableValues = [typeof totalStable === "number" ? totalStable : 0];

  // 3) FGI
  const fearValue = Number(fgi?.data?.[0]?.value ?? NaN);
  const fearClass =
    isNaN(fearValue) ? "중립" :
    fearValue < 25 ? "극심한 공포" :
    fearValue < 45 ? "공포" :
    fearValue < 55 ? "중립" :
    fearValue < 75 ? "탐욕" : "극심한 탐욕";

  // RainbowLite 컴포넌트를 클라이언트 전용으로 불러오기
  const RainbowLite = dynamic(
    () => import("@rainbow-me/rainbowkit").then(mod => mod.RainbowLite), 
    { ssr: false }
  );

  const closes: number[] = Array.isArray(btc?.prices) ? btc.prices.map((p: any[]) => p[1]) : [];
  const labels: string[] = Array.isArray(btc?.prices)
    ? btc.prices.map((p: any[]) => new Date(p[0]).toLocaleDateString())
    : [];
  const lastPrice = closes.at(-1) ?? NaN;

  // 분위 경계 (0%, 12.5%, 25%, 37.5%, 50%, 62.5%, 75%, 87.5%, 100%)
  const qs = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  const bands = closes.length ? quantiles(closes, qs) : [];


  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h2 className="text-xl font-semibold">시장 개요</h2>

      {/* 반감기 카드 */}
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm mb-2 text-brand-ink/80">BTC 반감기 카운트다운</div>
        <HalvingCountdown />
        <div className="mt-2 text-xs text-brand-ink/60">※ 블록 시간 변동으로 실제 일자는 달라질 수 있습니다.</div>
      </div>

      {/* Rainbow(간이) */}
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
      <div className="text-sm mb-2 text-brand-ink/80">BTC Rainbow (간이 · 최근 4년 분위)</div>
      {closes.length ? (
        <>
          <RainbowLite labels={labels} closes={closes} bands={bands} lastPrice={lastPrice} />
          <div className="mt-2 text-xs text-brand-ink/60">
            ※ 최근 4년 종가 분포 분위 기반의 간단 밴드입니다(정밀 지표 아님). 현재가: ${Math.round(lastPrice).toLocaleString()}
          </div>
        </>
      ) : (
        <div className="text-sm text-brand-ink/60">데이터 수집 중…</div>
      )}
      <div className="mt-2 text-xs">
        현재 평가 구간: <strong>{bandLabel(bands, lastPrice)}</strong>
      </div>
    </div>

      {/* 전체 시총 & 도미넌스 */}
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm mb-2 text-brand-ink/80">전체 시가총액</div>
        <div className="text-2xl font-semibold text-brand-gold">{formatUSD(mcap)}</div>
        <div className="mt-4">
          <div className="text-xs mb-2 text-brand-ink/60">도미넌스 (BTC/ETH/ALT)</div>
          {/* ✅ 클라이언트에서만 그려지도록 동적 컴포넌트 */}
          <Donut
            labels={["BTC", "ETH", "ALT"]}
            values={[
              typeof btcDom === "number" ? btcDom : 0,
              typeof ethDom === "number" ? ethDom : 0,
              typeof altDom === "number" ? altDom : 0
            ]}
          />
          <div className="mt-2 text-xs text-brand-ink/70">
            BTC {typeof btcDom === "number" ? btcDom.toFixed(1) : "-"}% · ETH {typeof ethDom === "number" ? ethDom.toFixed(1) : "-"}% · ALT {typeof altDom === "number" ? altDom.toFixed(1) : "-"}%
          </div>
        </div>
      </div>

      {/* 스테이블코인 총량 (MVP: 스냅샷) */}
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm mb-2 text-brand-ink/80">스테이블코인 총량(스냅샷)</div>
        <div className="text-2xl font-semibold text-brand-gold">{formatUSD(totalStable)}</div>
        <div className="mt-4">
          <MiniLine labels={stableLabels} values={stableValues} />
        </div>
        <div className="mt-2 text-xs text-brand-ink/60">※ 추후 30/90일 타임라인으로 확장 예정</div>
      </div>

      {/* 공포·탐욕 지수 */}
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm mb-2 text-brand-ink/80">공포·탐욕 지수</div>
        <div className="text-3xl font-semibold">
          {isNaN(fearValue) ? "-" : fearValue}
          <span className="ml-2 text-base text-brand-ink/70">({fearClass})</span>
        </div>
        <div className="mt-2 text-xs text-brand-ink/60">출처: Alternative.me</div>
      </div>
    </div>
  );
}