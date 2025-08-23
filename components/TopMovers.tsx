"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Props = { filter?: string };

export function TopMovers({ filter = "All" }: Props) {
  const { data, error, isLoading } = useSWR("/api/markets", fetcher, { refreshInterval: 60000 });

  if (error) return <div>불러오기 실패</div>;
  if (isLoading || !data) return <div>로딩 중…</div>;

  // 안전 가드
  let coins: any[] = Array.isArray(data) ? data.slice(0, 50) : [];

  if (filter === "LargeCap") {
    coins = coins.filter((c: any) => c.market_cap > 1_000_000_000);
  } else if (filter === "Meme") {
    coins = coins.filter((c: any) =>
      c.name.toLowerCase().includes("doge") || c.name.toLowerCase().includes("shiba")
    );
  } else if (filter === "AI") {
    coins = coins.filter((c: any) => c.name.toLowerCase().includes("ai"));
  } else if (filter === "DeFi") {
    coins = coins.filter((c: any) => c.category === "defi");
  }

  if (!coins.length) {
    return <div className="text-sm text-brand-ink/60">표시할 데이터가 없습니다.</div>;
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {coins.map((coin: any) => (
        <Link
          key={coin.id}
          href={`/coin/${coin.id}`}
          className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-4 block hover:border-brand-gold/60 transition"
        >
          <div className="font-semibold">
            {coin.name} ({coin.symbol?.toUpperCase()})
          </div>
            <div className="text-sm text-brand-ink/70">
              시총: {coin.market_cap ? `$${Math.round(coin.market_cap / 1e6)}M` : "-"}
            </div>
            <div className="text-sm text-brand-ink/70">
              24h: {typeof coin.price_change_percentage_24h === "number"
                ? `${coin.price_change_percentage_24h.toFixed(2)}%`
                : "-"}
            </div>
        </Link>
      ))}
    </div>
  );
}