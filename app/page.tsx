// app/page.tsx
import Link from "next/link";
import { KpiCard } from "@/components/KpiCard";
import { AdSlot } from "@/components/AdSlot";
import { sma, rsi } from "@/lib/indicators";

export const revalidate = 3600;

// ===== 데이터 fetch 함수들 =====
async function getGlobal() {
  const res = await fetch("https://api.coingecko.com/api/v3/global");
  return res.json();
}
async function getFng() {
  const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json");
  return res.json();
}
async function getBTC() {
  const res = await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily");
  return res.json();
}
async function getETH() {
  const res = await fetch("https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=7&interval=daily");
  return res.json();
}

// ===== 유틸 =====
function pct(a: number|null, b: number|null) {
  if (typeof a !== "number" || typeof b !== "number" || b === 0) return null;
  return ((a - b) / b) * 100;
}
function fgiText(v: string | null) {
  const n = Number(v ?? NaN);
  if (isNaN(n)) return "중립";
  if (n < 25) return "극공포";
  if (n < 45) return "공포";
  if (n < 55) return "중립";
  if (n < 75) return "탐욕";
  return "극탐욕";
}

// ===== 홈 페이지 =====
export default async function Home() {
  const [global, fng, btc, eth] = await Promise.all([getGlobal(), getFng(), getBTC(), getETH()]);

  // BTC/ETH 가격 배열
  const btcCloses: number[] = Array.isArray(btc?.prices) ? btc.prices.map((p: any[]) => p[1]) : [];
  const ethCloses: number[] = Array.isArray(eth?.prices) ? eth.prices.map((p: any[]) => p[1]) : [];

  // 최신/이전 값
  const btcLast = btcCloses.at(-1) ?? null;
  const btcPrev = btcCloses.at(-2) ?? null;
  const ethLast = ethCloses.at(-1) ?? null;
  const ethPrev = ethCloses.at(-2) ?? null;

  // % 변동
  const btc24h = pct(btcLast, btcPrev);
  const eth24h = pct(ethLast, ethPrev);

  // === 헤드라인 / 요약 ===
  function headlineText() {
    const ma20 = btcCloses.length ? sma(btcCloses, 20).at(-1) : null;
    const ma50 = btcCloses.length ? sma(btcCloses, 50).at(-1) : null;
    const rsiLatest = btcCloses.length ? rsi(btcCloses, 14).at(-1) : null;

    const up = (x: number|null|undefined) => typeof x === "number" && x >= 0.2;
    const dn = (x: number|null|undefined) => typeof x === "number" && x <= -0.2;

    const btcStr = typeof btc24h === "number" ? `${btc24h >= 0 ? "▲" : "▼"} ${Math.abs(btc24h).toFixed(1)}%` : "-";
    const ethStr = typeof eth24h === "number" ? `${eth24h >= 0 ? "▲" : "▼"} ${Math.abs(eth24h).toFixed(1)}%` : "-";

    const parts: string[] = [];
    if (up(btc24h) && up(eth24h)) parts.push("BTC·ETH 동반 상승");
    else if (dn(btc24h) && dn(eth24h)) parts.push("BTC·ETH 동반 하락");
    else parts.push("Crypto 혼조");

    if (ma20 && ma50 && ma20 > ma50) parts.push("단기 모멘텀↑");
    if (typeof rsiLatest === "number") {
      if (rsiLatest >= 70) parts.push("RSI 과열");
      else if (rsiLatest <= 30) parts.push("RSI 과매도");
    }

    const mood = fgiText(fng?.data?.[0]?.value ?? null);
    return `🔥 ${parts.join(" · ")} | BTC ${btcStr} · ETH ${ethStr} | 심리: ${mood}`;
  }

  function plainSummary() {
    const b = typeof btc24h === "number" ? (btc24h >= 0 ? `BTC ▲${btc24h.toFixed(1)}%` : `BTC ▼${Math.abs(btc24h).toFixed(1)}%`) : "BTC -";
    const e = typeof eth24h === "number" ? (eth24h >= 0 ? `ETH ▲${eth24h.toFixed(1)}%` : `ETH ▼${Math.abs(eth24h).toFixed(1)}%`) : "ETH -";
    const mood = fgiText(fng?.data?.[0]?.value ?? null);
    return `${b} · ${e} · 심리: ${mood}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">

      {/* === 큰 배너 인트로 === */}
      <section className="rounded-2xl bg-gradient-to-r from-brand-gold/90 to-brand-gold/60 text-black p-8 text-center shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">흩어진 핵심 정보를 한눈에 정리</h1>
        <p className="text-base md:text-lg font-medium">
          AI 분석으로 지금이 강세/약세인지 자동 판단합니다.<br />
          초보자도 쉽게 시장 흐름을 읽을 수 있습니다.
        </p>
      </section>

      {/* === 오늘의 투자 헤드라인 (자극적) === */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-6">
        <div className="text-sm mb-1 text-brand-ink/70">오늘의 투자 헤드라인</div>
        <div className="text-base font-semibold">{headlineText()}</div>
        <div className="mt-1 text-xs text-brand-ink/60">
          * AI 데이터 기반 자동 요약 (투자 손실 가능성 존재)
        </div>
      </section>

      {/* === 보수적 요약 === */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-4">
        <div className="text-xs mb-1 text-brand-ink/70">보수적 요약</div>
        <div className="text-sm">{plainSummary()}</div>
      </section>

      {/* === 예: KPI 카드 / 광고 등 기존 섹션 이어가기 === */}
      <section className="grid md:grid-cols-3 gap-4">
        <KpiCard title="Global Market Cap" value={global?.data?.total_market_cap?.usd?.toLocaleString() ?? "-"} />
        <KpiCard title="BTC Dominance" value={`${global?.data?.market_cap_percentage?.btc?.toFixed(1) ?? "-"}%`} />
        <KpiCard title="ETH Dominance" value={`${global?.data?.market_cap_percentage?.eth?.toFixed(1) ?? "-"}%`} />
      </section>

      <AdSlot id="home-mid" />

      {/* … 이후 비트코인 프리뷰, 알트코인 프리뷰 섹션들 */}
    </div>
  );
}