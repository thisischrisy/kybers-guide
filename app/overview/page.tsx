import { Donut } from "@/components/Donut";
import { MiniLine } from "@/components/MiniLine";

export const revalidate = 3600; // 1시간 캐시

async function getGlobal() {
  const res = await fetch("https://api.coingecko.com/api/v3/global");
  if (!res.ok) throw new Error("coingecko global failed");
  return res.json();
}

async function getStable() {
  const res = await fetch("https://stablecoins.llama.fi/stablecoins");
  if (!res.ok) throw new Error("defillama stable failed");
  return res.json();
}

async function getFGI() {
  const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json");
  if (!res.ok) throw new Error("fgi failed");
  return res.json();
}

function formatUSD(n: number | null | undefined) {
  if (!n && n !== 0) return "-";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default async function OverviewPage() {
  const [global, stableAll, fgi] = await Promise.all([getGlobal(), getStable(), getFGI()]);

  // 1) 전체 시총 & 도미넌스
  const mcap = global?.data?.total_market_cap?.usd ?? null;
  const btcDom = global?.data?.market_cap_percentage?.btc ?? null;
  const ethDom = global?.data?.market_cap_percentage?.eth ?? null;
  const altDom = btcDom != null && ethDom != null ? 100 - btcDom - ethDom : null;

  // 2) 스테이블코인 총량 추세(최근 90일)
  // DeFiLlama 응답의 예: stablecoins: [{peggedUSD: number, circulating: number, ...}, ...] (형식 다소 단순화)
  // 여기서는 전체 합계를 일단 "총량"으로 가정하고 날짜 없는 스냅샷이면 상단 요약만 보여줍니다.
  // 실제로는 /stablecoincharts로 체인별 타임시리즈도 가능하지만, MVP에선 간단 합계로.
  const totalStable = stableAll?.total?.[0]?.total ?? null; // 응답 포맷이 바뀌면 이 부분만 조정

  // 차트를 위해 라벨/값 더미 (MVP: 스냅샷이거나 값이 없으면 1점만 표시)
  const stableLabels = ["Now"];
  const stableValues = [typeof totalStable === "number" ? totalStable : 0];

  // 3) FGI
  const fearValue = Number(fgi?.data?.[0]?.value ?? NaN);
  const fearClass =
    isNaN(fearValue) ? "중립" :
    fearValue < 25 ? "극심한 공포" :
    fearValue < 45 ? "공포" :
    fearValue < 55 ? "중립" :
    fearValue < 75 ? "탐욕" : "극심한 탐욕";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h2 className="text-xl font-semibold">시장 개요</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 1) 전체 시총 & 도미넌스 */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
          <div className="text-sm mb-2 text-brand-ink/80">전체 시가총액</div>
          <div className="text-2xl font-semibold text-brand-gold">{formatUSD(mcap)}</div>
          <div className="mt-4">
            <div className="text-xs mb-2 text-brand-ink/60">도미넌스 (BTC/ETH/ALT)</div>
            <Donut
              labels={["BTC", "ETH", "ALT"]}
              values={[
                btcDom ?? 0,
                ethDom ?? 0,
                altDom != null ? altDom : 0
              ]}
            />
            <div className="mt-2 text-xs text-brand-ink/70">
              BTC {btcDom?.toFixed(1) ?? "-"}% · ETH {ethDom?.toFixed(1) ?? "-"}% · ALT {altDom?.toFixed(1) ?? "-"}%
            </div>
          </div>
        </div>

        {/* 2) 스테이블코인 총량 추세 (MVP: 최근 스냅샷) */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
          <div className="text-sm mb-2 text-brand-ink/80">스테이블코인 총량(스냅샷)</div>
          <div className="text-2xl font-semibold text-brand-gold">{formatUSD(totalStable)}</div>
          <div className="mt-4">
            <MiniLine labels={stableLabels} values={stableValues} />
          </div>
          <div className="mt-2 text-xs text-brand-ink/60">※ 추후 30/90일 타임라인으로 확장 예정</div>
        </div>

        {/* 3) 공포·탐욕 지수 */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
          <div className="text-sm mb-2 text-brand-ink/80">공포·탐욕 지수</div>
          <div className="text-3xl font-semibold">
            {isNaN(fearValue) ? "-" : fearValue}
            <span className="ml-2 text-base text-brand-ink/70">({fearClass})</span>
          </div>
          <div className="mt-2 text-xs text-brand-ink/60">출처: Alternative.me</div>
        </div>

        {/* 4) Rainbow + 반감기 (자리만 잡아두기) */}
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
          <div className="text-sm mb-2 text-brand-ink/80">BTC Rainbow & 반감기</div>
          <div className="text-brand-ink/70 text-sm">
            MVP에선 자리만. 다음 단계에서 간단한 Rainbow 밴드 + D-카운트다운을 붙입니다.
          </div>
        </div>
      </div>
    </div>
  );
}
