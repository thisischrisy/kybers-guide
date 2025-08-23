import dynamic from "next/dynamic";

const TvChart = dynamic(() => import("@/components/TvChart").then(m => m.TvChart), { ssr: false });
const CoinChartBlock = dynamic(() => import("@/components/CoinChartBlock").then(m => m.CoinChartBlock), { ssr: false });
export const revalidate = 600; // 10분


async function getCoin(id: string) {
  const url =
    `https://api.coingecko.com/api/v3/coins/${id}` +
    `?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error("coin_fetch_failed");
  return res.json();
}

export default async function CoinDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { sym?: string };
}) {
  const coin = await getCoin(params.id);
  const sym =
    (searchParams?.sym as string | undefined)?.toUpperCase() ||
    (coin?.symbol ? String(coin.symbol).toUpperCase() : "BTC");

  const name = coin?.name ?? params.id;
  const rank = coin?.market_cap_rank ?? null;
  const price = coin?.market_data?.current_price?.usd ?? null;
  const ch24 = coin?.market_data?.price_change_percentage_24h ?? null;
  const mcap = coin?.market_data?.market_cap?.usd ?? null;
  const ch7d  = coin?.market_data?.price_change_percentage_7d ?? null;
  const ch30d = coin?.market_data?.price_change_percentage_30d ?? null;

  function pctBadge(label: string, v: number | null | undefined) {
    if (typeof v !== "number") return <span className="px-2 py-1 rounded bg-brand-card/60 border border-brand-line/40 text-xs">-</span>;
      return (
          <span className={`px-2 py-1 rounded text-xs border ${
            v >= 0 ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300" : "bg-rose-500/10 border-rose-500/40 text-rose-300"
          }`}>
          {label}: {v >= 0 ? "▲" : "▼"} {Math.abs(v).toFixed(2)}%
          </span>
      );
  }

  const tvSymbol = `BINANCE:${sym}USDT`;
    <TvChart tvSymbol={tvSymbol} interval="240" height={460} />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {name} <span className="text-brand-ink/60 text-sm">({sym})</span>
        </h2>
        {rank ? <div className="text-xs text-brand-ink/60">Market Cap Rank #{rank}</div> : null}
      </div>

      <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-4">
        <div className="text-sm text-brand-ink/80 mb-2">
          가격: {price != null ? `$${price.toLocaleString()}` : "-"}
          {ch24 != null ? (
            <span className={`ml-2 ${ch24 >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {ch24 >= 0 ? "▲" : "▼"} {Math.abs(ch24).toFixed(2)}%
            </span>
          ) : null}
          {mcap != null ? (
            <span className="ml-2 text-brand-ink/70">시총: ${Math.round(mcap).toLocaleString()}</span>
          ) : null}
        </div>

        {/* TradingView 차트 (현재 BTC/ETH만 지원 중) */}
        // 기존: <TvChart symbol="bitcoin" interval="240" height={460} />
        <CoinChartBlock sym={sym} height={460} />
      </div>

      {/* KPI 배지 묶음 */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="px-2 py-1 rounded bg-brand-card/60 border border-brand-line/40">
          시총랭크: {rank ?? "-"}
        </span>
        <span className="px-2 py-1 rounded bg-brand-card/60 border border-brand-line/40">
          현재가: {price != null ? `$${price.toLocaleString()}` : "-"}
        </span>
        {pctBadge("24h", ch24)}
        {pctBadge("7d", ch7d)}
        {pctBadge("30d", ch30d)}
      </div>

      <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-4 text-sm text-brand-ink/70">
        <div className="font-medium mb-1">설명</div>
        <div className="prose prose-invert max-w-none text-[13px] leading-6">
          이 페이지는 {name} 기본 정보를 보여주는 MVP 버전입니다.
        </div>
      </div>
    </div>
  );
}