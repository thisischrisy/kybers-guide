// app/page.tsx
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";
import { KpiCard } from "@/components/KpiCard";
import { rsi, sma } from "@/lib/indicators";
import { getMarkets, getGlobal, type Market } from "@/lib/coingecko";

export const revalidate = 900; // 홈은 15분 캐시

function safePct(n?: number | null) {
  return typeof n === "number" && isFinite(n) ? n : NaN;
}

async function getFng() {
  try {
    const r = await fetch("https://api.alternative.me/fng/?limit=1&format=json", { cache: "no-store" });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

async function getBTCPrices(days = 120) {
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

// ---------- 포맷터 ----------
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

export default async function Home() {
  const [fng, btcChart] = await Promise.all([getFng(), getBTCPrices(120)]);

  // ✅ 외부 API 직접 호출
  const [markets, global] = await Promise.all([getMarkets(200), getGlobal()]);

  // 시총/도미넌스/심리
  const marketCap = global?.data?.total_market_cap?.usd ?? null;
  const marketCap24h = global?.data?.market_cap_change_percentage_24h_usd ?? null;
  const domBTC = global?.data?.market_cap_percentage?.btc ?? null;
  const domETH = global?.data?.market_cap_percentage?.eth ?? null;
  const domALT =
    typeof domBTC === "number" && typeof domETH === "number" ? Math.max(0, 100 - domBTC - domETH) : null;

  // BTC/ETH 24h 변화율 (markets에서 가져옴)
  const btc = markets.find((m) => m.id === "bitcoin");
  const eth = markets.find((m) => m.id === "ethereum");
  const btc24h = btc?.price_change_percentage_24h ?? Number.NaN;
  const eth24h = eth?.price_change_percentage_24h ?? Number.NaN;

  // RSI(14)
  const closes: number[] = Array.isArray(btcChart?.prices) ? btcChart.prices.map((p: any[]) => p[1]) : [];
  const rsiLatest = closes.length ? rsi(closes, 14).at(-1) ?? null : null;

  // FNG
  const fgiVal = Number(fng?.data?.[0]?.value ?? NaN);
  const fgiClass = isNaN(fgiVal)
    ? "중립"
    : fgiVal < 25
    ? "극공포"
    : fgiVal < 45
    ? "공포"
    : fgiVal < 55
    ? "중립"
    : fgiVal < 75
    ? "탐욕"
    : "극탐욕";

  // --- 혼합형(C): "조건 충족 우선 + Top-N 보충" -----------------
  type Mkt = Market & {
    price_change_percentage_7d_in_currency?: number;
    price_change_percentage_30d_in_currency?: number;
    score?: number;
  };
  const list: Mkt[] = Array.isArray(markets) ? markets : [];

  const strong = list.filter((c) => {
    const p24 = c.price_change_percentage_24h ?? 0;
    const p7d = c.price_change_percentage_7d_in_currency ?? 0;
    const p30 = c.price_change_percentage_30d_in_currency ?? 0;
    return p24 > 2 && p7d > 5 && p30 > 10;
  });

  const strongIds = new Set(strong.map((c) => c.id));
  const candidates = list.filter((c) => !strongIds.has(c.id));

  const scored = candidates
    .map((c) => {
      const s24 = c.price_change_percentage_24h ?? 0;
      const s7d = c.price_change_percentage_7d_in_currency ?? 0;
      const s30 = c.price_change_percentage_30d_in_currency ?? 0;
      const score = s24 * 0.5 + s7d * 0.3 + s30 * 0.2;
      return { ...c, score };
    })
    .sort((a, b) => b.score! - a.score!);

  const fillCount = Math.max(0, 6 - strong.length);
  const fill = scored.slice(0, fillCount);
  const picks = [...strong.slice(0, 6), ...fill].slice(0, 6);

  const tagById = new Map<string, "strong" | "top">();
  strong.slice(0, 6).forEach((c) => tagById.set(c.id, "strong"));
  fill.forEach((c) => tagById.set(c.id, "top"));

  // 헤드라인
  const headlineCore = `🔥 Crypto 혼조 | BTC ${pct(btc24h)} · ETH ${pct(eth24h)} | RSI: ${
    typeof rsiLatest === "number" ? Math.round(rsiLatest) : "—"
  } · 심리: ${fgiClass}`;
  const headlineSeo =
    "단기 변동성 확대 구간—핵심 지표로 강세/약세 전환을 신속 포착. 초보자도 이해 가능한 매수·중립·매도 신호 제공.";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* a) Kyber's Guide 배너 */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/60 shadow-card p-6 md:p-8">
        <div className="text-xs uppercase tracking-widest text-brand-gold/90 mb-2">Kyber’s Guide</div>
        <h1 className="text-2xl md:text-3xl font-semibold leading-snug">초보도 이해하는 투자 타이밍 가이드</h1>
        <p className="mt-3 text-sm md:text-base text-brand-ink/80 leading-6">
          차트를 몰라도 투자할 때인지 알 수 있습니다 <br />
          AI 분석으로 강세인지 약세인지 판단하여 명확한 방향을 제시합니다.
          <br />
          핵심만 간결하게 — <span className="font-semibold text-brand-gold">매수</span> ·{" "}
          <span className="font-semibold text-brand-gold">중립</span> ·{" "}
          <span className="font-semibold text-brand-gold">매도</span> 신호로 제공합니다.
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className="opacity-80">색상 가이드:</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/20 text-emerald-300 px-2 py-0.5">
            🟢 매수
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-600/20 text-yellow-300 px-2 py-0.5">
            🟡 중립
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-600/20 text-rose-300 px-2 py-0.5">
            🔴 매도
          </span>
        </div>
      </section>

      {/* b) 투자 헤드라인 */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm text-brand-ink/80 mb-2">오늘의 투자 헤드라인</div>
        <div className="text-base md:text-lg font-medium">{headlineCore}</div>
        <div className="mt-1 text-sm">
          <span>
            BTC{" "}
            {isFinite(btc24h) ? (btc24h > 0 ? "▲" : "▼") + Math.abs(btc24h).toFixed(2) + "%" : "-"}
          </span>
          {" · "}
          <span>
            ETH{" "}
            {isFinite(eth24h) ? (eth24h > 0 ? "▲" : "▼") + Math.abs(eth24h).toFixed(2) + "%" : "-"}
          </span>
        </div>
        <div className="mt-2 text-xs text-brand-ink/70">{headlineSeo}</div>
      </section>

      {/* c) 오늘의 강력 매수 추천 종목 (혼합형) */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-brand-ink/80">오늘의 강력 매수 추천</div>
          <Link href="/altcoin" className="text-sm underline opacity-90">
            알트코인 더 보기
          </Link>
        </div>
        <p className="text-xs text-brand-ink/70 mt-1">
          AI 알고리즘을 통해 단·중·장기 모두 “상승 우세”에 가까운 종목을 선별합니다.
        </p>

        {picks.length ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {picks.map((c) => {
              const badge = tagById.get(c.id) === "strong" ? "강력조건" : "Top";
              return (
                <Link
                  key={c.id}
                  href={`/coin/${c.id}`}
                  className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-4 hover:border-brand-gold/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      {c.name} <span className="text-brand-ink/60">({c.symbol?.toUpperCase()})</span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${
                        badge === "강력조건"
                          ? "border-emerald-400 text-emerald-300"
                          : "border-brand-gold text-brand-gold"
                      }`}
                    >
                      {badge}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-brand-ink/70">시총: {usd(c.market_cap)}</div>
                  <div className="mt-1 text-sm">
                    24h:{" "}
                    <b
                      className={
                        (c.price_change_percentage_24h ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"
                      }
                    >
                      {pct(c.price_change_percentage_24h)}
                    </b>
                    <span className="text-brand-ink/50">
                      {" "}
                      · 7d:{" "}
                      <b
                        className={
                          (c.price_change_percentage_7d_in_currency ?? 0) >= 0
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }
                      >
                        {pct(c.price_change_percentage_7d_in_currency)}
                      </b>
                      {" "}
                      · 30d:{" "}
                      <b
                        className={
                          (c.price_change_percentage_30d_in_currency ?? 0) >= 0
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }
                      >
                        {pct(c.price_change_percentage_30d_in_currency)}
                      </b>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 text-sm text-brand-ink/70">조건을 만족하는 종목을 찾는 중…</div>
        )}

        <div className="mt-3 text-[11px] text-brand-ink/60">
          ※ 우선순위: <b>강력조건(24h&gt;2%, 7d&gt;5%, 30d&gt;10%)</b> 충족 종목 → 부족 시{" "}
          <b>Top-N 가중치(24h 0.5 / 7d 0.3 / 30d 0.2)</b>로 보충하여 총 6개 노출.
        </div>
      </section>

      {/* 중단 광고 (유지) */}
      <AdSlot id="home-mid" />

      {/* ✅ d) 시장 개요 요약 — 단일 큰 카드로 묶기 */}
      <section className="rounded-2xl border border-brand-line/30 bg-brand-card/50 shadow-card p-8">
        <h1 className="text-2xl font-semibold tracking-wide mb-2">
          시장 감정자와 가능성 가정자를 위한 최고의 조명 대시보드
        </h1>
        <p className="text-brand-ink/80">
          Kyber’s Guide — 신뢰 가능한 요약과 직관적 시각화로 핵심만 제공합니다.
        </p>

        {/* 상단 KPI 3개 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <KpiCard title="총 시가총액" value={usd(marketCap)} />
          <KpiCard
            title="BTC 도미넌스"
            value={typeof domBTC === "number" ? `${domBTC.toFixed(1)}%` : "-"}
          />
          <KpiCard
            title="공포·탐욕 지수"
            value={isNaN(fgiVal) ? "-" : `${fgiVal} (${fgiClass})`}
          />
        </div>

        {/* 코인 도미넌스 / 투자심리 간단 요약 */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* 코인 도미넌스 */}
          <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
            <div className="text-sm text-brand-ink/80 mb-2">코인 도미넌스 (BTC/ETH/ALT)</div>
            <div className="text-sm">
              <div className="mb-1">
                BTC: {typeof domBTC === "number" ? domBTC.toFixed(1) : "—"}%
                <span className="ml-1 text-brand-ink/60">({pct(btc24h)} / 24h)</span>
              </div>
              <div className="mb-1">
                ETH: {typeof domETH === "number" ? domETH.toFixed(1) : "—"}%
                <span className="ml-1 text-brand-ink/60">({pct(eth24h)} / 24h)</span>
              </div>
              <div>
                ALT: {typeof domALT === "number" ? domALT.toFixed(1) : "—"}%
                <span className="ml-1 text-brand-ink/60">(—)</span>
              </div>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-brand-line/20 overflow-hidden flex">
              <div
                className="h-full bg-emerald-500/60"
                style={{ width: `${Math.max(0, Math.min(100, domBTC ?? 0))}%` }}
                title="BTC"
              />
              <div
                className="h-full bg-sky-500/60"
                style={{ width: `${Math.max(0, Math.min(100, domETH ?? 0))}%` }}
                title="ETH"
              />
              <div
                className="h-full bg-amber-500/60"
                style={{ width: `${Math.max(0, Math.min(100, domALT ?? 0))}%` }}
                title="ALT"
              />
            </div>
            <div className="mt-2 text-xs text-brand-ink/60">
              ※ 24h 변화율은 각 자산 <b>가격</b> 기준(MVP). 도미넌스 자체의 변화율은 추후 적용.
            </div>
          </div>

          {/* 투자 심리 */}
          <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
            <div className="text-sm text-brand-ink/80 mb-2">투자 심리</div>
            <div className="text-sm">
              <div>
                BTC RSI(14):{" "}
                <b>{typeof rsiLatest === "number" ? Math.round(rsiLatest) : "—"}</b>
              </div>
              <div>
                공포·탐욕 지수: <b>{isNaN(fgiVal) ? "—" : fgiVal} ({fgiClass})</b>
              </div>
            </div>
          </div>
        </div>

        {/* 빠른 이동 */}
        <div className="flex flex-wrap gap-3 text-sm mt-6">
          <Link href="/overview" className="underline">
            시장 개요
          </Link>
          <Link href="/btc" className="underline">
            비트코인
          </Link>
          <Link href="/altcoin" className="underline">
            알트코인
          </Link>
          <Link href="/insight" className="underline">
            매크로 인사이트
          </Link>
          <Link href="/premium" className="underline">
            프리미엄 인사이트
          </Link>
        </div>
      </section>

      {/* 하단 광고 (유지) */}
      <AdSlot id="home-bottom" />
    </div>
  );
}