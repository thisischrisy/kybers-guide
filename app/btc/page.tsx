// app/btc/page.tsx
import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Info } from "@/components/Info";
import { rsi, macd, sma } from "@/lib/indicators";
import { SIGNAL_EMOJI, SIGNAL_LABEL } from "@/lib/signal";
import { getMarkets, type Market } from "@/lib/coingecko";
import { AdSlot } from "@/components/AdSlot";

export const revalidate = 600; // 10분 캐시

// 클라이언트 전용 위젯은 동적 임포트
const TvChart = dynamic(() => import("@/components/TvChart").then(m => m.TvChart), { ssr: false });

async function getBTCPrices(days = 180) {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    return r.json(); // { prices: [[ts, price], ...] }
  } catch {
    return null;
  }
}

function usd(n: number | null | undefined) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}
function pct(n: number | null | undefined) {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  const sign = n > 0 ? "▲" : n < 0 ? "▼" : "";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

export default async function BTCPage() {
  // 1) 시세/지표 계산용 데이터
  const [btcChart, markets] = await Promise.all([getBTCPrices(180), getMarkets(50)]);
  const btcRow: Market | undefined = Array.isArray(markets)
    ? markets.find((m: Market) => m.id === "bitcoin")
    : undefined;

  // 가격/변동
  const priceNow = btcRow?.current_price ?? NaN;
  const ch24 = btcRow?.price_change_percentage_24h ?? NaN;
  const ch7d = (btcRow as any)?.price_change_percentage_7d_in_currency ?? NaN;
  const ch30d = (btcRow as any)?.price_change_percentage_30d_in_currency ?? NaN;

  // 2) RSI/MACD/MA
  const closes: number[] = Array.isArray(btcChart?.prices) ? btcChart.prices.map((p: any[]) => p[1]) : [];
  const lastClose = closes.at(-1) ?? NaN;

  const rsiArr = rsi(closes, 14);
  const rsiLast = rsiArr.at(-1) ?? NaN;

  const { macdLine, signalLine } = macd(closes);
  const macdCross =
    macdLine.at(-2) != null &&
    signalLine.at(-2) != null &&
    macdLine.at(-1) != null &&
    signalLine.at(-1) != null
      ? macdLine.at(-2)! < signalLine.at(-2)! && macdLine.at(-1)! > signalLine.at(-1)!
        ? "bull"
        : macdLine.at(-2)! > signalLine.at(-2)! && macdLine.at(-1)! < signalLine.at(-1)!
        ? "bear"
        : "none"
      : "none";

  const ma50Last = sma(closes, 50).at(-1) ?? NaN;
  const ma200Last = sma(closes, 200).at(-1) ?? NaN;
  const maCross =
    isFinite(ma50Last) && isFinite(ma200Last)
      ? ma50Last > ma200Last
        ? "golden"
        : ma50Last < ma200Last
        ? "dead"
        : "flat"
      : "unknown";

  // 3) 톤 결정 (MVP 규칙)
  type Tone = "buy" | "neutral" | "sell";
  const tone: Tone =
    macdCross === "bull" || maCross === "golden"
      ? "buy"
      : macdCross === "bear" || maCross === "dead"
      ? "sell"
      : "neutral";

  function summary() {
    const parts: string[] = [];
    if (macdCross === "bull") parts.push("MACD 골든크로스");
    if (macdCross === "bear") parts.push("MACD 데드크로스");
    if (isFinite(rsiLast)) {
      if (rsiLast >= 70) parts.push(`RSI ${Math.round(rsiLast)} 과열`);
      else if (rsiLast <= 30) parts.push(`RSI ${Math.round(rsiLast)} 과매도`);
      else parts.push(`RSI ${Math.round(rsiLast)}`);
    }
    if (maCross === "golden") parts.push("MA(50/200) 골든");
    if (maCross === "dead") parts.push("MA(50/200) 데드");
    if (!parts.length) return "데이터 수집 중 — 보수적 유지";
    return parts.join(", ");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h2 className="text-xl font-semibold">비트코인 분석</h2>

      {/* Hero + KPI */}
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6 space-y-4">
        {/* 신호 배지 */}
        <div className="flex items-center gap-2 text-sm">
          <Badge tone={tone}>
            {SIGNAL_EMOJI[tone]} {SIGNAL_LABEL[tone]}
          </Badge>
          <span className="text-brand-ink/70">{summary()}</span>
        </div>

        {/* KPI 라인 */}
        <div className="text-sm text-brand-ink/80 flex flex-wrap gap-x-6 gap-y-1">
          <div>가격: <b>{isFinite(priceNow) ? usd(priceNow) : "-"}</b></div>
          <div>24h: <b className={isFinite(ch24) && ch24 >= 0 ? "text-emerald-300" : "text-rose-300"}>{pct(ch24)}</b></div>
          <div>7d: <b className={isFinite(ch7d) && ch7d >= 0 ? "text-emerald-300" : "text-rose-300"}>{pct(ch7d)}</b></div>
          <div>30d: <b className={isFinite(ch30d) && ch30d >= 0 ? "text-emerald-300" : "text-rose-300"}>{pct(ch30d)}</b></div>
        </div>

        {/* TV 차트 (D=1Day) */}
        <div className="mt-2">
          <TvChart symbol="bitcoin" interval="D" height={420} />
        </div>

        {/* 툴팁/가이드 라벨 */}
        <div className="text-xs text-brand-ink/70 flex gap-3 mt-2">
          <Info label="RSI" tip="70 이상 과열, 30 이하 과매도" />
          <Info label="MACD" tip="MACD선이 시그널선 돌파 시 모멘텀 전환" />
          <Info label="MA(50/200)" tip="장기 추세 골든/데드 크로스" />
        </div>
      </div>

      {/* (선택) 광고 */}
      <AdSlot id="btc-mid" />

      {/* 필요한 경우: 아래에 기존 세부 카드(예: RSI/MACD 카드, 파생 지표 등)를 이어서 배치 */}
    </div>
  );
}