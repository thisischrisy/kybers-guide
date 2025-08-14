import Link from "next/link";
import { KpiCard } from "@/components/KpiCard";
import { AdSlot } from "@/components/AdSlot";
import { sma, rsi } from "@/lib/indicators";
import { Badge } from "@/components/Badge";   // ✅ 추가
import { Info } from "@/components/Info";     // ✅ 추가

export const revalidate = 3600; // 이 페이지 데이터는 1시간 캐시

async function getGlobal() {
  const res = await fetch("https://api.coingecko.com/api/v3/global");
  return res.json();
}
async function getFng() {
  const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json");
  return res.json();
}
async function getBTC() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90&interval=daily"
  );
  return res.json(); // { prices: [[timestamp, price], ...] }
}

export default async function Home() {
  // 1) 세 가지 데이터 동시 로드
  const [global, fng, btc] = await Promise.all([getGlobal(), getFng(), getBTC()]);

  // 2) KPI에 쓸 값 꺼내기 (mcap/dom/fgi)
  const mcap: number | null = global?.data?.total_market_cap?.usd ?? null;
  const dom: number | null = global?.data?.market_cap_percentage?.btc ?? null;
  const fgi: string | null = fng?.data?.[0]?.value ?? null;

  // 3) 한 줄 요약 계산 (RSI/MA)
  const closes: number[] = Array.isArray(btc?.prices) ? btc.prices.map((p: any[]) => p[1]) : [];
  const ma20 = closes.length ? sma(closes, 20).at(-1) : null;
  const ma50 = closes.length ? sma(closes, 50).at(-1) : null;
  const ma200 = closes.length ? sma(closes, 200).at(-1) : null; // 90일만 불러서 NaN일 수 있음(괜찮음)
  const rsiLatest = closes.length ? rsi(closes, 14).at(-1) : null;

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 인트로 블록 */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-6 mb-4">
        <h2 className="text-lg font-semibold mb-2">불안과 혼란을 줄이는, 한눈에 보는 대시보드</h2>
        <p className="text-sm text-brand-ink/80 leading-6">
          암호화폐 시장, 너무 복잡하게 느껴지셨나요? <br />
          비트코인 가격, MACD, 도미넌스, 온체인 지표까지 — 흩어진 핵심 정보를 한눈에 정리해드립니다. <br />
          AI 분석으로 지금이 강세/약세인지 자동 판단하고, 초보자도 쉽게 시장 흐름을 읽을 수 있습니다.
        </p>
        <div className="mt-3 text-xs text-brand-ink/70">
          <div className="flex items-center gap-2">
            <span className="opacity-80">색상 가이드:</span>
            <Badge tone="buy">🟢 매수</Badge>
            <Badge tone="sell">🔴 매도</Badge>
            <Badge tone="neutral">⚪ 중립</Badge>
          </div>
        </div>
      </section>

      {/* AI 한 줄 요약 카드 */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-6 mb-4">
        <div className="text-sm mb-2 text-brand-ink/80">AI 한 줄 요약(보수적 룰 기반)</div>
        <div className="text-base">{summaryText()}</div>
      </section>

      {/* 히어로 + KPI 3개 */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-8">
        <h1 className="text-2xl font-semibold tracking-wide mb-2">
          시장 감정자와 가능성 가정자를 위한 최고의 조명 대시보드
        </h1>
        <p className="text-brand-ink/80">
          Kyber’s Guide — 신뢰 가능한 요약과 직관적 시각화로 핵심만 제공합니다.
        </p>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <KpiCard title="총 시가총액" value={mcap ? `$${(mcap / 1e12).toFixed(2)}T` : "-"} />
          <KpiCard title="BTC 도미넌스" value={dom ? `${dom.toFixed(1)}%` : "-"} />
          <KpiCard title="공포·탐욕 지수" value={fgi ?? "-"} />
        </div>

        {/* KPI 바로 아래 색상 가이드 + 툴팁 */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Badge tone="buy">🟢 매수</Badge>
            <Badge tone="sell">🔴 매도</Badge>
            <Badge tone="neutral">⚪ 중립</Badge>
          </div>
          <div className="text-brand-ink/70">
            <Info label="RSI" tip="RSI 70 이상 과열, 30 이하 과매도" /> ·{" "}
            <Info label="도미넌스" tip="BTC 비중 상승 시 알트 약세 가능성" />
          </div>
        </div>

        <div className="flex gap-3 mt-6 text-sm">
          <Link href="/overview" className="underline">시장 개요</Link>
          <Link href="/btc" className="underline">비트코인 단기 분석</Link>
          <Link href="/altcoin" className="underline">알트코인 섹터</Link>
          <Link href="/insight" className="underline">매크로 인사이트</Link>
        </div>
      </section>

      <AdSlot id="ad-home-mid" />

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-6">개요 프리뷰</div>
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-6">알트 프리뷰</div>
      </section>
    </div>
  );
}