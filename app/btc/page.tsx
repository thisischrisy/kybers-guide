// app/btc/page.tsx
import dynamic from "next/dynamic";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { Badge } from "@/components/Badge";
import { Info } from "@/components/Info";
import { rsi, macd, sma } from "@/lib/indicators";
import { SIGNAL_EMOJI, SIGNAL_LABEL } from "@/lib/signal";
import { getMarkets, type Market } from "@/lib/coingecko";

export const revalidate = 600; // 10분 캐시

// 클라이언트 전용 위젯(차트/스파크라인)은 동적 임포트
const TvChart = dynamic(() => import("@/components/TvChart").then(m => m.TvChart), { ssr: false });
const MiniLine = dynamic(() => import("@/components/MiniLine").then(m => m.MiniLine), { ssr: false });

// ---------- 유틸 ----------
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
function takeEvery<T>(arr: T[], step: number) {
  if (step <= 1) return arr.slice();
  const out: T[] = [];
  for (let i = Math.max(arr.length % step, 0); i < arr.length; i += step) {
    out.push(arr[i]);
  }
  return out.length ? out : arr.slice(); // 최소 안전장치
}
function toWeeklyFromDaily(closes: number[]) {
  // 7개씩 묶어 마지막 값 사용(대략 주봉)
  const out: number[] = [];
  for (let i = 6; i < closes.length; i += 7) out.push(closes[i]);
  return out.length ? out : closes.slice();
}

// ---------- 데이터 ----------
async function getBTCMarketChart(days: number, interval: "hourly" | "daily") {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=${interval}`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    return r.json() as Promise<{ prices: [number, number][] }>;
  } catch {
    return null;
  }
}

// ---------- 신호 계산 ----------
type Tone = "buy" | "neutral" | "sell";
function toneByIndicators(closes: number[]) {
  if (!Array.isArray(closes) || closes.length < 50) {
    return {
      tone: "neutral" as Tone,
      rsiLast: NaN,
      macdCross: "none" as "bull" | "bear" | "none",
      maCross: "unknown" as "golden" | "dead" | "flat" | "unknown",
      summary: "데이터 수집 중 — 보수적 유지",
    };
  }
  const rsiArr = rsi(closes, 14);
  const rsiLast = rsiArr.at(-1) ?? NaN;

  const { macdLine, signalLine, hist } = macd(closes);
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

  const parts: string[] = [];
  if (macdCross === "bull") parts.push("MACD 골든");
  if (macdCross === "bear") parts.push("MACD 데드");
  if (isFinite(rsiLast)) {
    if (rsiLast >= 70) parts.push(`RSI ${Math.round(rsiLast)} 과열`);
    else if (rsiLast <= 30) parts.push(`RSI ${Math.round(rsiLast)} 과매도`);
    else parts.push(`RSI ${Math.round(rsiLast)}`);
  }
  if (maCross === "golden") parts.push("MA(50/200) 골든");
  if (maCross === "dead") parts.push("MA(50/200) 데드");

  const tone: Tone =
    macdCross === "bull" || maCross === "golden"
      ? "buy"
      : macdCross === "bear" || maCross === "dead"
      ? "sell"
      : "neutral";

  return {
    tone,
    rsiLast,
    macdCross,
    maCross,
    summary: parts.length ? parts.join(", ") : "지표 중립 — 방향성 모색",
  };
}

export default async function BTCPage() {
  // 1) 마켓/가격 요약
  const [markets, d180, h3, h14, d1500] = await Promise.all([
    getMarkets(50),                 // 요약 KPI(24h/7d/30d)
    getBTCMarketChart(180, "daily"),// 1D 신호용/미니라인용
    getBTCMarketChart(3, "hourly"), // 1H 신호용 (시간봉)
    getBTCMarketChart(14, "hourly"),// 4H 신호용 (시간봉 다운샘플)
    getBTCMarketChart(1500, "daily")// 1W 신호용 (일봉→주봉 변환)
  ]);

  const btcRow: Market | undefined = Array.isArray(markets)
    ? markets.find((m: Market) => m.id === "bitcoin")
    : undefined;

  const priceNow = btcRow?.current_price ?? NaN;
  const ch24 = btcRow?.price_change_percentage_24h ?? NaN;
  const ch7d = (btcRow as any)?.price_change_percentage_7d_in_currency ?? NaN;
  const ch30d = (btcRow as any)?.price_change_percentage_30d_in_currency ?? NaN;

  // 2) 타임프레임별 신호 산출
  const close1H = Array.isArray(h3?.prices) ? h3!.prices.map(p => p[1]) : [];
  const close4H_hourly = Array.isArray(h14?.prices) ? h14!.prices.map(p => p[1]) : [];
  const close4H = takeEvery(close4H_hourly, 4); // 4시간봉 대용

  const close1D = Array.isArray(d180?.prices) ? d180!.prices.map(p => p[1]) : [];
  const close1W = Array.isArray(d1500?.prices) ? toWeeklyFromDaily(d1500!.prices.map(p => p[1])) : [];

  const sig1H = toneByIndicators(close1H);
  const sig4H = toneByIndicators(close4H);
  const sig1D = toneByIndicators(close1D);
  const sig1W = toneByIndicators(close1W);

  // 3) 페이지 상단 종합 톤(대표)
  const headlineTone: Tone =
    sig1D.tone === "buy" || sig1W.tone === "buy"
      ? "buy"
      : sig1D.tone === "sell" && sig1W.tone === "sell"
      ? "sell"
      : "neutral";

  // 미니라인 데이터(최근 90일)
  const miniLabels = close1D.slice(-90).map((_, i) => `${i}`);
  const miniValues = close1D.slice(-90);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h2 className="text-xl font-semibold">비트코인 분석</h2>

      {/* Hero 섹션: 신호 배지 + KPI + 차트 */}
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6 space-y-4">
        {/* 대표 신호 */}
        <div className="flex items-center gap-2 text-sm">
          <Badge tone={headlineTone}>
            {SIGNAL_EMOJI[headlineTone]} {SIGNAL_LABEL[headlineTone]}
          </Badge>
          <span className="text-brand-ink/70">
            {sig1D.summary} · {sig1W.summary}
          </span>
        </div>

        {/* KPI */}
        <div className="text-sm text-brand-ink/80 flex flex-wrap gap-x-6 gap-y-1">
          <div>가격: <b>{isFinite(priceNow) ? usd(priceNow) : "-"}</b></div>
          <div>24h: <b className={isFinite(ch24) && ch24 >= 0 ? "text-emerald-300" : "text-rose-300"}>{pct(ch24)}</b></div>
          <div>7d: <b className={isFinite(ch7d) && ch7d >= 0 ? "text-emerald-300" : "text-rose-300"}>{pct(ch7d)}</b></div>
          <div>30d: <b className={isFinite(ch30d) && ch30d >= 0 ? "text-emerald-300" : "text-rose-300"}>{pct(ch30d)}</b></div>
        </div>

        {/* TV 차트 */}
        <div className="mt-2">
          <TvChart symbol="bitcoin" interval="D" height={420} />
        </div>

        {/* 지표 가이드 */}
        <div className="text-xs text-brand-ink/70 flex gap-3 mt-2">
          <Info label="RSI" tip="70 이상 과열, 30 이하 과매도" />
          <Info label="MACD" tip="MACD선이 시그널선 돌파 시 모멘텀 전환" />
          <Info label="MA(50/200)" tip="장기 추세 골든/데드 크로스" />
        </div>
      </div>

      {/* 타임프레임 신호 요약 */}
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm text-brand-ink/80 mb-3">타임프레임 신호 요약</div>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            { k: "1H", s: sig1H },
            { k: "4H", s: sig4H },
            { k: "1D", s: sig1D },
            { k: "1W", s: sig1W },
          ].map(({ k, s }) => (
            <span key={k} title={s.summary}>
              <Badge tone={s.tone}>
                <span className="mr-1 opacity-80">{k}</span>
                {SIGNAL_EMOJI[s.tone]} {SIGNAL_LABEL[s.tone]}
              </Badge>
            </span>
          ))}
        </div>
        <div className="mt-3 text-xs text-brand-ink/60">
          ※ 4H/1W 신호는 시간봉/일봉 데이터를 간략 변환해 산출한 <b>MVP 근사치</b>입니다.
        </div>
      </div>

      {/* 지표 상세(간단) + 미니라인 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 미니라인: 최근 90일 종가 */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
          <div className="text-sm text-brand-ink/80 mb-2">BTC 스파크라인 (최근 90일)</div>
          {miniValues.length ? (
            <MiniLine labels={miniLabels} values={miniValues} />
          ) : (
            <div className="text-sm text-brand-ink/60">데이터 수집 중…</div>
          )}
        </div>

        {/* RSI/MACD/MA 현황 텍스트 */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
          <div className="text-sm text-brand-ink/80 mb-2">지표 요약 (1D 기준)</div>
          <ul className="text-sm leading-6 text-brand-ink/80 list-disc pl-5">
            <li>{sig1D.summary}</li>
            <li>주봉 관점: {sig1W.summary}</li>
            <li>단기(1H/4H): {sig1H.summary} · {sig4H.summary}</li>
          </ul>
          <div className="mt-2 text-xs text-brand-ink/60">
            ※ 상세 지표 차트(MACD 히스토그램/RSI 라인)는 추후 카드형으로 확장 예정.
          </div>
        </div>
      </div>

      {/* 광고(유지) */}
      <AdSlot id="btc-mid" />
    </div>
  );
}