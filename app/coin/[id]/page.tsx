// app/coin/[id]/page.tsx
import dynamic from "next/dynamic";
import Link from "next/link";
import { AdSlot } from "@/components/AdSlot";

export const revalidate = 300; // 5분 캐시

// TV 미니차트(임베드) - 클라이언트에서만
const TvMini = dynamic(() => import("@/components/TvMini").then(m => m.TvMini), { ssr: false });

type Coin = {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank?: number;
  current_price?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  total_volume?: number;
};

function formatUSD(n?: number) {
  if (typeof n !== "number" || !isFinite(n)) return "-";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

// 간단 TV 심볼 추정
function guessTvSymbol(id: string, symbol: string) {
  const map: Record<string, string> = {
    bitcoin: "BINANCE:BTCUSDT",
    ethereum: "BINANCE:ETHUSDT",
    solana: "BINANCE:SOLUSDT",
    binancecoin: "BINANCE:BNBUSDT",
    ripple: "BINANCE:XRPUSDT",
    cardano: "BINANCE:ADAUSDT",
    dogecoin: "BINANCE:DOGEUSDT",
    chainlink: "BINANCE:LINKUSDT",
    avalanche: "BINANCE:AVAXUSDT",
    toncoin: "BINANCE:TONUSDT",
    tron: "BINANCE:TRXUSDT",
    polkadot: "BINANCE:DOTUSDT",
    litecoin: "BINANCE:LTCUSDT",
  };
  if (map[id]) return map[id];
  return `BINANCE:${symbol?.toUpperCase()}USDT`;
}

async function getCoin(id: string): Promise<Coin | null> {
  try {
    const url =
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd` +
      `&ids=${encodeURIComponent(id)}` +
      `&sparkline=false&price_change_percentage=24h,7d,30d`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const arr = await res.json();
    return Array.isArray(arr) && arr[0] ? arr[0] as Coin : null;
  } catch {
    return null;
  }
}

export default async function CoinDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const coin = await getCoin(id);

  if (!coin) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-6">
          데이터를 불러오지 못했습니다. <Link href="/altcoin" className="underline">← 목록으로</Link>
        </div>
      </div>
    );
  }

  const tvSymbol = guessTvSymbol(coin.id, coin.symbol);
  const chg = coin.price_change_percentage_24h ?? 0;
  const chgColor = chg > 0 ? "text-green-400" : chg < 0 ? "text-red-400" : "text-brand-ink/70";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {coin.name} ({coin.symbol?.toUpperCase()})
          {coin.market_cap_rank ? (
            <span className="ml-2 text-xs text-brand-ink/60">Rank #{coin.market_cap_rank}</span>
          ) : null}
        </h1>
        <Link href="/altcoin" className="text-sm underline">← 알트코인으로</Link>
      </div>

      {/* KPI */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
          <div className="text-xs text-brand-ink/70 mb-1">가격</div>
          <div className="text-lg font-semibold">{formatUSD(coin.current_price)}</div>
        </div>
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
          <div className="text-xs text-brand-ink/70 mb-1">24h 변화</div>
          <div className={`text-lg font-semibold ${chgColor}`}>
            {typeof chg === "number" ? `${chg.toFixed(2)}%` : "-"}
          </div>
        </div>
        <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4">
          <div className="text-xs text-brand-ink/70 mb-1">시가총액</div>
          <div className="text-lg font-semibold">{formatUSD(coin.market_cap)}</div>
        </div>
      </div>

      {/* 차트 (TradingView 위젯) */}
      <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-2">
        <TvMini tvSymbol={tvSymbol} title={`${coin.symbol?.toUpperCase()} / USDT`} dateRange="1D" height={460} />
      </div>

      {/* 광고 */}
      <AdSlot id="coin-mid" />
    </div>
  );
}