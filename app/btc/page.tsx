// app/btc/page.tsx
import NextDynamic from "next/dynamic";
import Link from "next/link";
import { Info } from "@/components/Info";
import { decideSignalForSeries, aggregateMaster, Tone } from "@/lib/signals";

export const revalidate = 0;             // 최신 데이터
export const dynamic = "force-dynamic";  // 런타임 강제

// TV 차트(클라 전용)
const TvChart = NextDynamic(() => import("@/components/TvChart").then(m => m.TvChart), { ssr: false });

/** 공용 fetch + 디버그 메타 수집 */
async function fetchWithDebug(url: string, init?: RequestInit) {
  const meta: {
    url: string;
    ok?: boolean;
    status?: number;
    ct?: string | null;
    isJson?: boolean;
    bodyPreview?: string;
    error?: string;
  } = { url };
  try {
    const r = await fetch(url, { cache: "no-store", ...init });
    meta.ok = r.ok;
    meta.status = r.status;
    meta.ct = r.headers.get("content-type");
    const text = await r.text();
    meta.bodyPreview = text.slice(0, 300);
    meta.isJson = !!(meta.ct && meta.ct.includes("json"));
    if (!r.ok) return { json: null, meta };
    try {
      const json = JSON.parse(text);
      return { json, meta };
    } catch (e: any) {
      meta.error = `JSON.parse 실패: ${e?.message ?? e}`;
      return { json: null, meta };
    }
  } catch (e: any) {
    meta.error = `fetch 실패: ${e?.message ?? e}`;
    return { json: null, meta };
  }
}

/** Coingecko: BTC 일봉 (365일 한도) */
async function cgGetBtcDaily(days = 365) {
  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${Math.min(
    days,
    365
  )}&interval=daily`;
  return fetchWithDebug(url, { headers: { accept: "application/json" } });
}

/** Kraken: OHLC (interval=60 → 1H, 240 → 4H) */
async function krakenOHLC(interval: 60 | 240) {
  const url = `https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=${interval}`;
  return fetchWithDebug(url);
}

/** CG {prices:[[ts,price],...]} → number[] closes */
function pickClosesFromCg(json: any) {
  if (!Array.isArray(json?.prices)) return [] as number[];
  const raw = json.prices as unknown[];
  return raw
    .map((p: unknown): number => {
      if (Array.isArray(p) && p.length >= 2) {
        const v = Number((p as [unknown, unknown])[1]);
        return Number.isFinite(v) ? v : NaN;
      }
      return NaN;
    })
    .filter((v: number): v is number => Number.isFinite(v));
}

/** Kraken {result:{PAIR:[[t,o,h,l,c,...],...]}} → number[] closes */
function pickClosesFromKraken(json: any) {
  const res = json?.result;
  if (!res || typeof res !== "object") return [] as number[];
  const keys = Object.keys(res).filter((k) => k !== "last");
  for (const k of keys) {
    const arr = res[k];
    if (Array.isArray(arr) && arr.length) {
      // 요소: [time, open, high, low, close, vwap, volume, count]
      return arr
        .map((row: unknown): number => {
          if (Array.isArray(row) && row.length >= 5) {
            const v = Number((row as any)[4]); // close
            return Number.isFinite(v) ? v : NaN;
          }
          return NaN;
        })
        .filter((v: number): v is number => Number.isFinite(v));
    }
  }
  return [] as number[];
}

function last<T>(arr: T[]): T | undefined {
  return arr.length ? arr[arr.length - 1] : undefined;
}
function toneColor(t: Tone) {
  return t === "buy" ? "text-emerald-300" : t === "sell" ? "text-rose-300" : "text-brand-ink/80";
}
function pill(t: Tone) {
  return t === "buy"
    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-400/40"
    : t === "sell"
    ? "bg-rose-600/20 text-rose-300 border border-rose-400/40"
    : "bg-yellow-600/20 text-yellow-300 border border-yellow-400/30";
}

export default async function BTCPage() {
  // 1) 데이터 소스 병렬 호출
  const [dailyResp, h1Resp, h4Resp] = await Promise.all([
    cgGetBtcDaily(365), // CG 일봉
    krakenOHLC(60),     // Kraken 1H
    krakenOHLC(240),    // Kraken 4H
  ]);

  // 2) 파싱
  const closesD = pickClosesFromCg(dailyResp.json);
  const closes1H = pickClosesFromKraken(h1Resp.json);
  const closes4H = pickClosesFromKraken(h4Resp.json);

  // 3) 신호 계산 (부족하면 내부 fallback 로직이 중립 처리)
  const eval1h = decideSignalForSeries("1h", closes1H);
  const eval4h = decideSignalForSeries("4h", closes4H);
  const eval1d = decideSignalForSeries("1d", closesD);
  const master = aggregateMaster(eval1h, eval4h, eval1d);

  const lastD = last(closesD) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <h2 className="text-xl font-semibold">비트코인 — 투자 관점 신호 (1h / 4h / 1d)</h2>

      {/* 1) 마스터 카드 */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className={`text-base md:text-lg font-semibold ${toneColor(master.tone)}`}>{master.label}</div>
        <div className="mt-2 text-sm text-brand-ink/80">
          단기(1h): <b className={toneColor(eval1h.tone)}>{eval1h.recommendation}</b>{" "}
          · 중기(4h): <b className={toneColor(eval4h.tone)}>{eval4h.recommendation}</b>{" "}
          · 장기(1d): <b className={toneColor(eval1d.tone)}>{eval1d.recommendation}</b>
        </div>
        <div className="mt-3 text-xs text-brand-ink/70 flex gap-3 flex-wrap">
          <Info label="기준" tip="MA(50/200/400) + RSI(14), 50/400 교차 최우선" />
          <Info label="우선순위" tip="다수결, 동률 시 장기(1d) 우선" />
          <Info label="왜 BTC?" tip="BTC는 크립토 유동성·심리의 엔진. 방향 전환=알트 확장/위축" />
        </div>
      </section>

      {/* 2) 관점별 카드 */}
      <section className="grid md:grid-cols-3 gap-6">
        {[eval1h, eval4h, eval1d].map((s) => (
          <div key={s.tf} className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-brand-ink/80">
                {s.tf === "1h" ? "단기 (1h)" : s.tf === "4h" ? "중기 (4h)" : "장기 (1d)"}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${pill(s.tone)}`}>
                {s.tone === "buy" ? "매수" : s.tone === "sell" ? "매도" : "중립"}
              </span>
            </div>
            <div className="text-[11px] text-brand-ink/60 mb-2">
              {s.tf === "1h" ? "24시간 이하 투자 관점" : s.tf === "4h" ? "1주일 미만 투자 관점" : "긴 호흡의 투자 관점"}
            </div>
            <div className={`text-xl font-semibold ${toneColor(s.tone)}`}>{s.recommendation}</div>
            <div className="mt-2 text-sm text-brand-ink/90">{s.status}</div>
            <div className="mt-2 text-xs text-brand-ink/70">
              50/400 교차:{" "}
              <b className={s.cross50400 === "golden" ? "text-emerald-300" : s.cross50400 === "dead" ? "text-rose-300" : "text-brand-ink/80"}>
                {s.cross50400 === "golden" ? "골든" : s.cross50400 === "dead" ? "데드" : "없음"}
              </b>
              {s._fallback && " (400MA 미충족: 50/200 기준 대체)"}
            </div>
            <div className="mt-1 text-xs text-brand-ink/70">
              RSI(14):{" "}
              <b className={s.rsiWarn === "탐욕 과열" ? "text-rose-300" : s.rsiWarn === "공포 과도" ? "text-emerald-300" : "text-brand-ink/80"}>
                {s.rsi != null ? Math.round(s.rsi) : "—"} ({s.rsiWarn})
              </b>
            </div>
          </div>
        ))}
      </section>

      {/* 3) 메인 차트 (일봉) */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
        <div className="text-sm text-brand-ink/80 mb-2">BTC 차트 (Daily)</div>
        <TvChart symbol="bitcoin" interval="D" height={480} />
        <div className="mt-3 text-sm text-brand-ink/80">
          현재가(스냅샷): {typeof lastD === "number" && Number.isFinite(lastD) ? `$${Math.round(lastD).toLocaleString()}` : "—"}
        </div>
        <div className="mt-2 text-[11px] text-brand-ink/60">
          ※ 50/200/400 MA 및 RSI 오버레이는 다음 단계에서 위젯에 표시 예정(현재는 신호 카드로 제공).
        </div>
      </section>

      {/* ---- DEBUG: 데이터 소스 상태 ---- */}
      <section className="rounded-xl border border-brand-line/40 bg-brand-card/70 p-4 text-[12px] text-brand-ink/80">
        <div className="font-semibold mb-2">DEBUG (Data Sources)</div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-brand-line/30 p-3">
            <div className="font-medium mb-1">Daily (Coingecko)</div>
            <div>url: {dailyResp.meta.url}</div>
            <div>ok/status: {String(dailyResp.meta.ok)} / {dailyResp.meta.status}</div>
            <div>content-type: {dailyResp.meta.ct ?? "-"}</div>
            <div>isJson: {String(dailyResp.meta.isJson)}</div>
            <div>closesD.length: {closesD.length}</div>
            {dailyResp.meta.error && <div className="text-rose-300">error: {dailyResp.meta.error}</div>}
            <details className="mt-2">
              <summary>body preview</summary>
              <pre className="whitespace-pre-wrap text-xs opacity-80">{dailyResp.meta.bodyPreview}</pre>
            </details>
          </div>
          <div className="rounded-lg border border-brand-line/30 p-3">
            <div className="font-medium mb-1">1H (Kraken)</div>
            <div>url: {h1Resp.meta.url}</div>
            <div>ok/status: {String(h1Resp.meta.ok)} / {h1Resp.meta.status}</div>
            <div>content-type: {h1Resp.meta.ct ?? "-"}</div>
            <div>isJson: {String(h1Resp.meta.isJson)}</div>
            <div>closes1H.length: {closes1H.length}</div>
            {h1Resp.meta.error && <div className="text-rose-300">error: {h1Resp.meta.error}</div>}
            <details className="mt-2">
              <summary>body preview</summary>
              <pre className="whitespace-pre-wrap text-xs opacity-80">{h1Resp.meta.bodyPreview}</pre>
            </details>
          </div>
          <div className="rounded-lg border border-brand-line/30 p-3">
            <div className="font-medium mb-1">4H (Kraken)</div>
            <div>url: {h4Resp.meta.url}</div>
            <div>ok/status: {String(h4Resp.meta.ok)} / {h4Resp.meta.status}</div>
            <div>content-type: {h4Resp.meta.ct ?? "-"}</div>
            <div>isJson: {String(h4Resp.meta.isJson)}</div>
            <div>closes4H.length: {closes4H.length}</div>
            {h4Resp.meta.error && <div className="text-rose-300">error: {h4Resp.meta.error}</div>}
            <details className="mt-2">
              <summary>body preview</summary>
              <pre className="whitespace-pre-wrap text-xs opacity-80">{h4Resp.meta.bodyPreview}</pre>
            </details>
          </div>
        </div>
      </section>

      {/* 리스크 안내 & CTA */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-6">
        <div className="text-sm text-brand-ink/80 mb-2">리스크 관리 & 면책</div>
        <ul className="list-disc pl-5 text-xs leading-6 text-brand-ink/80">
          <li>본 페이지의 신호는 <b>투자 자문이 아닌 참고용</b>입니다.</li>
          <li>단기 변동성 구간에선 손절/분할매수 등 <b>리스크 관리</b> 전제.</li>
          <li>데이터 소스(API) 지연·누락 시 신호가 지연될 수 있습니다.</li>
        </ul>
      </section>

      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm text-brand-ink/80 mb-1">프리미엄 신호 체험</div>
            <div className="text-base text-brand-ink/90">
              동일 로직을 전 코인으로 확장 — 단·중·장기 종합 점수, 섹터 상대강도, 변동성 스크리너 제공.
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