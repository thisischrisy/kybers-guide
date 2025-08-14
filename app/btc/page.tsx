import { Badge } from "@/components/Badge";
import { Info } from "@/components/Info";
import { rsi, macd, sma } from "@/lib/indicators";

export const revalidate = 1800; // 30분 캐시

async function getBTC() {
  const res = await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90&interval=daily");
  return res.json();
}

export default async function BTCPage() {
  const btc = await getBTC();
  const closes: number[] = Array.isArray(btc?.prices) ? btc.prices.map((p: any[]) => p[1]) : [];
  const last = closes.at(-1) ?? null;

  const rsiArr = rsi(closes, 14);
  const rsiLast = rsiArr.at(-1);
  const { macdLine, signalLine, hist } = macd(closes);
  const macdCross = macdLine.at(-2) != null && signalLine.at(-2) != null && macdLine.at(-1) != null && signalLine.at(-1) != null
    ? (macdLine.at(-2)! < signalLine.at(-2)! && macdLine.at(-1)! > signalLine.at(-1)! ? "bull"
      : macdLine.at(-2)! > signalLine.at(-2)! && macdLine.at(-1)! < signalLine.at(-1)! ? "bear" : "none")
    : "none";

  const ma50 = sma(closes, 50).at(-1);
  const ma200 = sma(closes, 200).at(-1);
  const maCross = (ma50 && ma200)
    ? (ma50 > ma200 ? "golden" : ma50 < ma200 ? "dead" : "flat")
    : "unknown";

  function summary() {
    const parts: string[] = [];
    if (macdCross === "bull") parts.push("MACD 골든크로스");
    if (macdCross === "bear") parts.push("MACD 데드크로스");
    if (typeof rsiLast === "number") {
      if (rsiLast >= 70) parts.push(`RSI ${Math.round(rsiLast)} 과열`);
      else if (rsiLast <= 30) parts.push(`RSI ${Math.round(rsiLast)} 과매도`);
      else parts.push(`RSI ${Math.round(rsiLast)}`);
    }
    if (maCross === "golden") parts.push("MA(50/200) 골든");
    if (maCross === "dead") parts.push("MA(50/200) 데드");
    if (!parts.length) return "데이터 수집 중 — 보수적 유지";
    return parts.join(", ");
  }

  const tone: "buy"|"sell"|"neutral" =
    macdCross === "bull" || maCross === "golden" ? "buy" :
    macdCross === "bear" || maCross === "dead" ? "sell" : "neutral";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h2 className="text-xl font-semibold">비트코인 단기 분석</h2>

      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="flex items-center gap-2 text-sm mb-2">
          <Badge tone={tone}>
            {tone === "buy" ? "🟢 상승세" : tone === "sell" ? "🔴 하락세" : "⚪ 중립"}
          </Badge>
          <span className="text-brand-ink/70">{summary()}</span>
        </div>
        <div className="text-xs text-brand-ink/70 flex gap-3">
          <Info label="RSI" tip="70 이상 과열, 30 이하 과매도" />
          <Info label="MACD" tip="MACD선이 시그널선 돌파 시 모멘텀 전환" />
          <Info label="MA(50/200)" tip="장기 추세 골든/데드 크로스" />
        </div>
        <div className="mt-3 text-sm text-brand-ink/80">
          가격(스냅샷): {last ? `$${Math.round(last).toLocaleString()}` : "-"}
        </div>
        {/* 차트는 후순위 — 자리만 */}
        <div className="mt-4 rounded-lg border border-brand-line/30 bg-brand-card/40 p-4 text-sm text-brand-ink/60">
          차트 추가 예정 (캔들 + MACD/RSI 오버레이)
        </div>
      </div>

      {/* 광고 */}
      <div className="mt-6">
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-4 text-xs text-brand-ink/60">
          광고 영역: btc-mid
        </div>
      </div>
    </div>
  );
}