// app/btc/page.tsx
import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Info } from "@/components/Info";
import { rsi, macd, sma } from "@/lib/indicators";
import { SIGNAL_EMOJI, SIGNAL_LABEL } from "@/lib/signal";

export const revalidate = 1800; // 30분 캐시

// TradingView 차트(클라이언트 전용)
const TvChart = dynamic(() => import("@/components/TvChart").then(m => m.TvChart), { ssr: false });

/** BTC 가격(일봉) */
async function getBTC(days = 180) {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json(); // { prices: [ [ts, price], ...] }
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

type Tone = "buy" | "neutral" | "sell";

/** 지표 종합 판단(MVP) */
function summarizeIndicators(closes: number[]) {
  if (!Array.isArray(closes) || closes.length < 200) {
    return {
      tone: "neutral" as Tone,
      rsiLast: NaN,
      macdCross: "none" as "bull" | "bear" | "none",
      maCross: "unknown" as "golden" | "dead" | "flat" | "unknown",
      macdHistLast: NaN,
      summary: "데이터 수집 중 — 보수적 유지",
    };
  }

  // RSI
  const rsiArr = rsi(closes, 14);
  const rsiLast = rsiArr.at(-1) ?? NaN;

  // MACD
  const { macdLine, signalLine, hist } = macd(closes);
  const macdHistLast = hist.at(-1) ?? NaN;
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

  // MA(50/200)
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const ma50Last = ma50.at(-1) ?? NaN;
  const ma200Last = ma200.at(-1) ?? NaN;
  const maCross =
    isFinite(ma50Last) && isFinite(ma200Last)
      ? ma50Last > ma200Last
        ? "golden"
        : ma50Last < ma200Last
        ? "dead"
        : "flat"
      : "unknown";

  // 톤 결정
  const tone: Tone =
    macdCross === "bull" || maCross === "golden"
      ? "buy"
      : macdCross === "bear" || maCross === "dead"
      ? "sell"
      : "neutral";

  // 사람이 읽는 문구
  const parts: string[] = [];
  if (macdCross === "bull") parts.push("MACD 골든");
  if (macdCross === "bear") parts.push("MACD 데드");
  if (isFinite(rsiLast))
    parts.push(
      rsiLast >= 70 ? `RSI ${Math.round(rsiLast)} 과열` :
      rsiLast <= 30 ? `RSI ${Math.round(rsiLast)} 과매도` :
      `RSI ${Math.round(rsiLast)}`
    );
  if (maCross === "golden") parts.push("MA(50/200) 골든");
  if (maCross === "dead") parts.push("MA(50/200) 데드");

  return {
    tone,
    rsiLast,
    macdCross,
    maCross,
    macdHistLast,
    summary: parts.length ? parts.join(", ") : "지표 중립 — 방향성 모색",
  };
}

/** 작은 숫자용 포맷 */
function fmt(n: number | null | undefined, digits = 2) {
  return typeof n === "number" && isFinite(n) ? n.toFixed(digits) : "—";
}

export default async function BTCPage() {
  const btc = await getBTC(200); // 200일 확보
  const closes: number[] = Array.isArray(btc?.prices) ? btc.prices.map((p: any[]) => p[1]) : [];
  const last = closes.at(-1) ?? null;

  const s = summarizeIndicators(closes);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <h2 className="text-xl font-semibold">비트코인 — 단·중·장기 신호</h2>

      {/* 상단 톤 배지 + 요약 */}
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
          <Badge tone={s.tone}>
            {SIGNAL_EMOJI[s.tone]} {SIGNAL_LABEL[s.tone]}
          </Badge>
          <span className="text-brand-ink/70">{s.summary}</span>
        </div>
        <div className="text-xs text-brand-ink/70 flex gap-3 flex-wrap">
          <Info label="RSI" tip="70 이상 과열, 30 이하 과매도" />
          <Info label="MACD" tip="MACD선이 시그널선 돌파 시 모멘텀 전환" />
          <Info label="MA(50/200)" tip="50일선이 200일선 상향 돌파 시 골든, 하향 시 데드" />
        </div>
        <div className="mt-3 text-sm text-brand-ink/80">
          현재가(스냅샷): {last ? usd(last) : "-"}
        </div>
      </div>

      {/* TradingView 메인 차트 */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
        <div className="text-sm text-brand-ink/80 mb-2">BTC 차트 (Daily)</div>
        <TvChart symbol="bitcoin" interval="D" height={480} />
      </section>

      {/* ① 지표 상세 카드: RSI / MACD / MA(50/200) */}
      <section className="grid md:grid-cols-3 gap-6">
        {/* RSI 카드 */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-5">
          <div className="text-sm text-brand-ink/80 mb-1">RSI(14)</div>
          <div className="text-2xl font-semibold text-brand-gold">{fmt(s.rsiLast, 0)}</div>
          <div className="mt-2 text-xs text-brand-ink/70">
            {isFinite(s.rsiLast)
              ? s.rsiLast >= 70
                ? "과열 구간 — 단기 과열, 변동성 유의"
                : s.rsiLast <= 30
                ? "과매도 구간 — 반등 가능성 주시"
                : "중립 구간 — 방향성 모색"
              : "지표 수집 중"}
          </div>
        </div>

        {/* MACD 카드 */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-5">
          <div className="text-sm text-brand-ink/80 mb-1">MACD</div>
          <div className="text-2xl font-semibold text-brand-gold">
            {s.macdCross === "bull" ? "골든 크로스" : s.macdCross === "bear" ? "데드 크로스" : "중립"}
          </div>
          <div className="mt-2 text-xs text-brand-ink/70">
            히스토그램: <b className={isFinite(s.macdHistLast) && s.macdHistLast >= 0 ? "text-emerald-300" : "text-rose-300"}>
              {isFinite(s.macdHistLast) ? fmt(s.macdHistLast, 3) : "—"}
            </b>{" "}
            {isFinite(s.macdHistLast)
              ? s.macdHistLast > 0
                ? "(상방 모멘텀)"
                : s.macdHistLast < 0
                ? "(하방 모멘텀)"
                : "(중립)"
              : ""}
          </div>
        </div>

        {/* MA(50/200) 카드 */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-5">
          <div className="text-sm text-brand-ink/80 mb-1">이동평균 (50 / 200)</div>
          <div className="text-2xl font-semibold text-brand-gold">
            {s.maCross === "golden" ? "골든 크로스" : s.maCross === "dead" ? "데드 크로스" : "중립"}
          </div>
          <div className="mt-2 text-xs text-brand-ink/70">
            장기 추세 판단: 50일선이 200일선 위면 <b className="text-emerald-300">상승 추세</b>, 아래면{" "}
            <b className="text-rose-300">하락 추세</b> 경향.
          </div>
        </div>
      </section>

      {/* ② 리스크 관리 안내 / 면책 */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-6">
        <div className="text-sm text-brand-ink/80 mb-2">리스크 관리 & 면책</div>
        <ul className="list-disc pl-5 text-xs leading-6 text-brand-ink/80">
          <li>본 페이지의 신호는 <b>투자 자문이 아닌 참고용</b>입니다.</li>
          <li>단기 변동성 구간에선 손절/분할매수 등 <b>리스크 관리</b>를 전제로 접근하세요.</li>
          <li>데이터 소스(API) 지연·누락 시 신호가 지연될 수 있습니다.</li>
        </ul>
      </section>

      {/* ③ 프리미엄 신호 체험(CTA) */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm text-brand-ink/80 mb-1">프리미엄 신호 체험</div>
            <div className="text-base text-brand-ink/90">
              단·중·장기 통합 점수, 섹터 상대강도, 리스크 지표까지 한 번에. 베타 기간 무료 체험.
            </div>
            <ul className="mt-2 text-xs text-brand-ink/70 list-disc pl-5">
              <li>프리미엄 룰 기반 종합 점수(가중 다수결, 추세 가점)</li>
              <li>알트 섹터 상대강도(24h/7d)</li>
              <li>변동성/거래대금 스크리너</li>
            </ul>
          </div>
          <Link
            href="/premium"
            className="rounded-lg border border-brand-gold/60 text-brand-gold px-4 py-2 hover:bg-brand-gold/10 transition"
          >
            프리미엄 보러가기 →
          </Link>
        </div>
      </section>
    </div>
  );
}