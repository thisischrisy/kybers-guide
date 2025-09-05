// app/btc/page.tsx
import dynamic from "next/dynamic";
import Link from "next/link";
import { sma } from "@/lib/indicators";
import { decideSignalForSeries, aggregateMaster, to4hCloses, type Tone } from "@/lib/signals";

export const revalidate = 180; // 3분 캐시

// TV 위젯(클라이언트 전용)
const TvChart = dynamic(() => import("@/components/TvChart").then(m => m.TvChart), { ssr: false });

/** ---------- 외부 데이터 소스 ---------- */
/** Coingecko 일봉 (무료 한도: 최근 365일) */
async function fetchDailyFromCoingecko(days = 365) {
  try {
    const url =
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return { ok: false as const, url, status: r.status, json: null, closes: [] as number[] };
    const json = await r.json();
    const closes = Array.isArray(json?.prices)
      ? (json.prices as unknown[])
          .map((p: unknown) => (Array.isArray(p) && p.length >= 2 ? Number((p as [unknown, unknown])[1]) : NaN))
          .filter((v: number): v is number => Number.isFinite(v))
      : [];
    return { ok: true as const, url, status: r.status, json, closes };
  } catch {
    return { ok: false as const, url: "cg:fail", status: 0, json: null, closes: [] as number[] };
  }
}

/** Kraken OHLC: XBTUSD, interval = 60(1h) / 240(4h) */
async function fetchKrakenCloses(intervalMinutes: 60 | 240) {
  try {
    const url = `https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=${intervalMinutes}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return { ok: false as const, url, status: r.status, json: null, closes: [] as number[] };
    const json = await r.json();
    // Kraken: { result: { XXBTZUSD: [[ts, open, high, low, close, vwap, volume, count], ...] } }
    const raw: unknown[] = json?.result?.XXBTZUSD ?? [];
    const closes =
      Array.isArray(raw)
        ? raw
            .map(row => (Array.isArray(row) && row.length >= 5 ? Number(row[4] as unknown) : NaN))
            .filter((v: number): v is number => Number.isFinite(v))
        : [];
    return { ok: true as const, url, status: r.status, json, closes };
  } catch {
    return { ok: false as const, url: "kraken:fail", status: 0, json: null, closes: [] as number[] };
  }
}

/** ---------- 유틸/표기 ---------- */
function last<T>(arr: T[]): T | undefined { return arr.length ? arr[arr.length - 1] : undefined; }
function toneColor(t: Tone) {
  // 요청: ‘투자 지양 권고(=중립 톤)’도 노랑으로
  return t === "buy" ? "text-emerald-300" : t === "sell" ? "text-rose-300" : "text-yellow-300";
}
function pill(t: Tone) {
  return t === "buy"
    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-400/40"
    : t === "sell"
    ? "bg-rose-600/20 text-rose-300 border border-rose-400/40"
    : "bg-yellow-600/20 text-yellow-300 border border-yellow-400/30";
}
function usd(n: number | null | undefined) {
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}

/** 최근 N캔들(기본 5)에서 50MA/400MA 교차 탐지 → 'golden' | 'dead' | '없음' */
function detectRecentCross50400(
  closes: number[],
  lookback = 5
): "golden" | "dead" | "없음" {
  if (!Array.isArray(closes) || closes.length < 410) return "없음"; // 400MA 계산 여유
  const ma50 = sma(closes, 50);
  const ma400 = sma(closes, 400);
  const len = Math.min(ma50.length, ma400.length);
  if (len < lookback + 1) return "없음";
  // 끝에서 lookback 구간을 검사(더 최근의 교차를 우선 반환)
  for (let i = len - lookback; i < len; i++) {
    const prev = ma50[i - 1] - ma400[i - 1];
    const curr = ma50[i] - ma400[i];
    if (!isFinite(prev) || !isFinite(curr)) continue;
    if (prev < 0 && curr > 0) return "golden"; // 상향 교차
    if (prev > 0 && curr < 0) return "dead";   // 하향 교차
  }
  return "없음";
}

/** 가격 vs MA 상/하단 비교 문구 생성 */
function priceVsMaLines(close: number | undefined, closes: number[]) {
  const lines: string[] = [];
  if (typeof close !== "number" || !isFinite(close) || closes.length < 60) {
    lines.push("데이터 수집 중");
    return lines;
  }
  const m50 = last(sma(closes, 50));
  const m200 = last(sma(closes, 200));
  const m400 = last(sma(closes, 400));
  const pos = (m?: number) => (typeof m === "number" && isFinite(m) ? (close >= m ? "상단" : "하단") : "—");

  lines.push(`50MA: ${pos(m50)} (${m50 ? usd(m50) : "—"})`);
  lines.push(`200MA: ${pos(m200)} (${m200 ? usd(m200) : "—"})`);
  lines.push(`400MA: ${pos(m400)} (${m400 ? usd(m400) : "—"})`);
  return lines;
}

/** RSI 라벨(초보 친화) — ‘투자심리(RSI): …’ */
function rsiLabelSimple(rsi: number | null | undefined) {
  if (typeof rsi !== "number" || !isFinite(rsi)) return { text: "투자심리(RSI): —", cls: "text-brand-ink/70" };
  const v = Math.round(rsi);
  let desc = "표준 수준";
  if (v <= 30) desc = "과매도 수준";
  else if (v <= 45) desc = "매도세 우세 수준";
  else if (v < 55) desc = "표준 수준";
  else if (v < 70) desc = "매수세 우세 수준";
  else desc = "과매수 수준";
  const cls =
    v >= 70 ? "text-rose-300" :
    v <= 30 ? "text-emerald-300" : "text-brand-ink/80";
  return { text: `투자심리(RSI): ${v} (${desc})`, cls };
}

export default async function BTCPage() {
  // 1) 데이터 수집
  const [dailyResp, h1Resp, h4Resp] = await Promise.all([
    fetchDailyFromCoingecko(365),
    fetchKrakenCloses(60),
    fetchKrakenCloses(240),
  ]);

  // 2) 종가 시계열
  const closesD = dailyResp.closes;
  const closes1H = h1Resp.closes;
  const closes4H = h4Resp.closes.length ? h4Resp.closes : to4hCloses(closes1H); // Kraken 4H 실패 시 1H로 집계

  // 3) 신호 산출(단/중/장기)
  const eval1h = decideSignalForSeries("1h", closes1H);
  const eval4h = decideSignalForSeries("4h", closes4H);
  const eval1d = decideSignalForSeries("1d", closesD);
  const master = aggregateMaster(eval1h, eval4h, eval1d);

  // 4) 보조 표기: 현재가/MA, 최근 교차(5캔들)
  const last1h = last(closes1H);
  const last4h = last(closes4H);
  const last1d = last(closesD);

  const cross1h = detectRecentCross50400(closes1H, 5);
  const cross4h = detectRecentCross50400(closes4H, 5);
  const cross1d = detectRecentCross50400(closesD, 5);

  const pvs1h = priceVsMaLines(last1h, closes1H);
  const pvs4h = priceVsMaLines(last4h, closes4H);
  const pvs1d = priceVsMaLines(last1d, closesD);

  const rsiText1h = rsiLabelSimple(eval1h.rsi);
  const rsiText4h = rsiLabelSimple(eval4h.rsi);
  const rsiText1d = rsiLabelSimple(eval1d.rsi);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 헤더(문구 수정) */}
      <header className="space-y-2">
        <h2 className="text-xl md:text-2xl font-semibold">
          비트코인으로 읽는 오늘의 투자 방향 — 단·중·장기 즉시 판단
        </h2>
        <p className="text-sm text-brand-ink/80">
          비트코인은 암호화폐 전체의 가장 중요한 <b>유동성·심리 엔진</b>입니다. BTC의 추세 전환은 알트 섹터의{" "}
          <b>확대·위축</b>추세로 번지므로, BTC 해석으로 먼저 <b>투자 타이밍</b>을 선점하세요.
        </p>
      </header>

      {/* 1) 마스터 카드 */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className={`text-base md:text-lg font-semibold ${toneColor(master.tone)}`}>{master.label}</div>
        <div className="mt-2 text-sm text-brand-ink/80">
          단기(24시간 이내 투자시 참고 · 1h 캔들 분석 기반):{" "}
          <b className={toneColor(eval1h.tone)}>{eval1h.recommendation}</b>{" "}
          · 중기(1주일 수준 투자시 참고 · 4h 캔들 분석 기반):{" "}
          <b className={toneColor(eval4h.tone)}>{eval4h.recommendation}</b>{" "}
          · 장기(긴 호흡의 투자 관점 · 1d+ 캔들 분석 기반):{" "}
          <b className={toneColor(eval1d.tone)}>{eval1d.recommendation}</b>
        </div>

        {/* 기준/우선순위 — 정적 문장 */}
        <ul className="mt-3 text-[12px] leading-6 text-brand-ink/70 list-disc pl-5">
          <li>기준: MA(50/200/400) + 투자심리(RSI). <b>추세전환 신호(50↔400 교차)</b>는 최우선.</li>
          <li>우선순위: 단·중·장기 다수결, 동률이면 장기(1d) 우선.</li>
        </ul>
      </section>

      {/* 2) 관점별 카드(가격 vs MA, 최근 5캔들 추세전환, RSI 라벨) */}
      <section className="grid md:grid-cols-3 gap-6">
        {/* 단기(1h) */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-brand-ink/80">단기 (24시간 이내 투자시 참고)</div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${pill(eval1h.tone)}`}>
              {eval1h.tone === "buy" ? "매수" : eval1h.tone === "sell" ? "매도" : "중립"}
            </span>
          </div>
          <div className="text-xs text-brand-ink/60 mb-2">1h 캔들 분석 기반</div>

          <div className={`text-xl font-semibold ${toneColor(eval1h.tone)}`}>{eval1h.recommendation}</div>
          <div className="mt-2 text-sm text-brand-ink/90">{eval1h.status}</div>

          <div className="mt-3 text-xs text-brand-ink/70">
            <b>추세전환 신호(최근 5캔들): </b>
            <span
              className={
                cross1h === "golden" ? "text-emerald-300" :
                cross1h === "dead" ? "text-rose-300" : "text-brand-ink/80"
              }
            >
              {cross1h === "없음" ? "없음" : (cross1h === "golden" ? "골든크로스(매수 전환)" : "데드크로스(매도 전환)")}
            </span>
          </div>

          <div className="mt-2 text-xs text-brand-ink/70">
            {(() => {
              const { text, cls } = rsiLabelSimple(eval1h.rsi);
              return <span className={cls}>{text}</span>;
            })()}
          </div>

          <div className="mt-3 text-xs text-brand-ink/70 space-y-1">
            <div className="font-medium">가격 vs 이동평균</div>
            {pvs1h.map((ln, i) => <div key={i}>{ln}</div>)}
          </div>
        </div>

        {/* 중기(4h) */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-brand-ink/80">중기 (1주일 수준 투자시 참고)</div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${pill(eval4h.tone)}`}>
              {eval4h.tone === "buy" ? "매수" : eval4h.tone === "sell" ? "매도" : "중립"}
            </span>
          </div>
          <div className="text-xs text-brand-ink/60 mb-2">4h 캔들 분석 기반</div>

          <div className={`text-xl font-semibold ${toneColor(eval4h.tone)}`}>{eval4h.recommendation}</div>
          <div className="mt-2 text-sm text-brand-ink/90">{eval4h.status}</div>

          <div className="mt-3 text-xs text-brand-ink/70">
            <b>추세전환 신호(최근 5캔들): </b>
            <span
              className={
                cross4h === "golden" ? "text-emerald-300" :
                cross4h === "dead" ? "text-rose-300" : "text-brand-ink/80"
              }
            >
              {cross4h === "없음" ? "없음" : (cross4h === "golden" ? "골든크로스(매수 전환)" : "데드크로스(매도 전환)")}
            </span>
          </div>

          <div className="mt-2 text-xs text-brand-ink/70">
            {(() => {
              const { text, cls } = rsiLabelSimple(eval4h.rsi);
              return <span className={cls}>{text}</span>;
            })()}
          </div>

          <div className="mt-3 text-xs text-brand-ink/70 space-y-1">
            <div className="font-medium">가격 vs 이동평균</div>
            {pvs4h.map((ln, i) => <div key={i}>{ln}</div>)}
          </div>
        </div>

        {/* 장기(1d) */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-brand-ink/80">장기 (긴 호흡의 투자 관점)</div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${pill(eval1d.tone)}`}>
              {eval1d.tone === "buy" ? "매수" : eval1d.tone === "sell" ? "매도" : "중립"}
            </span>
          </div>
          <div className="text-xs text-brand-ink/60 mb-2">1d+ 캔들 분석 기반</div>

          <div className={`text-xl font-semibold ${toneColor(eval1d.tone)}`}>{eval1d.recommendation}</div>
          <div className="mt-2 text-sm text-brand-ink/90">{eval1d.status}</div>

          <div className="mt-3 text-xs text-brand-ink/70">
            <b>추세전환 신호(최근 5캔들): </b>
            <span
              className={
                cross1d === "golden" ? "text-emerald-300" :
                cross1d === "dead" ? "text-rose-300" : "text-brand-ink/80"
              }
            >
              {cross1d === "없음" ? "없음" : (cross1d === "golden" ? "골든크로스(매수 전환)" : "데드크로스(매도 전환)")}
            </span>
          </div>

          <div className="mt-2 text-xs text-brand-ink/70">
            {(() => {
              const { text, cls } = rsiLabelSimple(eval1d.rsi);
              return <span className={cls}>{text}</span>;
            })()}
          </div>

          <div className="mt-3 text-xs text-brand-ink/70 space-y-1">
            <div className="font-medium">가격 vs 이동평균</div>
            {pvs1d.map((ln, i) => <div key={i}>{ln}</div>)}
          </div>
        </div>
      </section>

      {/* 3) 메인 차트 (오버레이는 다음 단계에서) */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
        <div className="text-sm text-brand-ink/80 mb-2">BTC 차트 (Daily)</div>
        <TvChart symbol="bitcoin" interval="D" height={480} />
        <div className="mt-3 text-sm text-brand-ink/80">
          현재가(스냅샷): {usd(last(closesD))}
        </div>
        <div className="mt-2 text-[11px] text-brand-ink/60">
          ※ MA(50/200/400) & RSI 오버레이는 다음 단계에서 위젯에 추가 예정(현재는 카드로 제공).
        </div>
      </section>

      {/* 리스크 & CTA */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-6">
        <div className="text-sm text-brand-ink/80 mb-2">리스크 관리 & 면책</div>
        <ul className="list-disc pl-5 text-xs leading-6 text-brand-ink/80">
          <li>본 페이지 신호는 <b>투자 자문이 아닌 참고용</b>입니다.</li>
          <li>단기 변동성 구간에서는 손절·분할매수 등 <b>리스크 관리</b>를 전제로 접근하세요.</li>
          <li>데이터 소스 지연/누락 시 신호 반영이 지연될 수 있습니다.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm text-brand-ink/80 mb-1">프리미엄 신호 체험</div>
            <div className="text-base text-brand-ink/90">
              동일 로직을 전 코인으로 확장 — 단·중·장기 종합 점수, 섹터 상대강도, 변동성 스크리너 제공(베타).
            </div>
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