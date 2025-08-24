import Link from "next/link";
import { KpiCard } from "@/components/KpiCard";
import { AdSlot } from "@/components/AdSlot";
import { sma, rsi } from "@/lib/indicators";

export const revalidate = 1800; // 30분 캐시

/** ---------- 외부 데이터 ---------- */
async function getGlobal() {
  const res = await fetch("https://api.coingecko.com/api/v3/global", { next: { revalidate } });
  return res.json();
}
async function getFng() {
  const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json", { next: { revalidate } });
  return res.json();
}
async function getBTC() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=120&interval=daily",
    { next: { revalidate } }
  );
  return res.json(); // { prices: [[timestamp, price], ...] }
}
// 상위 코인 리스트(+ 24h/7d/30d 퍼센트)
async function getMarkets() {
  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc" +
    "&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d,30d";
  const res = await fetch(url, { next: { revalidate } });
  return res.json(); // [{ id, symbol, name, market_cap, price_change_percentage_24h, ... , price_change_percentage_7d_in_currency, price_change_percentage_30d_in_currency }]
}

/** ---------- 헬퍼 ---------- */
function fmtUSD(n: number | null | undefined) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

function toneBadge(tone: "buy" | "neutral" | "sell") {
  const base = "inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold";
  if (tone === "buy") return `${base} bg-emerald-500/20 text-emerald-300 border border-emerald-400/30`;
  if (tone === "sell") return `${base} bg-red-500/20 text-red-300 border border-red-400/30`;
  return `${base} bg-yellow-500/20 text-yellow-300 border border-yellow-400/30`;
}

/** “오늘의 강력 매수 추천” 간단 규칙(무료 MVP 버전)
 * - 24h > +2%
 * - 7d > +5%
 * - 30d >= 0%
 * - 시총 상위(기본 데이터 내 상위 100)
 * - 최대 6개 노출
 */
function pickStrongBuys(markets: any[]) {
  const picked = markets
    .filter((c: any) => {
      const ch24 = c.price_change_percentage_24h ?? c.price_change_percentage_24h_in_currency;
      const ch7 = c.price_change_percentage_7d_in_currency;
      const ch30 = c.price_change_percentage_30d_in_currency;
      return (
        typeof ch24 === "number" &&
        typeof ch7 === "number" &&
        typeof ch30 === "number" &&
        ch24 > 2 &&
        ch7 > 5 &&
        ch30 >= 0
      );
    })
    .slice(0, 6);
  return picked;
}

export default async function Home() {
  const [global, fng, btc, markets] = await Promise.all([
    getGlobal(),
    getFng(),
    getBTC(),
    getMarkets(),
  ]);

  // KPI 값
  const mcap: number | null = global?.data?.total_market_cap?.usd ?? null;
  const dom: number | null = global?.data?.market_cap_percentage?.btc ?? null;
  const fgi: string | null = fng?.data?.[0]?.value ?? null;

  // AI 인사이트 텍스트(보수적 톤)
  const closes: number[] = Array.isArray(btc?.prices) ? btc.prices.map((p: any[]) => p[1]) : [];
  const ma20 = closes.length ? sma(closes, 20).at(-1) : null;
  const ma50 = closes.length ? sma(closes, 50).at(-1) : null;
  const rsiLatest = closes.length ? rsi(closes, 14).at(-1) : null;

  function aiSummary() {
    const parts: string[] = [];
    if (ma20 && ma50) {
      if (ma20 > ma50) parts.push("단기 모멘텀 우위");
      else if (ma20 < ma50) parts.push("단기 모멘텀 약화");
    }
    if (typeof rsiLatest === "number") {
      if (rsiLatest >= 70) parts.push(`RSI ${Math.round(rsiLatest)} (과열)`);
      else if (rsiLatest <= 30) parts.push(`RSI ${Math.round(rsiLatest)} (과매도)`);
      else parts.push(`RSI ${Math.round(rsiLatest)}`);
    }
    if (typeof dom === "number") parts.push(`BTC 도미넌스 ${dom.toFixed(1)}%`);
    if (!parts.length) return "데이터 수집 중 — 보수적 관점 유지";
    return `🔎 ${parts.join(" · ")} — 보수적 관점 유지`;
  }

  // 강력 매수 추천
  const strongBuys = Array.isArray(markets) ? pickStrongBuys(markets) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* ==================== 배너(아이덴티티) ==================== */}
      <section className="rounded-2xl border border-brand-line/30 bg-[linear-gradient(135deg,#031f1f_0%,#083232_60%,#0f4747_100%)] p-7 shadow-card">
        <div className="text-xs uppercase tracking-widest text-brand-gold/90 mb-2">Kyber’s Guide</div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-brand-ink">흩어진 시장 신호를 정리합니다.</h1>
        <p className="text-sm sm:text-base text-brand-ink/80 leading-6 mt-2">
          AI 분석으로 지금이 강세인지 약세인지 자동 판단하고, 초보자도 쉽게 시장 흐름을 읽을 수 있습니다.
          핵심만 간결하게 — <span className="font-semibold text-brand-gold">매수 · 중립 · 매도</span> 신호로 제공합니다.
        </p>

        {/* 색상 가이드 배지 */}
        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className="opacity-80">색상 가이드:</span>
          <span className={toneBadge("buy")}>🟢 매수</span>
          <span className={toneBadge("neutral")}>🟡 중립</span>
          <span className={toneBadge("sell")}>🔴 매도</span>
        </div>
      </section>

      {/* ==================== 오늘의 강력 매수 추천 ==================== */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">오늘의 강력 매수 추천</h2>
          <Link href="/altcoin" className="text-sm underline text-brand-gold/90">알트코인 더 보기</Link>
        </div>
        <p className="text-xs text-brand-ink/70 mt-1">
          단·중·장기 모두 “상승 우세”에 가까운 간단 규칙(무료 MVP)으로 선별합니다.
        </p>

        {strongBuys.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {strongBuys.map((c: any) => (
              <Link
                key={c.id}
                href={`/coin/${c.id}`}
                className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4 hover:border-brand-gold/40 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{c.name} <span className="text-brand-ink/60">({String(c.symbol).toUpperCase()})</span></div>
                  <span className={toneBadge("buy")}>매수</span>
                </div>
                <div className="mt-2 text-sm text-brand-ink/80">
                  시총: {fmtUSD(c.market_cap)}
                </div>
                <div className="mt-1 text-xs text-brand-ink/70">
                  24h: {typeof c.price_change_percentage_24h === "number" ? c.price_change_percentage_24h.toFixed(2) : "-"}% ·{" "}
                  7d: {typeof c.price_change_percentage_7d_in_currency === "number" ? c.price_change_percentage_7d_in_currency.toFixed(2) : "-"}% ·{" "}
                  30d: {typeof c.price_change_percentage_30d_in_currency === "number" ? c.price_change_percentage_30d_in_currency.toFixed(2) : "-"}%
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-brand-ink/60">조건에 맞는 코인이 없습니다. (데이터 수집 중이거나 시장이 약세일 수 있습니다)</div>
        )}
      </section>

      {/* ==================== AI 인사이트(보수적) ==================== */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-6">
        <div className="text-sm mb-2 text-brand-ink/80">AI 시장 인사이트 (보수적 룰 기반)</div>
        <div className="text-base">{aiSummary()}</div>
      </section>

      {/* ==================== KPI 3개 + 네비 ==================== */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-8">
        <h3 className="text-xl font-semibold tracking-wide mb-2">시장 개요 요약</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <KpiCard title="총 시가총액" value={fmtUSD(mcap)} />
          <KpiCard title="BTC 도미넌스" value={dom ? `${dom.toFixed(1)}%` : "-"} />
          <KpiCard title="공포·탐욕 지수" value={fgi ?? "-"} />
        </div>

        <div className="flex flex-wrap gap-3 mt-6 text-sm">
          <Link href="/overview" className="underline">시장 개요</Link>
          <Link href="/btc" className="underline">비트코인 단기 분석</Link>
          <Link href="/altcoin" className="underline">알트코인 섹터</Link>
          <Link href="/insight" className="underline">매크로 인사이트</Link>
          <Link href="/premium" className="underline">프리미엄 인사이트(데모)</Link>
        </div>
      </section>

      {/* 광고 */}
      <AdSlot id="home-mid" />

      {/* 프리뷰 박스(유지) */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-6">개요 프리뷰</div>
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-6">알트 프리뷰</div>
      </section>
    </div>
  );
}