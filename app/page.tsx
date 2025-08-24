// app/page.tsx
import Link from "next/link";
import { KpiCard } from "@/components/KpiCard";
import { AdSlot } from "@/components/AdSlot";
import { sma, rsi } from "@/lib/indicators";

export const revalidate = 3600; // 이 페이지 데이터는 1시간 캐시

// --- 데이터 불러오기 유틸 ---
async function getGlobal() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global", { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
async function getFng() {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json", { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
async function getBTC(days = 90) {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return null;
    return res.json(); // { prices: [[timestamp, price], ...] }
  } catch {
    return null;
  }
}
// ETH는 24h 변화율 계산용으로 2일만 받아 성능/비용 최소화
async function getETH2d() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=2&interval=daily",
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return null;
    return res.json(); // { prices: [[ts, price], [ts, price]] }
  } catch {
    return null;
  }
}

// --- 포맷터 ---
function fmtUSD(n: number | null | undefined) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}
function pctChange(a?: number, b?: number) {
  if (typeof a !== "number" || typeof b !== "number" || !isFinite(a) || !isFinite(b) || b === 0) return null;
  return ((a - b) / b) * 100;
}

// --- 페이지 ---
export default async function Home() {
  // 1) 필요한 데이터 동시 로드
  const [global, fng, btc, eth2d] = await Promise.all([getGlobal(), getFng(), getBTC(90), getETH2d()]);

  // 2) KPI에 쓸 값 꺼내기 (mcap/dom/fgi)
  const mcap: number | null = global?.data?.total_market_cap?.usd ?? null;
  const dom: number | null = global?.data?.market_cap_percentage?.btc ?? null;
  const fgi: string | null = fng?.data?.[0]?.value ?? null;

  // 3) BTC 지표 계산 (RSI/MA + 24h 변화율)
  const closes: number[] = Array.isArray(btc?.prices) ? btc.prices.map((p: any[]) => p[1]) : [];
  const ma20 = closes.length ? sma(closes, 20).at(-1) : null;
  const ma50 = closes.length ? sma(closes, 50).at(-1) : null;
  const rsiLatest = closes.length ? rsi(closes, 14).at(-1) : null;

  const lastBTC = closes.at(-1) ?? null;
  const prevBTC = closes.at(-2) ?? null;
  const btc24h = pctChange(lastBTC ?? undefined, prevBTC ?? undefined);

  // 4) ETH 24h 변화율 계산 (2일치 데이터로)
  const ethCloses: number[] = Array.isArray(eth2d?.prices) ? eth2d.prices.map((p: any[]) => p[1]) : [];
  const lastETH = ethCloses.at(-1) ?? null;
  const prevETH = ethCloses.at(-2) ?? null;
  const eth24h = pctChange(lastETH ?? undefined, prevETH ?? undefined);

  // 5) AI 한 줄 요약 (보수적 톤)
  function summaryText() {
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
    if (!parts.length) return "데이터 수집 중 — 보수적 관점 유지";
    return `🔎 ${parts.join(", ")} — 보수적 관점 유지`;
  }

  // 6) 오늘의 투자 헤드라인 (임시 간단 로직)
  // - BTC/ETH 24h 변화 + FGI로 시장 톤을 한 줄 설명
  function headlineText() {
    const btcStr = typeof btc24h === "number" ? `${btc24h >= 0 ? "▲" : "▼"} BTC ${btc24h.toFixed(2)}%` : "BTC 데이터 대기";
    const ethStr = typeof eth24h === "number" ? `${eth24h >= 0 ? "▲" : "▼"} ETH ${eth24h.toFixed(2)}%` : "ETH 데이터 대기";
    const fgiVal = Number(fgi ?? NaN);
    const fgiLabel = isNaN(fgiVal)
      ? "심리: -"
      : fgiVal < 25 ? "심리: 극공포"
      : fgiVal < 45 ? "심리: 공포"
      : fgiVal < 55 ? "심리: 중립"
      : fgiVal < 75 ? "심리: 탐욕"
      : "심리: 극탐욕";
    // 톤 뱃지
    const tone = (typeof btc24h === "number" && typeof eth24h === "number" && btc24h > 0 && eth24h > 0) ? "🟢 강세 톤"
      : (typeof btc24h === "number" && typeof eth24h === "number" && btc24h < 0 && eth24h < 0) ? "🔴 약세 톤"
      : "🟡 혼조";
    return `📢 오늘의 투자 헤드라인 — ${tone} · ${btcStr} · ${ethStr} · ${fgiLabel}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 0) 인트로(사이트 아이덴티티) */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-6 mb-4">
        <h2 className="text-lg font-semibold mb-2">불안과 혼란을 줄이는, 한눈에 보는 대시보드</h2>
        <p className="text-sm text-brand-ink/80 leading-6">
          암호화폐 시장, 너무 복잡하게 느껴지셨나요? <br />
          비트코인 가격, MACD, 도미넌스, 온체인 지표까지 — 흩어진 핵심 정보를 한눈에 정리해드립니다. <br />
          <strong>AI 분석</strong>으로 지금이 강세/약세인지 자동 판단하고, 초보자도 쉽게 시장 흐름을 읽을 수 있습니다.
        </p>
        <div className="mt-3 text-xs text-brand-ink/70">
          <div className="flex items-center gap-2">
            <span className="opacity-80">색상 가이드:</span>
            {/* 예: <Badge tone="buy">🟢 매수</Badge> / <Badge tone="neutral">🟡 중립</Badge> / <Badge tone="sell">🔴 매도</Badge> */}
            <span className="inline-flex items-center gap-1 rounded-md bg-green-600/20 px-2 py-0.5 text-xs">🟢 매수</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-yellow-500/20 px-2 py-0.5 text-xs">🟡 중립</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-red-600/20 px-2 py-0.5 text-xs">🔴 매도</span>
          </div>
        </div>
      </section>

      {/* 1) 오늘의 투자 헤드라인 (임시 버전) */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-6 mb-4">
        <div className="text-sm mb-2 text-brand-ink/80">오늘의 투자 헤드라인</div>
        <div className="text-base">{headlineText()}</div>
      </section>

      {/* 2) AI 한 줄 요약 (보수적 룰 기반) */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-6 mb-4">
        <div className="text-sm mb-2 text-brand-ink/80">AI 한 줄 요약(보수적 룰 기반)</div>
        <div className="text-base">{summaryText()}</div>
      </section>

      {/* 3) 히어로 + KPI 3개 */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-8">
        <h1 className="text-2xl font-semibold tracking-wide mb-2">
          시장 감정자와 가능성 가정자를 위한 최고의 조명 대시보드
        </h1>
        <p className="text-brand-ink/80">
          Kyber’s Guide — 신뢰 가능한 요약과 직관적 시각화로 핵심만 제공합니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <KpiCard title="총 시가총액" value={fmtUSD(mcap)} />
          <KpiCard title="BTC 도미넌스" value={typeof dom === "number" ? `${dom.toFixed(1)}%` : "-"} />
          <KpiCard title="공포·탐욕 지수" value={fgi ?? "-"} />
        </div>
        <div className="flex gap-3 mt-6 text-sm">
          <Link href="/overview" className="underline">시장 개요</Link>
          <Link href="/btc" className="underline">비트코인 단기 분석</Link>
          <Link href="/altcoin" className="underline">알트코인 섹터</Link>
          <Link href="/insight" className="underline">매크로 인사이트</Link>
        </div>
      </section>

      {/* 중간 광고 */}
      <AdSlot id="ad-home-mid" />

      {/* 4) 프리뷰 영역 */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-6">
          <div className="text-sm mb-2 text-brand-ink/80">시장 개요 프리뷰</div>
          <p className="text-sm text-brand-ink/70">Rainbow, 도미넌스, 스테이블 총량, FGI 하이라이트 (요약)</p>
        </div>
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-6">
          <div className="text-sm mb-2 text-brand-ink/80">알트코인 프리뷰</div>
          <p className="text-sm text-brand-ink/70">Top Movers & 섹터 요약 (간단 미리보기)</p>
        </div>
      </section>
    </div>
  );
}