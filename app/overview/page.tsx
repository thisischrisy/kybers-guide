import dynamic from "next/dynamic";

export const revalidate = 3600; // 이 페이지는 1시간 간격으로 재검증

/** -----------------------------------------------------------
 *  클라이언트 렌더가 필요한 컴포넌트는 모두 동적 로딩(SSR 비활성)
 *  - 차트/카운트다운/인터랙티브 위젯은 브라우저에서만 동작
 * ---------------------------------------------------------- */
const Donut = dynamic(() => import("@/components/Donut").then(m => m.Donut), { ssr: false });
const MiniLine = dynamic(() => import("@/components/MiniLine").then(m => m.MiniLine), { ssr: false });
const TvMini = dynamic(() => import("@/components/TvMini").then(m => m.TvMini), { ssr: false });
const StablecapCard = dynamic(() => import("@/components/StablecapCard").then(m => m.StablecapCard), { ssr: false });
const HalvingCountdown = dynamic(
  () => import("@/components/HalvingCountdown").then(m => m.HalvingCountdown),
  { ssr: false }
);
const RainbowLite = dynamic(
  () => import("@/components/RainbowLite").then(m => m.RainbowLite),
  { ssr: false }
);

/** -------------------------
 *  서버에서 한번에 필요한 데이터 조회
 * ------------------------ */
async function getGlobal() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getStable() {
  try {
    const res = await fetch("https://stablecoins.llama.fi/stablecoins");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getFGI() {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** -------------------------
 *  숫자 → 보기 좋은 USD 포맷
 * ------------------------ */
function formatUSD(n: number | null | undefined) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

/** =========================
 *  페이지 컴포넌트
 * ======================== */
export default async function OverviewPage() {
  // 필요한 서버 데이터 병렬 로드
  const [global, stableAll, fgi] = await Promise.all([
    getGlobal(),
    getStable(),
    getFGI(),
  ]);

  // 1) 전체 시가총액 & 도미넌스
  const mcap = global?.data?.total_market_cap?.usd ?? null;
  const btcDom = global?.data?.market_cap_percentage?.btc ?? null;
  const ethDom = global?.data?.market_cap_percentage?.eth ?? null;
  const altDom =
    typeof btcDom === "number" && typeof ethDom === "number"
      ? 100 - btcDom - ethDom
      : null;

  // 2) 스테이블코인 총량(스냅샷 표기용) — StablecapCard는 시계열을 별도로 표시
  const totalStable =
    (stableAll?.total?.[0]?.total as number | undefined) ??
    (stableAll?.total as number | undefined) ??
    null;
  const stableLabels = ["Now"];
  const stableValues = [typeof totalStable === "number" ? totalStable : 0];

  // 3) 공포·탐욕(FGI)
  const fearValue = Number(fgi?.data?.[0]?.value ?? NaN);
  const fearClass = isNaN(fearValue)
    ? "중립"
    : fearValue < 25
    ? "극심한 공포"
    : fearValue < 45
    ? "공포"
    : fearValue < 55
    ? "중립"
    : fearValue < 75
    ? "탐욕"
    : "극심한 탐욕";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h2 className="text-xl font-semibold">시장 개요</h2>

      {/* ── BTC 반감기 카운트다운 ───────────────────────────── */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm mb-2 text-brand-ink/80">BTC 반감기 카운트다운</div>
        <HalvingCountdown />
        <div className="mt-2 text-xs text-brand-ink/60">
          ※ 블록 시간 변동으로 실제 일자는 달라질 수 있습니다.
        </div>
      </section>

      {/* ── BTC Rainbow (Lite) : 내부에서 365D 가격 불러와 분위수 밴드 생성 ─ */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm mb-2 text-brand-ink/80">BTC Rainbow (간이 · 365D)</div>
        <RainbowLite />
      </section>

      {/* ── 전체 시가총액 & 도미넌스 ─────────────────────────── */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm mb-2 text-brand-ink/80">전체 시가총액</div>
        <div className="text-2xl font-semibold text-brand-gold">{formatUSD(mcap)}</div>

        <div className="mt-4">
          <div className="text-xs mb-2 text-brand-ink/60">도미넌스 (BTC / ETH / ALT)</div>
          <Donut
            labels={["BTC", "ETH", "ALT"]}
            values={[
              typeof btcDom === "number" ? btcDom : 0,
              typeof ethDom === "number" ? ethDom : 0,
              typeof altDom === "number" ? altDom : 0,
            ]}
          />
          <div className="mt-2 text-xs text-brand-ink/70">
            BTC {typeof btcDom === "number" ? btcDom.toFixed(1) : "-"}% ·{" "}
            ETH {typeof ethDom === "number" ? ethDom.toFixed(1) : "-"}% ·{" "}
            ALT {typeof altDom === "number" ? altDom.toFixed(1) : "-"}%
          </div>
        </div>
      </section>

      {/* ── 미니 TV 차트 (BTC/ETH 1D) ───────────────────────── */}
      <section className="grid md:grid-cols-2 gap-6 mt-6">
        <TvMini tvSymbol="BINANCE:BTCUSDT" title="BTC 미니 차트 (1D)" dateRange="1D" height={180} />
        <TvMini tvSymbol="BINANCE:ETHUSDT" title="ETH 미니 차트 (1D)" dateRange="1D" height={180} />
      </section>

      {/* ── 스테이블코인: 스냅샷 + 기간 토글 카드(30/90/180D) ─────────────── */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm mb-2 text-brand-ink/80">스테이블코인 총량 (스냅샷)</div>
        <div className="text-2xl font-semibold text-brand-gold">{formatUSD(totalStable)}</div>

        <div className="mt-4">
          {/* 간단 스냅샷 라인(한 점) — 자리 감 유지용 */}
          <MiniLine labels={stableLabels} values={stableValues} />
        </div>

        {/* 실제 시계열 + 기간 토글은 카드 컴포넌트에서 처리 */}
        <div className="mt-4">
          <StablecapCard />
        </div>

        <div className="mt-2 text-xs text-brand-ink/60">
          ※ 정확한 “거래소 Netflow(순유입/유출)”는 유료 온체인 데이터 필요. 현재는 총 공급(=시총) 추세로 근사.
        </div>
      </section>

      {/* ── 공포·탐욕 지수 ─────────────────────────────────── */}
      <section className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
        <div className="text-sm mb-2 text-brand-ink/80">공포·탐욕 지수</div>
        <div className="text-3xl font-semibold">
          {isNaN(fearValue) ? "-" : fearValue}
          <span className="ml-2 text-base text-brand-ink/70">({fearClass})</span>
        </div>
        <div className="mt-2 text-xs text-brand-ink/60">출처: Alternative.me</div>
      </section>
    </div>
  );
}