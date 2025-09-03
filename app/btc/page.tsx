// app/btc/page.tsx
import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { Info } from "@/components/Info";
import { decideSignalForSeries, to4hCloses, aggregateMaster, Tone } from "@/lib/signals";

export const revalidate = 900;

const TvChart = dynamic(() => import("@/components/TvChart").then(m => m.TvChart), { ssr: false });

async function getBTCDaily(days = 500) {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function getBTCHourly(days = 120) {
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=hourly`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

function last<T>(arr: T[]): T | undefined { return arr.length ? arr[arr.length - 1] : undefined; }
function toneColor(t: Tone) {
  return t === "buy" ? "text-emerald-300" : t === "sell" ? "text-rose-300" : "text-brand-ink/80";
}

export default async function BTCPage() {
  const [daily, hourly] = await Promise.all([getBTCDaily(500), getBTCHourly(120)]);
  const closesD: number[] = Array.isArray(daily?.prices) ? daily.prices.map((p: any[]) => p[1]) : [];
  const closesH: number[] = Array.isArray(hourly?.prices) ? hourly.prices.map((p: any[]) => p[1]) : [];
  const closes4H = to4hCloses(closesH);

  // 각 타임프레임 신호 (lib/signals 사용)
  const eval1h = decideSignalForSeries("1h", closesH);
  const eval4h = decideSignalForSeries("4h", closes4H);
  const eval1d = decideSignalForSeries("1d", closesD);

  const master = aggregateMaster(eval1h, eval4h, eval1d);

  // 일봉 스냅샷 (가격만 표시)
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
          <Info label="우선순위" tip="단순 다수결, 동률은 장기(1d) 우선" />
          <Info label="왜 BTC?" tip="BTC는 크립토 유동성·심리의 엔진. 방향 전환=알트 확장/위축" />
        </div>
      </section>

      {/* 2) 관점별 카드 */}
      <section className="grid md:grid-cols-3 gap-6">
        {[eval1h, eval4h, eval1d].map(s => (
          <div key={s.tf} className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-5">
            <div className="text-sm text-brand-ink/80 mb-1">
              {s.tf === "1h" ? "단기 (1h)" : s.tf === "4h" ? "중기 (4h)" : "장기 (1d)"}
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

      {/* 3) 차트 (오버레이는 다음 단계에서) */}
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

      {/* 리스크 & CTA는 기존 그대로 유지하셔도 됩니다 */}
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