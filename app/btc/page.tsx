// app/btc/page.tsx
import dynamic from "next/dynamic";
import Link from "next/link";
import { Info } from "@/components/Info";
import { decideSignalForSeries, to4hCloses, aggregateMaster, Tone } from "@/lib/signals";

export const revalidate = 300; // 5분 캐시로 속도 개선

const TvChart = dynamic(() => import("@/components/TvChart").then(m => m.TvChart), { ssr: false });

// 내부 API 경유: 일봉 450일 (400MA 판단용)
async function getBTCDaily(days = 450) {
  try {
    const r = await fetch(`/api/btc/market-chart?days=${days}&interval=daily&id=bitcoin`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    return r.json(); // { prices: [[ts, price], ...] }
  } catch {
    return null;
  }
}

// 내부 API 경유: 시간봉 60일 (4H 변환 충분)
async function getBTCHourly(days = 60) {
  try {
    const r = await fetch(`/api/btc/market-chart?days=${days}&interval=hourly&id=bitcoin`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    return r.json(); // { prices: [[ts, price], ...] }
  } catch {
    return null;
  }
}

// 안전 파서
function pickCloses(json: any): number[] {
  if (!Array.isArray(json?.prices)) return [];
  return json.prices
    .map((p: unknown) => (Array.isArray(p) ? Number(p[1]) : NaN))
    .filter((n: number): n is number => isFinite(n)); // 타입가드
}

function last<T>(arr: T[]): T | undefined { return arr.length ? arr[arr.length - 1] : undefined; }
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
  const [daily, hourly] = await Promise.all([getBTCDaily(450), getBTCHourly(60)]);
  //const closesD: number[] = Array.isArray(daily?.prices) ? daily.prices.map((p: any[]) => p[1]) : [];
  //const closesH: number[] = Array.isArray(hourly?.prices) ? hourly.prices.map((p: any[]) => p[1]) : [];
  // 교체
  const closesD: number[] = pickCloses(daily);
  const closesH: number[] = pickCloses(hourly);
  const closes4H = to4hCloses(closesH);

  // 신호 계산(부족하면 자동 fallback → 항상 결과 제공)
  const eval1h = decideSignalForSeries("1h", closesH);
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
          <Info label="기준" tip="MA(50/200/400) + RSI(14), 50/400 교차는 최우선" />
          <Info label="우선순위" tip="다수결, 동률 시 장기(1d) 우선" />
          <Info label="왜 BTC?" tip="BTC는 크립토 유동성·심리의 엔진. 방향 전환=알트 확장/위축" />
        </div>
      </section>

      {/* 데이터 상태 표시 (선택) */}
      <div className="mt-2 text-[11px] text-brand-ink/60">
        일봉:{closesD.length} / 시간봉:{closesH.length} (빈 값이면 데이터 소스 지연 가능)
      </div>

      {/* 2) 관점별 카드 (가이드 문구 포함) */}
      <section className="grid md:grid-cols-3 gap-6">
        {[eval1h, eval4h, eval1d].map(s => (
          <div key={s.tf} className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-brand-ink/80">
                {s.tf === "1h" ? "단기 (1h)" : s.tf === "4h" ? "중기 (4h)" : "장기 (1d)"}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${pill(s.tone)}`}>
                {s.tone === "buy" ? "매수" : s.tone === "sell" ? "매도" : "중립"}
              </span>
            </div>
            {/* 투자 관점 가이드 */}
            <div className="text-[11px] text-brand-ink/60 mb-2">
              {s.tf === "1h"
                ? "24시간 이하 투자 관점"
                : s.tf === "4h"
                ? "1주일 미만 투자 관점"
                : "긴 호흡의 투자 관점"}
            </div>

            <div className={`text-xl font-semibold ${toneColor(s.tone)}`}>{s.recommendation}</div>
            <div className="mt-2 text-sm text-brand-ink/90">{s.status}</div>
            <div className="mt-2 text-xs text-brand-ink/70">
              50/400 교차:{" "}
              <b className={
                s.cross50400 === "golden" ? "text-emerald-300" :
                s.cross50400 === "dead" ? "text-rose-300" : "text-brand-ink/80"
              }>
                {s.cross50400 === "golden" ? "골든" : s.cross50400 === "dead" ? "데드" : "없음"}
              </b>
              {s._fallback && " (400MA 미충족: 50/200 기준 대체)"}
            </div>
            <div className="mt-1 text-xs text-brand-ink/70">
              RSI(14):{" "}
              <b className={
                s.rsiWarn === "탐욕 과열" ? "text-rose-300" :
                s.rsiWarn === "공포 과도" ? "text-emerald-300" :
                "text-brand-ink/80"
              }>
                {s.rsi != null ? Math.round(s.rsi) : "—"} ({s.rsiWarn})
              </b>
            </div>
          </div>
        ))}
      </section>

      {/* 3) 메인 차트 (오버레이는 다음 단계에서) */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
        <div className="text-sm text-brand-ink/80 mb-2">BTC 차트 (Daily)</div>
        <TvChart symbol="bitcoin" interval="D" height={480} />
        <div className="mt-3 text-sm text-brand-ink/80">
          현재가(스냅샷): {typeof lastD === "number" && isFinite(lastD) ? `$${Math.round(lastD).toLocaleString()}` : "—"}
        </div>
        <div className="mt-2 text-[11px] text-brand-ink/60">
          ※ 50/200/400 MA 및 RSI 오버레이는 다음 단계에서 위젯에 표시 예정(현재는 신호 카드로 제공).
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